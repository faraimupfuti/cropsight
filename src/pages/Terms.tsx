import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 fade-in">
      <div className="mb-8 cursor-pointer inline-block" onClick={() => navigate("/")}><Logo height={22} /></div>
      <div className="card p-7">
        <div className="p-3 rounded-lg text-xs mb-6" style={{ background: "#FBF0DD", color: "#C2790E" }}>
          <strong>Draft placeholder.</strong> Not legal advice — have a lawyer review and localize these terms before
          onboarding real users.
        </div>
        <h1 className="text-xl font-semibold mb-4">Terms of use</h1>
        <div className="space-y-4 text-sm" style={{ color: "#4A4E42" }}>
          <p><strong style={{ color: "#15180F" }}>Not a diagnostic authority.</strong> CropSight's AI predictions are probabilistic estimates for informational purposes only. They are not a substitute for assessment by a qualified agronomist, and no prediction should be treated as confirmed until reviewed by one.</p>
          <p><strong style={{ color: "#15180F" }}>No liability for input decisions.</strong> Decisions about fungicide use, crop management, or other agronomic inputs made on the basis of CropSight output are the user's responsibility.</p>
          <p><strong style={{ color: "#15180F" }}>Acceptable use.</strong> Don't upload images you don't have the right to use, attempt to disrupt the service, or attempt to access another organization's data.</p>
          <p><strong style={{ color: "#15180F" }}>Changes.</strong> These terms may be updated as the product develops; material changes will be communicated to organization admins.</p>
        </div>
      </div>
    </div>
  );
}
