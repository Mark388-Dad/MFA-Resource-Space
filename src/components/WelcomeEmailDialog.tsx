import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  ShieldCheck,
  Lock,
  Trophy,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  School,
  ExternalLink,
} from "lucide-react";
import { WelcomeEmailRecord } from "@/lib/challengeRegistrationManager";

interface WelcomeEmailDialogProps {
  email: WelcomeEmailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExplore?: () => void;
}

export const WelcomeEmailDialog: React.FC<WelcomeEmailDialogProps> = ({
  email,
  open,
  onOpenChange,
  onExplore,
}) => {
  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-card border-border shadow-2xl">
        {/* Email Header Banner */}
        <div className="p-6 bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/10 border-b border-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-lg shadow-xs">
                {email.badge_icon || "📬"}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Official Enrolment & Welcoming Letter
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>M-PESA Foundation Academy Library</span>
                  <span>•</span>
                  <span>{new Date(email.sent_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Confirmed
            </Badge>
          </div>

          <h2 className="text-lg font-bold font-display text-foreground leading-snug">
            {email.subject}
          </h2>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>To: <strong className="text-foreground">{email.recipient_name}</strong></span>
            <span>&lt;{email.recipient_email}&gt;</span>
          </div>
        </div>

        {/* Official Letter Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Academy Crest / Letterhead intro */}
          <div className="flex items-center justify-between pb-3 border-b border-dashed border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <School className="w-4 h-4 text-primary" />
              <span>Office of the Academy Head Librarian</span>
            </div>
            <span>Ref: {email.id}</span>
          </div>

          <div className="space-y-3 leading-relaxed text-foreground">
            <p>
              Dear <strong>{email.recipient_name}</strong>,
            </p>
            <p>
              Welcome to the <strong>{email.challenge_title}</strong> reading challenge! We are delighted to confirm that your registration has been successfully logged in the academy system.
            </p>
          </div>

          {/* Librarian Notification Card */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              Librarian & Staff Roster Notification Confirmed
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The academy librarian and your house teachers have been notified of your registration. You now appear on the librarian’s official enrolment roster, and staff can oversee your progress and verify your readings.
            </p>
          </div>

          {/* Submission Privacy & Locking Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-300">
              <Lock className="w-4 h-4" />
              Strict Student Privacy & Locked Submissions
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Your submissions are private:</strong> Other students cannot see your submissions or reading reflections. Only you, the academy librarian, and authorized staff have access. Furthermore, once submitted, each book entry is locked to protect academic integrity.
            </p>
          </div>

          {/* Goal & Reward Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl border border-border bg-muted/40 text-center">
              <div className="text-[11px] text-muted-foreground uppercase font-bold">Goal Target</div>
              <div className="text-xl font-bold font-display text-primary mt-1">
                {email.target_books} Books
              </div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border bg-muted/40 text-center">
              <div className="text-[11px] text-muted-foreground uppercase font-bold">House Points</div>
              <div className="text-xl font-bold font-display text-amber-500 mt-1">
                +{email.points_reward} pts
              </div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border bg-muted/40 text-center">
              <div className="text-[11px] text-muted-foreground uppercase font-bold">Award Badge</div>
              <div className="text-sm font-bold text-foreground mt-1 flex items-center justify-center gap-1.5">
                <span>{email.badge_icon}</span>
                <span className="truncate">{email.badge_name}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground border-t border-border">
            <p className="italic">
              "A reader lives a thousand lives before he dies. The man who never reads lives only one."
            </p>
            <p className="mt-1 font-semibold text-foreground">
              — David O. Oloo, Academy Head Librarian & Instructional Leadership
            </p>
          </div>
        </div>

        <DialogFooter className="p-5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Keep in Inbox
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              title="Open message in Google Gmail app or web"
            >
              <a
                href={`https://mail.google.com/mail/u/0/#search/subject%3A${encodeURIComponent(email.subject || "Reading Challenge")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                View in Gmail
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onExplore?.();
            }}
            className="text-xs font-bold text-white px-5 shadow-sm w-full sm:w-auto"
            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Explore Challenge & Start Reading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeEmailDialog;
