import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Laptop,
  Tablet,
  Smartphone,
  Monitor,
  Share,
  PlusSquare,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { DeviceType } from "@/hooks/usePWAInstall";
import {
  downloadMacDmg,
  downloadMacZip,
  downloadIpadApp,
  downloadMacWebloc,
  downloadMacCommandLauncher,
  downloadWindowsShortcut,
} from "@/lib/appDownload";

interface AppDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: DeviceType;
  isInstallable: boolean;
  onPromptInstall: () => Promise<boolean>;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  open,
  onOpenChange,
  device,
  isInstallable,
  onPromptInstall,
}) => {
  const initialTab =
    device === "mac"
      ? "mac"
      : device === "ipad"
      ? "ipad"
      : device === "ios"
      ? "iphone"
      : device === "windows"
      ? "pc"
      : device === "android"
      ? "android"
      : "mac";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await onPromptInstall();
    setInstalling(false);
    if (success) {
      toast.success("App installed successfully! You can now launch it from your home screen or dock.");
      onOpenChange(false);
    }
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast.success("App URL copied! Open this link on your device to install.");
  };

  const downloadShortcut = () => {
    const fn = downloadWindowsShortcut();
    toast.success(`Downloaded ${fn}! Move it to your desktop for 1-click access.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="text-left space-y-2 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#00205B] text-white flex items-center justify-center font-bold text-lg shadow-md border border-white/20">
              📚
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                Download & Install MFA Reading App
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  All Devices
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Install our official standalone web app on your MacBook, iPad, iPhone, Windows PC, or Android.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick direct install button if Chromium supported */}
        {isInstallable && (
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3">
            <div className="text-xs">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Direct 1-Click Install Available
              </div>
              <p className="text-muted-foreground mt-0.5">
                Your current browser supports instant 1-click installation.
              </p>
            </div>
            <Button
              size="sm"
              disabled={installing}
              onClick={handleInstallClick}
              className="text-xs font-bold text-white shrink-0 shadow-md border-0"
              style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {installing ? "Installing…" : "Install Now"}
            </Button>
          </div>
        )}

        {/* Device selector tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 h-10 rounded-2xl bg-muted p-1">
            <TabsTrigger value="mac" className="rounded-xl text-xs flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5" /> Mac
            </TabsTrigger>
            <TabsTrigger value="ipad" className="rounded-xl text-xs flex items-center gap-1">
              <Tablet className="w-3.5 h-3.5" /> iPad
            </TabsTrigger>
            <TabsTrigger value="iphone" className="rounded-xl text-xs flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> iPhone
            </TabsTrigger>
            <TabsTrigger value="pc" className="rounded-xl text-xs flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5" /> PC / Win
            </TabsTrigger>
            <TabsTrigger value="android" className="rounded-xl text-xs flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> Android
            </TabsTrigger>
          </TabsList>

          {/* MACBOOK / MACOS */}
          <TabsContent value="mac" className="space-y-3 mt-0">
            <div className="rounded-2xl border border-border p-4 bg-muted/30 space-y-3">
              <div className="font-semibold text-sm flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-primary" /> Install on Apple MacBook / iMac
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                  macOS Native
                </Badge>
              </div>

              {/* Direct .dmg Download */}
              <div className="p-3.5 rounded-xl bg-background border border-primary/30 space-y-2">
                <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-primary" /> macOS Disk Image (.dmg)
                  </span>
                  <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">
                    Verified Mountable
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Download the official macOS Apple Disk Image (.dmg) or zipped application archive. Double-click to mount and drag MFA Reading Challenge into your Applications folder.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const fn = downloadMacDmg();
                      toast.success(`Downloading ${fn}! Double-click the .dmg to mount and install.`);
                    }}
                    className="flex-1 text-xs font-bold text-white border-0 h-9 shadow-sm"
                    style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Download .dmg (Disk Image)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fn = downloadMacZip();
                      toast.success(`Downloading ${fn}! Extract and drag to Applications.`);
                    }}
                    className="text-xs font-bold h-9 border-primary/40 hover:bg-primary/10"
                  >
                    <Download className="w-4 h-4 mr-1.5 text-primary" /> Download .zip
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5">
                <div className="p-3 rounded-xl bg-background border border-border/80 space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Option 2: Safari "Add to Dock"
                  </div>
                  <p className="leading-relaxed">
                    In Safari on your Mac, click <code className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono text-[11px]">File &gt; Add to Dock…</code> or choose Share &gt; <strong>Add to Dock</strong>.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Apple creates a standalone Mac application directly in your Dock and Launchpad.
                  </p>
                </div>
              </div>

              {/* Verified macOS Desktop Launchers */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Additional macOS Launchers:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fn = downloadMacWebloc();
                      toast.success(`Downloaded ${fn}! Move to your Desktop for 1-click opening.`);
                    }}
                    className="text-xs h-9"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Mac Shortcut (.webloc)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fn = downloadMacCommandLauncher();
                      toast.success(`Downloaded ${fn}! Double-click to launch in Terminal.`);
                    }}
                    className="text-xs h-9"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Terminal Launcher (.command)
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* IPAD / IPADOS */}
          <TabsContent value="ipad" className="space-y-3 mt-0">
            <div className="rounded-2xl border border-border p-4 bg-muted/30 space-y-3">
              <div className="font-semibold text-sm flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-primary" /> Download &amp; Install on Apple iPad
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                  iPadOS Ready
                </Badge>
              </div>

              {/* Direct iPad Profile Download */}
              <div className="p-3.5 rounded-xl bg-background border border-primary/30 space-y-2">
                <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-primary" /> Direct iPad App (.mobileconfig)
                  </span>
                  <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">
                    Direct Download
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Download the Apple WebClip profile to install the MFA Reading Challenge app directly onto your iPad home screen and App Library without the App Store.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    const fn = downloadIpadApp();
                    toast.success(`Downloaded ${fn}! Go to iPad Settings > Profile Downloaded > Install.`);
                  }}
                  className="w-full text-xs font-bold text-white border-0 h-9 shadow-sm"
                  style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                >
                  <Download className="w-4 h-4 mr-1.5" /> Direct Download App for iPad
                </Button>
                <p className="text-[10px] text-muted-foreground italic">
                  * After downloading, tap "Allow", then open Settings app &gt; "Profile Downloaded" &gt; tap Install.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-primary" /> Option 2: Safari "Add to Home Screen"
                </div>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                  <li>Open this website in <strong>Safari</strong> on your iPad.</li>
                  <li>Tap the <strong>Share</strong> button <Share className="inline w-3 h-3 text-primary" /> in the toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3 h-3 text-primary" />.</li>
                  <li>Tap <strong>Add</strong> in the top-right corner to place the app on your iPad!</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* IPHONE / IOS */}
          <TabsContent value="iphone" className="space-y-3 mt-0">
            <div className="rounded-2xl border border-border p-4 bg-muted/30 space-y-3">
              <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Smartphone className="w-4 h-4 text-primary" /> How to install on Apple iPhone:
              </div>
              <ol className="text-xs text-muted-foreground space-y-2.5 list-decimal pl-4">
                <li>
                  Open this link in <strong className="text-foreground">Safari</strong>.
                </li>
                <li>
                  Tap the <strong className="text-foreground">Share icon</strong>{" "}
                  <Share className="inline w-3.5 h-3.5 text-primary" /> at the bottom center of the screen.
                </li>
                <li>
                  Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-foreground">Add</strong> to complete! The app runs in borderless full-screen mode like an App Store download.
                </li>
              </ol>
            </div>
          </TabsContent>

          {/* WINDOWS PC */}
          <TabsContent value="pc" className="space-y-3 mt-0">
            <div className="rounded-2xl border border-border p-4 bg-muted/30 space-y-3">
              <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Monitor className="w-4 h-4 text-primary" /> How to install on Windows PC / Laptop:
              </div>
              <ol className="text-xs text-muted-foreground space-y-2.5 list-decimal pl-4">
                <li>
                  In <strong className="text-foreground">Google Chrome, Edge, or Brave:</strong> Look at the right end of the address bar for the{" "}
                  <strong className="text-foreground">App available / Install (⊕)</strong> icon.
                </li>
                <li>
                  Click <strong className="text-foreground">Install</strong> to add it to your Windows Start Menu, Taskbar, and Desktop.
                </li>
                <li>
                  Or click the button below to download a 1-click Windows Desktop Web Shortcut:
                </li>
              </ol>
              <div className="pt-1">
                <Button size="sm" variant="outline" onClick={downloadShortcut} className="text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download Windows Desktop Shortcut (.url)
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ANDROID */}
          <TabsContent value="android" className="space-y-3 mt-0">
            <div className="rounded-2xl border border-border p-4 bg-muted/30 space-y-3">
              <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                <Smartphone className="w-4 h-4 text-primary" /> How to install on Android Phones & Tablets:
              </div>
              <ol className="text-xs text-muted-foreground space-y-2.5 list-decimal pl-4">
                <li>
                  In <strong className="text-foreground">Chrome for Android</strong>: Tap the three dots menu (⋮) in the top-right corner.
                </li>
                <li>
                  Select <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.
                </li>
                <li>
                  Confirm <strong className="text-foreground">Install</strong>. The app icon will appear in your app drawer and home screen.
                </li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Universal Action Footer */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground text-center sm:text-left">
            Need to install on another device?
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAppUrl}
              className="text-xs h-8 flex-1 sm:flex-none gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy App Link
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 flex-1 sm:flex-none"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
