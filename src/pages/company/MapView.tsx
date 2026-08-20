import { useStore } from "@/lib/store";
import { DiseaseMap } from "@/components/DiseaseMap";

export default function CompanyMapView() {
  const db = useStore((s) => s.db);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Disease Map</h1>
      <p className="text-sm mb-6" style={{ color: "#4A4E42" }}>
        Live GIS view of every observation, clustered by proximity. Farmer identities are never shown on the map.
      </p>
      <div className="card p-5">
        <DiseaseMap observations={db.observations} />
        <div className="flex gap-4 mt-4 text-xs flex-wrap" style={{ color: "#4A4E42" }}>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#006838" }} />Healthy</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#7C8B72" }} />Mild</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#C2790E" }} />Moderate</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: "#AA3626" }} />Severe</span>
        </div>
      </div>
    </div>
  );
}
