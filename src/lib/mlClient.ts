export interface PredictionResponse {
  prediction: string;
  diseaseCode: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | null;
  severity_source?: "model" | "confidence_heuristic" | null;
  model_version: string;
  recommendation_status: "agronomist_review_required";
  source?: "live" | "mock";
  upstream_error?: string;
  persisted?: boolean;
  observation?: {
    id: string;
    fieldId: string;
    createdAt: string;
    status: string;
    imagePreview?: string;
  };
}

/**
 * Sends an image (base64, no data-URL prefix) to the serverless predict
 * function. In live mode, pass fieldId + accessToken so the function can
 * authorize the write and persist the observation server-side (see
 * netlify/functions/predict.ts) — in demo mode, omit them and the function
 * returns a prediction only, which the caller turns into a local
 * in-memory Observation.
 */
export async function runPrediction(
  imageBase64: string,
  opts: { cropName?: string; fieldId?: string; accessToken?: string } = {}
): Promise<PredictionResponse> {
  const res = await fetch("/.netlify/functions/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      cropName: opts.cropName ?? "Maize",
      fieldId: opts.fieldId,
      accessToken: opts.accessToken,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Prediction request failed (${res.status})`);
  }
  return res.json();
}

export function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ base64, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 8_000_000;

/** Client-side validation — a fast, friendly check before the upload even starts. The server re-validates independently; this is not the security boundary. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "That image is larger than 8MB — please choose a smaller photo.";
  }
  return null;
}

/**
 * Local fallback used ONLY when the Netlify Function itself is unreachable
 * (e.g. running `vite dev`/`vite preview` without `netlify dev`, so
 * `/.netlify/functions/predict` 404s). This keeps demo mode fully
 * functional with zero backend. It is never used to mask a real failure
 * in live mode — see Upload.tsx, which only calls this when mode==='demo'.
 */
export function localMockPrediction(): PredictionResponse {
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
  const severity = chosen.severityCapable ? (confidence >= 0.85 ? "severe" : confidence >= 0.65 ? "moderate" : "mild") : null;
  return {
    prediction: chosen.name,
    diseaseCode: chosen.code,
    confidence,
    severity: severity as any,
    severity_source: chosen.severityCapable ? "confidence_heuristic" : null,
    model_version: "mock-fallback",
    recommendation_status: "agronomist_review_required",
    source: "mock",
  };
}
