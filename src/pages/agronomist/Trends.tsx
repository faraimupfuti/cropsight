import { useStore } from "@/lib/store";
import { SeverityBar } from "@/components/charts/Charts";

export default function AgronomistTrends() {
  const db = useStore((s) => s.db);
  const reviewed = db.observations.filter((o) => o.review);
  const byDisease: Record<string, number> = {};
  reviewed.forEach((o) => { byDisease[o.diseaseName] = (byDisease[o.diseaseName] || 0) + 1; });
  const data = Object.entries(byDisease).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Disease Trends</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Based on {reviewed.length} agronomist-reviewed observations</p>
      <div className="card p-5">
        <SeverityBar data={data} />
      </div>
    </div>
  );
}
