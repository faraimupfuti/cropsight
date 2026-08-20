import { useState } from "react";
import { useStore } from "@/lib/store";
import { REGIONS } from "@/lib/mockData";
import { DISEASE_CLASSES, diseaseById } from "@/lib/diseaseData";
import { SeverityTag } from "@/components/ui/Tag";
import { fmtDate, fmtPct, toCSV, downloadFile } from "@/lib/format";

export default function ResearcherExplorer() {
  const db = useStore((s) => s.db);
  const pushToast = useStore((s) => s.pushToast);
  const [diseaseId, setDiseaseId] = useState("");
  const [region, setRegion] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const results = db.observations.filter((o) => {
    if (!o.review || o.review.status === "uncertain") return false;
    if (diseaseId && o.diseaseId !== diseaseId) return false;
    if (region && o.region !== region) return false;
    if (from && new Date(o.createdAt) < new Date(from)) return false;
    if (to && new Date(o.createdAt) > new Date(to)) return false;
    return true;
  });

  function exportData(fmt: "csv" | "json") {
    const rows = results.map((o) => ({
      obs_id: o.id,
      date: o.createdAt,
      region: o.region,
      crop: o.crop,
      ai_prediction: o.diseaseName,
      ai_confidence: o.confidence,
      severity: o.severity || "",
      validated_label: diseaseById(o.review!.finalDiseaseId || "")?.name || "",
      model_version: o.modelVersion,
    }));
    if (fmt === "csv") {
      downloadFile(`cropsight_dataset_${Date.now()}.csv`, toCSV(rows, Object.keys(rows[0] || { obs_id: "" })), "text/csv");
    } else {
      downloadFile(`cropsight_dataset_${Date.now()}.json`, JSON.stringify(rows, null, 2), "application/json");
    }
    pushToast(`Dataset exported (${fmt.toUpperCase()})`);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Dataset Explorer</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Validated, anonymised observations only — farmer identities are never shown</p>

      <div className="card p-4 mb-5 grid md:grid-cols-4 gap-3">
        <select value={diseaseId} onChange={(e) => setDiseaseId(e.target.value)}>
          <option value="">All diseases</option>
          {DISEASE_CLASSES.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm" style={{ color: "#4A4E42" }}>{results.length} validated observations match</div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-2" onClick={() => exportData("csv")}>Export CSV</button>
          <button className="btn-secondary text-xs px-3 py-2" onClick={() => exportData("json")}>Export JSON</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Obs ID</th><th>Date</th><th>Region</th><th>Crop</th><th>Disease</th><th>Confidence</th><th>Severity</th><th>Validated label</th></tr></thead>
          <tbody>
            {results.slice(0, 60).map((o) => (
              <tr key={o.id}>
                <td className="font-mono">{o.id}</td>
                <td className="font-mono">{fmtDate(o.createdAt)}</td>
                <td>{o.region}</td>
                <td>{o.crop}</td>
                <td>{o.diseaseName}</td>
                <td className="font-mono">{fmtPct(o.confidence)}</td>
                <td><SeverityTag severity={o.severity} /></td>
                <td>{diseaseById(o.review!.finalDiseaseId || "")?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
