import React from "react";
import { Logo } from "./Logo";

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, wire this to an error-tracking service (Sentry, etc.)
    console.error("CropSight crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6"><Logo height={26} /></div>
            <div className="card p-7">
              <div className="text-lg font-semibold mb-2">Something went wrong</div>
              <p className="text-sm mb-5" style={{ color: "#4A4E42" }}>
                This screen hit an unexpected error. Your data wasn't lost — reloading usually fixes it.
              </p>
              <button className="btn-primary px-5 py-2.5 text-sm" onClick={() => window.location.reload()}>
                Reload CropSight
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
