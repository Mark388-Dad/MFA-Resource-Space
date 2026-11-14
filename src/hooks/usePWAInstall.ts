import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { safeStorage } from "@/lib/safeStorage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type DeviceType = "mac" | "ipad" | "ios" | "windows" | "android" | "other";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [device, setDevice] = useState<DeviceType>("other");
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Detect if running standalone (already installed app)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://"));

    setIsInstalled(isStandalone);

    // 2. Detect platform / device
    const ua = (typeof window !== "undefined" ? window.navigator.userAgent : "").toLowerCase();
    const isMacPlatform = /macintosh|mac os x/.test(ua) && !("ontouchend" in document);
    const isIPadOS =
      /ipad/.test(ua) ||
      (/macintosh/.test(ua) && "ontouchend" in document && navigator.maxTouchPoints > 1);
    const isIPhone = /iphone|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    const isWindowsDevice = /windows|win32|win64/.test(ua);

    if (isIPadOS) {
      setDevice("ipad");
    } else if (isIPhone) {
      setDevice("ios");
    } else if (isMacPlatform) {
      setDevice("mac");
    } else if (isAndroidDevice) {
      setDevice("android");
    } else if (isWindowsDevice) {
      setDevice("windows");
    } else {
      setDevice("other");
    }

    // 3. Listen for Chromium/Edge native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
      setShowModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if user dismissed banner recently
    const dismissedUntil = safeStorage.getItem("mfa-pwa-dismissed");
    const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

    if (!isStandalone && !isDismissed) {
      // Delay prompt slightly so user sees the interface first
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const downloadDesktopLauncher = useCallback(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const targetUrl = `${origin}/dashboard`;
    const isWindows = navigator.userAgent.toLowerCase().includes("windows");

    if (isWindows) {
      // Windows Desktop Internet Shortcut (.url)
      const content = `[InternetShortcut]\r\nURL=${targetUrl}\r\nIconIndex=0\r\nIconFile=${origin}/favicon.ico\r\n`;
      const blob = new Blob([content], { type: "application/internet-shortcut;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MFA Reading Challenge.url";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // HTML Web App Desktop Launcher (.html)
      const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MFA Reading Challenge</title>
  <link rel="icon" href="${origin}/favicon.ico">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <script>window.location.replace("${targetUrl}");</script>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#030712;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;">
    <h2>📚 Opening MFA Reading Challenge...</h2>
    <p><a href="${targetUrl}" style="color:#10b981;text-decoration:none;font-weight:bold;">Click here if your reading challenge does not open</a></p>
  </div>
</body>
</html>`;
      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MFA-Reading-Challenge.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast.success("MFA Reading Challenge downloaded! Open the file to launch directly from your desktop.", {
      duration: 5000,
    });
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowBanner(false);
          setShowModal(false);
          toast.success("MFA Reading Challenge installed successfully!");
          return true;
        }
      } catch (err) {
        console.warn("PWA install prompt failed:", err);
      }
    }
    // Automatically download desktop app shortcut without showing instruction modal
    downloadDesktopLauncher();
    setShowBanner(false);
    return true;
  }, [deferredPrompt, downloadDesktopLauncher]);

  const dismissBanner = useCallback((hours = 48) => {
    setShowBanner(false);
    safeStorage.setItem(
      "mfa-pwa-dismissed",
      String(Date.now() + hours * 60 * 60 * 1000)
    );
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    device,
    showModal,
    setShowModal,
    showBanner,
    setShowBanner,
    promptInstall,
    dismissBanner,
  };
}
