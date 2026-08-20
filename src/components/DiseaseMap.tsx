import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Observation } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const SEVERITY_COLOR: Record<string, string> = {
  Severe: "#AA3626",
  Moderate: "#C2790E",
  Mild: "#7C8B72",
};

function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Illustrative Zimbabwe-region field observations plotted on a real
 * OpenStreetMap basemap (no API key required). Farmer identities are
 * never included in marker popups — only field, region, disease and
 * severity — per the platform's privacy requirements.
 */
export function DiseaseMap({ observations, height = 480 }: { observations: Observation[]; height?: number }) {
  const center: [number, number] = [-18.5, 30.0]; // Zimbabwe centroid, approx

  return (
    <div className="rounded-lg overflow-hidden" style={{ height, border: "1px solid #E2E0D4" }}>
      <MapContainer center={center} zoom={6.3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
          {observations.map((o) => {
            const color = o.diseaseId === "healthy" ? "#006838" : SEVERITY_COLOR[o.severity || "Mild"] || "#7C8B72";
            return (
              <Marker key={o.id} position={[o.lat, o.lng]} icon={dotIcon(color)}>
                <Popup>
                  <div style={{ fontFamily: "inherit", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{o.diseaseName}</div>
                    <div style={{ color: "#4A4E42" }}>{o.region}</div>
                    {o.severity && <div style={{ color: "#4A4E42" }}>Severity: {o.severity}</div>}
                    <div style={{ color: "#4A4E42" }}>{fmtDate(o.createdAt)}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
