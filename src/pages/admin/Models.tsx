export default function AdminModels() {
  const models = [
    { name: "cropsight-model", crop: "Maize", status: "Active (live inference via Netlify Function)", accuracy: "Pending verified evaluation set" },
    { name: "mock-fallback", crop: "Maize", status: "Fallback — used automatically if the live endpoint is unreachable", accuracy: "N/A — demo only" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">ML Models</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>
        Model versioning registry. The active model is called through <code className="font-mono">netlify/functions/predict.ts</code> —
        swap the endpoint or add a new version without changing any page or component.
      </p>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Model version</th><th>Crop</th><th>Status</th><th>Accuracy</th></tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name}>
                <td className="font-mono font-medium">{m.name}</td>
                <td>{m.crop}</td>
                <td>{m.status}</td>
                <td className="font-mono">{m.accuracy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
