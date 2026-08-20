import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { stripJpegExif } from "./lib/stripExif";

/**
 * POST /.netlify/functions/predict
 *
 * Body: { imageBase64: string, cropName?: string, fieldId?: string, accessToken?: string }
 *
 * Two modes, chosen automatically based on server-side configuration:
 *
 * 1. DEMO MODE (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set, or no
 *    fieldId/accessToken supplied): runs inference only and returns the
 *    prediction. The frontend builds a local, in-memory Observation from it
 *    (see src/pages/farmer/Upload.tsx) — nothing is persisted.
 *
 * 2. LIVE MODE (Supabase configured AND fieldId+accessToken supplied):
 *    - Verifies the caller's session token server-side (never trusts the
 *      client's claim of who they are)
 *    - Re-checks that the target field belongs to the caller's organization
 *      and that the caller is allowed to write to it — authorization is
 *      enforced here, not just via frontend routing or even RLS alone
 *    - Runs inference
 *    - Uploads the image to Supabase Storage
 *    - Inserts images / observations / predictions / audit_log rows using
 *      the service role key (which bypasses RLS — this is the ONE place
 *      that's appropriate, since authorization was just re-verified above)
 *    - Returns the fully persisted Observation, ready to render
 *
 * The API key and inference URL never reach the browser in either mode.
 */

const CLASS_LABEL_MAP: Record<string, { code: string; name: string; severityCapable: boolean }> = {
  "cercospora leaf spot": { code: "cercospora", name: "Cercospora Leaf Spot", severityCapable: true },
  "gray leaf spot": { code: "cercospora", name: "Cercospora Leaf Spot", severityCapable: true },
  "common rust": { code: "rust", name: "Common Rust", severityCapable: true },
  "northern leaf blight": { code: "nclb", name: "Northern Leaf Blight", severityCapable: true },
  "northern corn leaf blight": { code: "nclb", name: "Northern Leaf Blight", severityCapable: true },
  healthy: { code: "healthy", name: "Healthy", severityCapable: false },
};

function normalizeLabel(raw: string) {
  const key = raw.trim().toLowerCase();
  return CLASS_LABEL_MAP[key] ?? { code: "unknown", name: raw || "Other / Unknown", severityCapable: false };
}

/**
 * This is a fallback ONLY — it maps model *confidence* to severity, which
 * conflates two different things (how sure the model is vs. how bad the
 * disease actually is). It exists so the UI always has something to show,
 * not because confidence is a real severity signal. If your Roboflow
 * workflow outputs an actual severity/lesion-coverage estimate, wire it
 * up in parseWorkflowResponse() below instead — this function should only
 * ever run when the model gave us nothing better.
 */
function estimateSeverityFromConfidence(confidence: number): "mild" | "moderate" | "severe" {
  if (confidence >= 0.85) return "severe";
  if (confidence >= 0.65) return "moderate";
  return "mild";
}

interface ParsedPrediction {
  label: string;
  confidence: number;
  /** Only set if the workflow response itself provided a severity value — never derived from confidence here. */
  modelSeverity?: "mild" | "moderate" | "severe";
}

function normalizeModelSeverity(raw: unknown): "mild" | "moderate" | "severe" | undefined {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim().toLowerCase();
  if (key === "mild" || key === "low") return "mild";
  if (key === "moderate" || key === "medium") return "moderate";
  if (key === "severe" || key === "high") return "severe";
  return undefined;
}

function parseWorkflowResponse(json: any): ParsedPrediction | null {
  try {
    const outputs = json?.outputs?.[0];
    const predBlock = outputs?.predictions?.predictions ?? outputs?.model_predictions?.predictions ?? outputs?.predictions;
    if (Array.isArray(predBlock) && predBlock.length > 0) {
      const top = [...predBlock].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
      const label = top.class ?? top.class_name ?? top.top ?? top.label;
      // Some workflows may output a severity/lesion-coverage field directly on
      // the top prediction (e.g. `severity`, `severity_class`) — use it if
      // present, rather than falling back to the confidence heuristic.
      const modelSeverity = normalizeModelSeverity(top.severity ?? top.severity_class ?? outputs?.severity);
      if (label) return { label, confidence: top.confidence ?? 0.6, modelSeverity };
    }
    if (outputs?.top) {
      return { label: outputs.top, confidence: outputs.confidence ?? 0.6, modelSeverity: normalizeModelSeverity(outputs.severity) };
    }
    if (json?.class_name) {
      return { label: json.class_name, confidence: json.confidence ?? 0.6, modelSeverity: normalizeModelSeverity(json.severity) };
    }
  } catch {
    // fall through
  }
  return null;
}

function mockPrediction() {
  const classes = [
    { code: "healthy", name: "Healthy", severityCapable: false, weight: 0.3 },
    { code: "nclb", name: "Northern Leaf Blight", severityCapable: true, weight: 0.26 },
    { code: "rust", name: "Common Rust", severityCapable: true, weight: 0.24 },
    { code: "cercospora", name: "Cercospora Leaf Spot", severityCapable: true, weight: 0.2 },
  ];
  const r = Math.random();
  let acc = 0;
  let chosen = classes[0];
  for (const c of classes) {
    acc += c.weight;
    if (r <= acc) {
      chosen = c;
      break;
    }
  }
  const confidence = +(0.55 + Math.random() * 0.4).toFixed(2);
  return {
    prediction: chosen.name,
    diseaseCode: chosen.code,
    confidence,
    severity: chosen.severityCapable ? estimateSeverityFromConfidence(confidence) : null,
    severity_source: chosen.severityCapable ? ("confidence_heuristic" as const) : null,
    model_version: "mock-fallback",
    recommendation_status: "agronomist_review_required" as const,
    source: "mock" as const,
  };
}

// Very simple in-memory rate limiter. Resets whenever the function's
// execution environment recycles, so this is a soft speed-bump, not a
// hard guarantee — for real distributed rate limiting across concurrent
// function instances, back this with Upstash Redis or similar. Documented
// as a known limitation in the README.
const requestLog = new Map<string, number[]>();
function isRateLimited(key: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  hits.push(now);
  requestLog.set(key, hits);
  return hits.length > maxPerMinute;
}

interface PredictionResult {
  prediction: string;
  diseaseCode: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | null;
  /** "model": the workflow itself reported severity. "confidence_heuristic": derived from confidence as a fallback, not a real severity signal — the frontend shows a caveat when this is the source. */
  severity_source: "model" | "confidence_heuristic" | null;
  model_version: string;
  recommendation_status: "agronomist_review_required";
  source: "live" | "mock";
  upstream_error?: string;
}

async function runInference(imageBase64: string): Promise<PredictionResult> {
  const serviceUrl = process.env.ML_SERVICE_URL;
  const apiKey = process.env.ML_API_KEY;

  if (!serviceUrl || !apiKey || serviceUrl.includes("localhost")) {
    return mockPrediction();
  }

  try {
    const res = await fetch(serviceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, inputs: { image: { type: "base64", value: imageBase64 } } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ...mockPrediction(), upstream_error: `Inference service responded ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json();
    const parsed = parseWorkflowResponse(json);
    if (!parsed) {
      return {
        ...mockPrediction(),
        upstream_error:
          "Could not parse inference response shape — check CLASS_LABEL_MAP / parseWorkflowResponse in netlify/functions/predict.ts against your workflow's real output.",
      };
    }

    const mapped = normalizeLabel(parsed.label);
    const confidence = Math.max(0, Math.min(1, parsed.confidence));
    const severity = mapped.severityCapable ? parsed.modelSeverity ?? estimateSeverityFromConfidence(confidence) : null;
    return {
      prediction: mapped.name,
      diseaseCode: mapped.code,
      confidence,
      severity,
      severity_source: mapped.severityCapable ? (parsed.modelSeverity ? "model" : "confidence_heuristic") : null,
      model_version: "cropsight-model",
      recommendation_status: "agronomist_review_required",
      source: "live",
    };
  } catch (err: any) {
    return { ...mockPrediction(), upstream_error: `Request to inference service failed: ${err?.message || "unknown error"}` };
  }
}

function detectImageType(imageBase64: string): { mime: string; ext: string } | null {
  const head = Buffer.from(imageBase64.slice(0, 16), "base64");
  if (head[0] === 0xff && head[1] === 0xd8) return { mime: "image/jpeg", ext: "jpg" };
  if (head[0] === 0x89 && head[1] === 0x50) return { mime: "image/png", ext: "png" };
  if (head[8] === 0x57 && head[9] === 0x45) return { mime: "image/webp", ext: "webp" };
  return null;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = Buffer.from(base64, "base64");
  return new Uint8Array(binary);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const clientKey = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (isRateLimited(clientKey)) {
    return { statusCode: 429, body: JSON.stringify({ error: "Too many requests — please wait a moment and try again." }) };
  }

  let body: { imageBase64?: string; cropName?: string; fieldId?: string; accessToken?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!body.imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: "imageBase64 is required" }) };
  }

  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 8_000_000);
  const approxBytes = Math.ceil((body.imageBase64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    return { statusCode: 413, body: JSON.stringify({ error: "Image too large" }) };
  }
  // Reject anything that isn't plausibly image bytes (cheap magic-byte check for JPEG/PNG/WebP)
  const detectedType = detectImageType(body.imageBase64);
  if (!detectedType) {
    return { statusCode: 415, body: JSON.stringify({ error: "Unsupported image format — expected JPEG, PNG, or WebP" }) };
  }

  const prediction = await runInference(body.imageBase64);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const canPersist = Boolean(supabaseUrl && serviceRoleKey && body.fieldId && body.accessToken);

  if (!canPersist) {
    return { statusCode: 200, body: JSON.stringify(prediction) };
  }

  try {
    const admin = createClient(supabaseUrl as string, serviceRoleKey as string);

    // 1. Verify the caller's identity from their access token — never trust
    //    a client-supplied user id.
    const { data: userResult, error: userErr } = await admin.auth.getUser(body.accessToken as string);
    if (userErr || !userResult.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired session" }) };
    }
    const userId = userResult.user.id;

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr || !profile?.organization_id) {
      return { statusCode: 403, body: JSON.stringify({ error: "No organization associated with this account" }) };
    }

    // 2. Re-verify the target field actually belongs to the caller's
    //    organization, and the caller owns the farm (or is elevated).
    //    This mirrors — and backs up — the RLS policy, per the platform's
    //    "never rely on frontend alone" requirement.
    const { data: field, error: fieldErr } = await admin
      .from("fields")
      .select("id, latitude, longitude, farms(id, organization_id, owner_id)")
      .eq("id", body.fieldId)
      .maybeSingle();
    const farm: any = field?.farms;
    const elevated = ["agronomist", "company_admin", "platform_admin"].includes(profile.role);
    if (fieldErr || !field || !farm || farm.organization_id !== profile.organization_id || (!elevated && farm.owner_id !== userId)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Not authorized to add an observation for this field" }) };
    }

    // 3. Resolve the predicted disease's crop_disease_id and the active model_version_id
    const { data: diseaseRow } = await admin.from("crop_diseases").select("id").eq("code", prediction.diseaseCode).maybeSingle();
    const { data: modelRow } = await admin.from("model_versions").select("id").eq("name", prediction.model_version).maybeSingle();

    // 4. Upload the image, preserving its real content type/extension.
    //    For JPEGs, strip EXIF metadata first — phone cameras commonly
    //    embed GPS coordinates there, which is a privacy concern
    //    independent of the field's own registered location.
    const imageId = crypto.randomUUID();
    const storagePath = `${profile.organization_id}/${imageId}.${detectedType.ext}`;
    let bytes = base64ToUint8Array(body.imageBase64);
    if (detectedType.mime === "image/jpeg") {
      bytes = stripJpegExif(Buffer.from(bytes));
    }
    const { error: uploadErr } = await admin.storage.from("observation-images").upload(storagePath, bytes, {
      contentType: detectedType.mime,
      upsert: false,
    });
    if (uploadErr) {
      return { statusCode: 500, body: JSON.stringify({ error: `Image upload failed: ${uploadErr.message}` }) };
    }

    const { data: imageRow, error: imageInsertErr } = await admin
      .from("images")
      .insert({
        id: imageId,
        storage_bucket: "observation-images",
        storage_path: storagePath,
        mime_type: detectedType.mime,
        size_bytes: bytes.byteLength,
        uploaded_by: userId,
      })
      .select()
      .single();
    if (imageInsertErr) {
      return { statusCode: 500, body: JSON.stringify({ error: `Image record failed: ${imageInsertErr.message}` }) };
    }

    // 5. Insert the observation (final disease null until agronomist review) + prediction
    const { data: obsRow, error: obsInsertErr } = await admin
      .from("observations")
      .insert({
        organization_id: profile.organization_id,
        field_id: body.fieldId,
        image_id: imageRow.id,
        review_status: "pending",
        latitude: field.latitude,
        longitude: field.longitude,
      })
      .select()
      .single();
    if (obsInsertErr) {
      return { statusCode: 500, body: JSON.stringify({ error: `Observation record failed: ${obsInsertErr.message}` }) };
    }

    if (diseaseRow && modelRow) {
      await admin.from("predictions").insert({
        observation_id: obsRow.id,
        crop_disease_id: diseaseRow.id,
        confidence: prediction.confidence,
        severity: prediction.severity,
        model_version_id: modelRow.id,
        source: prediction.source,
      });
    }

    await admin.from("audit_log").insert({
      organization_id: profile.organization_id,
      user_id: userId,
      action: "observation.create",
      metadata: { field_id: body.fieldId, disease_code: prediction.diseaseCode, source: prediction.source },
    });

    const { data: signedUrl } = await admin.storage.from("observation-images").createSignedUrl(storagePath, 60 * 30);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...prediction,
        persisted: true,
        observation: {
          id: obsRow.id,
          fieldId: body.fieldId,
          createdAt: obsRow.created_at,
          status: "pending",
          imagePreview: signedUrl?.signedUrl,
        },
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ...prediction, persisted: false, upstream_error: `Persistence failed: ${err?.message || "unknown error"}` }),
    };
  }
};
