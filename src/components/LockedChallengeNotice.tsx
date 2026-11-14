import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Challenge } from '@/contexts/ChallengeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock,
  Mail,
  Send,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Sliders,
  Unlock,
} from 'lucide-react';
import { safeStorage } from '@/lib/safeStorage';
import { dispatchReadingChallengeMessage } from '@/lib/emailRepliesManager';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LockedChallengeNoticeProps {
  challenge?: Challenge | null;
  variant?: 'banner' | 'modal' | 'compact';
  onActionClick?: () => void;
  className?: string;
}

export const ADMIN_EMAIL = 'library@mpesafoundationacademy.ac.ke';

export const LockedChallengeNotice: React.FC<LockedChallengeNoticeProps> = ({
  challenge,
  variant = 'banner',
  className = '',
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState<'compose' | 'preview' | 'sent'>('compose');
  const [studentNote, setStudentNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  const challengeTitle = challenge?.title || '45-Book Reading Challenge';
  const challengeId = challenge?.id || '45450000-2025-4026-8000-000000000045';
  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student Scholar';
  const studentEmail = user?.email || 'student@mpesafoundationacademy.ac.ke';
  const studentCohort = [profile?.year_group, profile?.house ? `${profile.house} House` : null]
    .filter(Boolean)
    .join(' · ') || 'MFA Scholar';

  const formattedDate = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const emailSubject = `[Challenge Unlock Request] ${challengeTitle} - ${studentName}`;
  const effectiveReason = studentNote.trim() || 'I have completed my reading and reflection and would like to submit my book to this challenge. Please unlock or advise on when submissions will resume.';

  const fullEmailBody = [
    `Dear Administrator & Academy Librarian,`,
    ``,
    `A student has requested to reopen submissions for a currently locked reading challenge:`,
    ``,
    `• Challenge: ${challengeTitle}`,
    `• Student: ${studentName} (${studentEmail})`,
    `• Cohort: ${studentCohort}`,
    `• Date of Request: ${formattedDate}`,
    ``,
    `Student Message:`,
    `"${effectiveReason}"`,
    ``,
    `Portal Link: ${typeof window !== 'undefined' ? window.location.origin : ''}/admin`,
    ``,
    `Kind regards,`,
    `M-Pesa Foundation Academy Reading Challenge System`,
  ].join('\n');

  const handleSendEmailRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSending(true);

    // 1. Dispatch directly to in-built web inbox (recorded for both student and library staff)
    try {
      dispatchReadingChallengeMessage({
        challengeId,
        challengeTitle,
        senderName: studentName,
        senderEmail: studentEmail,
        senderRole: `Scholar (${studentCohort})`,
        recipientEmail: ADMIN_EMAIL,
        recipientName: 'Academy Librarian & Reading Patron',
        subject: emailSubject,
        body: fullEmailBody,
        category: 'review',
      });
    } catch (err) {
      console.warn('Could not record in-built web inbox message:', err);
    }

    // 2. Trigger native mailto link so the email client drafts the email to Tonny Odundo
    const mailtoUrl = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(fullEmailBody)}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsSending(false);
    setDialogStep('sent');

    toast.success('Unlock request email dispatched & logged to your Inbox!', {
      duration: 6000,
      description: `Dispatched to Tonny Odundo (${ADMIN_EMAIL}) and recorded in your Web Inbox.`,
    });
  };

  const resetDialog = () => {
    setShowContactDialog(false);
    setDialogStep('compose');
    setStudentNote('');
  };

  const isStaff = profile?.role && profile.role !== "student";
  const isAdmin = profile?.role === "admin" || profile?.role === "librarian" || isStaff;

  return (
    <>
      {/* HIGH-CONTRAST COLORFUL LINEAR-GRADIENT ROUNDED DIV BANNER */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all shadow-xl ${className}`}
        style={{
          background:
            'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(239, 68, 68, 0.12) 40%, rgba(13, 148, 136, 0.08) 100%), #0c1527',
          border: '2px solid rgba(245, 158, 11, 0.65)',
          boxShadow:
            '0 20px 45px -10px rgba(245, 158, 11, 0.22), 0 0 35px -5px rgba(239, 68, 68, 0.18)',
        }}
      >
        {/* Decorative ambient gradient orbs */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Info Column */}
          <div className="flex items-start gap-4">
            {/* Glowing Padlock Icon Div */}
            <div
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(239, 68, 68, 0.25) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.75)',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
              }}
            >
              <Lock className="w-7 h-7 text-amber-400 drop-shadow-md animate-pulse" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-black"></span>
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Kicker badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Challenge Submissions Locked
                </span>
                <span className="text-[11px] font-semibold text-rose-400/90 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  Moderation Active
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                {challengeTitle} is Currently Locked
              </h3>

              {/* Description message */}
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-2xl">
                {isAdmin
                  ? "You have set this challenge to LOCKED. Student book submissions and reflections are temporarily paused across the academy. You can re-open submissions anytime below."
                  : "The Academy Librarian and Administration have temporarily paused new book submissions and challenge progress evaluations for moderation, score audit, or verification. Your previously approved books and badges remain 100% safe."}
              </p>
            </div>
          </div>

          {/* Right Action Column */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {isAdmin ? (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    safeStorage.setItem(`mfa_challenge_status_${challengeId}`, 'open');
                    safeStorage.setItem(`mfa_challenge_status_all`, 'open');
                    safeStorage.setItem(`mfa_challenge_status_45-books`, 'open');
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("mfa_challenge_status_changed", { detail: { id: challengeId, status: 'open' } }));
                    }
                    toast.success(`🔓 Submissions unlocked and open for ${challengeTitle}!`);
                    navigate('/admin?s=controls');
                  }}
                  className="h-10 px-4 text-xs font-bold rounded-xl text-white border-0 shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Unlock Submissions Now</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin?s=controls')}
                  className="h-10 px-3.5 text-xs font-semibold rounded-xl text-slate-200 border-white/20 bg-black/40 hover:bg-black/60 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Session Controls</span>
                </Button>
              </>
            ) : (
              <>
                {/* Embedded Email Trigger Button - Students Only */}
                <Button
                  type="button"
                  onClick={() => setShowContactDialog(true)}
                  className="h-10 px-4 text-xs font-bold rounded-xl text-black border-0 shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
                  style={{
                    background:
                      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <Mail className="w-4 h-4 text-black" />
                  <span>Contact Admin to Open</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowContactDialog(true)}
                  className="h-10 px-3.5 text-xs font-semibold rounded-xl text-slate-200 border-amber-500/35 bg-black/40 hover:bg-black/60 hover:text-white flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Details</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Helpful Footnote */}
        <div className="mt-4 pt-3 border-t border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-200/80">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {isAdmin ? (
              <span>Administrator View: <strong>{profile?.full_name || 'Staff Member'}</strong>. Only students see the unlock request button.</span>
            ) : (
              <span>Librarian Contact: <strong>MFA Library &amp; Reading Patron</strong> ({ADMIN_EMAIL})</span>
            )}
          </div>
          <span className="italic">
            {isAdmin ? "Use Session Controls to schedule automatic start/end lock dates." : "Clicking 'Contact Admin' dispatches an immediate notification to the librarian."}
          </span>
        </div>
      </div>

      {/* HIGH-CONTRAST CONTACT ADMINISTRATOR DIALOG WITH COMPOSE -> PREVIEW -> SEND FLOW */}
      <Dialog open={showContactDialog} onOpenChange={(open) => {
        if (!open) resetDialog();
        else setShowContactDialog(true);
      }}>
        <DialogContent
          className="max-w-xl rounded-3xl p-6 text-white border-2 border-amber-500/50 shadow-2xl"
          style={{
            background:
              'linear-gradient(165deg, #111d35 0%, #0c1527 100%)',
          }}
        >
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(239, 68, 68, 0.2) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                }}
              >
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-bold text-white flex items-center gap-2">
                  Request Challenge Reopening
                  <Badge className="bg-amber-500 text-black font-black text-[10px] px-2 py-0 border-0">
                    LOCKED
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  {dialogStep === 'compose' && "Compose your unlock request message for Academy Librarian and Reading Patron."}
                  {dialogStep === 'preview' && "Review the formatted dispatch before sending to email and in-built web inbox."}
                  {dialogStep === 'sent' && "Your request has been successfully dispatched across all channels!"}
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-slate-400">
              <span className={cn("px-2.5 py-0.5 rounded-lg border", dialogStep === 'compose' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-black/30 border-white/10 text-slate-500")}>
                1. Compose
              </span>
              <span>→</span>
              <span className={cn("px-2.5 py-0.5 rounded-lg border", dialogStep === 'preview' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-black/30 border-white/10 text-slate-500")}>
                2. Live Preview
              </span>
              <span>→</span>
              <span className={cn("px-2.5 py-0.5 rounded-lg border", dialogStep === 'sent' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-black/30 border-white/10 text-slate-500")}>
                3. Dispatched
              </span>
            </div>
          </DialogHeader>

          {/* STEP 1: COMPOSE */}
          {dialogStep === 'compose' && (
            <div className="space-y-4 pt-2">
              {/* Recipient info div */}
              <div
                className="p-3.5 rounded-2xl border text-xs space-y-1.5"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-amber-300">Recipient:</span>
                  <span className="font-mono text-white">Academy Librarian ({ADMIN_EMAIL})</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-amber-300">Target Challenge:</span>
                  <span className="font-bold text-white">{challengeTitle}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-amber-300">Student Scholar:</span>
                  <span className="text-white">{studentName} ({studentCohort})</span>
                </div>
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <Label htmlFor="unlock-note" className="text-xs font-semibold text-slate-200">
                  Reason for Request (Note for the Librarian)
                </Label>
                <Textarea
                  id="unlock-note"
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder="e.g. I have just finished reading my novel for this challenge and need to submit my 50-word reflection today..."
                  className="text-xs min-h-[100px] rounded-xl bg-black/40 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400">
                  A default request message is prepared if left blank.
                </p>
              </div>

              {/* Information callout */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-snug">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Clicking Preview will let you inspect the authentic email dispatch before sending to Tonny Odundo and the In-Built Web Inbox.
                </span>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetDialog}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setDialogStep('preview')}
                  className="font-bold text-black border-0 text-xs h-9 px-5 gap-1.5 shadow-md ml-auto"
                  style={{
                    background:
                      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
                  }}
                >
                  <span>Preview Email & In-App Dispatch</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {dialogStep === 'preview' && (
            <div className="space-y-4 pt-2">
              <div
                className="rounded-2xl border p-4 text-xs space-y-3 font-sans shadow-inner max-h-[360px] overflow-y-auto"
                style={{
                  background: '#090f1e',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              >
                {/* Email Header Simulation */}
                <div className="border-b border-white/10 pb-2.5 space-y-1 text-slate-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-300">From:</span>
                    <span className="font-mono text-white">{studentName} &lt;{studentEmail}&gt;</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-300">To:</span>
                    <span className="font-mono text-white">Tonny Odundo &lt;{ADMIN_EMAIL}&gt;</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-300">Subject:</span>
                    <span className="font-bold text-white">{emailSubject}</span>
                  </div>
                </div>

                {/* Simulated MFA Letter Body */}
                <div className="space-y-2 text-slate-200 text-xs leading-relaxed font-mono whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-white/5">
                  {fullEmailBody}
                </div>

                {/* Multi-Channel Dispatch Info */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Multi-Channel:</strong> Opens native email draft AND records live in the In-Built Web Inbox (/inbox).
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogStep('compose')}
                  className="text-xs border-white/20 text-slate-300 hover:text-white"
                >
                  ← Back to Edit
                </Button>
                <Button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendEmailRequest}
                  className="font-bold text-black border-0 text-xs h-9 px-5 gap-1.5 shadow-lg ml-auto"
                  style={{
                    background:
                      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff'
                  }}
                >
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Confirm & Dispatch (Email + In-Built Web)
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 3: SENT SUCCESS */}
          {dialogStep === 'sent' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-lg text-white">Unlock Request Dispatched!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your email client trigger was activated for <strong>{ADMIN_EMAIL}</strong>, and the notification has been logged to the <strong>In-Built Reading Challenge Web Inbox</strong>.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    resetDialog();
                    navigate('/inbox');
                  }}
                  className="text-xs font-bold h-9 px-4 gap-1.5 bg-amber-500 hover:bg-amber-400 text-black border-0 shadow-md"
                >
                  <Mail className="w-3.5 h-3.5" />
                  View in Inbox
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDialog}
                  className="text-xs h-9 px-4 border-white/20 text-slate-300 hover:text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LockedChallengeNotice;
