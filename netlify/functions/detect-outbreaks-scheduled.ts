import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

/**
 * Runs every 6 hours (see `export const config` below). Computes potential
 * outbreaks per organization from recent observations and upserts them into
 * the `outbreaks` table, so the Company dashboard reads a precomputed,
 * server-maintained result instead of recalculating on every page load —
 * this is the "move outbreak detection to a scheduled job" hardening item
 * from the original README checklist.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (same as predict.ts).
 * No-ops quietly if they aren't set, so this is safe to deploy before
 * Supabase is configured.
 */
export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("[detect-outbreaks] Supabase not configured — skipping run.");
    return new Response("skipped: supabase not configured", { status: 200 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: orgs, error: orgsErr } = await admin.from("organizations").select("id");
  if (orgsErr) {
    console.error("[detect-outbreaks] failed to list organizations", orgsErr);
    return new Response("error", { status: 500 });
  }

  let totalFlagged = 0;

  for (const org of orgs ?? []) {
    const { data: threshold } = await admin
      .from("outbreak_thresholds")
      .select("min_affected_fields, min_observations, window_days")
      .eq("organization_id", org.id)
      .is("crop_disease_id", null)
      .maybeSingle();

    const minFields = threshold?.min_affected_fields ?? 5;
    const minObservations = threshold?.min_observations ?? 8;
    const windowDays = threshold?.window_days ?? 21;
    const windowStart = new Date(Date.now() - windowDays * 86400000).toISOString();

    const { data: obs, error: obsErr } = await admin
      .from("observations")
      .select("id, field_id, created_at, crop_disease_id, fields(region), predictions(crop_disease_id)")
      .eq("organization_id", org.id)
      .gte("created_at", windowStart);

    if (obsErr) {
      console.error(`[detect-outbreaks] org ${org.id} query failed`, obsErr);
      continue;
    }

    const groups = new Map<string, { region: string; diseaseId: string; fields: Set<string>; count: number }>();

    for (const o of obs ?? []) {
      const region = (o as any).fields?.region ?? "Unknown";
      const predictionDiseaseId = Array.isArray((o as any).predictions) ? (o as any).predictions[0]?.crop_disease_id : (o as any).predictions?.crop_disease_id;
      const diseaseId = o.crop_disease_id ?? predictionDiseaseId;
      if (!diseaseId) continue;

      const key = `${region}|${diseaseId}`;
      if (!groups.has(key)) groups.set(key, { region, diseaseId, fields: new Set(), count: 0 });
      const g = groups.get(key)!;
      g.fields.add(o.field_id);
      g.count += 1;
    }

    for (const g of groups.values()) {
      if (g.fields.size < minFields && g.count < minObservations) continue;

      totalFlagged += 1;
      await admin.from("outbreaks").insert({
        organization_id: org.id,
        region: g.region,
        crop_disease_id: g.diseaseId,
        status: "potential",
        affected_fields: g.fields.size,
        observation_count: g.count,
        window_start: windowStart,
        window_end: new Date().toISOString(),
      });
    }
  }

  console.log(`[detect-outbreaks] run complete — ${totalFlagged} organization/disease groups flagged`);
  return new Response(`ok: ${totalFlagged} flagged`, { status: 200 });
};

export const config: Config = {
  schedule: "0 */6 * * *", // every 6 hours
};
