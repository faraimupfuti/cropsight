import { useNavigate } from "react-router-dom";
import { useStore, fieldsForFarmer } from "@/lib/store";
import { fmtDate } from "@/lib/format";

export default function FarmerFields() {
  const db = useStore((s) => s.db);
  const mode = useStore((s) => s.mode);
  const navigate = useNavigate();
  const fields = mode === "live" ? db.fields : fieldsForFarmer(db, "F1");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">My Fields</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>{fields.length} fields registered</p>
      <div className="grid md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.id} className="card p-4 cursor-pointer" onClick={() => navigate(`/app/farmer/fields/${f.id}`)}>
            <div className="flex justify-between mb-1">
              <div className="font-semibold text-sm">{f.name}</div>
              <span className="text-xs font-mono" style={{ color: "#4A4E42" }}>{f.areaHa} ha</span>
            </div>
            <div className="text-xs" style={{ color: "#4A4E42" }}>Maize · {f.variety} · planted {fmtDate(f.plantingDate)}</div>
            <div className="text-xs mt-1" style={{ color: "#4A4E42" }}>{f.region} · {f.lat.toFixed(3)}, {f.lng.toFixed(3)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
