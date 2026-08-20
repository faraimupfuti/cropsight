import { useStore } from "@/lib/store";

export default function AdminThresholds() {
  const threshold = useStore((s) => s.outbreakThreshold);
  const updateThreshold = useStore((s) => s.updateThreshold);
  const pushToast = useStore((s) => s.pushToast);

  function handleChange(key: "minFields" | "minObservations" | "windowDays", value: string) {
    updateThreshold({ [key]: Number(value) } as any);
    pushToast("Threshold updated");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Outbreak Thresholds</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Configurable per-region trigger conditions for potential-outbreak flags</p>
      <div className="card p-6 max-w-md space-y-4">
        <div>
          <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Minimum affected fields</label>
          <input type="number" defaultValue={threshold.minFields} onChange={(e) => handleChange("minFields", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Minimum observations</label>
          <input type="number" defaultValue={threshold.minObservations} onChange={(e) => handleChange("minObservations", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Time window (days)</label>
          <input type="number" defaultValue={threshold.windowDays} onChange={(e) => handleChange("windowDays", e.target.value)} />
        </div>
        <p className="text-[11px]" style={{ color: "#7C8B72" }}>Changes apply immediately to the Outbreak Alerts view in the Agricultural Company workspace.</p>
      </div>
    </div>
  );
}
