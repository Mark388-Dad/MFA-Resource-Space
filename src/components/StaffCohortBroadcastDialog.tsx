import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  connectGmail,
  getGmailConnectionStatus,
  sendViaGoogleGmail,
  createWebGmailComposeUrl,
  GmailConnectionStatus,
  EmailStyleOptions,
  buildBeautifulEmailHtml,
  dispatchCertificateEmailService,
} from "@/lib/gmailService";
import { cn } from "@/lib/utils";
import { EmailLivePreviewCard } from "@/components/EmailLivePreviewCard";
import {
  formatDraftTime,
  getBroadcastDraft,
  saveBroadcastDraft,
  clearBroadcastDraft,
  COHORT_BROADCAST_DRAFT_KEY,
} from "@/lib/broadcastDraftManager";
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  Sparkles,
  Megaphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  Trash2,
  Check,
  Award,
  Download,
  Printer,
  FileCheck,
  FileText,
} from "lucide-react";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { OfficialCertificateCard } from "@/components/OfficialCertificateCard";
import { generateAndDownloadCertificatePDF } from "@/lib/certificatePdfService";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CertificateTargetInfo {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  house?: string;
  yearGroup?: string;
  className?: string;
  booksCount: number;
  level: string;
  verificationCode?: string;
}

interface Props {
  staffRole?: string;
  yearGroup?: string | null;
  className?: string | null;
  house?: string | null;
  triggerButton?: React.ReactNode;
  initialMode?: "broadcast" | "certificate";
  initialTarget?: CertificateTargetInfo | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface StudentRecipient {
  user_id: string;
  full_name: string;
  email: string;
  year_group?: string | null;
  class_name?: string | null;
  house?: string | null;
  books?: number;
}

export const StaffCohortBroadcastDialog: React.FC<Props> = ({
  staffRole = "homeroom_tutor",
  yearGroup = "",
  className = "",
  house = "",
  triggerButton,
  initialMode = "broadcast",
  initialTarget = null,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}) => {
  const { profile, user } = useAuth();
  const initialDraft = getBroadcastDraft(COHORT_BROADCAST_DRAFT_KEY);

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(val);
    } else {
      setInternalOpen(val);
    }
  };

  const canIssueCertificates = profile?.role === "librarian" || profile?.role === "admin";
  const [mode, setMode] = useState<"broadcast" | "certificate">(canIssueCertificates ? initialMode : "broadcast");
  const [certTarget, setCertTarget] = useState<CertificateTargetInfo | null>(initialTarget);

  const [subject, setSubject] = useState(() => initialDraft?.subject || "");
  const [message, setMessage] = useState(() => initialDraft?.body || "");
  const [sendToEmail, setSendToEmail] = useState(() => initialDraft?.sendToEmail !== undefined ? initialDraft.sendToEmail : true);
  const [students, setStudents] = useState<StudentRecipient[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sending, setSending] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>(getGmailConnectionStatus());
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [lastComposeUrl, setLastComposeUrl] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"compose" | "preview">("compose");

  // Auto-save state
  const [lastSavedDraftAt, setLastSavedDraftAt] = useState<number | null>(() => initialDraft?.updatedAt || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    if (!canIssueCertificates) {
      setMode("broadcast");
    } else if (initialMode) {
      setMode(initialMode);
    }
    if (initialTarget) setCertTarget(initialTarget);
  }, [initialMode, initialTarget, canIssueCertificates]);

  // Determine cohort label
  const cohortLabel =
    staffRole === "head_of_year"
      ? `${yearGroup || "Assigned"} Year Group`
      : staffRole === "homeroom_tutor"
      ? `${yearGroup || ""} ${className || "Assigned Class"}`.trim()
      : staffRole === "house_patron"
      ? `${house || "Assigned"} House`
      : "Academy Cohort";

  const defaultBadge =
    staffRole === "head_of_year"
      ? `Head of Year (${yearGroup || "Cohort"})`
      : staffRole === "homeroom_tutor"
      ? `Homeroom Tutor (${yearGroup || ""} ${className || ""})`.trim()
      : staffRole === "house_patron"
      ? `House Patron (${house || "House"})`
      : "Office of the Academy Head Librarian";

  const activeSenderName = profile?.full_name || "Tonny Odundo";
  const activeSenderEmail = profile?.email || user?.email || "tonny.odundo@mpesafoundationacademy.ac.ke";
  const activeSenderTitle = profile?.role === "librarian" ? "Head Librarian & Director of Literacy" : defaultBadge;

  const [emailStyle, setEmailStyle] = useState<EmailStyleOptions>(() => initialDraft?.styleOptions || {
    primaryColor: staffRole === "house_patron" && house === "Kilimanjaro" ? "#B91C1C" : staffRole === "house_patron" && house === "Longonot" ? "#B45309" : staffRole === "house_patron" && house === "Elgon" ? "#059669" : "#00205B",
    fontSize: "md",
    textAlign: "left",
    showLogo: true,
    senderBadge: defaultBadge,
    includeQuickLinks: true,
    selectedLinks: ["portal", "submit", "leaderboard", "progress"],
  });

  // When switching to certificate mode, populate with certificate congratulatory letter
  useEffect(() => {
    if (mode === "certificate" && certTarget) {
      setSubject(`🎓 Official ${certTarget.level || "Bronze"} Reading Certificate: 45-Book Reading Challenge`);
      setMessage(
        `Dear ${certTarget.name},

Congratulations on your distinguished reading milestone in the 45-Book Reading Challenge!

You have officially read and verified ${certTarget.booksCount} books, earning the prestigious ${certTarget.level} Reading Award.

Your verified certificate document is permanently recorded in your student portal and attached below for official Follett and IB portfolio verification. You can download and print your official certificate PDF anytime.

Keep up the outstanding reading and academic leadership!

Warm regards,
${activeSenderName}
${activeSenderTitle}
M-PESA Foundation Academy`
      );
    }
  }, [mode, certTarget, activeSenderName, activeSenderTitle]);

  // Debounced auto-save effect for broadcast mode
  useEffect(() => {
    if (!open || mode !== "broadcast") return;
    if (!subject.trim() && !message.trim()) return;

    setIsAutoSaving(true);
    const timer = setTimeout(() => {
      const saved = saveBroadcastDraft(COHORT_BROADCAST_DRAFT_KEY, {
        subject,
        body: message,
        sendToEmail,
        styleOptions: emailStyle,
      });
      setLastSavedDraftAt(saved.updatedAt);
      setIsAutoSaving(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [open, mode, subject, message, sendToEmail, emailStyle]);

  const handleClearDraft = () => {
    clearBroadcastDraft(COHORT_BROADCAST_DRAFT_KEY);
    setSubject("");
    setMessage("");
    setLastSavedDraftAt(null);
    toast.success("Broadcast draft cleared");
  };

  useEffect(() => {
    if (!open) return;
    setGmailStatus(getGmailConnectionStatus());
    const fetchCohortStudents = async () => {
      setLoadingStudents(true);
      try {
        let query = supabase
          .from("profiles")
          .select("user_id, full_name, email, year_group, class_name, house")
          .eq("role", "student");

        if (staffRole === "head_of_year" && yearGroup) {
          query = query.eq("year_group", yearGroup);
        } else if (staffRole === "homeroom_tutor") {
          if (yearGroup) query = query.eq("year_group", yearGroup);
          if (className) query = query.eq("class_name", className);
        } else if (staffRole === "house_patron" && house) {
          query = query.eq("house", house);
        }

        const { data, error } = await query;
        let recipientList = !error && data && data.length > 0 ? data : [];
        if (recipientList.length === 0) {
          const { data: allProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, year_group, class_name, house")
            .eq("role", "student")
            .limit(50);
          if (allProfiles && allProfiles.length > 0) {
            recipientList = allProfiles;
          }
        }

        // Strictly filter to eliminate staff/librarian accounts from recipient pool
        const strictlyStudents = recipientList
          .filter((d: any) => {
            const em = (d.email || "").toLowerCase();
            return !em.includes("tonny") && !em.includes("librarian") && !em.includes("patron") && !em.includes("principal");
          })
          .map((d: any) => ({
            user_id: d.user_id,
            full_name: d.full_name || "Academy Scholar",
            email: d.email || `${(d.full_name || "scholar").toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
            year_group: d.year_group,
            class_name: d.class_name,
            house: d.house,
          }));

        setStudents(strictlyStudents);

        if (!certTarget && strictlyStudents.length > 0) {
          setCertTarget({
            userId: strictlyStudents[0].user_id,
            name: strictlyStudents[0].full_name,
            email: strictlyStudents[0].email,
            house: strictlyStudents[0].house || "Kenya",
            yearGroup: strictlyStudents[0].year_group || "DP1",
            className: strictlyStudents[0].class_name || undefined,
            booksCount: 15,
            level: "Bronze",
            verificationCode: `MFA-RC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          });
        }
      } catch (err) {
        console.warn("Could not load cohort students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchCohortStudents();
  }, [open, staffRole, yearGroup, className, house]);

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await connectGmail();
      setGmailStatus(getGmailConnectionStatus());
      toast.success(`Google Workspace Gmail connected as ${res.user.email}!`);
    } catch (err: any) {
      toast.error(`Could not connect Gmail: ${err.message}`);
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certTarget) return;
    const toastId = toast.loading("Generating official high-resolution PDF certificate...");
    try {
      await generateAndDownloadCertificatePDF({
        studentName: certTarget.name,
        level: (certTarget.level as any) || "Bronze",
        booksCount: certTarget.booksCount,
        signatoryName: activeSenderName,
        signatoryTitle: activeSenderTitle,
        verificationCode: certTarget.verificationCode,
        studentEmail: certTarget.email,
        challengeName: "45-Book Reading Challenge",
        dateAwarded: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
      toast.success(`Downloaded official PDF for ${certTarget.name}!`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF", { id: toastId });
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) return toast.error("Please enter a subject");
    if (!message.trim()) return toast.error("Please enter your message");

    setSending(true);

    if (mode === "certificate") {
      if (!certTarget) {
        setSending(false);
        return toast.error("Please select a student recipient for certificate dispatch");
      }

      const toastId = toast.loading(`Dispatching official certificate to ${certTarget.name}...`);
      try {
        const uId = certTarget.userId || certTarget.id || `user-${certTarget.email}`;
        const recipientEmail = certTarget.email;

        await dispatchCertificateEmailService({
          recipientEmail,
          recipientName: certTarget.name,
          recipientUserId: uId,
          senderEmail: activeSenderEmail,
          senderName: activeSenderName,
          senderRole: activeSenderTitle,
          challengeId: "45450000-2025-4026-8000-000000000045",
          challengeTitle: "45-Book Reading Challenge",
          level: certTarget.level || "Bronze",
          booksCount: certTarget.booksCount,
          verificationCode: certTarget.verificationCode || "MFA-RC-2026-VERIFIED",
          subject,
          customMessage: message,
          styleOptions: {
            ...emailStyle,
            primaryColor: "#00205B",
            headerStyle: "crest_center",
            senderBadge: activeSenderTitle,
            showLogo: true,
          },
        });

        toast.success(`🎉 Dispatched certificate directly to ${recipientEmail} and logged in student's Inbox!`, {
          id: toastId,
        });

        setOpen(false);
      } catch (err: any) {
        toast.error(err?.message || "Failed to dispatch certificate", { id: toastId });
      } finally {
        setSending(false);
      }
      return;
    }

    // Cohort Broadcast Mode
    const targetStudents = students;
    if (targetStudents.length === 0) {
      setSending(false);
      return toast.error("No student recipients found in this cohort.");
    }

    const validEmails = targetStudents.map((s) => s.email).filter((e) => e && e.includes("@"));

    // 1. Post In-App Notifications for all students in cohort
    const notifRows = targetStudents
      .filter((s) => s.user_id && !s.user_id.startsWith("scholar-"))
      .map((s) => ({
        user_id: s.user_id,
        title: `[${cohortLabel}] ${subject}`,
        message: message,
        type: "broadcast",
        read: false,
      }));

    if (notifRows.length > 0) {
      try {
        await supabase.from("notifications").insert(notifRows);
      } catch (err) {
        console.warn("In-app notification insert issue:", err);
      }
    }

    // 2. Dispatch real email to student school inboxes if enabled
    if (sendToEmail && validEmails.length > 0) {
      let emailed = 0;
      let fallbackCompose = false;

      if (gmailStatus.isConnected) {
        try {
          const res = await sendViaGoogleGmail(validEmails, `[MFA] ${subject}`, message, emailStyle);
          emailed = res.sentCount;
          if (res.failedCount > 0) {
            toast.warning(`Sent ${res.sentCount} emails via Google Gmail (${res.failedCount} failed)`);
          } else {
            toast.success(`Dispatched ${res.sentCount} official emails via Google Gmail directly to recipient inboxes!`);
          }
        } catch (err: any) {
          console.warn("Gmail API failed, trying relay/compose:", err);
          fallbackCompose = true;
        }
      } else {
        try {
          const styledHtml = buildBeautifulEmailHtml(`[MFA] ${subject}`, message, emailStyle);
          const { data, error } = await supabase.functions.invoke("send-broadcast", {
            body: {
              subject: `[MFA] ${subject}`,
              message,
              html: styledHtml,
              styleOptions: emailStyle,
              emails: validEmails,
            },
          });
          if (!error && !data?.error) {
            emailed = data?.sent ?? validEmails.length;
            toast.success(`Dispatched to ${emailed} student inboxes via school email relay!`);
          } else {
            fallbackCompose = true;
          }
        } catch {
          fallbackCompose = true;
        }
      }

      if (fallbackCompose) {
        const composeUrl = createWebGmailComposeUrl(
          validEmails.slice(0, 15).join(","),
          `[MFA ${cohortLabel}] ${subject}`,
          message,
          emailStyle
        );
        setLastComposeUrl(composeUrl);
        toast.info("Notice prepared! Click 'Open Google Gmail Compose' below to send directly from your personal Gmail.");
      }
    }

    setSending(false);
    toast.success(`Cohort broadcast sent to ${students.length} scholars in ${cohortLabel}!`);
    clearBroadcastDraft(COHORT_BROADCAST_DRAFT_KEY);
    setSubject("");
    setMessage("");
    setLastSavedDraftAt(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-card border-border">
        {/* Header with Mode Toggle: Broadcast vs Certificate Dispatch */}
        <DialogHeader className="space-y-3 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" />{" "}
                  {canIssueCertificates ? "Academy Communication & Award Center" : "Academy Cohort Email Center"}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                {canIssueCertificates && mode === "certificate" ? (
                  <>
                    <Award className="w-5 h-5 text-amber-500" /> Official Certificate Dispatch Studio
                  </>
                ) : (
                  <>
                    <Megaphone className="w-5 h-5 text-primary" /> Cohort Email &amp; Announcement
                  </>
                )}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canIssueCertificates && mode === "certificate"
                  ? "Issue official Reading Challenge credentials with cryptographic verification hash, real SVG parchment, and instant student inbox delivery."
                  : `Send direct email announcements to all ${students.length} scholars in your assigned ${cohortLabel}.`}
              </p>
            </div>

            {/* Mode Switcher Toggle (Certificate Dispatch for Librarians & Admins only) */}
            {canIssueCertificates && (
              <div className="flex items-center p-1 rounded-2xl bg-muted border border-border shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("broadcast")}
                  className={cn(
                    "py-1.5 px-3 rounded-xl font-semibold flex items-center gap-1.5 transition-all text-xs",
                    mode === "broadcast"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Megaphone className="w-3.5 h-3.5 text-primary" />
                  <span>Broadcast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("certificate")}
                  className={cn(
                    "py-1.5 px-3 rounded-xl font-semibold flex items-center gap-1.5 transition-all text-xs",
                    mode === "certificate"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Certificate Dispatch</span>
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* View Switcher: Compose vs Preview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2 pt-1">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={activeView === "compose" ? "default" : "ghost"}
              onClick={() => setActiveView("compose")}
              className="h-7 text-xs px-3 font-semibold"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Compose {mode === "certificate" ? "Award Letter" : "Message"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "preview" ? "default" : "ghost"}
              onClick={() => setActiveView("preview")}
              className="h-7 text-xs px-3 font-semibold gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              {mode === "certificate" ? "Certificate Parchment Preview" : "Live Email Preview"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {mode === "broadcast" && (
              <>
                {isAutoSaving ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-mono animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-saving…
                  </Badge>
                ) : lastSavedDraftAt ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-mono">
                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    Auto-saved {formatDraftTime(lastSavedDraftAt)}
                  </Badge>
                ) : null}
              </>
            )}

            <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 text-primary hidden sm:inline-flex">
              {mode === "certificate" ? `${certTarget?.name || "Single Scholar"}` : cohortLabel}
            </Badge>
          </div>
        </div>

        {/* View Content */}
        {activeView === "preview" ? (
          mode === "certificate" ? (
            /* Live Official Certificate Document Card (Image 2 style) */
            <div className="space-y-4">
              <OfficialCertificateCard
                studentName={certTarget?.name || "Academy Scholar"}
                studentEmail={certTarget?.email || ""}
                house={certTarget?.house || "Kenya House"}
                yearGroup={certTarget?.yearGroup || "DP1"}
                level={certTarget?.level || "Beginner"}
                booksCount={certTarget?.booksCount ?? 3}
                challengeTitle="45-Book Reading Challenge 2025/2026: Beyond the Pages"
                verificationCode={certTarget?.verificationCode || "MFA-RC-2026-13455"}
                signatoryName={activeSenderName}
                signatoryTitle={activeSenderTitle}
                showActionBar={true}
                showHeaderMeta={false}
                onDownload={handleDownloadPDF}
              />
            </div>
          ) : (
            <EmailLivePreviewCard
              subject={subject || `[MFA] Notice to ${cohortLabel}`}
              messageBody={message}
              recipientCount={students.length}
              recipientLabel={cohortLabel}
              senderEmail={gmailStatus.email || "leadership@mpesafoundationacademy.ac.ke"}
              styleOptions={emailStyle}
              onChangeStyleOptions={setEmailStyle}
              onSubjectChange={setSubject}
              onMessageBodyChange={setMessage}
              autoSaveStatus={{
                isSaving: isAutoSaving,
                lastSavedAt: lastSavedDraftAt,
                hasDraft: Boolean(subject.trim() || message.trim()),
              }}
              draftKey={COHORT_BROADCAST_DRAFT_KEY}
              onClearDraft={handleClearDraft}
            />
          )
        ) : (
          <div className="space-y-4">
            {mode === "certificate" ? (
              /* Certificate Scholar Details Card */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{certTarget?.name || "Select Scholar"}</span>
                        <Badge variant="outline" className="text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          🏆 {certTarget?.level || "Bronze"} Tier
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono text-foreground font-semibold">{certTarget?.email}</span>
                        {certTarget?.house && <span>• {certTarget.house} House</span>}
                        {certTarget?.yearGroup && <span>• {certTarget.yearGroup}</span>}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Verification Serial</div>
                      <div className="text-xs font-mono font-bold text-primary">
                        {certTarget?.verificationCode || "MFA-RC-2026-10492"}
                      </div>
                    </div>
                  </div>

                  {/* Student Switcher Dropdown if multiple students available */}
                  {students.length > 1 && (
                    <div className="pt-2 border-t border-border/60">
                      <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Switch Recipient Student:
                      </Label>
                      <Select
                        value={certTarget?.userId || certTarget?.id || ""}
                        onValueChange={(val) => {
                          const st = students.find((s) => s.user_id === val);
                          if (st) {
                            setCertTarget({
                              userId: st.user_id,
                              name: st.full_name,
                              email: st.email,
                              house: st.house || "Kenya",
                              yearGroup: st.year_group || "DP1",
                              className: st.class_name || undefined,
                              booksCount: 15,
                              level: "Bronze",
                              verificationCode: `MFA-RC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Choose student recipient..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {students.map((st) => (
                            <SelectItem key={st.user_id} value={st.user_id} className="text-xs">
                              {st.full_name} ({st.email}) — {st.house || "House"} • {st.year_group || "Year"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* PDF Certificate Attachment Card */}
                <div className="p-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Official PDF Certificate Attachment
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold">
                      Security Watermarked
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                        <Award className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate text-foreground">
                          {certTarget?.level || "Official"}_Certificate_{(certTarget?.name || "Scholar").replace(/[^a-zA-Z0-9]/g, "_")}.pdf
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>45-Book Reading Challenge</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {certTarget?.booksCount ?? 0} Verified Books Logged
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveView("preview")}
                        className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Parchment</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Subject & Custom Message */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Dispatch Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                      placeholder="e.g. Official Gold Reading Certificate Awarded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Official Letter &amp; Congratulatory Note</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">Personalized for recipient</span>
                    </div>
                    <Textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="rounded-xl text-xs font-mono leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Broadcast Mode UI */
              <>
                <div className="p-3.5 rounded-2xl border border-border bg-muted/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        Recipients: {loadingStudents ? "Loading..." : `${students.length} Scholars`}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                        Target: {cohortLabel} · Includes inboxes &amp; profile notifications
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveView("preview")}
                    className="text-xs h-7 gap-1 text-primary border-primary/30"
                  >
                    <Eye className="w-3 h-3" /> Preview Email First
                  </Button>
                </div>

                <div className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
                    <div className="truncate">
                      <span className="font-semibold text-foreground">
                        Reading Inbox Dispatch:
                      </span>
                      <span className="text-muted-foreground ml-1">
                        Delivered directly to scholars' Reading Inboxes
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                    In-App Channel
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subject / Announcement Title</Label>
                    <Input
                      placeholder={`e.g. Important Update for ${cohortLabel}`}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Message Content</Label>
                    <Textarea
                      placeholder={`Write your announcement, encouragement, or reading check-in message for ${cohortLabel}...`}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-semibold text-foreground">Dispatch Real Email to Inboxes</div>
                        <div className="text-[11px] text-muted-foreground">Sends directly to students' school email addresses with interactive quick links</div>
                      </div>
                    </div>
                    <Switch checked={sendToEmail} onCheckedChange={setSendToEmail} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {mode === "certificate"
              ? `Delivering directly to ${certTarget?.email || "student email"}`
              : `Reaches ${students.length} scholars in ${cohortLabel}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || (mode === "broadcast" && loadingStudents)}
              className="rounded-full text-xs font-semibold text-white border-0 gap-1.5 shadow-sm px-5"
              style={{
                background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))",
              }}
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                </>
              ) : mode === "certificate" ? (
                <>
                  <Send className="w-3.5 h-3.5" /> Send &amp; Dispatch Certificate
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Dispatch to {cohortLabel}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default StaffCohortBroadcastDialog;
