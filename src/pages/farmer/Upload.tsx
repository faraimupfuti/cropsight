import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useStore, fieldsForFarmer } from "@/lib/store";
import { fileToBase64, runPrediction, validateImageFile, localMockPrediction, type PredictionResponse } from "@/lib/mlClient";
import { DISEASE_KB } from "@/lib/diseaseData";
import { SeverityTag } from "@/components/ui/Tag";
import { fmtPct } from "@/lib/format";
import type { Observation, Severity } from "@/lib/types";

type Stage = "idle" | "analyzing" | "result" | "error";

function toTitleSeverity(s: string | null | undefined): Severity | null {
  if (!s) return null;
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Severity;
}

// Farmer id used for the demo-mode dataset only; in live mode the field
// list already comes pre-scoped to the signed-in farmer via RLS.
const DEMO_FARMER_ID = "F1";

export default function FarmerUpload() {
  const db = useStore((s) => s.db);
  const mode = useStore((s) => s.mode);
  const accessToken = useStore((s) => s.accessToken);
  const addObservation = useStore((s) => s.addObservation);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fields = mode === "live" ? db.fields : fieldsForFarmer(db, DEMO_FARMER_ID);

  const [fieldId, setFieldId] = useState(params.get("fieldId") || fields[0]?.id);
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [savedObs, setSavedObs] = useState<Observation | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      setStage("error");
      return;
    }

    const { base64, dataUrl } = await fileToBase64(file);
    setPreview(dataUrl);
    setStage("analyzing");

    try {
      let prediction: PredictionResponse;
      try {
        prediction = await runPrediction(base64, {
          cropName: "Maize",
          fieldId: mode === "live" ? fieldId : undefined,
          accessToken: mode === "live" ? accessToken ?? undefined : undefined,
        });
      } catch (fetchErr) {
        // In demo mode, the Netlify Function may not be running at all
        // (e.g. plain `vite dev`/`vite preview`) — degrade gracefully so
        // the product still works with zero backend. In live mode, a
        // failure here is real and should surface, not be silently
        // papered over with a fake result.
        if (mode === "demo") {
          prediction = localMockPrediction();
        } else {
          throw fetchErr;
        }
      }

      const field = db.fields.find((f) => f.id === fieldId)!;
      const observation: Observation = prediction.persisted && prediction.observation
        ? {
            id: prediction.observation.id,
            fieldId: prediction.observation.fieldId,
            farmId: field.farmId,
            farmerId: db.farms.find((x) => x.id === field.farmId)?.farmerId ?? "",
            region: field.region,
            crop: "Maize",
            diseaseId: prediction.diseaseCode,
            diseaseName: prediction.prediction,
            confidence: prediction.confidence,
            severity: toTitleSeverity(prediction.severity),
            modelVersion: prediction.model_version,
            createdAt: prediction.observation.createdAt,
            status: "pending",
            review: null,
            lat: field.lat,
            lng: field.lng,
            imagePreview: prediction.observation.imagePreview ?? dataUrl,
          }
        : {
            id: "OBS-NEW-" + Date.now(),
            fieldId: field.id,
            farmId: field.farmId,
            farmerId: db.farms.find((x) => x.id === field.farmId)?.farmerId ?? "",
            region: field.region,
            crop: "Maize",
            diseaseId: prediction.diseaseCode,
            diseaseName: prediction.prediction,
            confidence: prediction.confidence,
            severity: toTitleSeverity(prediction.severity),
            modelVersion: prediction.model_version,
            createdAt: new Date().toISOString(),
            status: "pending",
            review: null,
            lat: field.lat,
            lng: field.lng,
            imagePreview: dataUrl,
          };

      addObservation(observation);
      setSavedObs(observation);
      setResult(prediction);
      setStage("result");
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong analysing that photo. Please try again.");
      setStage("error");
    }
  }

  const kb = savedObs ? DISEASE_KB[savedObs.diseaseId] : null;

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-1">Check My Crop</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Take or upload a clear photo of the affected leaf.</p>

      {stage === "idle" && fields.length === 0 && (
        <div className="card p-6 text-sm" style={{ color: "#4A4E42" }}>
          You don't have any fields yet.{" "}
          <button className="underline font-semibold" style={{ color: "#006838" }} onClick={() => navigate("/app/farmer/fields")}>
            Add a field
          </button>{" "}
          before checking a crop.
        </div>
      )}

      {stage === "idle" && fields.length > 0 && (
        <div className="card p-6">
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4E42" }}>Field</label>
          <select className="mb-4" value={fieldId} onChange={(e) => setFieldId(e.target.value)}>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4E42" }}>Crop</label>
          <select className="mb-5" disabled><option>Maize</option></select>
          <div className="border-2 border-dashed rounded-xl p-8 text-center" style={{ borderColor: "#E2E0D4" }}>
            <div className="text-sm mb-3" style={{ color: "#4A4E42" }}>Add a photo of the leaf</div>
            <div className="flex justify-center gap-3">
              <label className="btn-primary px-4 py-2.5 text-sm cursor-pointer">
                Take Photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              </label>
              <label className="btn-secondary px-4 py-2.5 text-sm cursor-pointer">
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <div className="text-[11px] mt-3" style={{ color: "#7C8B72" }}>JPEG, PNG, or WebP · up to 8MB</div>
          </div>
        </div>
      )}

      {stage === "analyzing" && (
        <div className="card p-6 text-center">
          <div className="scan-line rounded-lg h-56 mb-5 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />
          <div className="font-semibold text-sm mb-1">Analysing image…</div>
          <div className="text-xs" style={{ color: "#4A4E42" }}>Running maize disease inference</div>
        </div>
      )}

      {stage === "error" && (
        <div className="card p-6">
          <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "#FAEAE6", color: "#AA3626" }}>{errorMsg}</div>
          <button className="btn-secondary w-full py-2.5 text-sm" onClick={() => { setStage("idle"); setErrorMsg(null); }}>Try again</button>
        </div>
      )}

      {stage === "result" && result && savedObs && (
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "#4A4E42" }}>Crop Health Assessment</div>
          <div className="rounded-lg h-48 mb-4 bg-cover bg-center" style={{ backgroundImage: `url(${savedObs.imagePreview})` }} />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Crop</div><div className="font-semibold text-sm">Maize</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Field</div><div className="font-semibold text-sm">{db.fields.find((f) => f.id === savedObs.fieldId)?.name}</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>AI Assessment</div><div className="font-semibold text-sm">{savedObs.diseaseName}</div></div>
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Confidence</div><div className="font-semibold text-sm font-mono">{fmtPct(savedObs.confidence)}</div></div>
            {savedObs.severity && (
              <div>
                <div className="text-xs" style={{ color: "#4A4E42" }}>Severity</div>
                <SeverityTag severity={savedObs.severity} />
              </div>
            )}
            <div><div className="text-xs" style={{ color: "#4A4E42" }}>Model version</div><div className="font-semibold text-sm font-mono">{savedObs.modelVersion}</div></div>
          </div>

          <div className="p-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2" style={{ background: "#FBF0DD", color: "#C2790E" }}>
            ⏳ Status: Pending agronomist verification
          </div>

          {result.severity_source === "confidence_heuristic" && (
            <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "#F0EEE3", color: "#4A4E42" }}>
              <strong>About the severity shown above:</strong> the model didn't report a severity estimate directly, so this is derived from how confident the model is in its diagnosis — not a direct measure of how bad the infection is. Treat it as a rough signal only, and rely on the agronomist's assessment for anything that affects a field decision.
            </div>
          )}

          {result.source === "mock" && (
            <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "#E9F0F6", color: "#2A5C8A" }}>
              This result used the demo fallback model{result.upstream_error ? ` (${result.upstream_error})` : ""} — the live inference endpoint isn't reachable yet. See README for wiring up ML_SERVICE_URL / ML_API_KEY.
            </div>
          )}

          {mode === "live" && !result.persisted && (
            <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "#FAEAE6", color: "#AA3626" }}>
              This result was generated but could not be saved to your account{result.upstream_error ? `: ${result.upstream_error}` : "."} It will disappear on refresh — please try again.
            </div>
          )}

          <div className="p-3 rounded-lg text-xs mb-4" style={{ background: "#F0EEE3", color: "#4A4E42" }}>
            <strong>Why CropSight thinks this:</strong> Explainability (highlighting the specific leaf regions that informed the prediction) is not yet implemented. This result is a statistical estimate, not a confirmed diagnosis.
          </div>

          {kb && (
            <div className="border-t pt-4 mt-2" style={{ borderColor: "#E2E0D4" }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "#4A4E42" }}>About {kb.name}</div>
              <div className="text-xs" style={{ color: "#4A4E42" }}>{kb.description}</div>
            </div>
          )}

          <button
            className="btn-primary w-full py-2.5 text-sm mt-5"
            onClick={() => {
              pushToast("Observation saved");
              navigate("/app/farmer/history");
            }}
          >
            Done — view history
          </button>
        </div>
      )}
    </div>
  );
}
