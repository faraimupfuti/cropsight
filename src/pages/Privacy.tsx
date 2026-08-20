import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 fade-in">
      <div className="mb-8 cursor-pointer inline-block" onClick={() => navigate("/")}><Logo height={22} /></div>
      <div className="card p-7">
        <div className="p-3 rounded-lg text-xs mb-6" style={{ background: "#FBF0DD", color: "#C2790E" }}>
          <strong>Draft placeholder.</strong> This page describes CropSight's intended data practices at a product
          level. It is not legal advice and has not been reviewed by a lawyer — have this reviewed and adapted to
          Zimbabwean/regional data protection law before handling real farmer data.
        </div>
        <h1 className="text-xl font-semibold mb-4">Privacy</h1>
        <div className="space-y-4 text-sm" style={{ color: "#4A4E42" }}>
          <p><strong style={{ color: "#15180F" }}>What we collect:</strong> account details (name, email, role), farm and field information you enter, photos you upload for disease assessment, and location data tied to fields you register.</p>
          <p><strong style={{ color: "#15180F" }}>How it's used:</strong> to run AI disease predictions, route them to agronomists for review, and show you and your organization field-health history and disease trends.</p>
          <p><strong style={{ color: "#15180F" }}>Who can see it:</strong> data is isolated per organization at the database level — members of another organization cannot see your farms, fields, or observations. Within your organization, farmers see their own data; agronomists and organization admins can see organization-wide data needed to do their jobs.</p>
          <p><strong style={{ color: "#15180F" }}>Public disease maps:</strong> aggregated, anonymized disease location data may be shown on organization dashboards. Farmer names are never shown on shared maps.</p>
          <p><strong style={{ color: "#15180F" }}>Research datasets:</strong> only observations that have been reviewed and validated by an agronomist are made available to the researcher role, and always without farmer-identifying information.</p>
          <p><strong style={{ color: "#15180F" }}>Retention & deletion:</strong> contact your organization admin to request deletion of your account or data, subject to any records your organization is required to retain.</p>
        </div>
      </div>
    </div>
  );
}
