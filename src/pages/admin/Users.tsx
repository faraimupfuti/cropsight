import { useStore, AGRONOMISTS } from "@/lib/store";

export default function AdminUsers() {
  const db = useStore((s) => s.db);
  const rows = [
    ...db.farmers.map((f) => ({ name: f.name, role: "Farmer", region: f.region, org: "Mash. Central Growers Co-op" })),
    ...AGRONOMISTS.map((a) => ({ name: a.name, role: "Agronomist", region: a.region, org: "AgriExtend Zimbabwe" })),
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Users</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>{rows.length} demo users across all organisations</p>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Region</th><th>Organisation</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="font-medium">{r.name}</td>
                <td>{r.role}</td>
                <td>{r.region}</td>
                <td>{r.org}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
