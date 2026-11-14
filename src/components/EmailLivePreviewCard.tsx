import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EmailStyleOptions,
  buildBeautifulEmailHtml,
  OFFICIAL_APP_URL,
} from "@/lib/gmailService";
import {
  formatDraftTime,
  getBroadcastDraft,
  clearBroadcastDraft,
  ADMIN_BROADCAST_DRAFT_KEY,
} from "@/lib/broadcastDraftManager";
import { useMainSidebar } from "@/lib/sidebarHelper";
import { toast } from "sonner";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { exportCertificatePDF } from "@/lib/pdfExporter";
import { verifyAndLogCertificatePayload } from "@/lib/certificateStudioSync";
import { HOUSES, YEAR_GROUPS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import {
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  Eye,
  Smartphone,
  Monitor,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Layers,
  Cloud,
  RefreshCw,
  Trash2,
  Clock,
  MousePointerClick,
  Sliders,
  Link as LinkIcon,
  Copy,
  ChevronDown,
  ChevronUp,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Mail,
  FileText,
  Award,
  User,
  GraduationCap,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Users,
  School,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";

export const EMAIL_COLOR_PRESETS = [
  { name: "Academy Navy", value: "#00205B", bgClass: "bg-[#00205B]" },
  { name: "Emerald Green", value: "#059669", bgClass: "bg-emerald-600" },
  { name: "Royal Indigo", value: "#4338CA", bgClass: "bg-indigo-700" },
  { name: "Crimson Red", value: "#B91C1C", bgClass: "bg-red-700" },
  { name: "Gold Bronze", value: "#B45309", bgClass: "bg-amber-700" },
  { name: "Obsidian Slate", value: "#0F172A", bgClass: "bg-slate-900" },
];

export const BUTTON_COLOR_PRESETS = [
  { name: "Academy Navy", value: "#00205B" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Vibrant Rose", value: "#E11D48" },
  { name: "Royal Purple", value: "#7C3AED" },
  { name: "Solar Amber", value: "#D97706" },
  { name: "Electric Blue", value: "#0284C7" },
];

export const SEGMENT_BG_PRESETS = [
  { name: "Slate Soft", value: "#F8FAFC" },
  { name: "Pure White", value: "#FFFFFF" },
  { name: "Mint Soft", value: "#F0FDF4" },
  { name: "Sky Soft", value: "#EFF6FF" },
  { name: "Cream Soft", value: "#FFFBEB" },
  { name: "Rose Soft", value: "#FDF2F8" },
];

export const ACCENT_COLOR_PRESETS = [
  { name: "Academy Navy", value: "#00205B" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Royal Purple", value: "#7C3AED" },
  { name: "Rose Crimson", value: "#E11D48" },
  { name: "Solar Amber", value: "#D97706" },
  { name: "Electric Blue", value: "#0284C7" },
  { name: "Ocean Teal", value: "#0D9488" },
];

export const LINK_COLOR_PRESETS = [
  { name: "Electric Blue", value: "#0284C7" },
  { name: "Academy Navy", value: "#00205B" },
  { name: "Emerald", value: "#059669" },
  { name: "Royal Purple", value: "#7C3AED" },
  { name: "Rose Crimson", value: "#E11D48" },
];

export const SENDER_BADGE_PRESETS = [
  "Office of the Academy Librarian",
  "Homeroom Tutor",
  "Head of Year",
  "House Patron",
  "Academy Reading Committee",
  "M-Pesa Foundation Academy Leadership",
];

export interface CertificateDispatchData {
  studentName: string;
  studentEmail?: string;
  house?: string;
  yearGroup?: string;
  level: string;
  booksCount: number;
  verificationCode: string;
  challengeTitle?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  dateAwarded?: string;
}

export interface EmailLivePreviewCardProps {
  mode?: "broadcast" | "certificate";
  certificateData?: CertificateDispatchData;
  onCertificateDataChange?: (data: CertificateDispatchData) => void;
  subject: string;
  messageBody: string;
  recipientCount?: number;
  recipientLabel?: string;
  senderEmail?: string;
  styleOptions: EmailStyleOptions;
  onChangeStyleOptions: (options: EmailStyleOptions) => void;
  // Optional fast message editors directly inside studio
  onSubjectChange?: (val: string) => void;
  onMessageBodyChange?: (val: string) => void;
  // Auto-save capabilities
  autoSaveStatus?: {
    isSaving?: boolean;
    lastSavedAt?: number | Date | null;
    hasDraft?: boolean;
  };
  draftKey?: string;
  onClearDraft?: () => void;
}

export const EmailLivePreviewCard: React.FC<EmailLivePreviewCardProps> = ({
  mode = "broadcast",
  certificateData,
  onCertificateDataChange,
  subject,
  messageBody,
  recipientCount = 450,
  recipientLabel = "All Academy Students & Staff",
  senderEmail = "librarian@mpesafoundationacademy.ac.ke",
  styleOptions,
  onChangeStyleOptions,
  onSubjectChange,
  onMessageBodyChange,
  autoSaveStatus,
  draftKey = ADMIN_BROADCAST_DRAFT_KEY,
  onClearDraft,
}) => {
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHtmlRaw, setShowHtmlRaw] = useState(false);
  const [localDraftTime, setLocalDraftTime] = useState<number | null>(() => {
    const d = getBroadcastDraft(draftKey);
    return d ? d.updatedAt : null;
  });

  const { isCollapsed: sidebarCollapsed, toggle: toggleSidebar } = useMainSidebar();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.updatedAt) {
        setLocalDraftTime(e.detail.updatedAt);
      }
    };
    const clearHandler = () => {
      setLocalDraftTime(null);
    };
    window.addEventListener("mfa-broadcast-draft-saved", handler);
    window.addEventListener("mfa-broadcast-draft-cleared", clearHandler);
    return () => {
      window.removeEventListener("mfa-broadcast-draft-saved", handler);
      window.removeEventListener("mfa-broadcast-draft-cleared", clearHandler);
    };
  }, [draftKey]);

  const effectiveSavedAt = autoSaveStatus?.lastSavedAt ?? localDraftTime;
  const isSaving = autoSaveStatus?.isSaving;
  const hasDraftContent =
    autoSaveStatus?.hasDraft ??
    (Boolean(effectiveSavedAt) && (Boolean(subject.trim()) || Boolean(messageBody.trim())));

  const primary = styleOptions.primaryColor || "#00205B";
  const fontSize = styleOptions.fontSize || "md";
  const textAlign = styleOptions.textAlign || "left";
  const showLogo = styleOptions.showLogo !== false;
  const senderBadge = styleOptions.senderBadge || "Office of the Academy Librarian";
  const includeQuickLinks = styleOptions.includeQuickLinks !== false;
  const selectedLinks = styleOptions.selectedLinks || ["portal", "submit", "leaderboard", "progress"];

  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [showQuickMessageEditor, setShowQuickMessageEditor] = useState(false);
  const [rosterScholars, setRosterScholars] = useState<any[]>([]);

  // Certificate studio live preview & clean PDF export state
  const [certPreviewTab, setCertPreviewTab] = useState<"certificate" | "email">("certificate");
  const certCanvasRef = useRef<HTMLDivElement>(null);
  const certContainerRef = useRef<HTMLDivElement>(null);
  const [certScale, setCertScale] = useState(0.72);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (certContainerRef.current) {
        const availableWidth = certContainerRef.current.clientWidth - 24;
        const scale = Math.min(Math.max(availableWidth / 800, 0.38), 0.95);
        setCertScale(scale);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [certPreviewTab, mode]);

  const handleDownloadDirectPDF = async () => {
    if (!certificateData) return;
    try {
      setIsExportingPDF(true);
      // Verify and log payload before rendering / PDF exporting
      verifyAndLogCertificatePayload(certificateData, "Email Live Preview Card (Clean PDF Export)");
      toast.loading("Generating institutional clean A4 PDF...");
      await exportCertificatePDF(certCanvasRef.current, {
        filename: `MFA_${certificateData.level}_Certificate_${certificateData.studentName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        studentName: certificateData.studentName,
        level: certificateData.level,
        booksCount: certificateData.booksCount,
        signatoryName: certificateData.signatoryName || "Head Librarian",
        signatoryTitle: certificateData.signatoryTitle || "Media Specialist",
        dateAwarded: certificateData.dateAwarded || "1 July 2026",
        verificationCode: certificateData.verificationCode,
        challengeName: certificateData.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
        onSuccess: () => {
          toast.dismiss();
          toast.success(`Downloaded clean A4 PDF certificate for ${certificateData.studentName}!`);
        },
      });
    } catch (err: any) {
      toast.dismiss();
      toast.error("Failed to generate PDF: " + (err.message || "Unknown error"));
    } finally {
      setIsExportingPDF(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, house, year_group, role")
          .order("full_name")
          .limit(100);
        if (data && data.length > 0) {
          setRosterScholars(data.filter((p) => !p.role || p.role === "student"));
        }
      } catch (err) {
        console.warn("Could not load scholars roster:", err);
      }
    })();
  }, []);

  const paragraphs = (messageBody || "")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const handleCopyRichHtml = async () => {
    try {
      const blobHtml = new Blob([previewHtml], { type: "text/html" });
      const blobText = new Blob([messageBody || ""], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      toast.success("Copied formatted rich email! Ready to paste into Gmail, Outlook, or Apple Mail with all colors preserved.");
    } catch {
      await navigator.clipboard.writeText(previewHtml);
      toast.success("Copied HTML code to clipboard!");
    }
  };

  const updateSegmentOverride = (index: number, partial: { bg?: string; border?: string; accent?: string; textColor?: string }) => {
    const current = { ...(styleOptions.segmentOverrides || {}) };
    current[index] = { ...(current[index] || {}), ...partial };
    handleUpdate({ segmentOverrides: current });
  };

  const removeSegmentOverride = (index: number) => {
    const current = { ...(styleOptions.segmentOverrides || {}) };
    delete current[index];
    handleUpdate({ segmentOverrides: current });
  };

  const handleUpdate = (partial: Partial<EmailStyleOptions>) => {
    onChangeStyleOptions({
      ...styleOptions,
      ...partial,
    });
  };

  const toggleLink = (key: "portal" | "submit" | "leaderboard" | "progress") => {
    const next = selectedLinks.includes(key)
      ? selectedLinks.filter((l) => l !== key)
      : [...selectedLinks, key];
    handleUpdate({ selectedLinks: next });
  };

  const previewHtml = buildBeautifulEmailHtml(
    subject || (mode === "certificate" ? "Certificate of Achievement" : "Announcement Title"),
    messageBody || "Your message body content will appear here exactly as scholars and parents receive it in their inboxes.",
    {
      ...styleOptions,
      certificateData: mode === "certificate" && certificateData ? {
        studentName: certificateData.studentName,
        level: certificateData.level,
        booksCount: certificateData.booksCount,
        verificationCode: certificateData.verificationCode,
        challengeTitle: certificateData.challengeTitle,
        signatoryName: certificateData.signatoryName,
        signatoryTitle: certificateData.signatoryTitle,
        dateAwarded: certificateData.dateAwarded,
      } : styleOptions.certificateData,
    }
  );

  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none bg-background overflow-y-auto flex flex-col"
          : ""
      }`}
    >
      {/* Top Header Bar with Auto-Save status & Quick Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-border bg-card shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base sm:text-lg text-foreground">
                  Broadcast Workspace Studio &amp; Live Preview
                </span>
                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary font-medium">
                  Split Workspace
                </Badge>

                {/* Auto-save real-time badge */}
                {isSaving ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-mono animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Auto-saving draft…
                  </Badge>
                ) : hasDraftContent && effectiveSavedAt ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-mono">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Auto-saved {formatDraftTime(effectiveSavedAt)}
                    </Badge>
                    {onClearDraft && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearDraft}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                        title="Discard saved draft and start fresh"
                      >
                        <Trash2 className="w-3 h-3" /> Discard
                      </Button>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border/60 gap-1 font-mono">
                    <Cloud className="w-3 h-3 text-primary/70" /> Auto-save active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Styling studio controls on the left update the authentic Gmail / Apple Mail preview on the right instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Main Sidebar Toggle */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Fullscreen Edge-to-Edge Toggle Button */}
          <Button
            type="button"
            variant={isFullscreen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 text-xs font-semibold gap-1.5 border-border shadow-2xs"
            title={isFullscreen ? "Exit Fullscreen Studio (Esc)" : "Expand Workspace to Fullscreen edge-to-edge"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span>Fullscreen Studio</span>
              </>
            )}
          </Button>

          {/* Main Sidebar Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 text-xs font-semibold gap-1.5 border-border shadow-2xs"
            title={sidebarCollapsed ? "Expand Main Navigation Sidebar" : "Hide Main Sidebar to maximize Broadcast Studio"}
          >
            {sidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-primary" />
                <span>Show Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Hide Sidebar</span>
              </>
            )}
          </Button>

          {/* Copy Styled Rich HTML for direct paste */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyRichHtml}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            title="Copy formatted email with full styles, colors & buttons"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Styled Email
          </Button>

          {/* Device Switcher (Desktop vs Mobile) */}
          <div className="flex items-center rounded-xl bg-muted p-1 border border-border/60">
            <Button
              type="button"
              variant={previewDevice === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewDevice("desktop")}
              className="h-6 text-xs px-2 gap-1"
            >
              <Monitor className="w-3 h-3" /> Desktop
            </Button>
            <Button
              type="button"
              variant={previewDevice === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewDevice("mobile")}
              className="h-6 text-xs px-2 gap-1"
            >
              <Smartphone className="w-3 h-3" /> Mobile
            </Button>
          </div>

          {/* Raw HTML Code toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowHtmlRaw(!showHtmlRaw)}
            className="h-8 text-xs font-mono"
            title="Toggle between HTML Code & Rendered View"
          >
            {showHtmlRaw ? "Rendered" : "HTML Code"}
          </Button>
        </div>
      </div>

      {/* Main Split Layout:
          LEFT COLUMN: Styling Studio Controls (going down on the left)
          RIGHT COLUMN: Live Pre-Send Email Client Preview (on the right side) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* ========================================================
            LEFT COLUMN: STYLING STUDIO (going down on the left)
            ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-5 border-r border-border p-4 sm:p-5 space-y-4 bg-muted/20 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                Styling Studio
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Live Inspector
            </span>
          </div>

          {/* Quick Subject & Body Editor inside Studio (if handlers provided) */}
          {(onSubjectChange || onMessageBodyChange) && (
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Message Text
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickMessageEditor(!showQuickMessageEditor)}
                  className="h-6 px-2 text-[10px] font-semibold text-primary gap-1"
                >
                  {showQuickMessageEditor ? "Collapse" : "Edit Subject & Body"}
                  {showQuickMessageEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              {showQuickMessageEditor && (
                <div className="space-y-2 pt-1 border-t border-border/50 text-xs">
                  {onSubjectChange && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject Line</Label>
                      <Input
                        value={subject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        placeholder="Announcement Subject..."
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                  )}
                  {onMessageBodyChange && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Message Body</Label>
                      <Textarea
                        rows={4}
                        value={messageBody}
                        onChange={(e) => onMessageBodyChange(e.target.value)}
                        placeholder="Write paragraphs (double newline creates colored cards)..."
                        className="text-xs resize-y"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Certificate Scholar & Award Configuration (Visible in Certificate Mode) */}
          {mode === "certificate" && certificateData && onCertificateDataChange && (
            <div className="p-3.5 rounded-xl bg-card border-2 border-amber-500/40 space-y-3 shadow-xs bg-gradient-to-b from-amber-500/5 to-transparent">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Scholar Recipient &amp; Award Tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 text-[10px] font-mono">
                    {certificateData.level} Tier
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDownloadDirectPDF}
                    disabled={isExportingPDF}
                    className="h-6 px-2 text-[10px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    title="Export clean A4 landscape PDF without borders"
                  >
                    <Download className="w-2.5 h-2.5" /> PDF
                  </Button>
                </div>
              </div>

              {/* Quick Studio Presets from Official Certificate Studio (Abdullahi Adan & Abigael Wanjiru) */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Certificate Studio Standards
                  </span>
                  <span className="text-[9px] font-normal text-muted-foreground">Click to load</span>
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      name: "ABDULLAHI ADAN",
                      level: "Beginner",
                      booksCount: 1,
                      verificationCode: "MFA-RC-2026-42013",
                      house: "Kenya House",
                      yearGroup: "DP1",
                      color: "#16A34A",
                      medal: "🏅",
                      badge: "Beginner (1 Book)",
                    },
                    {
                      name: "ABIGAEL WANJIRU",
                      level: "Gold",
                      booksCount: 45,
                      verificationCode: "MFA-RC-2026-40248",
                      house: "Longonot House",
                      yearGroup: "DP2",
                      color: "#D4AF37",
                      medal: "🥇",
                      badge: "Gold (45 Books)",
                    },
                    {
                      name: "ANTONY MUUO",
                      level: "Silver",
                      booksCount: 16,
                      verificationCode: "MFA-RC-2026-82447",
                      house: "Kilimanjaro House",
                      yearGroup: "DP1",
                      color: "#94A3B8",
                      medal: "🥈",
                      badge: "Silver (16 Books)",
                    },
                    {
                      name: "AMINA MBETSA",
                      level: "Bronze",
                      booksCount: 9,
                      verificationCode: "MFA-RC-2026-59215",
                      house: "Elgon House",
                      yearGroup: "G10",
                      color: "#CD7F32",
                      medal: "🥉",
                      badge: "Bronze (9 Books)",
                    },
                  ].map((p) => {
                    const isCurrent = certificateData.studentName.toUpperCase() === p.name.toUpperCase();
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...certificateData,
                            studentName: p.name,
                            studentEmail: `${p.name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                            house: p.house,
                            yearGroup: p.yearGroup,
                            level: p.level,
                            booksCount: p.booksCount,
                            verificationCode: p.verificationCode,
                            challengeTitle: certificateData.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
                            signatoryName: certificateData.signatoryName || "Head Librarian",
                            signatoryTitle: certificateData.signatoryTitle || "Media Specialist",
                            dateAwarded: certificateData.dateAwarded || "1 July 2026",
                          };
                          onCertificateDataChange(updated);
                          if (onSubjectChange) {
                            onSubjectChange(`🎓 Official ${p.level} Certificate of Achievement: ${updated.challengeTitle}`);
                          }
                          if (onMessageBodyChange) {
                            onMessageBodyChange(
                              `Hello ${p.name},\n\nCongratulations on achieving the official ${p.level} Reading Award! In recognition of your dedicated reading and completion of ${p.booksCount} Verified Books in the ${updated.challengeTitle}, your certificate has been validated by the Teaching & Learning Directorate and the Academy Library.\n\nVerification Serial: ${p.verificationCode}`
                            );
                          }
                          toast.success(`Loaded ${p.name}'s ${p.level} Certificate from Studio!`);
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="flex items-center gap-1">
                            <span>{p.medal}</span>
                            <span className="truncate">{p.name}</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-0.5">
                          <span style={{ color: p.color }} className="font-semibold">{p.badge}</span>
                          <span className="font-mono text-[9px]">{p.verificationCode.slice(-5)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Scholar Picker from Database */}
              {rosterScholars.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Quick Select Scholar from Certificate Studio Roster
                  </Label>
                  <Select
                    onValueChange={(val) => {
                      const s = rosterScholars.find((x) => x.user_id === val);
                      if (s) {
                        const cleanHouse = s.house ? (s.house.endsWith("House") ? s.house : `${s.house} House`) : "Kenya House";
                        const serialCode = `MFA-CERT-${cleanHouse.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                        onCertificateDataChange({
                          ...certificateData,
                          studentName: s.full_name || "Scholar Reader",
                          studentEmail: s.email || `${(s.full_name || "student").toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                          house: cleanHouse,
                          yearGroup: s.year_group || "DP1",
                          verificationCode: serialCode,
                        });
                        toast.success(`Loaded ${s.full_name}'s academic record into Certificate Dispatch.`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-amber-500/30">
                      <SelectValue placeholder={`Choose from ${rosterScholars.length} enrolled scholars...`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {rosterScholars.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          <span className="font-semibold text-xs">{s.full_name}</span>
                          <span className="text-[11px] text-muted-foreground ml-1.5">
                            · {s.house || "Kenya"} {s.year_group ? `(${s.year_group})` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Scholar Full Name</Label>
                  <Input
                    value={certificateData.studentName}
                    onChange={(e) => onCertificateDataChange({ ...certificateData, studentName: e.target.value })}
                    placeholder="e.g. Abdullahi Adan"
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Scholar School Email</Label>
                  <Input
                    value={certificateData.studentEmail || ""}
                    onChange={(e) => onCertificateDataChange({ ...certificateData, studentEmail: e.target.value })}
                    placeholder="e.g. abdullahi.adan@mpesafoundationacademy.ac.ke"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">House</Label>
                  <Select
                    value={certificateData.house || "Kenya House"}
                    onValueChange={(val) => onCertificateDataChange({ ...certificateData, house: val })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kenya House">Kenya House (Navy)</SelectItem>
                      <SelectItem value="Longonot House">Longonot House (Yellow)</SelectItem>
                      <SelectItem value="Kilimanjaro House">Kilimanjaro House (Red)</SelectItem>
                      <SelectItem value="Elgon House">Elgon House (Green)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Year Group</Label>
                  <Select
                    value={certificateData.yearGroup || "DP1"}
                    onValueChange={(val) => onCertificateDataChange({ ...certificateData, yearGroup: val })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DP2">DP2 (Grade 12)</SelectItem>
                      <SelectItem value="DP1">DP1 (Grade 11)</SelectItem>
                      <SelectItem value="G10">G10 (Grade 10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Award Tier</Label>
                  <Select
                    value={certificateData.level || "Beginner"}
                    onValueChange={(val) => onCertificateDataChange({ ...certificateData, level: val })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">🏅 Beginner Reader Award</SelectItem>
                      <SelectItem value="Bronze">🥉 Bronze Reader Award (15 Books)</SelectItem>
                      <SelectItem value="Silver">🥈 Silver Reader Award (30 Books)</SelectItem>
                      <SelectItem value="Gold">🥇 Gold Reader Award (45 Books)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Verified Books Count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={certificateData.booksCount}
                    onChange={(e) => onCertificateDataChange({ ...certificateData, booksCount: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Verification Serial Hash</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomNum = Math.floor(1000 + Math.random() * 9000);
                        const code = `MFA-CERT-KEN-${randomNum}`;
                        onCertificateDataChange({ ...certificateData, verificationCode: code });
                      }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Re-roll
                    </button>
                  </div>
                  <Input
                    value={certificateData.verificationCode}
                    onChange={(e) => onCertificateDataChange({ ...certificateData, verificationCode: e.target.value })}
                    placeholder="e.g. MFA-RC-2026-42013"
                    className="h-8 text-xs font-mono font-bold text-amber-500 uppercase"
                  />
                </div>
              </div>

              {/* Direct Clean PDF Download Bar inside Settings */}
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Clean Institutional A4 Export:</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadDirectPDF}
                  disabled={isExportingPDF}
                  className="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF Certificate
                </Button>
              </div>
            </div>
          )}

          {/* 1. Header Banner & Theme Color */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" /> Header Banner Color
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">School Logo</span>
                <Switch
                  checked={showLogo}
                  onCheckedChange={(val) => handleUpdate({ showLogo: val })}
                  className="scale-75 origin-right"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {EMAIL_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleUpdate({ primaryColor: preset.value })}
                  title={preset.name}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    primary === preset.value ? "border-foreground ring-2 ring-primary scale-110" : "border-background"
                  }`}
                  style={{ backgroundColor: preset.value }}
                >
                  {primary === preset.value && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{primary}</span>
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => handleUpdate({ primaryColor: e.target.value })}
                  title="Pick custom banner color"
                  className="w-6 h-6 rounded-md cursor-pointer border border-border bg-transparent p-0"
                />
              </div>
            </div>
          </div>

          {/* 2. Section / Div Card Style & Background */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" /> Section / Div Style &amp; Cards
              </Label>
              <Badge variant="outline" className="text-[9px] uppercase font-mono">
                {styleOptions.sectionStyle || "cards"}
              </Badge>
            </div>

            <Select
              value={styleOptions.sectionStyle || "cards"}
              onValueChange={(val: any) => handleUpdate({ sectionStyle: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Div Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cards">📦 Segmented Cards (Distinct Divs with Borders)</SelectItem>
                <SelectItem value="callout">📌 Callout Highlight (Left Accent Border)</SelectItem>
                <SelectItem value="minimal">➖ Minimal Dividers (Clean Hairlines)</SelectItem>
                <SelectItem value="classic">📄 Classic Plain (Continuous Text)</SelectItem>
              </SelectContent>
            </Select>

            {/* Segment Card Background Palette */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
              <span className="font-semibold text-muted-foreground">Div Card Background:</span>
              <div className="flex items-center gap-1 shrink-0">
                {SEGMENT_BG_PRESETS.map((bg) => (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => handleUpdate({ segmentBgColor: bg.value })}
                    title={`Card Background: ${bg.name}`}
                    className={`w-5 h-5 rounded-md border transition-all ${
                      (styleOptions.segmentBgColor || "#F8FAFC") === bg.value
                        ? "border-primary ring-1 ring-primary scale-105"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: bg.value }}
                  />
                ))}
                <input
                  type="color"
                  value={styleOptions.segmentBgColor || "#f8fafc"}
                  onChange={(e) => handleUpdate({ segmentBgColor: e.target.value })}
                  title="Pick segment background color"
                  className="w-5 h-5 rounded-md cursor-pointer border border-border bg-transparent p-0"
                />
              </div>
            </div>
          </div>

          {/* 3. Call-To-Action (CTA) Button & Redirect Link */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-xs text-foreground">Action Button &amp; Redirect Link</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">Include:</span>
                <Switch
                  checked={styleOptions.showCtaButton !== false}
                  onCheckedChange={(val) => handleUpdate({ showCtaButton: val })}
                  className="scale-90"
                />
              </div>
            </div>

            {styleOptions.showCtaButton !== false && (
              <div className="space-y-2.5 pt-1 text-xs">
                {/* Button Text */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Button Label</Label>
                  <Input
                    value={styleOptions.ctaButtonText ?? "🚀 Open MFA Reading Portal"}
                    onChange={(e) => handleUpdate({ ctaButtonText: e.target.value })}
                    placeholder="e.g. 🚀 Open Reading Portal"
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                {/* Redirect URL */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                    <span>Redirect Link (Destination URL)</span>
                    <span className="text-[9px] lowercase text-primary font-normal">recipients open this link</span>
                  </Label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      value={styleOptions.ctaButtonUrl ?? OFFICIAL_APP_URL}
                      onChange={(e) => handleUpdate({ ctaButtonUrl: e.target.value })}
                      placeholder="https://..."
                      className="h-8 text-xs pl-8 font-mono"
                    />
                  </div>
                </div>

                {/* Quick Link URL chips */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                  <span className="font-semibold text-muted-foreground">Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        ctaButtonUrl: OFFICIAL_APP_URL,
                        ctaButtonText: "🚀 Open Reading Portal",
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-mono"
                  >
                    Portal Home
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        ctaButtonUrl: `${OFFICIAL_APP_URL}/submit`,
                        ctaButtonText: "📖 Submit Book Review",
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-mono"
                  >
                    /submit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        ctaButtonUrl: `${OFFICIAL_APP_URL}/leaderboard`,
                        ctaButtonText: "🏆 View House Leaderboard",
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground font-mono"
                  >
                    /leaderboard
                  </button>
                </div>

                {/* Button Color Palette */}
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Button Color</Label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {BUTTON_COLOR_PRESETS.map((bp) => (
                      <button
                        key={bp.value}
                        type="button"
                        onClick={() => handleUpdate({ ctaButtonColor: bp.value })}
                        title={bp.name}
                        className={`w-6 h-6 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                          (styleOptions.ctaButtonColor || primary) === bp.value
                            ? "border-foreground ring-2 ring-primary scale-105"
                            : "border-background"
                        }`}
                        style={{ backgroundColor: bp.value }}
                      >
                        {(styleOptions.ctaButtonColor || primary) === bp.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={styleOptions.ctaButtonColor || primary}
                      onChange={(e) => handleUpdate({ ctaButtonColor: e.target.value })}
                      title="Custom button hex color"
                      className="w-6 h-6 rounded-md cursor-pointer border border-border bg-transparent p-0"
                    />
                  </div>
                </div>

                {/* Button Size, Radius & Text Color */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
                  <div>
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">
                      Button Size
                    </span>
                    <div className="flex rounded-md border border-border bg-muted/40 p-0.5">
                      {(["sm", "md", "lg"] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleUpdate({ ctaButtonSize: sz })}
                          className={`flex-1 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            (styleOptions.ctaButtonSize || "md") === sz
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sz.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">
                      Corner Shape
                    </span>
                    <div className="flex rounded-md border border-border bg-muted/40 p-0.5">
                      {(["rounded", "pill", "square"] as const).map((rad) => (
                        <button
                          key={rad}
                          type="button"
                          onClick={() => handleUpdate({ ctaButtonRadius: rad })}
                          className={`flex-1 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            (styleOptions.ctaButtonRadius || "rounded") === rad
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {rad === "rounded" ? "Round" : rad === "pill" ? "Pill" : "Box"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Paragraph Segments & Div Colors Customizer */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bold text-xs text-foreground">Paragraph Divs &amp; Colors</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                {paragraphs.length} Div{paragraphs.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Palette Theme:</span>
                <Select
                  value={styleOptions.segmentPalette || "uniform"}
                  onValueChange={(val: any) => handleUpdate({ segmentPalette: val })}
                >
                  <SelectTrigger className="h-7 text-xs w-44">
                    <SelectValue placeholder="Segment Palette" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform">🎨 Uniform Theme Stripe</SelectItem>
                    <SelectItem value="rainbow">🌈 Vibrant Rainbow (Unique per div)</SelectItem>
                    <SelectItem value="alternating">🔄 Alternating Accent Colors</SelectItem>
                    <SelectItem value="custom">🛠️ Custom Overrides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accent Stripe Color */}
              <div className="space-y-1 pt-1 border-t border-border/40">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Default Stripe Accent Color</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACCENT_COLOR_PRESETS.map((ap) => (
                    <button
                      key={ap.value}
                      type="button"
                      onClick={() => handleUpdate({ segmentAccentColor: ap.value })}
                      title={ap.name}
                      className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 flex items-center justify-center ${
                        (styleOptions.segmentAccentColor || primary) === ap.value ? "border-foreground ring-1 ring-primary scale-110" : "border-border"
                      }`}
                      style={{ backgroundColor: ap.value }}
                    >
                      {(styleOptions.segmentAccentColor || primary) === ap.value && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={styleOptions.segmentAccentColor || primary}
                    onChange={(e) => handleUpdate({ segmentAccentColor: e.target.value })}
                    title="Pick custom accent stripe color"
                    className="w-5 h-5 rounded cursor-pointer border p-0 bg-transparent"
                  />
                </div>
              </div>

              {/* In-Text Link Color */}
              <div className="space-y-1 pt-1 border-t border-border/40">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">In-Text Links Color</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LINK_COLOR_PRESETS.map((lp) => (
                    <button
                      key={lp.value}
                      type="button"
                      onClick={() => handleUpdate({ linkColor: lp.value })}
                      title={lp.name}
                      className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 flex items-center justify-center ${
                        (styleOptions.linkColor || "#0284c7") === lp.value ? "border-foreground ring-1 ring-primary scale-110" : "border-border"
                      }`}
                      style={{ backgroundColor: lp.value }}
                    >
                      {(styleOptions.linkColor || "#0284c7") === lp.value && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={styleOptions.linkColor || "#0284c7"}
                    onChange={(e) => handleUpdate({ linkColor: e.target.value })}
                    title="Pick custom link color"
                    className="w-5 h-5 rounded cursor-pointer border p-0 bg-transparent"
                  />
                </div>
              </div>

              {/* Expandable Per-Div Color Inspector */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSectionEditor(!showSectionEditor)}
                  className="h-7 text-xs font-semibold gap-1.5 w-full justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-primary" />
                    Customize Each Div ({paragraphs.length})
                  </span>
                  {showSectionEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>

                {showSectionEditor && (
                  <div className="space-y-2 pt-2 border-t border-border/40 mt-2 max-h-56 overflow-y-auto pr-1">
                    {paragraphs.map((para, pIdx) => {
                      const override = styleOptions.segmentOverrides?.[pIdx] || {};
                      const currentAccent =
                        override.accent ||
                        (styleOptions.segmentPalette === "rainbow"
                          ? ACCENT_COLOR_PRESETS[pIdx % ACCENT_COLOR_PRESETS.length].value
                          : (styleOptions.segmentAccentColor || primary));
                      const currentBg = override.bg || styleOptions.segmentBgColor || "#f8fafc";

                      return (
                        <div
                          key={`seg-edit-${pIdx}`}
                          className="p-2 rounded-lg border border-border bg-muted/30 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] flex items-center gap-1">
                              <span
                                className="w-2.5 h-2.5 rounded-xs"
                                style={{ backgroundColor: currentAccent }}
                              />
                              Div #{pIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                Stripe:
                                <input
                                  type="color"
                                  value={currentAccent}
                                  onChange={(e) => updateSegmentOverride(pIdx, { accent: e.target.value })}
                                  className="w-4 h-4 rounded cursor-pointer border p-0 bg-transparent"
                                />
                              </label>
                              <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                Bg:
                                <input
                                  type="color"
                                  value={currentBg}
                                  onChange={(e) => updateSegmentOverride(pIdx, { bg: e.target.value })}
                                  className="w-4 h-4 rounded cursor-pointer border p-0 bg-transparent"
                                />
                              </label>
                              {(override.accent || override.bg) && (
                                <button
                                  type="button"
                                  onClick={() => removeSegmentOverride(pIdx)}
                                  className="text-[9px] text-muted-foreground hover:text-destructive underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1 italic">
                            "{para}"
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Typography, Alignment & Sender Badge */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" /> Font Size &amp; Position
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={fontSize}
                onValueChange={(val: "sm" | "md" | "lg" | "xl") => handleUpdate({ fontSize: val })}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (13px)</SelectItem>
                  <SelectItem value="md">Standard (15px)</SelectItem>
                  <SelectItem value="lg">Large (17px)</SelectItem>
                  <SelectItem value="xl">XL Headline (19px)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdate({ textAlign: "left" })}
                  className={`p-1.5 rounded-md ${textAlign === "left" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  title="Left Align"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ textAlign: "center" })}
                  className={`p-1.5 rounded-md ${textAlign === "center" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  title="Center Align"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-border/40">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sender Badge</Label>
              <Select
                value={senderBadge}
                onValueChange={(val) => handleUpdate({ senderBadge: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select sender badge" />
                </SelectTrigger>
                <SelectContent>
                  {SENDER_BADGE_PRESETS.map((badge) => (
                    <SelectItem key={badge} value={badge}>
                      {badge}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 6. Footer Quick Action Pills */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-xs text-foreground">Footer Quick-Action Pills</span>
              </div>
              <Switch
                checked={includeQuickLinks}
                onCheckedChange={(val) => handleUpdate({ includeQuickLinks: val })}
                className="scale-75 origin-right"
              />
            </div>

            {includeQuickLinks && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: "portal", label: "Portal Home", url: OFFICIAL_APP_URL },
                  { id: "submit", label: "Submit Book", url: `${OFFICIAL_APP_URL}/submit` },
                  { id: "leaderboard", label: "Leaderboard", url: `${OFFICIAL_APP_URL}/leaderboard` },
                  { id: "progress", label: "My Progress", url: `${OFFICIAL_APP_URL}/progress` },
                ].map((item) => {
                  const active = selectedLinks.includes(item.id as any);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleLink(item.id as any)}
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-all ${
                        active
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                          : "bg-background border-border text-muted-foreground line-through opacity-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: LIVE EMAIL CLIENT PREVIEW (on the right side)
            ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-7 p-4 sm:p-6 bg-slate-100/90 dark:bg-slate-950/90 lg:sticky lg:top-16 self-start lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto space-y-3">
          {/* Header indicator inside Right Preview area */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">
                {mode === "certificate" ? "Live Certificate Dispatch Studio" : "Live Recipient View"}
              </span>
              <span className="text-[11px] font-mono">({previewDevice === "mobile" ? "Mobile 380px" : "Full Desktop"})</span>
            </div>

            {/* Mode-specific view toggles */}
            {mode === "certificate" ? (
              <div className="flex items-center gap-1 p-1 bg-background rounded-xl border border-border shadow-2xs">
                <Button
                  type="button"
                  size="sm"
                  variant={certPreviewTab === "certificate" ? "default" : "ghost"}
                  onClick={() => setCertPreviewTab("certificate")}
                  className="h-6 text-xs px-2.5 font-bold gap-1"
                >
                  <Award className="w-3 h-3 text-amber-500" /> Studio Certificate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={certPreviewTab === "email" ? "default" : "ghost"}
                  onClick={() => setCertPreviewTab("email")}
                  className="h-6 text-xs px-2.5 font-bold gap-1"
                >
                  <Mail className="w-3 h-3 text-blue-500" /> Email Notification
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-background font-mono">
                {recipientCount} Recipient{recipientCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          {/* VIEW 1: OFFICIAL STUDIO CERTIFICATE VIEW */}
          {mode === "certificate" && certPreviewTab === "certificate" ? (
            <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden p-4 sm:p-5 space-y-4">
              {/* Studio Certificate Top Action Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{certificateData?.studentName || "Abdullahi Adan"}</span>
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 text-[10px] font-mono">
                        {certificateData?.level || "Beginner"} Award
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Serial: {certificateData?.verificationCode || "MFA-RC-2026-42013"} · {certificateData?.booksCount || 1} Books Logged
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDownloadDirectPDF}
                    disabled={isExportingPDF}
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    title="Export clean A4 landscape PDF without borders"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Clean A4 PDF
                  </Button>
                </div>
              </div>

              {/* Canvas Display Container with Auto-Scaling matching image_39de208f.png */}
              <div
                ref={certContainerRef}
                className="w-full flex justify-center items-center py-5 px-2 bg-slate-950/80 rounded-xl overflow-hidden min-h-[440px] border border-border/60"
              >
                <div
                  className="transition-transform duration-200"
                  style={{
                    width: `${800 * certScale}px`,
                    height: `${566 * certScale}px`,
                    position: "relative",
                  }}
                >
                  <CertificateCanvas
                    ref={certCanvasRef}
                    scale={certScale}
                    data={{
                      studentName: certificateData?.studentName || "Abdullahi Adan",
                      studentEmail: certificateData?.studentEmail,
                      level: (certificateData?.level as any) || "Beginner",
                      booksCount: certificateData?.booksCount ?? 1,
                      verificationCode: certificateData?.verificationCode || "MFA-RC-2026-42013",
                      challengeName: certificateData?.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
                      signatoryName: certificateData?.signatoryName || "Head Librarian",
                      signatoryTitle: certificateData?.signatoryTitle || "Media Specialist",
                      dateAwarded: certificateData?.dateAwarded || "1 July 2026",
                    }}
                  />
                </div>
              </div>

              {/* Institutional Quality Bar */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Institutional Vector Layout (800x566). Clean A4 export strips outside borders.</span>
                </span>
                <span className="font-mono text-[10px] text-primary font-bold">Cryptographically Verified</span>
              </div>
            </div>
          ) : (
            /* VIEW 2: AUTHENTIC GMAIL / APPLE MAIL CLIENT WINDOW */
            <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 shadow-md overflow-hidden">
              {/* Window Chrome Top Header */}
              <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-border p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                    <span className="font-bold text-xs sm:text-sm text-foreground ml-2">
                      Official M-Pesa Foundation Academy Email Dispatch
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs py-0.5 px-2">
                    Inbox Verified
                  </Badge>
                </div>

                {/* Email Envelope Metadata */}
                <div className="text-sm space-y-1.5 font-mono pt-1.5 text-muted-foreground border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground w-16 shrink-0">From:</span>
                    <span className="text-foreground truncate font-sans text-sm">{senderEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground w-16 shrink-0">To:</span>
                    <span className="text-foreground font-sans truncate text-sm">
                      {recipientLabel} <span className="text-muted-foreground text-xs">({recipientCount} scholars &amp; staff)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground w-16 shrink-0">Subject:</span>
                    <span className="font-bold text-foreground font-sans truncate text-base">
                      {subject || "(No subject set)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Canvas Container */}
              <div
                className={`p-2 sm:p-4 bg-white dark:bg-slate-950 transition-all ${
                  previewDevice === "mobile" ? "max-w-[390px] mx-auto" : "w-full"
                }`}
              >
                {showHtmlRaw ? (
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto rounded-xl max-h-96">
                    {previewHtml}
                  </pre>
                ) : (
                  <div
                    className="rounded-xl border border-border/70 overflow-hidden shadow-xs"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Delivery Note */}
          <div className="p-2.5 rounded-xl bg-background/80 border border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Live HTML rendered with school logo, styled divs, colors, redirect button, and clickable links.
            </span>
            <span className="font-mono text-[10px] text-primary">Responsive 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailLivePreviewCard;
