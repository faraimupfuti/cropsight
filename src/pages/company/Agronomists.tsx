import { useStore, AGRONOMISTS } from "@/lib/store";
import { Tag } from "@/components/ui/Tag";

export default function CompanyAgronomists() {
  const db = useStore((s) => s.db);
  const rows = AGRONOMISTS.map((a) => ({
    ...a,
    caseload: db.observations.filter((o) => o.review && o.review.reviewer.includes(a.name.split(" ").slice(-1)[0])).length,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Manage Agronomists</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>{rows.length} agronomists active in this organisation</p>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Name</th><th>Region</th><th>Reviews completed</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.name}>
                <td className="font-medium">{a.name}</td>
                <td>{a.region}</td>
                <td className="font-mono">{a.caseload}</td>
                <td><Tag variant="confirmed">Active</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
