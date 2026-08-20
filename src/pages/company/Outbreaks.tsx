import { useStore, detectOutbreaks } from "@/lib/store";
import { Tag } from "@/components/ui/Tag";

export default function CompanyOutbreaks() {
  const db = useStore((s) => s.db);
  const threshold = useStore((s) => s.outbreakThreshold);
  const outbreaks = detectOutbreaks(db, threshold);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Outbreak Alerts</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>
        Auto-flagged when a disease crosses configurable thresholds within a region &amp; time window (currently ≥{threshold.minFields} fields
        or ≥{threshold.minObservations} observations in {threshold.windowDays} days — adjustable in the admin panel).
      </p>
      {outbreaks.length === 0 ? (
        <div className="card p-6 text-sm" style={{ color: "#4A4E42" }}>No thresholds currently exceeded.</div>
      ) : (
        outbreaks.map((o) => (
          <div key={o.region + o.diseaseId} className="card p-5 mb-4" style={{ borderLeft: "4px solid #AA3626" }}>
            <div className="flex items-center justify-between mb-3">
              <Tag variant="severe">Potential outbreak</Tag>
              <span className="text-xs font-mono" style={{ color: "#4A4E42" }}>threshold auto-detected</span>
            </div>
            <div className="font-semibold text-lg">{o.diseaseName}</div>
            <div className="text-sm mb-4" style={{ color: "#4A4E42" }}>{o.region}</div>
            <div className="grid grid-cols-3 gap-3 font-mono text-center max-w-md">
              <div className="card p-3"><div className="text-lg font-semibold">{o.fieldCount}</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>affected fields</div></div>
              <div className="card p-3"><div className="text-lg font-semibold">{o.obsCount}</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>observations</div></div>
              <div className="card p-3"><div className="text-lg font-semibold" style={{ color: "#AA3626" }}>{o.trend === "Increasing" ? "↑" : "→"}</div><div className="text-[11px]" style={{ color: "#4A4E42" }}>{o.trend}</div></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
