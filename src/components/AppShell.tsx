import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Tag } from "./ui/Tag";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const NAV: Record<Role, { to: string; label: string }[]> = {
  farmer: [
    { to: "/app/farmer", label: "Dashboard" },
    { to: "/app/farmer/upload", label: "Check My Crop" },
    { to: "/app/farmer/fields", label: "My Fields" },
    { to: "/app/farmer/history", label: "Observation History" },
  ],
  agronomist: [
    { to: "/app/agronomist", label: "Review Queue" },
    { to: "/app/agronomist/trends", label: "Disease Trends" },
  ],
  company: [
    { to: "/app/company", label: "Overview" },
    { to: "/app/company/map", label: "Disease Map" },
    { to: "/app/company/outbreaks", label: "Outbreak Alerts" },
    { to: "/app/company/agronomists", label: "Manage Agronomists" },
    { to: "/app/company/reports", label: "Reports" },
  ],
  researcher: [{ to: "/app/researcher", label: "Dataset Explorer" }],
  admin: [
    { to: "/app/admin", label: "Overview" },
    { to: "/app/admin/users", label: "Users" },
    { to: "/app/admin/diseases", label: "Disease Knowledge" },
    { to: "/app/admin/models", label: "ML Models" },
    { to: "/app/admin/thresholds", label: "Outbreak Thresholds" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  farmer: "Farmer",
  agronomist: "Agronomist",
  company: "Agricultural Company",
  researcher: "Researcher",
  admin: "Platform Admin",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!role || !user) return null;
  const nav = NAV[role];

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="w-64 shrink-0 border-r hidden md:flex md:flex-col bg-white" style={{ borderColor: "#E2E0D4" }}>
        <div className="h-16 flex items-center px-5 border-b" style={{ borderColor: "#E2E0D4" }}>
          <Logo height={20} />
        </div>
        <div className="p-3 flex-1">
          <div className="mb-3">
            <Tag variant="demo">DEMO MODE</Tag>
          </div>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/app/${role}`}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t text-xs" style={{ borderColor: "#E2E0D4", color: "#4A4E42" }}>
          <div className="font-semibold" style={{ color: "#15180F" }}>{user.name}</div>
          <div>{ROLE_LABEL[role]}</div>
          <div className="mt-0.5">{user.org}</div>
          <button className="btn-ghost text-xs mt-3" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden border-b bg-white sticky top-0 z-30" style={{ borderColor: "#E2E0D4" }}>
          <div className="h-14 flex items-center justify-between px-4">
            <Logo height={18} />
            <button
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="w-9 h-9 flex items-center justify-center rounded-lg"
              style={{ border: "1.5px solid #E2E0D4" }}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <span style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
              ) : (
                <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="border-t px-3 py-3 fade-in" style={{ borderColor: "#E2E0D4" }}>
              <div className="mb-2"><Tag variant="demo">DEMO MODE</Tag></div>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === `/app/${role}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t mt-2 pt-3 text-xs" style={{ borderColor: "#E2E0D4", color: "#4A4E42" }}>
                <div className="font-semibold" style={{ color: "#15180F" }}>{user.name}</div>
                <div>{ROLE_LABEL[role]} · {user.org}</div>
                <button className="btn-ghost text-xs mt-2" onClick={handleLogout}>Log out</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 md:p-8 max-w-6xl mx-auto fade-in">{children}</div>
      </main>
    </div>
  );
}
