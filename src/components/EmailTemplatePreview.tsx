import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Eye,
  Monitor,
  Smartphone,
  Copy,
  ExternalLink,
  Award,
  Megaphone,
  Check,
  Send,
  Sparkles,
  Link2,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import {
  buildBeautifulEmailHtml,
  EmailStyleOptions,
  sendViaGoogleGmail,
  connectGmail,
  getGmailConnectionStatus,
} from "@/lib/gmailService";
import { useSystemLinks, resolveSystemLink } from "@/lib/systemLinksManager";
import { toast } from "sonner";

export const EmailTemplatePreview: React.FC = () => {
  const { links } = useSystemLinks();
  const [selectedTemplate, setSelectedTemplate] = useState<"broadcast" | "verification" | "milestone">("verification");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [showRawHtml, setShowRawHtml] = useState<boolean>(false);

  // Template custom fields
  const [studentName, setStudentName] = useState<string>("Tonny Odundo");
  const [studentEmail, setStudentEmail] = useState<string>("tonny.odundo@mpesafoundationacademy.ac.ke");
  const [level, setLevel] = useState<string>("Beginner");
  const [booksCount, setBooksCount] = useState<number>(3);
  const [verificationCode, setVerificationCode] = useState<string>("MFA-RC-2026-13455");
  const [subject, setSubject] = useState<string>("🎓 Official Beginner Certificate of Achievement: 45-Book Reading Challenge");
  const [broadcastTitle, setBroadcastTitle] = useState<string>("Official M-Pesa Foundation Academy Announcement");
  const [broadcastBody, setBroadcastBody] = useState<string>(
    "Welcome to the official M-Pesa Foundation Academy Reading Challenge platform! Beyond the Pages turns every literary category into a vibrant realm of imagination, inquiry, and leadership.\n\nAll participants who log verified books earn points toward the House Cup and qualify for official certification from the Teaching & Learning Directorate."
  );

  const [sendingTest, setSendingTest] = useState(false);

  // Build the rendered HTML according to selected template
  const previewHtml = React.useMemo(() => {
    if (selectedTemplate === "verification") {
      return buildBeautifulEmailHtml(
        subject,
        `Hello ${studentName},\n\nCongratulations on achieving the official ${level} Reading Award! In recognition of your dedicated reading and completion of ${booksCount} Verified Books in the 45-Book Reading Challenge 2025/2026: Beyond the Pages, your certificate has been officially validated by the Teaching & Learning Directorate and the Academy Library.`,
        {
          primaryColor: "#00205B",
          headerStyle: "banner",
          senderBadge: "Teaching & Learning Directorate",
          showLogo: true,
          includeQuickLinks: true,
          certificateData: {
            studentName,
            level,
            booksCount,
            verificationCode,
            challengeTitle: "45-Book Reading Challenge 2025/2026: Beyond the Pages",
            signatoryName: "David O. Oloo",
            signatoryTitle: "Director of Teaching & Learning",
            dateAwarded: "January 2026",
          },
        }
      );
    } else if (selectedTemplate === "broadcast") {
      return buildBeautifulEmailHtml(broadcastTitle, broadcastBody, {
        primaryColor: "#0B192C",
        secondaryColor: "#16A34A",
        headerStyle: "banner",
        senderBadge: "Office of the Academy Librarian",
        showLogo: true,
        includeQuickLinks: true,
        sectionStyle: "cards",
        segmentAccentColor: "#D4AF37",
        ctaButtonText: "🚀 Open MFA Reading Portal",
        ctaButtonUrl: links.email_cta_url,
        ctaButtonColor: "#0B192C",
      });
    } else {
      // Milestone
      return buildBeautifulEmailHtml(
        `🏆 Halfway Milestone: 20 Books Completed in the 45-Book Challenge!`,
        `Congratulations ${studentName}!\n\nYou have officially read and submitted reflections for ${booksCount} books in the 45-Book Reading Challenge 2025/2026.\n\nKeep reading to achieve the Silver (30 Books) and Gold (45 Books) honors before the academic year ends!`,
        {
          primaryColor: "#0B192C",
          secondaryColor: "#16A34A",
          headerStyle: "banner",
          senderBadge: "Academic Literacy Directorate",
          showLogo: true,
          includeQuickLinks: true,
          ctaButtonText: "🎯 View My Progress & Standings",
          ctaButtonUrl: links.progress_dashboard_url,
          ctaButtonColor: "#16A34A",
        }
      );
    }
  }, [
    selectedTemplate,
    studentName,
    studentEmail,
    level,
    booksCount,
    verificationCode,
    subject,
    broadcastTitle,
    broadcastBody,
    links,
  ]);

  const handleCopyRichHtml = async () => {
    try {
      const blobHtml = new Blob([previewHtml], { type: "text/html" });
      const blobText = new Blob([previewHtml], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      toast.success("Copied formatted rich email! Ready to paste into Gmail, Outlook, or Apple Mail with all styling.");
    } catch {
      await navigator.clipboard.writeText(previewHtml);
      toast.success("Copied HTML code to clipboard!");
    }
  };

  const handleSendTestEmail = async () => {
    if (!studentEmail || !studentEmail.includes("@")) {
      toast.error("Please enter a valid recipient test email");
      return;
    }
    setSendingTest(true);
    try {
      let gStatus = getGmailConnectionStatus();
      if (!gStatus.isConnected) {
        toast.info("Connecting Google Gmail account for dispatch...");
        await connectGmail();
        gStatus = getGmailConnectionStatus();
      }

      const activeSubject =
        selectedTemplate === "verification"
          ? subject
          : selectedTemplate === "broadcast"
          ? broadcastTitle
          : "🏆 Challenge Milestone Preview";

      const activeBody =
        selectedTemplate === "verification"
          ? `Hello ${studentName}, your certificate serial is ${verificationCode}`
          : broadcastBody;

      const res = await sendViaGoogleGmail(
        [studentEmail],
        activeSubject,
        activeBody,
        {
          primaryColor: "#0B192C",
          certificateData:
            selectedTemplate === "verification"
              ? {
                  studentName,
                  level,
                  booksCount,
                  verificationCode,
                  challengeTitle: "45-Book Reading Challenge 2025/2026: Beyond the Pages",
                  signatoryName: "David O. Oloo",
                  signatoryTitle: "Director of Teaching & Learning",
                  dateAwarded: "January 2026",
                }
              : undefined,
        }
      );

      if (res.sentCount > 0) {
        toast.success(`Test email dispatched directly to ${studentEmail} via Google Gmail!`);
      } else {
        toast.error(`Dispatch error: ${res.errors.join(", ")}`);
      }
    } catch (err: any) {
      toast.error(`Could not send test email: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none select-none">
      {/* Top Header Bar */}
      <Card className="rounded-3xl border-border bg-gradient-to-r from-[#0B192C] via-[#0A2540] to-[#0B192C] text-white shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono uppercase tracking-wider">
                  MFA Institutional Email Studio
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                  Navy #0B192C &bull; Gold #D4AF37 &bull; Green #16A34A
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                Email Template Live Preview &amp; Inspector
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Inspect and test live rendered notification templates for Broadcast Announcements and Official Certificate
                Dispatches before sending to scholars, teachers, and parents.
              </p>
            </div>

            {/* Template Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80">
              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "verification" ? "default" : "ghost"}
                onClick={() => setSelectedTemplate("verification")}
                className={`h-8 text-xs font-semibold px-3 gap-1.5 ${
                  selectedTemplate === "verification"
                    ? "bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificate Dispatch</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "broadcast" ? "default" : "ghost"}
                onClick={() => setSelectedTemplate("broadcast")}
                className={`h-8 text-xs font-semibold px-3 gap-1.5 ${
                  selectedTemplate === "broadcast"
                    ? "bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Broadcast Announcement</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "milestone" ? "default" : "ghost"}
                onClick={() => setSelectedTemplate("milestone")}
                className={`h-8 text-xs font-semibold px-3 gap-1.5 ${
                  selectedTemplate === "milestone"
                    ? "bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Milestone Notice</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Split Layout: Left Controls + Right Live Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Parameters & Customization (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-3xl border-border bg-card shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Template Test Data
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedTemplate.toUpperCase()}
                </Badge>
              </div>

              {selectedTemplate === "verification" ? (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Recipient Scholar Name</Label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Award Level</Label>
                      <Input
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Verified Books</Label>
                      <Input
                        type="number"
                        value={booksCount}
                        onChange={(e) => setBooksCount(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Verification Serial Code</Label>
                    <Input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="h-8 text-xs font-mono text-amber-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Email Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Announcement Title / Subject</Label>
                    <Input
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Message Paragraphs (double newline creates div cards)</Label>
                    <Textarea
                      rows={5}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Recipient Test Email & Direct Action */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <Label className="text-[11px] font-bold text-foreground">
                  Test Recipient Email
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@mpesafoundationacademy.ac.ke"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={sendingTest}
                    className="h-8 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shrink-0 gap-1"
                  >
                    {sendingTest ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send Test</span>
                  </Button>
                </div>
              </div>

              {/* Destination URL Indicators */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5 text-[11px]">
                <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  <span>Configured Target Endpoints</span>
                </div>
                <div className="space-y-1 text-muted-foreground font-mono text-[10px]">
                  <div className="truncate">
                    <strong>Portal:</strong> {links.portal_base_url}
                  </div>
                  <div className="truncate">
                    <strong>Verify:</strong>{" "}
                    {resolveSystemLink("certificate_verification_url", { code: verificationCode })}
                  </div>
                  <div className="truncate">
                    <strong>Download:</strong>{" "}
                    {resolveSystemLink("certificate_download_url", { code: verificationCode })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Authentic Pre-Send Live Recipient View (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Action Toolbar on Top of Preview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-bold text-xs text-foreground">
                Authentic Email Client Preview
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({previewDevice === "mobile" ? "Mobile 380px" : "Full Desktop"})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Device Toggle */}
              <div className="flex items-center rounded-xl bg-muted p-0.5 border border-border">
                <Button
                  type="button"
                  size="sm"
                  variant={previewDevice === "desktop" ? "default" : "ghost"}
                  onClick={() => setPreviewDevice("desktop")}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewDevice === "mobile" ? "default" : "ghost"}
                  onClick={() => setPreviewDevice("mobile")}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile</span>
                </Button>
              </div>

              {/* Copy Styled Rich Email */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyRichHtml}
                className="h-7 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                title="Copy formatted email for 1-click paste into Gmail or Outlook"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Rich HTML</span>
              </Button>

              {/* Code Toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="h-7 text-xs font-mono"
              >
                {showRawHtml ? "Visual" : "Code"}
              </Button>
            </div>
          </div>

          {/* Email Canvas Window Chrome */}
          <div className="rounded-2xl border border-border bg-slate-900 shadow-xl overflow-hidden">
            {/* Top Window Dots */}
            <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                <span className="font-bold text-[11px] text-slate-300 ml-2">
                  M-Pesa Foundation Academy &bull; Official Notification Delivery
                </span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] py-0 h-4">
                Verified Template
              </Badge>
            </div>

            {/* Email Canvas Container */}
            <div
              className={`p-3 sm:p-5 bg-[#070d18] transition-all overflow-y-auto max-h-[750px] ${
                previewDevice === "mobile" ? "max-w-[390px] mx-auto border-x border-slate-800" : "w-full"
              }`}
            >
              {showRawHtml ? (
                <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto rounded-xl max-h-[600px] border border-slate-800">
                  {previewHtml}
                </pre>
              ) : (
                <div
                  className="rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
