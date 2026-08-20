import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Role } from "@/lib/types";

const DEMO_ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "farmer", label: "Farmer", desc: "Upload crops, track fields" },
  { id: "agronomist", label: "Agronomist", desc: "Review AI predictions" },
  { id: "company", label: "Agricultural Company", desc: "Enterprise disease intelligence" },
  { id: "researcher", label: "Researcher", desc: "Dataset access & export" },
  { id: "admin", label: "Platform Admin", desc: "Manage the platform" },
];

function DemoLogin() {
  const navigate = useNavigate();
  const loginDemo = useStore((s) => s.loginDemo);

  function handleLogin(role: Role) {
    loginDemo(role);
    navigate(`/app/${role}`);
  }

  return (
    <div className="card p-7">
      <div className="text-sm font-semibold mb-1">Choose a demo role</div>
      <div className="text-xs mb-5" style={{ color: "#4A4E42" }}>
        Demo mode — no real credentials required. Each role loads seeded fictional data.
      </div>
      <div className="space-y-2">
        {DEMO_ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => handleLogin(r.id)}
            className="w-full text-left p-3.5 rounded-lg border flex items-center justify-between hover:border-[#006838] transition"
            style={{ borderColor: "#E2E0D4" }}
          >
            <div>
              <div className="text-sm font-semibold">{r.label}</div>
              <div className="text-xs" style={{ color: "#4A4E42" }}>{r.desc}</div>
            </div>
            <span style={{ color: "#006838" }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveLogin() {
  const navigate = useNavigate();
  const signInLive = useStore((s) => s.signInLive);
  const signUpLive = useStore((s) => s.signUpLive);
  const needsOnboarding = useStore((s) => s.needsOnboarding);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const role = useStore((s) => s.role);

  useEffect(() => {
    if (needsOnboarding) {
      navigate("/onboarding");
    } else if (role) {
      navigate(`/app/${role}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsOnboarding, role]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    await signInLive(email, password);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const result = await signUpLive(email, password);
    if (result.needsEmailConfirmation) {
      setConfirmSent(true);
    }
  }

  return (
    <div className="card p-7">
      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "#F0EEE3" }}>
        <button
          className="flex-1 text-sm font-semibold py-2 rounded-md"
          style={tab === "signin" ? { background: "#fff", color: "#006838" } : { color: "#4A4E42" }}
          onClick={() => setTab("signin")}
        >
          Sign in
        </button>
        <button
          className="flex-1 text-sm font-semibold py-2 rounded-md"
          style={tab === "signup" ? { background: "#fff", color: "#006838" } : { color: "#4A4E42" }}
          onClick={() => setTab("signup")}
        >
          Create account
        </button>
      </div>

      {confirmSent ? (
        <div className="p-4 rounded-lg text-sm" style={{ background: "#E6EFE6", color: "#003D21" }}>
          Check your email to confirm your account, then come back and sign in.
        </div>
      ) : (
        <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {authError && (
            <div className="p-2.5 rounded-lg text-xs" style={{ background: "#FAEAE6", color: "#AA3626" }}>{authError}</div>
          )}
          <button className="btn-primary w-full py-2.5 text-sm" disabled={authLoading}>
            {authLoading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
          </button>
          {tab === "signup" && (
            <p className="text-[11px]" style={{ color: "#7C8B72" }}>
              You'll set up your organization next. Agronomist, researcher, and platform-admin accounts are provisioned by an existing admin, not self-serve sign-up.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 fade-in">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo height={30} /></div>
        {isSupabaseConfigured ? <LiveLogin /> : <DemoLogin />}
        <button className="btn-ghost text-xs mt-5" onClick={() => navigate("/")}>← Back to site</button>
      </div>
    </div>
  );
}
