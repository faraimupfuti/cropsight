import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, fieldsForFarmer } from "@/lib/store";
import { REGIONS } from "@/lib/mockData";
import { fmtDate } from "@/lib/format";

const DEMO_FARMER_ID = "F1";

export default function FarmerFields() {
  const db = useStore((s) => s.db);
  const mode = useStore((s) => s.mode);
  const addFarm = useStore((s) => s.addFarm);
  const addField = useStore((s) => s.addField);
  const pushToast = useStore((s) => s.pushToast);
  const navigate = useNavigate();

  const farms = mode === "live" ? db.farms : db.farms.filter((f) => f.farmerId === DEMO_FARMER_ID);
  const fields = mode === "live" ? db.fields : fieldsForFarmer(db, DEMO_FARMER_ID);

  const [showForm, setShowForm] = useState(false);
  const [farmChoice, setFarmChoice] = useState<string>(farms[0]?.id ?? "__new__");
  const [newFarmName, setNewFarmName] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [variety, setVariety] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fieldName.trim()) {
      setError("Field name is required.");
      return;
    }
    if (farmChoice === "__new__" && !newFarmName.trim()) {
      setError("Enter a name for the new farm.");
      return;
    }

    setSubmitting(true);
    try {
      let targetFarmId = farmChoice;
      if (farmChoice === "__new__") {
        const farm = await addFarm(newFarmName.trim());
        targetFarmId = farm.id;
      }

      await addField(targetFarmId, {
        name: fieldName.trim(),
        variety: variety.trim(),
        plantingDate,
        areaHa: areaHa ? Number(areaHa) : 0,
        region,
      });

      pushToast("Field added");
      setShowForm(false);
      setFieldName("");
      setVariety("");
      setPlantingDate("");
      setAreaHa("");
      setNewFarmName("");
    } catch (err: any) {
      setError(err?.message || "Could not add this field. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">My Fields</h1>
        <button className="btn-primary px-4 py-2 text-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Field"}
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>{fields.length} fields registered across {farms.length} farm{farms.length === 1 ? "" : "s"}</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-3 max-w-lg">
          <div>
            <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Farm</label>
            <select value={farmChoice} onChange={(e) => setFarmChoice(e.target.value)}>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
              <option value="__new__">+ Create a new farm…</option>
            </select>
          </div>
          {farmChoice === "__new__" && (
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>New farm name</label>
              <input type="text" value={newFarmName} onChange={(e) => setNewFarmName(e.target.value)} placeholder="e.g. Riverbank Farm" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Field name</label>
            <input type="text" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g. Field A1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Variety</label>
              <input type="text" value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. SC719" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Area (ha)</label>
              <input type="number" step="0.1" min="0" value={areaHa} onChange={(e) => setAreaHa(e.target.value)} placeholder="e.g. 3.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Planting date</label>
              <input type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div className="p-2.5 rounded-lg text-xs" style={{ background: "#FAEAE6", color: "#AA3626" }}>{error}</div>
          )}
          <button className="btn-primary w-full py-2.5 text-sm" disabled={submitting}>
            {submitting ? "Adding…" : "Add field"}
          </button>
        </form>
      )}

      {fields.length === 0 && !showForm ? (
        <div className="card p-6 text-sm" style={{ color: "#4A4E42" }}>
          No fields yet — add your first one to start tracking crop health.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.id} className="card p-4 cursor-pointer" onClick={() => navigate(`/app/farmer/fields/${f.id}`)}>
              <div className="flex justify-between mb-1">
                <div className="font-semibold text-sm">{f.name}</div>
                <span className="text-xs font-mono" style={{ color: "#4A4E42" }}>{f.areaHa} ha</span>
              </div>
              <div className="text-xs" style={{ color: "#4A4E42" }}>Maize{f.variety ? ` · ${f.variety}` : ""}{f.plantingDate ? ` · planted ${fmtDate(f.plantingDate)}` : ""}</div>
              <div className="text-xs mt-1" style={{ color: "#4A4E42" }}>{f.region} · {f.lat.toFixed(3)}, {f.lng.toFixed(3)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
