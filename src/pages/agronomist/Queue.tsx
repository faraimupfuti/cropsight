import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { SeverityTag, Tag } from "@/components/ui/Tag";
import { fmtDate, fmtPct } from "@/lib/format";

export default function AgronomistQueue() {
  const db = useStore((s) => s.db);
  const navigate = useNavigate();
  const pending = db.observations.filter((o) => o.status === "pending");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Review Queue</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>{pending.length} predictions awaiting your review</p>
      <div className="grid gap-3">
        {pending.slice(0, 30).map((o) => {
          const field = db.fields.find((f) => f.id === o.fieldId)!;
          const farmer = db.farmers.find((x) => x.id === o.farmerId);
          return (
            <div key={o.id} className="card p-4 flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/app/agronomist/review/${o.id}`)}>
              <div
                className="w-16 h-16 rounded-lg shrink-0 bg-cover bg-center"
                style={{ backgroundColor: "#EAE7D8", backgroundImage: o.imagePreview ? `url(${o.imagePreview})` : undefined }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-sm">{o.diseaseName}</div>
                  <SeverityTag severity={o.severity} />
                  <span className="font-mono text-xs" style={{ color: "#4A4E42" }}>{fmtPct(o.confidence)} confidence</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#4A4E42" }}>{farmer?.name || "—"} · {field.name} · {o.region} · {fmtDate(o.createdAt)}</div>
              </div>
              <Tag variant="pending">Review</Tag>
            </div>
          );
        })}
        {pending.length === 0 && <div className="card p-6 text-sm" style={{ color: "#4A4E42" }}>Queue clear — no pending predictions.</div>}
      </div>
    </div>
  );
}
