import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 fade-in">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6"><Logo height={26} /></div>
        <div className="card p-7">
          <div className="text-lg font-semibold mb-2">Page not found</div>
          <p className="text-sm mb-5" style={{ color: "#4A4E42" }}>
            The page you're looking for doesn't exist or may have moved.
          </p>
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={() => navigate("/")}>
            Back to CropSight
          </button>
        </div>
      </div>
    </div>
  );
}
