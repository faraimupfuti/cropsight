import { useStore, fieldsForFarmer, obsForField } from "@/lib/store";
import { SeverityTag, StatusTag } from "@/components/ui/Tag";
import { fmtDate, fmtPct } from "@/lib/format";

export default function FarmerHistory() {
  const db = useStore((s) => s.db);
  const mode = useStore((s) => s.mode);
  const fields = mode === "live" ? db.fields : fieldsForFarmer(db, "F1");
  const allObs = fields.flatMap((f) => obsForField(db, f.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Observation History</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Date</th><th>Field</th><th>AI assessment</th><th>Confidence</th><th>Severity</th><th>Status</th></tr></thead>
          <tbody>
            {allObs.map((o) => (
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
