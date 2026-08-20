import React from "react";

const styles: Record<string, React.CSSProperties> = {
  pending: { background: "#FBF0DD", color: "#C2790E" },
  confirmed: { background: "#E6EFE6", color: "#003D21" },
  corrected: { background: "#E9F0F6", color: "#2A5C8A" },
  severe: { background: "#FAEAE6", color: "#AA3626" },
  moderate: { background: "#FBF0DD", color: "#C2790E" },
  mild: { background: "#E6EFE6", color: "#003D21" },
  healthy: { background: "#E6EFE6", color: "#003D21" },
  demo: { background: "#FBF0DD", color: "#C2790E" },
  neutral: { background: "#F0EEE3", color: "#4A4E42" },
};

export function Tag({ variant, children }: { variant: keyof typeof styles; children: React.ReactNode }) {
  return (
    <span className="tag" style={styles[variant]}>
      {children}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: "Mild" | "Moderate" | "Severe" | null }) {
  if (!severity) return null;
  const variant = severity === "Severe" ? "severe" : severity === "Moderate" ? "moderate" : "mild";
  return <Tag variant={variant}>{severity}</Tag>;
}

export function StatusTag({ status }: { status: "pending" | "confirmed" | "corrected" }) {
  const label = status === "pending" ? "Pending review" : status === "confirmed" ? "Confirmed" : "Corrected";
  return <Tag variant={status}>{label}</Tag>;
}
