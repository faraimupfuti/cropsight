import { useStore } from "@/lib/store";
import { MODEL_VERSION } from "@/lib/diseaseData";

export default function AdminOverview() {
  const db = useStore((s) => s.db);
  const obs = db.observations;
  const reviewed = obs.filter((o) => o.review && o.review.status !== "uncertain");
  const confirmed = reviewed.filter((o) => o.review!.status === "confirmed").length;
  const corrected = reviewed.filter((o) => o.review!.status === "corrected").length;
  const agreement = reviewed.length ? Math.round((confirmed / reviewed.length) * 100) : 0;

  const kpis: [string, number | string][] = [
    ["Organisations", 4], ["Total users", db.farmers.length + 7], ["Images uploaded", obs.length], ["Predictions generated", obs.length],
    ["Human-confirmed", confirmed], ["Human-corrected", corrected], ["Model agreement rate", agreement + "%"], ["Active model version", MODEL_VERSION],
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Platform Overview</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>System-wide analytics · demo data</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {kpis.map(([l, v]) => (
          <div key={l} className="card p-4">
            <div className="text-xl font-semibold font-mono">{v}</div>
            <div className="text-xs mt-1" style={{ color: "#4A4E42" }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card p-5 text-xs" style={{ color: "#4A4E42" }}>
        Model performance (precision/recall/F1) is only calculated from human-verified observations — never from
        unverified AI predictions. Current sample size ({reviewed.length} verified) is a demo illustration, not a
        production evaluation set.
      </div>
    </div>
  );
}
