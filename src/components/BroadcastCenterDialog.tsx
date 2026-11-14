import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Megaphone,
  Trophy,
  CheckCheck,
  ExternalLink,
  BookOpen,
  Calendar,
  Sparkles,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BroadcastItem,
  getBroadcasts,
  markBroadcastAsRead,
  markAllBroadcastsAsRead,
} from "@/lib/broadcastManager";
import {
  getWelcomeEmails,
  markWelcomeEmailRead,
  WelcomeEmailRecord,
} from "@/lib/challengeRegistrationManager";
import WelcomeEmailDialog from "@/components/WelcomeEmailDialog";
import StaffCohortBroadcastDialog from "@/components/StaffCohortBroadcastDialog";

interface BroadcastCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  isStaff?: boolean;
  staffRole?: string;
  yearGroup?: string | null;
  className?: string | null;
  house?: string | null;
}

export const BroadcastCenterDialog: React.FC<BroadcastCenterDialogProps> = ({
  open,
  onOpenChange,
  userId = "",
  isStaff = false,
  staffRole = "",
  yearGroup = null,
  className = null,
  house = null,
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"broadcasts" | "letters">("broadcasts");
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [welcomeEmails, setWelcomeEmails] = useState<WelcomeEmailRecord[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<WelcomeEmailRecord | null>(null);

  const load = () => {
    setBroadcasts(getBroadcasts());
    setWelcomeEmails(getWelcomeEmails(userId));
  };

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener("mfa-broadcast-received", handleUpdate);
    window.addEventListener("mfa-broadcast-updated", handleUpdate);
    window.addEventListener("mfa-welcome-email-received", handleUpdate);
    window.addEventListener("mfa-welcome-email-updated", handleUpdate);
    return () => {
      window.removeEventListener("mfa-broadcast-received", handleUpdate);
      window.removeEventListener("mfa-broadcast-updated", handleUpdate);
      window.removeEventListener("mfa-welcome-email-received", handleUpdate);
      window.removeEventListener("mfa-welcome-email-updated", handleUpdate);
    };
  }, [userId]);

  const handleMarkAllRead = () => {
    if (userId) {
      markAllBroadcastsAsRead(userId);
      load();
    }
  };

  const handleItemClick = (b: BroadcastItem) => {
    if (userId) {
      markBroadcastAsRead(b.id, userId);
      load();
    }
    if (b.challenge_id) {
      onOpenChange(false);
      navigate(`/challenges?id=${b.challenge_id}`);
    }
  };

  const handleLetterClick = (letter: WelcomeEmailRecord) => {
    markWelcomeEmailRead(letter.id);
    setSelectedLetter(letter);
    load();
  };

  const unreadBroadcasts = broadcasts.filter((b) => !b.read_by?.includes(userId)).length;
  const unreadLetters = welcomeEmails.filter((w) => !w.read).length;
  const totalUnread = unreadBroadcasts + unreadLetters;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-card border-border">
          <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    Academy Communications & Inbox
                    {totalUnread > 0 && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                        {totalUnread} new
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Official welcome letters, librarian notices, and academy challenge updates.
                  </DialogDescription>
                </div>
              </div>
              {unreadBroadcasts > 0 && tab === "broadcasts" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </Button>
              )}
            </div>

            {/* Sub-tabs: Broadcasts vs Welcome Letters + Leadership Cohort Broadcast */}
            <div className="flex items-center justify-between gap-2 pt-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={tab === "broadcasts" ? "default" : "outline"}
                  onClick={() => setTab("broadcasts")}
                  className="text-xs h-7 gap-1.5 rounded-lg"
                >
                  <Megaphone className="w-3 h-3" />
                  Announcements ({broadcasts.length})
                  {unreadBroadcasts > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={tab === "letters" ? "default" : "outline"}
                  onClick={() => setTab("letters")}
                  className="text-xs h-7 gap-1.5 rounded-lg"
                >
                  <Mail className="w-3 h-3" />
                  Welcome Letters ({welcomeEmails.length})
                  {unreadLetters > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </Button>
              </div>

              {isStaff && (
                <StaffCohortBroadcastDialog
                  staffRole={staffRole}
                  yearGroup={yearGroup}
                  className={className}
                  house={house}
                  triggerButton={
                    <Button
                      size="sm"
                      className="text-xs h-7 gap-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <Megaphone className="w-3 h-3" />
                      Broadcast &amp; Mail to Assigned Cohort
                    </Button>
                  }
                />
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-5 overflow-y-auto">
            {tab === "broadcasts" ? (
              <div className="space-y-3">
                {isStaff && (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3 text-xs mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          Faculty &amp; Leadership Cohort Broadcaster
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Send styled emails with live interactive preview and announcements to your assigned scholars.
                        </div>
                      </div>
                    </div>
                    <StaffCohortBroadcastDialog
                      staffRole={staffRole}
                      yearGroup={yearGroup}
                      className={className}
                      house={house}
                      triggerButton={
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shrink-0"
                        >
                          <Mail className="w-3 h-3" />
                          Broadcast &amp; Mail
                        </Button>
                      }
                    />
                  </div>
                )}
                {broadcasts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Bell className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-sm font-medium">No announcements yet</p>
                    <p className="text-xs">Broadcasts from the librarian will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                  {broadcasts.map((b) => {
                    const isRead = !!b.read_by?.includes(userId);
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleItemClick(b)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                          isRead
                            ? "bg-card/40 border-border opacity-85 hover:border-primary/40 hover:opacity-100"
                            : "bg-primary/5 border-primary/30 shadow-sm hover:border-primary/60 ring-1 ring-primary/20"
                        }`}
                      >
                        {!isRead && (
                          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                        )}
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background:
                                b.type === "challenge"
                                  ? "hsl(var(--v-yellow) / 0.15)"
                                  : "hsl(var(--v-electric-blue) / 0.15)",
                              color:
                                b.type === "challenge"
                                  ? "hsl(var(--v-yellow))"
                                  : "hsl(var(--v-electric-blue))",
                            }}
                          >
                            {b.type === "challenge" ? (
                              <Trophy className="w-4 h-4" />
                            ) : (
                              <Megaphone className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap pr-3">
                              <span className="font-bold text-xs text-foreground leading-tight">
                                {b.title}
                              </span>
                              {b.type === "challenge" && (
                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-amber-500/40 text-amber-500">
                                  Challenge
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {b.message}
                            </p>
                            <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground/75 flex-wrap gap-2">
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Calendar className="w-3 h-3" />
                                {new Date(b.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://mail.google.com/mail/u/0/#search/subject%3A${encodeURIComponent(b.title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 dark:text-blue-400 font-semibold text-[10px] flex items-center gap-1 hover:underline"
                                  title="Open this email in Google Gmail"
                                >
                                  <Mail className="w-3 h-3 text-blue-500" /> View in Gmail
                                </a>
                                {b.challenge_id ? (
                                  <span className="text-primary font-semibold text-[10px] flex items-center gap-1">
                                    Open Challenge <ExternalLink className="w-3 h-3" />
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">
                                    {b.author_name || "Librarian"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB: Welcome Letters */
              welcomeEmails.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Mail className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No welcome letters yet</p>
                  <p className="text-xs">
                    When you register for a reading challenge, you receive an official welcoming letter confirming your enrolment on the librarian roster.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {welcomeEmails.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => handleLetterClick(w)}
                      className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 transition-all cursor-pointer relative"
                    >
                      {!w.read && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 text-base">
                          {w.badge_icon || "📬"}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-foreground truncate">
                              {w.subject}
                            </span>
                            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">
                              Librarian Notified
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Welcome to {w.challenge_title}! Enrolment confirmed. The librarian can now see you on the active roster.
                          </p>
                          <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                            <span>Goal: {w.target_books} Books · +{w.points_reward} pts</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://mail.google.com/mail/u/0/#search/subject%3A${encodeURIComponent(w.subject)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 dark:text-blue-400 font-semibold text-[10px] flex items-center gap-1 hover:underline"
                                title="Open this welcoming letter in Google Gmail"
                              >
                                <Mail className="w-3 h-3 text-blue-500" /> View in Gmail
                              </a>
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                View Letter <ExternalLink className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </ScrollArea>

          {isStaff && (
            <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Staff Controls:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/admin?s=broadcast");
                }}
                className="text-xs h-7 font-medium gap-1"
              >
                <Megaphone className="w-3 h-3" /> Create New Broadcast
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pop-up for selected Welcome Letter */}
      {selectedLetter && (
        <WelcomeEmailDialog
          email={selectedLetter}
          open={!!selectedLetter}
          onOpenChange={(open) => !open && setSelectedLetter(null)}
          onExplore={() => {
            onOpenChange(false);
            if (selectedLetter.challenge_id) {
              navigate(`/challenges?id=${selectedLetter.challenge_id}`);
            }
          }}
        />
      )}
    </>
  );
};

export default BroadcastCenterDialog;
