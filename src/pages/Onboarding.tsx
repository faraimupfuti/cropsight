import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

export default function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);
  const role = useStore((s) => s.role);

  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"farmer" | "company">("company");

  useEffect(() => {
    if (role) navigate(`/app/${role}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await completeOnboarding(orgName, fullName, accountType);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 fade-in">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo height={30} /></div>
        <div className="card p-7">
          <div className="text-sm font-semibold mb-1">Set up your organization</div>
          <div className="text-xs mb-5" style={{ color: "#4A4E42" }}>
            This creates your organization and your account in one step. Additional teammates (agronomists,
            researchers) can be invited afterwards by an admin.
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Your name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Organization name</label>
              <input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Zimbabwe Grain Partners" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "#4A4E42" }}>Account type</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value as "farmer" | "company")}>
                <option value="company">Agricultural company / cooperative admin</option>
                <option value="farmer">Individual farmer</option>
              </select>
            </div>
            {authError && (
              <div className="p-2.5 rounded-lg text-xs" style={{ background: "#FAEAE6", color: "#AA3626" }}>{authError}</div>
            )}
            <button className="btn-primary w-full py-2.5 text-sm" disabled={authLoading}>
              {authLoading ? "Setting up…" : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
