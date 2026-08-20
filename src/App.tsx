import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ToastHost } from "@/components/ToastHost";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Role } from "@/lib/types";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";

import FarmerDashboard from "@/pages/farmer/Dashboard";
import FarmerFields from "@/pages/farmer/Fields";
import FieldDetail from "@/pages/farmer/FieldDetail";
import FarmerUpload from "@/pages/farmer/Upload";
import FarmerHistory from "@/pages/farmer/History";

import AgronomistQueue from "@/pages/agronomist/Queue";
import AgronomistReviewDetail from "@/pages/agronomist/ReviewDetail";
import AgronomistTrends from "@/pages/agronomist/Trends";

import CompanyOverview from "@/pages/company/Overview";
import CompanyMapView from "@/pages/company/MapView";
import CompanyOutbreaks from "@/pages/company/Outbreaks";
import CompanyAgronomists from "@/pages/company/Agronomists";
import CompanyReports from "@/pages/company/Reports";

import ResearcherExplorer from "@/pages/researcher/Explorer";

import AdminOverview from "@/pages/admin/Overview";
import AdminUsers from "@/pages/admin/Users";
import AdminDiseases from "@/pages/admin/Diseases";
import AdminModels from "@/pages/admin/Models";
import AdminThresholds from "@/pages/admin/Thresholds";

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const currentRole = useStore((s) => s.role);
  const authLoading = useStore((s) => s.authLoading);
  if (authLoading) return <LoadingScreen />;
  if (currentRole !== role) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm" style={{ color: "#4A4E42" }}>Loading…</div>
    </div>
  );
}

/** Loads a privacy-friendly analytics script only if the site owner has configured a domain. No-op by default — nothing loads, no cookies, no tracking, unless explicitly opted in via env var. */
function Analytics() {
  useEffect(() => {
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
    if (!domain) return;
    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = domain;
    script.src = "https://plausible.io/js/script.js";
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
}

export default function App() {
  const initLiveSession = useStore((s) => s.initLiveSession);

  useEffect(() => {
    if (isSupabaseConfigured) {
      initLiveSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <Analytics />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/app/farmer" element={<RequireRole role="farmer"><FarmerDashboard /></RequireRole>} />
        <Route path="/app/farmer/fields" element={<RequireRole role="farmer"><FarmerFields /></RequireRole>} />
        <Route path="/app/farmer/fields/:fieldId" element={<RequireRole role="farmer"><FieldDetail /></RequireRole>} />
        <Route path="/app/farmer/upload" element={<RequireRole role="farmer"><FarmerUpload /></RequireRole>} />
        <Route path="/app/farmer/history" element={<RequireRole role="farmer"><FarmerHistory /></RequireRole>} />

        <Route path="/app/agronomist" element={<RequireRole role="agronomist"><AgronomistQueue /></RequireRole>} />
        <Route path="/app/agronomist/review/:observationId" element={<RequireRole role="agronomist"><AgronomistReviewDetail /></RequireRole>} />
        <Route path="/app/agronomist/trends" element={<RequireRole role="agronomist"><AgronomistTrends /></RequireRole>} />

        <Route path="/app/company" element={<RequireRole role="company"><CompanyOverview /></RequireRole>} />
        <Route path="/app/company/map" element={<RequireRole role="company"><CompanyMapView /></RequireRole>} />
        <Route path="/app/company/outbreaks" element={<RequireRole role="company"><CompanyOutbreaks /></RequireRole>} />
        <Route path="/app/company/agronomists" element={<RequireRole role="company"><CompanyAgronomists /></RequireRole>} />
        <Route path="/app/company/reports" element={<RequireRole role="company"><CompanyReports /></RequireRole>} />

        <Route path="/app/researcher" element={<RequireRole role="researcher"><ResearcherExplorer /></RequireRole>} />

        <Route path="/app/admin" element={<RequireRole role="admin"><AdminOverview /></RequireRole>} />
        <Route path="/app/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />
        <Route path="/app/admin/diseases" element={<RequireRole role="admin"><AdminDiseases /></RequireRole>} />
        <Route path="/app/admin/models" element={<RequireRole role="admin"><AdminModels /></RequireRole>} />
        <Route path="/app/admin/thresholds" element={<RequireRole role="admin"><AdminThresholds /></RequireRole>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastHost />
    </ErrorBoundary>
  );
}
