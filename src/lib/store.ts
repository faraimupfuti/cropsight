import { create } from "zustand";
import { generateSeedData, approxCoordsForRegion } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import * as authApi from "./api/auth";
import * as liveData from "./api/liveData";
import type { DemoUser, Farm, Field, Observation, OutbreakThresholdConfig, Role, Severity } from "./types";

const DEMO_USERS: Record<Role, DemoUser> = {
  farmer: { name: "Tendai Moyo", email: "tendai.moyo@demo.cropsight.africa", org: "Mash. Central Growers Co-op" },
  agronomist: { name: "Agron. Rutendo Sibanda", email: "r.sibanda@demo.cropsight.africa", org: "AgriExtend Zimbabwe" },
  company: { name: "Grace Chikafu", email: "g.chikafu@demo.cropsight.africa", org: "Zimbabwe Grain Partners" },
  researcher: { name: "Dr. B. Ncube", email: "b.ncube@demo.cropsight.africa", org: "University of Zimbabwe — Crop Science" },
  admin: { name: "Platform Admin", email: "admin@demo.cropsight.africa", org: "CropSight Platform" },
};

export const AGRONOMISTS = [
  { name: "Agron. Tendai Chikafu", region: "Mashonaland Central" },
  { name: "Agron. Rutendo Sibanda", region: "Mashonaland West" },
  { name: "Agron. Blessing Moyo", region: "Manicaland" },
];

interface Toast {
  id: number;
  message: string;
}

type DB = ReturnType<typeof generateSeedData>;

interface CropSightState {
  mode: "demo" | "live";
  db: DB;
  role: Role | null;
  user: DemoUser | null;
  organizationId: string | null;
  accessToken: string | null;
  needsOnboarding: boolean;
  authLoading: boolean;
  authError: string | null;
  outbreakThreshold: OutbreakThresholdConfig;
  toasts: Toast[];

  loginDemo: (role: Role) => void;

  initLiveSession: () => Promise<void>;
  signInLive: (email: string, password: string) => Promise<void>;
  signUpLive: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  completeOnboarding: (orgName: string, fullName: string, role: "farmer" | "company") => Promise<void>;

  logout: () => Promise<void>;

  addObservation: (obs: Observation) => void;
  submitReview: (
    observationId: string,
    status: "confirmed" | "corrected" | "uncertain",
    correction?: { diseaseId: string; severity: Severity; notes: string }
  ) => Promise<void>;
  updateThreshold: (patch: Partial<OutbreakThresholdConfig>) => Promise<void>;
  addFarm: (name: string) => Promise<Farm>;
  addField: (farmId: string, input: { name: string; variety: string; plantingDate: string; areaHa: number; region: string }) => Promise<Field>;
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

async function hydrateFromSupabase(organizationId: string): Promise<DB> {
  const snapshot = await liveData.fetchOrgSnapshot(organizationId);
  return snapshot as DB;
}

export const useStore = create<CropSightState>((set, get) => ({
  mode: isSupabaseConfigured ? "live" : "demo",
  db: generateSeedData(),
  role: null,
  user: null,
  organizationId: null,
  accessToken: null,
  needsOnboarding: false,
  authLoading: false,
  authError: null,
  outbreakThreshold: { minFields: 5, minObservations: 8, windowDays: 21 },
  toasts: [],

  loginDemo: (role) => set({ role, user: DEMO_USERS[role], mode: "demo" }),

  initLiveSession: async () => {
    if (!isSupabaseConfigured || !supabase) return;
    set({ authLoading: true, authError: null });
    try {
      const session = await authApi.getSession();
      if (!session) {
        set({ authLoading: false });
        return;
      }
      const profile = await authApi.fetchMyProfile();
      if (!profile || !profile.organization_id) {
        set({ authLoading: false, needsOnboarding: true, accessToken: session.access_token });
        return;
      }
      const db = await hydrateFromSupabase(profile.organization_id);
      const threshold = await liveData.fetchThresholdLive(profile.organization_id);
      set({
        role: authApi.dbRoleToAppRole(profile.role),
        user: { name: profile.full_name, email: session.user.email ?? "", org: "" },
        organizationId: profile.organization_id,
        accessToken: session.access_token,
        db,
        outbreakThreshold: threshold,
        needsOnboarding: false,
        authLoading: false,
      });
    } catch (err: any) {
      set({ authLoading: false, authError: err?.message ?? "Failed to restore session" });
    }
  },

  signInLive: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      await authApi.signIn(email, password);
      await get().initLiveSession();
    } catch (err: any) {
      set({ authLoading: false, authError: err?.message ?? "Sign in failed" });
      throw err;
    }
  },

  signUpLive: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const result = await authApi.signUp(email, password);
      set({ authLoading: false });
      if (!result.session) {
        return { needsEmailConfirmation: true };
      }
      set({ needsOnboarding: true, accessToken: result.session.access_token });
      return { needsEmailConfirmation: false };
    } catch (err: any) {
      set({ authLoading: false, authError: err?.message ?? "Sign up failed" });
      throw err;
    }
  },

  completeOnboarding: async (orgName, fullName, role) => {
    set({ authLoading: true, authError: null });
    try {
      const profile = await authApi.bootstrapOrganization(orgName, fullName, role);
      const orgId = profile.organization_id as string;
      const db = await hydrateFromSupabase(orgId);
      const threshold = await liveData.fetchThresholdLive(orgId);
      set({
        role: authApi.dbRoleToAppRole(profile.role),
        user: { name: profile.full_name, email: "", org: orgName },
        organizationId: orgId,
        db,
        outbreakThreshold: threshold,
        needsOnboarding: false,
        authLoading: false,
      });
    } catch (err: any) {
      set({ authLoading: false, authError: err?.message ?? "Could not create organization" });
      throw err;
    }
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await authApi.signOut();
      } catch {
        // ignore — clear local state regardless
      }
    }
    set({ role: null, user: null, organizationId: null, accessToken: null, needsOnboarding: false });
  },

  addObservation: (obs) => set((s) => ({ db: { ...s.db, observations: [obs, ...s.db.observations] } })),

  submitReview: async (observationId, status, correction) => {
    const { mode, organizationId } = get();
    if (mode === "live" && organizationId) {
      await liveData.submitReviewLive(
        observationId,
        status,
        correction ? { diseaseCode: correction.diseaseId, severity: correction.severity, notes: correction.notes } : undefined
      );
    }

    set((s) => {
      const observations = s.db.observations.map((o) => {
        if (o.id !== observationId) return o;
        const reviewer = get().user?.name || "Agronomist";
        if (status === "corrected" && correction) {
          return {
            ...o,
            status: "corrected" as const,
            review: {
              reviewer,
              status: "corrected" as const,
              finalDiseaseId: correction.diseaseId,
              finalSeverity: correction.severity,
              notes: correction.notes,
              reviewedAt: new Date().toISOString(),
            },
          };
        }
        if (status === "confirmed") {
          return {
            ...o,
            status: "confirmed" as const,
            review: {
              reviewer,
              status: "confirmed" as const,
              finalDiseaseId: o.diseaseId,
              finalSeverity: o.severity,
              notes: "Confirmed as AI-predicted.",
              reviewedAt: new Date().toISOString(),
            },
          };
        }
        return {
          ...o,
          status: "pending" as const,
          review: {
            reviewer,
            status: "uncertain" as const,
            finalDiseaseId: null,
            finalSeverity: o.severity,
            notes: "Marked uncertain — follow-up scouting recommended.",
            reviewedAt: new Date().toISOString(),
          },
        };
      });
      return { db: { ...s.db, observations } };
    });
  },

  updateThreshold: async (patch) => {
    const { mode, organizationId } = get();
    if (mode === "live" && organizationId) {
      await liveData.updateThresholdLive(organizationId, { ...get().outbreakThreshold, ...patch });
    }
    set((s) => ({ outbreakThreshold: { ...s.outbreakThreshold, ...patch } }));
  },

  addFarm: async (name) => {
    const { mode, organizationId } = get();
    if (mode === "live" && organizationId) {
      const farm = await liveData.createFarmLive(organizationId, name);
      set((s) => ({ db: { ...s.db, farms: [...s.db.farms, farm] } }));
      return farm;
    }
    const farm: Farm = { id: "FARM-" + Date.now(), name, farmerId: "F1", region: "" };
    set((s) => ({ db: { ...s.db, farms: [...s.db.farms, farm] } }));
    return farm;
  },

  addField: async (farmId, input) => {
    const { mode } = get();
    const [lat, lng] = approxCoordsForRegion(input.region);

    if (mode === "live") {
      const field = await liveData.createFieldLive(farmId, { ...input, lat, lng });
      set((s) => ({ db: { ...s.db, fields: [...s.db.fields, field] } }));
      return field;
    }

    const field: Field = {
      id: "FIELD-" + Date.now(),
      name: input.name,
      farmId,
      region: input.region,
      crop: "Maize",
      variety: input.variety,
      plantingDate: input.plantingDate,
      areaHa: input.areaHa,
      lat,
      lng,
    };
    set((s) => ({ db: { ...s.db, fields: [...s.db.fields, field] } }));
    return field;
  },

  pushToast: (message) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => get().dismissToast(id), 3000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function fieldsForFarmer(db: DB, farmerId: string) {
  const farmIds = db.farms.filter((f) => f.farmerId === farmerId).map((f) => f.id);
  return db.fields.filter((f) => farmIds.includes(f.farmId));
}

export function obsForField(db: DB, fieldId: string) {
  return db.observations.filter((o) => o.fieldId === fieldId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function detectOutbreaks(db: DB, threshold: OutbreakThresholdConfig) {
  const now = Date.now();
  const groups: Record<string, { region: string; diseaseId: string; diseaseName: string; fields: Set<string>; obs: Observation[] }> = {};
  db.observations.forEach((o) => {
    if (o.diseaseId === "healthy") return;
    const ageDays = (now - new Date(o.createdAt).getTime()) / 86400000;
    if (ageDays > threshold.windowDays) return;
    const key = o.region + "|" + o.diseaseId;
    if (!groups[key]) groups[key] = { region: o.region, diseaseId: o.diseaseId, diseaseName: o.diseaseName, fields: new Set(), obs: [] };
    groups[key].fields.add(o.fieldId);
    groups[key].obs.push(o);
  });
  return Object.values(groups)
    .filter((g) => g.fields.size >= threshold.minFields || g.obs.length >= threshold.minObservations)
    .map((g) => {
      const half = g.obs.filter((o) => (now - new Date(o.createdAt).getTime()) / 86400000 < threshold.windowDays / 2).length;
      const trend = half > g.obs.length / 2 ? "Increasing" : "Stable";
      return { region: g.region, diseaseId: g.diseaseId, diseaseName: g.diseaseName, fieldCount: g.fields.size, obsCount: g.obs.length, trend };
    })
    .sort((a, b) => b.obsCount - a.obsCount);
}
