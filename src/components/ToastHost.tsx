import { useStore } from "@/lib/store";

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="card px-4 py-3 shadow-lg text-sm font-medium flex items-center gap-2 fade-in">
          <span style={{ color: "#006838" }}>●</span> {t.message}
        </div>
      ))}
    </div>
  );
}
