import { DISEASE_KB } from "@/lib/diseaseData";

export default function AdminDiseases() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Disease Knowledge Base</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Structured, citable agronomic reference data — reviewable by administrators/agronomists before it reaches farmers</p>
      <div className="space-y-3">
        {Object.values(DISEASE_KB).map((d) => (
          <div key={d.name} className="card p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div className="font-semibold text-sm">{d.name}</div>
              <span className="text-xs font-mono italic" style={{ color: "#4A4E42" }}>{d.scientificName}</span>
            </div>
            <p className="text-xs mb-3" style={{ color: "#4A4E42" }}>{d.description}</p>
            <div className="grid md:grid-cols-2 gap-3 text-xs" style={{ color: "#4A4E42" }}>
              <div><strong>Symptoms:</strong> {d.symptoms}</div>
              <div><strong>Favourable conditions:</strong> {d.conditions}</div>
              <div><strong>Prevention:</strong> {d.prevention}</div>
              <div><strong>Management:</strong> {d.management}</div>
            </div>
            <div className="text-[11px] mt-3" style={{ color: "#7C8B72" }}>Reference: {d.reference} · Last reviewed {d.reviewed}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
