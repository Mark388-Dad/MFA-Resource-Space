import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, Sparkles, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Challenge, useChallenges } from "@/contexts/ChallengeContext";
import { safeStorage } from "@/lib/safeStorage";
import { createWelcomeEmail } from "@/lib/challengeRegistrationManager";

interface ChallengeAccessCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge?: Challenge | null;
  challengeId?: string;
  challengeTitle?: string;
  onSuccess: () => void;
}

export default function ChallengeAccessCodeDialog({
  open,
  onOpenChange,
  challenge,
  challengeId,
  challengeTitle,
  onSuccess,
}: ChallengeAccessCodeDialogProps) {
  const { user, profile } = useAuth();
  const { challenges, selectedChallenge, setSelectedChallengeId, joinChallengeWithCode } = useChallenges();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStaff = profile?.role && profile.role !== "student";

  // Resolve active challenge safely
  const resolvedTargetId = challenge?.id || challengeId || selectedChallenge?.id || "45450000-2025-4026-8000-000000000045";
  const matchedChallenge = challenge ||
    challenges.find((c) => c.id === resolvedTargetId) ||
    (selectedChallenge?.id === resolvedTargetId ? selectedChallenge : null) ||
    challenges[0] ||
    null;

  const title = challenge?.title || challengeTitle || matchedChallenge?.title || "Reading Challenge";
  const badgeIcon = challenge?.badge_icon || matchedChallenge?.badge_icon || "🏆";
  const targetBooks = challenge?.target_books ?? matchedChallenge?.target_books ?? 45;
  const pointsReward = challenge?.points_reward ?? matchedChallenge?.points_reward ?? 450;

  const handleInstantJoin = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const stored = safeStorage.getJSON<string[]>("mfa_registered_challenges", []);
      if (!stored.includes(resolvedTargetId)) {
        stored.push(resolvedTargetId);
        safeStorage.setJSON("mfa_registered_challenges", stored);
      }
      setSelectedChallengeId(resolvedTargetId);

      createWelcomeEmail({
        userId: user.id,
        userEmail: profile?.email || user.email || "",
        studentName: profile?.full_name || user.email?.split("@")[0] || "Scholar",
        challengeId: resolvedTargetId,
        challengeTitle: title,
        house: profile?.house || "Kenya",
        yearGroup: profile?.year_group || "Grade 11",
        targetBooks: targetBooks,
        pointsReward: pointsReward,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mfa_registered_challenges_updated"));
      }

      toast.success(`You are now registered for "${title}"! Welcome letter delivered to your Reading Challenge Inbox.`);
      setCode("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      // If code is empty, perform instant direct join
      await handleInstantJoin();
      return;
    }
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await joinChallengeWithCode(resolvedTargetId, code.trim().toUpperCase());
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      setSelectedChallengeId(resolvedTargetId);
      toast.success(`Verified! You are now registered for ${title}.`);
      setCode("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl mb-1 border border-amber-500/20">
            {badgeIcon}
          </div>
          <DialogTitle className="text-xl font-bold font-display text-foreground">
            Join Reading Challenge
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Participate in <span className="font-semibold text-foreground">{title}</span>. You can join directly as an Academy scholar or enter a specific access code if provided by your teacher.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyAndRegister} className="space-y-4 pt-2">
          <div className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Goal:</span>
              <strong className="text-foreground">{targetBooks} Books</strong>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Completion Reward:</span>
              <strong className="text-emerald-500">+{pointsReward} Points &amp; Official Badge</strong>
            </div>
            {profile?.house && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Your House:</span>
                <Badge variant="outline" className="text-[10px]">{profile.house}</Badge>
              </div>
            )}
          </div>

          {/* Quick Direct Join Action */}
          <Button
            type="button"
            onClick={handleInstantJoin}
            disabled={loading}
            className="w-full text-xs text-white border-0 font-semibold gap-2 py-5 rounded-2xl shadow-md transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Join Challenge Directly (Instant Academy Entry)</span>
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              or enter access code
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-code" className="text-xs font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Optional Academy Access Code
            </Label>
            <Input
              id="challenge-code"
              placeholder="e.g. READ-2026 or leave blank"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              className="font-mono text-center tracking-widest text-sm font-bold uppercase h-10"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
            <span>
              Once enrolled, your reading logs, reviews, and badges synchronize directly across all academy leaderboards.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            {code.trim() ? (
              <Button
                type="submit"
                disabled={loading}
                className="text-xs text-white border-0 font-semibold gap-1.5 shadow-md"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? "Verifying..." : "Verify Code & Enter"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
