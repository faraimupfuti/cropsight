import { requireSupabase } from "../supabaseClient";
import type { Farm, Farmer, Field, Observation, OutbreakThresholdConfig, Review, Severity } from "../types";

/**
 * NOTE ON TESTING: the RLS policies and schema this queries against were
 * validated against a real local Postgres instance (see supabase/migrations
 * and the project README). The exact PostgREST embedded-select syntax below
 * follows Supabase's documented conventions, but hasn't been exercised
 * against a live hosted Supabase project from this environment — smoke-test
 * it against your project and adjust embed names if PostgREST reports an
 * ambiguous- or missing-relationship error.
 */

const IMAGE_SIGNED_URL_TTL = 60 * 30; // 30 minutes

function dbSeverityToApp(s: string | null): Severity | null {
  if (!s) return null;
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Severity;
}

export interface OrgSnapshot {
  farmers: Farmer[];
  farms: Farm[];
  fields: Field[];
  observations: Observation[];
}

export async function fetchOrgSnapshot(organizationId: string): Promise<OrgSnapshot> {
  const sb = requireSupabase();

  const [{ data: profiles, error: profilesErr }, { data: farmsRaw, error: farmsErr }, { data: fieldsRaw, error: fieldsErr }, { data: diseasesRaw, error: diseasesErr }] =
    await Promise.all([
      sb.from("profiles").select("id, full_name, role, region").eq("organization_id", organizationId),
      sb.from("farms").select("id, name, owner_id").eq("organization_id", organizationId),
      sb.from("fields").select("id, name, farm_id, variety, planting_date, area_hectares, latitude, longitude, region, crops(name)").in(
        "farm_id",
        (await sb.from("farms").select("id").eq("organization_id", organizationId)).data?.map((f) => f.id) ?? []
      ),
      sb.from("crop_diseases").select("id, code, name"),
    ]);

  if (profilesErr) throw profilesErr;
  if (farmsErr) throw farmsErr;
  if (fieldsErr) throw fieldsErr;
  if (diseasesErr) throw diseasesErr;

  const diseaseById = new Map((diseasesRaw ?? []).map((d: any) => [d.id, { code: d.code, name: d.name }]));

  const farmers: Farmer[] = (profiles ?? [])
    .filter((p: any) => p.role === "farmer")
    .map((p: any) => ({ id: p.id, name: p.full_name, region: p.region ?? "", orgId: organizationId }));

  const fieldIds = (fieldsRaw ?? []).map((f: any) => f.id);

  const farms: Farm[] = (farmsRaw ?? []).map((f: any) => {
    const firstField = (fieldsRaw ?? []).find((fl: any) => fl.farm_id === f.id);
    return { id: f.id, name: f.name, farmerId: f.owner_id, region: firstField?.region ?? "" };
  });

  const fields: Field[] = (fieldsRaw ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    farmId: f.farm_id,
    region: f.region ?? "",
    crop: f.crops?.name ?? "Maize",
    variety: f.variety ?? "",
    plantingDate: f.planting_date ?? "",
    areaHa: f.area_hectares ?? 0,
    lat: f.latitude ?? 0,
    lng: f.longitude ?? 0,
  }));

  let observations: Observation[] = [];
  if (fieldIds.length > 0) {
    const { data: obsRaw, error: obsErr } = await sb
      .from("observations")
      .select(
        `id, field_id, organization_id, severity, review_status, latitude, longitude, created_at,
         predictions(confidence, severity, source, crop_disease_id, model_versions(name)),
         agronomist_reviews(reviewer_id, status, corrected_disease_id, corrected_severity, notes, reviewed_at, profiles(full_name)),
         images(storage_bucket, storage_path)`
      )
      .in("field_id", fieldIds)
      .order("created_at", { ascending: false });

    if (obsErr) throw obsErr;

    observations = await Promise.all(
      (obsRaw ?? []).map(async (o: any) => {
        const field = (fieldsRaw ?? []).find((f: any) => f.id === o.field_id);
        const farm = (farmsRaw ?? []).find((f: any) => f.id === field?.farm_id);
        const prediction = Array.isArray(o.predictions) ? o.predictions[0] : o.predictions;
        const reviewRaw = Array.isArray(o.agronomist_reviews) ? o.agronomist_reviews[0] : o.agronomist_reviews;
        const image = Array.isArray(o.images) ? o.images[0] : o.images;
        const disease = prediction ? diseaseById.get(prediction.crop_disease_id) : null;

        let imagePreview: string | undefined;
        if (image?.storage_path) {
          const { data: signed } = await sb.storage
            .from(image.storage_bucket || "observation-images")
            .createSignedUrl(image.storage_path, IMAGE_SIGNED_URL_TTL);
          imagePreview = signed?.signedUrl;
        }

        const review: Review | null = reviewRaw
          ? {
              reviewer: reviewRaw.profiles?.full_name ?? "Agronomist",
              status: reviewRaw.status,
              finalDiseaseId: reviewRaw.corrected_disease_id ? diseaseById.get(reviewRaw.corrected_disease_id)?.code ?? null : null,
              finalSeverity: dbSeverityToApp(reviewRaw.corrected_severity),
              notes: reviewRaw.notes ?? "",
              reviewedAt: reviewRaw.reviewed_at,
            }
          : null;

        return {
          id: o.id,
          fieldId: o.field_id,
          farmId: field?.farm_id ?? "",
          farmerId: farm?.owner_id ?? "",
          region: field?.region ?? "",
          crop: "Maize",
          diseaseId: disease?.code ?? "unknown",
          diseaseName: disease?.name ?? "Other / Unknown",
          confidence: prediction?.confidence ?? 0,
          severity: dbSeverityToApp(prediction?.severity ?? o.severity),
          modelVersion: prediction?.model_versions?.name ?? "unknown",
          createdAt: o.created_at,
          status: o.review_status,
          review,
          lat: o.latitude ?? field?.latitude ?? 0,
          lng: o.longitude ?? field?.longitude ?? 0,
          imagePreview,
        } as Observation;
      })
    );
  }

  return { farmers, farms, fields, observations };
}

export async function submitReviewLive(
  observationId: string,
  status: "confirmed" | "corrected" | "uncertain",
  correction?: { diseaseCode: string; severity: Severity; notes: string }
) {
  const sb = requireSupabase();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  let finalDiseaseId: string | null = null;
  let finalSeverity: string | null = null;

  if (status === "corrected" && correction) {
    const { data: disease } = await sb.from("crop_diseases").select("id").eq("code", correction.diseaseCode).maybeSingle();
    finalDiseaseId = disease?.id ?? null;
    finalSeverity = correction.severity.toLowerCase();
  } else if (status === "confirmed") {
    // Carry over the AI's own prediction as the validated result — this
    // was previously left null on confirm, which meant every "Confirm"
    // (as opposed to "Correct") silently dropped the diagnosis instead of
    // recording it as validated.
    const { data: prediction } = await sb
      .from("predictions")
      .select("crop_disease_id, severity")
      .eq("observation_id", observationId)
      .order("inference_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    finalDiseaseId = prediction?.crop_disease_id ?? null;
    finalSeverity = prediction?.severity ?? null;
  }

  const { error: reviewErr } = await sb.from("agronomist_reviews").insert({
    observation_id: observationId,
    reviewer_id: userData.user.id,
    status,
    corrected_disease_id: finalDiseaseId,
    corrected_severity: finalSeverity,
    notes: correction?.notes ?? (status === "confirmed" ? "Confirmed as AI-predicted." : "Marked uncertain — follow-up scouting recommended."),
  });
  if (reviewErr) throw reviewErr;

  const { error: updateErr } = await sb
    .from("observations")
    .update({
      review_status: status === "uncertain" ? "pending" : status,
      crop_disease_id: status === "uncertain" ? undefined : finalDiseaseId,
      severity: status === "uncertain" ? undefined : finalSeverity,
    })
    .eq("id", observationId);
  if (updateErr) throw updateErr;
}

export async function fetchThresholdLive(organizationId: string): Promise<OutbreakThresholdConfig> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("outbreak_thresholds")
    .select("min_affected_fields, min_observations, window_days")
    .eq("organization_id", organizationId)
    .is("crop_disease_id", null)
    .maybeSingle();
  if (error) throw error;
  return {
    minFields: data?.min_affected_fields ?? 5,
    minObservations: data?.min_observations ?? 8,
    windowDays: data?.window_days ?? 21,
  };
}

export async function updateThresholdLive(organizationId: string, patch: Partial<OutbreakThresholdConfig>) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("outbreak_thresholds")
    .update({
      min_affected_fields: patch.minFields,
      min_observations: patch.minObservations,
      window_days: patch.windowDays,
    })
    .eq("organization_id", organizationId)
    .is("crop_disease_id", null);
  if (error) throw error;
}

export async function createFarmLive(organizationId: string, name: string): Promise<Farm> {
  const sb = requireSupabase();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data, error } = await sb
    .from("farms")
    .insert({ organization_id: organizationId, owner_id: userData.user.id, name })
    .select()
    .single();
  if (error) throw error;

  return { id: data.id, name: data.name, farmerId: data.owner_id, region: "" };
}

export interface NewFieldInput {
  name: string;
  variety: string;
  plantingDate: string;
  areaHa: number;
  region: string;
  lat: number;
  lng: number;
}

export async function createFieldLive(farmId: string, input: NewFieldInput): Promise<Field> {
  const sb = requireSupabase();

  const { data: cropRow, error: cropErr } = await sb.from("crops").select("id").eq("name", "Maize").maybeSingle();
  if (cropErr) throw cropErr;
  if (!cropRow) throw new Error("Maize crop is not configured in this database — run supabase/migrations/0003_seed_reference_data.sql");

  const { data, error } = await sb
    .from("fields")
    .insert({
      farm_id: farmId,
      crop_id: cropRow.id,
      name: input.name,
      variety: input.variety || null,
      planting_date: input.plantingDate || null,
      area_hectares: input.areaHa || null,
      latitude: input.lat,
      longitude: input.lng,
      region: input.region,
    })
    .select()
    .single();
  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    farmId: data.farm_id,
    region: data.region ?? "",
    crop: "Maize",
    variety: data.variety ?? "",
    plantingDate: data.planting_date ?? "",
    areaHa: data.area_hectares ?? 0,
    lat: data.latitude ?? 0,
    lng: data.longitude ?? 0,
  };
}
