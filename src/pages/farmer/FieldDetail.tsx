import { useNavigate, useParams } from "react-router-dom";
import { useStore, obsForField } from "@/lib/store";
import { SeverityTag, StatusTag } from "@/components/ui/Tag";
import { fmtDate, fmtPct } from "@/lib/format";

export default function FieldDetail() {
  const { fieldId } = useParams();
  const db = useStore((s) => s.db);
  const navigate = useNavigate();
  const field = db.fields.find((f) => f.id === fieldId);
  if (!field) return <div>Field not found.</div>;
  const obs = obsForField(db, field.id);

  function dotColor(o: (typeof obs)[number]) {
    if (o.diseaseId === "healthy") return "#006838";
    if (o.severity === "Severe") return "#AA3626";
    if (o.severity === "Moderate") return "#C2790E";
    return "#7C8B72";
  }

  return (
    <div>
      <button className="btn-ghost text-xs mb-3" onClick={() => navigate("/app/farmer/fields")}>← Back to fields</button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">{field.name}</h1>
          <p className="text-sm" style={{ color: "#4A4E42" }}>Maize · {field.variety} · {field.areaHa} ha · planted {fmtDate(field.plantingDate)}</p>
        </div>
        <button className="btn-primary px-4 py-2.5 text-sm" onClick={() => navigate(`/app/farmer/upload?fieldId=${field.id}`)}>📷 Check this field</button>
      </div>

      <div className="card p-5 mb-6">
        <div className="font-semibold text-sm mb-4">Field health timeline</div>
        {obs.length === 0 ? (
          <div className="text-sm" style={{ color: "#4A4E42" }}>No observations recorded yet.</div>
        ) : (
          <div className="flex overflow-x-auto gap-0 pb-2">
            {obs.map((o, i) => (
              <div key={o.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-center w-32">
                  <div className="text-[11px] font-mono mb-1.5" style={{ color: "#4A4E42" }}>{fmtDate(o.createdAt)}</div>
                  <div className="w-3 h-3 rounded-full" style={{ background: dotColor(o) }} />
                  <div className="text-[11px] mt-1.5 text-center leading-tight px-1">{o.diseaseName}</div>
                </div>
                {i < obs.length - 1 && <div className="h-[1.5px] w-8" style={{ background: "#E2E0D4" }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Date</th><th>AI assessment</th><th>Confidence</th><th>Severity</th><th>Status</th></tr></thead>
          <tbody>
            {[...obs].reverse().map((o) => (
              <tr key={o.id}>
                <td className="font-mono">{fmtDate(o.createdAt)}</td>
                <td>{o.diseaseName}</td>
                <td className="font-mono">{fmtPct(o.confidence)}</td>
                <td><SeverityTag severity={o.severity} /></td>
                <td><StatusTag status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
