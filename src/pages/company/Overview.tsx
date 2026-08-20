import { useStore } from "@/lib/store";
import { REGIONS } from "@/lib/mockData";
import { DistributionPie, SeverityBar, TrendLine, RegionBar } from "@/components/charts/Charts";

export default function CompanyOverview() {
  const db = useStore((s) => s.db);
  const user = useStore((s) => s.user);
  const obs = db.observations;

  const k = {
    farmers: db.farmers.length,
    farms: db.farms.length,
    fields: db.fields.length,
    imagesAnalyzed: obs.length,
    diseasesDetected: obs.filter((o) => o.diseaseId !== "healthy").length,
    pendingReview: obs.filter((o) => o.status === "pending").length,
    highRisk: db.fields.filter((f) => {
      const fieldObs = obs.filter((o) => o.fieldId === f.id);
      const latest = fieldObs[fieldObs.length - 1];
      return latest && latest.severity === "Severe";
    }).length,
  };

  const distMap: Record<string, number> = {};
  obs.forEach((o) => { distMap[o.diseaseName] = (distMap[o.diseaseName] || 0) + 1; });
  const distData = Object.entries(distMap).map(([name, value]) => ({ name, value }));

  const sevMap: Record<string, number> = { Mild: 0, Moderate: 0, Severe: 0 };
  obs.forEach((o) => { if (o.severity) sevMap[o.severity]++; });
  const sevData = Object.entries(sevMap).map(([name, value]) => ({ name, value }));

  const weekMap: Record<string, number> = {};
  obs.forEach((o) => {
    const d = new Date(o.createdAt);
    const wk = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}`;
    weekMap[wk] = (weekMap[wk] || 0) + 1;
  });
  const trendData = Object.entries(weekMap).map(([name, value]) => ({ name, value }));

  const regionMap: Record<string, number> = {};
  REGIONS.forEach((r) => (regionMap[r] = 0));
  obs.forEach((o) => { regionMap[o.region] = (regionMap[o.region] || 0) + 1; });
  const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

  const kpis: [string, number | string][] = [
    ["Total farmers", k.farmers], ["Total farms", k.farms], ["Total fields", k.fields], ["Images analysed", k.imagesAnalyzed],
    ["Diseases detected", k.diseasesDetected], ["Pending reviews", k.pendingReview], ["High-risk fields", k.highRisk], ["Regions active", REGIONS.length],
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{user?.org}</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Organisation-wide disease intelligence · demo data</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {kpis.map(([l, v]) => (
          <div key={l} className="card p-4">
            <div className="text-2xl font-semibold font-mono">{v}</div>
            <div className="text-xs mt-1" style={{ color: "#4A4E42" }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="card p-5">
          <div className="font-semibold text-sm mb-3">Disease distribution</div>
          <DistributionPie data={distData} />
        </div>
        <div className="card p-5">
          <div className="font-semibold text-sm mb-3">Severity distribution</div>
          <SeverityBar data={sevData} />
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="font-semibold text-sm mb-3">Disease trend (recent weeks)</div>
        <TrendLine data={trendData} />
      </div>

      <div className="card p-5">
        <div className="font-semibold text-sm mb-3">Prevalence by region</div>
        <RegionBar data={regionData} />
      </div>
    </div>
  );
}
