import { useNavigate } from "react-router-dom";
import { useStore, fieldsForFarmer, obsForField } from "@/lib/store";
import { SeverityTag, StatusTag, Tag } from "@/components/ui/Tag";
import { fmtDate, fmtPct } from "@/lib/format";

export default function FarmerDashboard() {
  const db = useStore((s) => s.db);
  const mode = useStore((s) => s.mode);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const fields = mode === "live" ? db.fields : fieldsForFarmer(db, "F1");
  const allObs = fields.flatMap((f) => obsForField(db, f.id));
  const pending = allObs.filter((o) => o.status === "pending").length;
  const recent = [...allObs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Good day, {user?.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-sm" style={{ color: "#4A4E42" }}>{fields.length} fields · {allObs.length} past observations · {pending} pending review</p>
        </div>
        <button className="btn-primary px-5 py-3 text-sm" onClick={() => navigate("/app/farmer/upload")}>📷 Check My Crop</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {fields.length === 0 && (
          <div className="card p-6 text-sm md:col-span-3" style={{ color: "#4A4E42" }}>
            No fields yet.{" "}
            <button className="underline font-semibold" style={{ color: "#006838" }} onClick={() => navigate("/app/farmer/fields")}>
              Add your first field
            </button>{" "}
            to get started.
          </div>
        )}
        {fields.slice(0, 3).map((f) => {
          const obs = obsForField(db, f.id);
          const latest = obs[obs.length - 1];
          return (
            <div key={f.id} className="card p-4 cursor-pointer" onClick={() => navigate(`/app/farmer/fields/${f.id}`)}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-sm">{f.name}</div>
                {latest && (latest.diseaseId === "healthy" ? <Tag variant="healthy">Healthy</Tag> : <SeverityTag severity={latest.severity} />)}
              </div>
              <div className="text-xs" style={{ color: "#4A4E42" }}>{f.variety} · {f.areaHa} ha</div>
              <div className="text-xs mt-2" style={{ color: "#4A4E42" }}>
                {latest ? `Last check: ${fmtDate(latest.createdAt)} — ${latest.diseaseName}` : "No observations yet"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Recent observations</h2>
        <button className="btn-ghost text-xs" onClick={() => navigate("/app/farmer/history")}>View all →</button>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Date</th><th>Field</th><th>AI assessment</th><th>Confidence</th><th>Severity</th><th>Status</th></tr></thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id}>
                <td className="font-mono">{fmtDate(o.createdAt)}</td>
                <td>{db.fields.find((f) => f.id === o.fieldId)?.name}</td>
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
