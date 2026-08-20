import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/lib/store";
import { DISEASE_CLASSES } from "@/lib/diseaseData";
import { fmtPct } from "@/lib/format";
import type { Severity } from "@/lib/types";

export default function AgronomistReviewDetail() {
  const { observationId } = useParams();
  const db = useStore((s) => s.db);
  const submitReview = useStore((s) => s.submitReview);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();

  const o = db.observations.find((x) => x.id === observationId);
  const [showCorrect, setShowCorrect] = useState(false);
  const [diseaseId, setDiseaseId] = useState(DISEASE_CLASSES[0].id);
  const [severity, setSeverity] = useState<Severity>("Moderate");
  const [notes, setNotes] = useState("");

  if (!o) return <div>Observation not found.</div>;
  const field = db.fields.find((f) => f.id === o.fieldId)!;
  const farmer = db.farmers.find((x) => x.id === o.farmerId);

  function save(status: "confirmed" | "corrected" | "uncertain") {
    if (status === "corrected") {
      submitReview(o!.id, "corrected", { diseaseId, severity, notes });
    } else {
      submitReview(o!.id, status);
    }
    pushToast("Review saved");
    navigate("/app/agronomist");
  }

  return (
    <div className="max-w-xl">
      <button className="btn-ghost text-xs mb-3" onClick={() => navigate("/app/agronomist")}>← Back to queue</button>
      <div className="card p-6">
        <div className="w-full h-48 rounded-lg mb-4 bg-cover bg-center" style={{ backgroundColor: "#EAE7D8", backgroundImage: o.imagePreview ? `url(${o.imagePreview})` : undefined }} />
        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Farmer</div><div className="font-semibold">{farmer?.name || "—"}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Field</div><div className="font-semibold">{field.name}, {o.region}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>AI diagnosis</div><div className="font-semibold">{o.diseaseName}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>AI confidence</div><div className="font-semibold font-mono">{fmtPct(o.confidence)}</div></div>
        </div>

        <div className="flex gap-2 mb-4">
          <button className="btn-primary flex-1 py-2.5 text-sm" onClick={() => save("confirmed")}>✓ Confirm</button>
          <button className="btn-secondary flex-1 py-2.5 text-sm" onClick={() => setShowCorrect((v) => !v)}>Correct</button>
          <button className="btn-secondary flex-1 py-2.5 text-sm" onClick={() => save("uncertain")}>? Uncertain</button>
        </div>

        {showCorrect && (
          <div className="space-y-3 border-t pt-4" style={{ borderColor: "#E2E0D4" }}>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Actual disease</label>
              <select value={diseaseId} onChange={(e) => setDiseaseId(e.target.value)}>
                {DISEASE_CLASSES.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {["Mild", "Moderate", "Severe"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Notes</label>
              <textarea rows={3} placeholder="Reviewer notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button className="btn-primary w-full py-2.5 text-sm" onClick={() => save("corrected")}>Save correction</button>
          </div>
        )}
      </div>
    </div>
  );
}
