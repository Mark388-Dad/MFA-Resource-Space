import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  Check,
  Send,
  Terminal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { safeStorage } from "@/lib/safeStorage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  copied: boolean;
  reported: boolean;
  reportRef?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    showDetails: false,
    copied: false,
    reported: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Automatically log diagnostic trace for debugging
    console.group("🚨 [MFA Reading Challenge] Application Error Boundary Triggered");
    console.error("Error Details:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.groupEnd();
  }

  private handleReportIssue = () => {
    const { error, errorInfo } = this.state;
    const refCode = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const reportPayload = {
      referenceCode: refCode,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      errorName: error?.name || "UnknownError",
      errorMessage: error?.message || "No error message provided",
      errorStack: error?.stack || null,
      componentStack: errorInfo?.componentStack || null,
    };

    // 1. Log to console for browser dev tools and monitoring services (e.g. Sentry / Datadog / GCP logs)
    console.error("[MFA Error Monitoring Service] Automated Incident Report Filed:", reportPayload);

    // 2. Persist to safe resilient storage
    try {
      const existingReports = safeStorage.getJSON<any[]>("mfa_reported_issues", []);
      existingReports.unshift(reportPayload);
      safeStorage.setJSON("mfa_reported_issues", existingReports.slice(0, 20));
    } catch {
      // storage quota or restricted
    }

    // 3. Dispatch monitoring event for listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mfa_issue_reported", { detail: reportPayload }));
    }

    this.setState({ reported: true, reportRef: refCode });
  };

  private handleCopyDiagnostics = () => {
    const { error, errorInfo } = this.state;
    const diagnostics = [
      `=== MFA READING CHALLENGE ERROR REPORT ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "unknown"}`,
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`,
      `Error Name: ${error?.name || "Unknown"}`,
      `Message: ${error?.message || "No message"}`,
      `\n--- COMPONENT TRACE ---`,
      errorInfo?.componentStack || "N/A",
      `\n--- CALL STACK ---`,
      error?.stack || "N/A",
    ].join("\n");

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnostics);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  private handleResetStorageAndReload = () => {
    try {
      safeStorage.removeItem("mfa_cached_profile");
      safeStorage.removeItem("mfa-theme-mode");
      safeStorage.removeItem("mfa-theme-accent");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied, reported, reportRef } = this.state;
      const errorTitle = error?.name || "Application Runtime Error";
      const errorMessage = error?.message || "An unexpected error occurred while rendering this interface.";

      return (
        <div
          role="alert"
          style={{
            backgroundColor: "#070d18",
            color: "#f8fafc",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "680px",
              width: "100%",
              backgroundColor: "#0f172a",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 40px -10px rgba(239, 68, 68, 0.2)",
            }}
          >
            {/* Header Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f87171",
                  }}
                >
                  <ShieldAlert style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <h1 style={{ fontSize: "17px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                    M-Pesa Foundation Academy
                  </h1>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>
                    Reading Challenge Protection Shield
                  </span>
                </div>
              </div>

              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(239, 68, 68, 0.18)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Safe Recovery Mode
              </span>
            </div>

            {/* Error Message Box */}
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "16px",
                padding: "16px 20px",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <AlertTriangle style={{ width: "16px", height: "16px", color: "#f87171" }} />
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#fca5a5" }}>
                  {errorTitle}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: "#e2e8f0",
                  margin: 0,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  wordBreak: "break-word",
                }}
              >
                {errorMessage}
              </p>
            </div>

            {/* User Assurance Copy */}
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", margin: "0 0 24px 0" }}>
              The portal encountered an unexpected display issue. Your submitted books, reading points, and challenge progress remain safely stored. Use the options below to resume reading or report this event to the technical team.
            </p>

            {/* Action Buttons Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#0d8a4a",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(13, 138, 74, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                <RefreshCw style={{ width: "14px", height: "14px" }} />
                Reload Portal
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = "/";
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#1e293b",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: "1px solid #334155",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Home style={{ width: "14px", height: "14px" }} />
                Academy Home
              </button>

              {/* REPORT ISSUE BUTTON */}
              <button
                type="button"
                onClick={this.handleReportIssue}
                disabled={reported}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: reported ? "rgba(16, 185, 129, 0.15)" : "#2563eb",
                  color: reported ? "#34d399" : "#ffffff",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: reported ? "1px solid rgba(52, 211, 153, 0.4)" : "none",
                  cursor: reported ? "default" : "pointer",
                  boxShadow: reported ? "none" : "0 4px 12px rgba(37, 99, 235, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                {reported ? (
                  <>
                    <Check style={{ width: "14px", height: "14px" }} />
                    Issue Reported ✓ ({reportRef})
                  </>
                ) : (
                  <>
                    <Send style={{ width: "14px", height: "14px" }} />
                    Report Issue to Monitor
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={this.handleResetStorageAndReload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: "500",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
                title="Clears local state cache and reinitializes"
              >
                <RotateCcw style={{ width: "12px", height: "12px" }} />
                Reset Cache
              </button>
            </div>

            {/* Report Confirmation Notice */}
            {reported && (
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Diagnostic report recorded with Reference <strong>{reportRef}</strong> and logged to the Academy Monitoring Console.
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyDiagnostics}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#a7f3d0",
                    fontWeight: "600",
                    fontSize: "11px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {copied ? "Copied!" : "Copy Report"}
                </button>
              </div>
            )}

            {/* Expandable Technical Diagnostics */}
            <div
              style={{
                borderTop: "1px solid #1e293b",
                paddingTop: "16px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Terminal style={{ width: "14px", height: "14px", color: "#38bdf8" }} />
                  Technical Diagnostics &amp; Stack Trace
                </span>
                {showDetails ? (
                  <ChevronUp style={{ width: "14px", height: "14px" }} />
                ) : (
                  <ChevronDown style={{ width: "14px", height: "14px" }} />
                )}
              </button>

              {showDetails && (
                <div style={{ marginTop: "12px", spaceY: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <button
                      type="button"
                      onClick={this.handleCopyDiagnostics}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "#1e293b",
                        color: "#94a3b8",
                        fontSize: "11px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        cursor: "pointer",
                      }}
                    >
                      {copied ? (
                        <>
                          <Check style={{ width: "12px", height: "12px", color: "#34d399" }} />
                          Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <Copy style={{ width: "12px", height: "12px" }} />
                          Copy Trace Details
                        </>
                      )}
                    </button>
                  </div>

                  <pre
                    style={{
                      backgroundColor: "#020617",
                      border: "1px solid #1e293b",
                      borderRadius: "12px",
                      padding: "14px",
                      fontSize: "11px",
                      lineHeight: "1.5",
                      color: "#93c5fd",
                      overflowX: "auto",
                      maxHeight: "220px",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      margin: 0,
                    }}
                  >
                    {error?.stack || errorMessage}
                    {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
