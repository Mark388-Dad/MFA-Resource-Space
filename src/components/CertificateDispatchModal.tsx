import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Award,
  Send,
  Download,
  Mail,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ExternalLink,
  Layers,
  Users,
  Eye,
  Printer,
  FileText,
  Search,
  X,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CertificateLevel, CERTIFICATE_LEVEL_CONFIG } from "@/lib/certificateTypes";
import { dispatchCertificateEmailService } from "@/lib/gmailService";
import { useAuth } from "@/contexts/AuthContext";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { OfficialCertificateCard } from "@/components/OfficialCertificateCard";
import { generateAndDownloadCertificatePDF } from "@/lib/certificatePdfService";
import { getHouseColor } from "@/lib/constants";

export interface CertificateDispatchTarget {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  house?: string;
  yearGroup?: string;
  className?: string;
  booksCount: number;
  level: CertificateLevel;
  verificationCode: string;
}

interface CertificateDispatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CertificateDispatchTarget | null;
  batchTargets?: CertificateDispatchTarget[];
  challengeTitle: string;
  challengeId: string;
  signatoryName?: string;
  signatoryTitle?: string;
  onDownloadPDF?: (target: CertificateDispatchTarget) => void;
  onSuccess?: () => void;
}

export const CertificateDispatchModal: React.FC<CertificateDispatchModalProps> = ({
  open,
  onOpenChange,
  target,
  batchTargets,
  challengeTitle,
  challengeId,
  signatoryName = "Tonny Odundo",
  signatoryTitle = "Head Librarian & Director of Literacy",
  onDownloadPDF,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const isBatch = Boolean(batchTargets && batchTargets.length > 0);

  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [includedIds, setIncludedIds] = useState<Set<string>>(() => {
    if (batchTargets && batchTargets.length > 0) {
      return new Set(batchTargets.map((t, idx) => t.userId || t.id || `rec-${idx}`));
    }
    return new Set();
  });

  // Re-sync included targets when batch changes
  useEffect(() => {
    if (batchTargets && batchTargets.length > 0) {
      setIncludedIds(new Set(batchTargets.map((t, idx) => t.userId || t.id || `rec-${idx}`)));
      setSelectedRecipientId(batchTargets[0]?.userId || batchTargets[0]?.id || 'rec-0');
    } else if (target) {
      setSelectedRecipientId(target.userId || target.id || 'target-0');
      setIncludedIds(new Set([target.userId || target.id || 'target-0']));
    }
  }, [batchTargets, target]);

  const allRecipients: CertificateDispatchTarget[] = useMemo(() => {
    if (batchTargets && batchTargets.length > 0) return batchTargets;
    if (target) return [target];
    return [];
  }, [batchTargets, target]);

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return allRecipients;
    return allRecipients.filter((st) => {
      const name = (st.name || "").toLowerCase();
      const email = (st.email || "").toLowerCase();
      const house = (st.house || "").toLowerCase();
      const year = (st.yearGroup || "").toLowerCase();
      const cls = (st.className || "").toLowerCase();
      const lvl = (st.level || "").toLowerCase();
      return name.includes(q) || email.includes(q) || house.includes(q) || year.includes(q) || cls.includes(q) || lvl.includes(q);
    });
  }, [allRecipients, recipientSearch]);

  const activeStudent: CertificateDispatchTarget | null = useMemo(() => {
    if (selectedRecipientId) {
      const found = allRecipients.find((t, idx) => (t.userId || t.id || `rec-${idx}`) === selectedRecipientId);
      if (found) return found;
    }
    return target || allRecipients[0] || null;
  }, [allRecipients, selectedRecipientId, target]);

  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");

  const activeSenderName = signatoryName || profile?.full_name || "Tonny Odundo";
  const activeSenderEmail = profile?.email || user?.email || "librarian@mpesafoundationacademy.ac.ke";
  const activeSenderTitle = signatoryTitle || "Head Librarian & Director of Literacy";

  useEffect(() => {
    if (activeStudent) {
      const levelName = activeStudent.level || "Bronze";
      setSubject(`🎓 Official ${levelName} Reading Certificate: ${challengeTitle}`);
      setCustomMessage(
        `Dear ${activeStudent.name},

Congratulations on your remarkable achievement in the ${challengeTitle}!

You have officially completed ${activeStudent.booksCount} verified reading reflections, qualifying for the prestigious ${levelName} Reading Award.

Your verified certificate document is attached below and permanently recorded in your student portal. You can download and print your official certificate PDF anytime.

Keep up the outstanding reading and academic leadership!

Warm regards,
${activeSenderName}
${activeSenderTitle}
M-PESA Foundation Academy`
      );
    }
  }, [activeStudent, challengeTitle, activeSenderName, activeSenderTitle]);

  if (!activeStudent && allRecipients.length === 0) return null;

  const handleConfirmDispatch = async () => {
    const targetsToDispatch = isBatch && batchTargets
      ? batchTargets.filter((t, idx) => includedIds.has(t.userId || t.id || `rec-${idx}`))
      : activeStudent ? [activeStudent] : [];

    if (targetsToDispatch.length === 0) {
      toast.error("Please select at least one recipient student to dispatch certificates.");
      return;
    }

    setSending(true);
    const toastId = toast.loading(
      targetsToDispatch.length > 1
        ? `Dispatching ${targetsToDispatch.length} certificates to student emails & inboxes...`
        : `Dispatching certificate to ${targetsToDispatch[0]?.name}...`
    );

    try {
      let dispatchedCount = 0;
      let lastRecipient = "";

      for (const st of targetsToDispatch) {
        const uId = st.userId || st.id || `user-${st.email}`;
        const recipientEmail = st.email || `${st.name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`;
        lastRecipient = recipientEmail;

        const levelCfgCurrent = CERTIFICATE_LEVEL_CONFIG[st.level] || CERTIFICATE_LEVEL_CONFIG["Bronze"];

        await dispatchCertificateEmailService({
          recipientEmail,
          recipientName: st.name,
          recipientUserId: uId,
          senderEmail: activeSenderEmail,
          senderName: activeSenderName,
          senderRole: activeSenderTitle,
          challengeId,
          challengeTitle,
          level: st.level,
          booksCount: st.booksCount,
          verificationCode: st.verificationCode,
          subject: subject || `🎓 Official ${st.level} Reading Certificate Awarded`,
          customMessage: customMessage || `Congratulations ${st.name}! Your ${st.level} Certificate is attached with verification serial: ${st.verificationCode}.`,
          styleOptions: {
            primaryColor: levelCfgCurrent?.primaryColor || "#00205B",
            headerStyle: "crest_center",
            senderBadge: "Office of the Academy Head Librarian",
            showLogo: true,
          },
        });

        dispatchedCount++;
      }

      toast.success(
        dispatchedCount > 1
          ? `🎉 Dispatched ${dispatchedCount} official certificates to students' emails & Inboxes!`
          : `🎉 Dispatched certificate directly to ${lastRecipient} and logged in Inbox!`,
        {
          id: toastId,
          description: "Student inboxes updated and notifications triggered.",
        }
      );

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch certificate";
      toast.error(msg, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const levelCfg = activeStudent?.level ? CERTIFICATE_LEVEL_CONFIG[activeStudent.level] : CERTIFICATE_LEVEL_CONFIG["Bronze"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-border bg-card">
        {/* Header with Linear Gradient Glow & Tab Controls */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shadow-xs">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display tracking-tight text-foreground flex items-center gap-2">
                  Certificate Dispatch Studio
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official M-PESA Foundation Academy award issuance &amp; in-app mailbox dispatch.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-muted/80 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("compose")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs",
                    activeTab === "compose"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dispatch Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs",
                    activeTab === "preview"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Certificate Document</span>
                </button>
              </div>

              {isBatch && (
                <Badge className="bg-primary text-primary-foreground font-mono text-xs">
                  <Users className="w-3 h-3 mr-1" /> {batchTargets?.length}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Recipient Search & Scholar Selector Tray */}
          {allRecipients.length > 1 && (
            <div className="p-4 rounded-3xl border border-border/80 bg-gradient-to-br from-card via-muted/30 to-card shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Search &amp; Filter Recipients ({includedIds.size} of {allRecipients.length} Selected)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allFilteredSelected = filteredRecipients.length > 0 && filteredRecipients.every((r, idx) => includedIds.has(r.userId || r.id || `rec-${idx}`));
                      setIncludedIds((prev) => {
                        const next = new Set(prev);
                        filteredRecipients.forEach((r, idx) => {
                          const id = r.userId || r.id || `rec-${idx}`;
                          if (allFilteredSelected) next.delete(id);
                          else next.add(id);
                        });
                        return next;
                      });
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {filteredRecipients.length > 0 && filteredRecipients.every((r, idx) => includedIds.has(r.userId || r.id || `rec-${idx}`))
                      ? "Deselect Filtered"
                      : `Select All Filtered (${filteredRecipients.length})`}
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search student by name, email, class, year, house, or award tier..."
                  className="h-9 pl-9 pr-8 text-xs bg-background/90 rounded-2xl border-border focus-visible:ring-1 focus-visible:ring-primary"
                />
                {recipientSearch && (
                  <button
                    type="button"
                    onClick={() => setRecipientSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtered Recipient List */}
              <div className="border border-border/70 rounded-2xl overflow-y-auto max-h-[175px] divide-y divide-border/40 bg-background/50">
                {filteredRecipients.map((st, idx) => {
                  const id = st.userId || st.id || `rec-${idx}`;
                  const isSelected = includedIds.has(id);
                  const isCurrentActive = activeStudent && (activeStudent.userId || activeStudent.id || `rec-${idx}`) === id;
                  const houseColor = st.house ? getHouseColor(st.house) : "hsl(var(--primary))";

                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedRecipientId(id)}
                      className={cn(
                        "px-3 py-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors",
                        isCurrentActive
                          ? "bg-primary/10 border-l-4 border-l-primary font-medium"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setIncludedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(id);
                              else next.delete(id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                          aria-label={`Include ${st.name} in dispatch`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("font-bold truncate text-foreground", isCurrentActive && "text-primary")}>
                              {st.name}
                            </span>
                            {isCurrentActive && (
                              <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0 h-4">
                                Active Preview
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                              {st.level} ({st.booksCount} bks)
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                            <span>{st.email}</span>
                            {st.house && (
                              <>
                                <span>•</span>
                                <span style={{ color: houseColor }} className="font-semibold">{st.house} House</span>
                              </>
                            )}
                            {st.yearGroup && <span>• {st.yearGroup}</span>}
                            {st.className && <span>• Class {st.className}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecipientId(id);
                            setActiveTab("preview");
                          }}
                          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">Parchment</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredRecipients.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No recipients match &quot;{recipientSearch}&quot; in this batch.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Scholar Meta Card */}
          <div className="p-4 rounded-3xl border border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  {activeStudent?.name || "Recipient Scholar"}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold"
                  style={{
                    borderColor: levelCfg?.primaryColor || "var(--primary)",
                    color: levelCfg?.primaryColor || "var(--primary)",
                  }}
                >
                  {levelCfg?.medal || "🏆"} {activeStudent?.level} Tier
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{activeStudent?.email}</span>
                {activeStudent?.house && <span>• {activeStudent.house} House</span>}
                {activeStudent?.yearGroup && <span>• {activeStudent.yearGroup}</span>}
                {activeStudent?.className && <span>• Class {activeStudent.className}</span>}
              </p>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono font-semibold text-muted-foreground uppercase">
                Verification Serial
              </div>
              <div className="text-xs font-mono font-bold text-primary">
                {activeStudent?.verificationCode || "MFA-CERT-VERIFIED"}
              </div>
            </div>
          </div>

          {activeTab === "compose" ? (
            <>
              {/* Email Subject Line */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Dispatch Subject Line</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9 text-xs bg-background"
                  placeholder="e.g. Official Gold Reading Certificate Awarded"
                />
              </div>

              {/* Congratulatory Letter Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Official Letter &amp; Congratulatory Note</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Personalized for each recipient</span>
                </div>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  className="text-xs font-mono bg-background leading-relaxed"
                  placeholder="Write the personalized certificate award letter..."
                />
              </div>

              {/* Certificate Attachment Preview Div */}
              <div className="p-4 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Verified PDF Certificate Attachment
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background border-amber-500/40 text-amber-600 dark:text-amber-400">
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
                        {activeStudent?.level}_Certificate_{activeStudent?.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{challengeTitle}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {activeStudent?.booksCount} Books Logged
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("preview")}
                      className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Parchment</span>
                    </Button>
                    {activeStudent && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          if (onDownloadPDF) {
                            onDownloadPDF(activeStudent);
                          } else {
                            const toastId = toast.loading(`Generating certificate for ${activeStudent.name}...`);
                            try {
                              await generateAndDownloadCertificatePDF({
                                studentName: activeStudent.name,
                                studentEmail: activeStudent.email,
                                level: activeStudent.level,
                                booksCount: activeStudent.booksCount,
                                verificationCode: activeStudent.verificationCode,
                                challengeName: challengeTitle,
                                signatoryName: activeSenderName,
                                signatoryTitle: activeSenderTitle,
                                dateAwarded: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                              });
                              toast.success(`Downloaded official certificate for ${activeStudent.name}!`, { id: toastId });
                            } catch (err: unknown) {
                              const msg = err instanceof Error ? err.message : "Error generating PDF";
                              toast.error("Download failed: " + msg, { id: toastId });
                            }
                          }
                        }}
                        className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Includes cryptographic verification hash and Academy Seal for Follett &amp; IB portfolios.</span>
                </div>
              </div>

              {/* Delivery Channels Checklist */}
              <div className="p-3.5 rounded-2xl border border-border bg-muted/20 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Simultaneous Dispatch Destinations:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Student Email</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Reading Inbox</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Scholar Dashboard</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Authentic Studio Certificate Document Canvas */
            <div className="space-y-4">
              <div className="w-full overflow-x-auto flex justify-center py-2 bg-slate-950/20 rounded-2xl border border-border">
                <div className="transform scale-[0.55] sm:scale-[0.72] md:scale-[0.85] origin-top">
                  <CertificateCanvas
                    data={{
                      studentName: activeStudent?.name || "Academy Scholar",
                      studentEmail: activeStudent?.email || "",
                      level: activeStudent?.level || "Gold",
                      booksCount: activeStudent?.booksCount ?? 45,
                      signatoryName: activeSenderName,
                      signatoryTitle: activeSenderTitle,
                      verificationCode: activeStudent?.verificationCode || "MFA-RC-2026-40248",
                      challengeName: challengeTitle,
                      dateAwarded: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
                    }}
                    scale={1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmDispatch}
            disabled={sending || (isBatch && includedIds.size === 0)}
            className="text-xs font-bold gap-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {sending
                ? "Dispatching..."
                : isBatch
                ? `Send ${includedIds.size} ${includedIds.size === 1 ? "Certificate" : "Certificates"}`
                : "Send & Dispatch Certificate"}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default CertificateDispatchModal;
