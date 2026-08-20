import { useStore } from "@/lib/store";
import { fmtDate, fmtPct, toCSV, downloadFile } from "@/lib/format";

export default function CompanyReports() {
  const db = useStore((s) => s.db);
  const pushToast = useStore((s) => s.pushToast);
  const obs = db.observations;

  const validationRate = Math.round((obs.filter((o) => o.review).length / obs.length) * 100);

  function exportReport() {
    const rows = obs.map((o) => ({
      date: fmtDate(o.createdAt),
      region: o.region,
      field: db.fields.find((f) => f.id === o.fieldId)?.name || "",
      disease: o.diseaseName,
      confidence: fmtPct(o.confidence),
      severity: o.severity || "",
      status: o.status,
    }));
    downloadFile(`cropsight_report_${Date.now()}.csv`, toCSV(rows, ["date", "region", "field", "disease", "confidence", "severity", "status"]), "text/csv");
    pushToast("Report exported (CSV)");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Reports</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>Generated for the current reporting period · demo data</p>
      <div className="card p-6 max-w-xl">
        <div className="grid grid-cols-2 gap-3 text-sm mb-5">
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Farms</div><div className="font-semibold">{db.farms.length}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Fields</div><div className="font-semibold">{db.fields.length}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Observations</div><div className="font-semibold">{obs.length}</div></div>
          <div><div className="text-xs" style={{ color: "#4A4E42" }}>Agronomist validation rate</div><div className="font-semibold">{validationRate}%</div></div>
        </div>
        <button className="btn-primary px-5 py-2.5 text-sm" onClick={exportReport}>⬇ Export CSV report</button>
      </div>
    </div>
  );
}
