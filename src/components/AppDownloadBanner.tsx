import React from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { AppDownloadModal } from "./AppDownloadModal";
import { Button } from "@/components/ui/button";
import { Download, X, Sparkles, Smartphone, Laptop, Tablet, Monitor } from "lucide-react";

export const AppDownloadBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    device,
    showModal,
    setShowModal,
    showBanner,
    promptInstall,
    dismissBanner,
  } = usePWAInstall();

  // If already running standalone, hide ambient banner
  if (isInstalled) {
    return (
      <AppDownloadModal
        open={showModal}
        onOpenChange={setShowModal}
        device={device}
        isInstallable={isInstallable}
        onPromptInstall={promptInstall}
      />
    );
  }

  const deviceIcon =
    device === "mac" ? (
      <Laptop className="w-4 h-4 text-sky-400" />
    ) : device === "ipad" ? (
      <Tablet className="w-4 h-4 text-emerald-400" />
    ) : device === "windows" ? (
      <Monitor className="w-4 h-4 text-blue-400" />
    ) : (
      <Smartphone className="w-4 h-4 text-amber-400" />
    );

  const deviceLabel =
    device === "mac"
      ? "MacBook App"
      : device === "ipad"
      ? "iPad App"
      : device === "ios"
      ? "iPhone App"
      : device === "windows"
      ? "PC Desktop App"
      : device === "android"
      ? "Android App"
      : "Mobile & PC App";

  return (
    <>
      {showBanner && (
        <aside
          aria-label="Download Reading App Prompt"
          className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-2xl space-y-3 relative overflow-hidden">
            <div
              className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40"
              style={{ background: "hsl(var(--primary))" }}
            />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00205B] text-white flex items-center justify-center font-bold text-base shadow-sm border border-white/20 shrink-0">
                  📚
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
                    Download {deviceLabel}
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    Fast offline access, fullscreen mode & push alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissBanner(48)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 relative z-10">
              <Button
                size="sm"
                onClick={promptInstall}
                className="w-full text-xs font-bold text-white border-0 h-8 shadow-sm"
                style={{
                  background:
                    "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))",
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download App Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowModal(true)}
                className="text-xs h-8 shrink-0 px-2.5"
                title="View installation guide"
              >
                {deviceIcon}
              </Button>
            </div>
          </div>
        </aside>
      )}

      <AppDownloadModal
        open={showModal}
        onOpenChange={setShowModal}
        device={device}
        isInstallable={isInstallable}
        onPromptInstall={promptInstall}
      />
    </>
  );
};

export const AppDownloadButton: React.FC<{
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}> = ({
  className = "",
  variant = "outline",
  size = "sm",
  label = "Download App",
}) => {
  const { isInstallable, device, showModal, setShowModal, promptInstall } =
    usePWAInstall();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={promptInstall}
        className={`gap-1.5 text-xs font-semibold ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        {label}
      </Button>

      <AppDownloadModal
        open={showModal}
        onOpenChange={setShowModal}
        device={device}
        isInstallable={isInstallable}
        onPromptInstall={promptInstall}
      />
    </>
  );
};
