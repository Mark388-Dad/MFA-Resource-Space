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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  EmailReply,
  getEmailReplies,
  markEmailReplyAsRead,
  markAllEmailRepliesAsRead,
  appendUserResponse,
} from "@/lib/emailRepliesManager";
import {
  Mail,
  CheckCheck,
  Send,
  ExternalLink,
  Clock,
  User,
  ArrowLeft,
  Sparkles,
  Inbox,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface EmailRepliesInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserEmail?: string;
  currentUserName?: string;
}

export const EmailRepliesInboxDialog: React.FC<EmailRepliesInboxDialogProps> = ({
  open,
  onOpenChange,
  currentUserEmail = "tonny.odundo@mpesafoundationacademy.ac.ke",
  currentUserName = "Tonny Odundo",
}) => {
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [selectedReply, setSelectedReply] = useState<EmailReply | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReplies();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Inbox refreshed with latest Reading Challenge messages.");
    }, 300);
  };

  const loadReplies = () => {
    setReplies(getEmailReplies(currentUserEmail));
  };

  useEffect(() => {
    if (open) {
      loadReplies();
    }
    const handler = (e: any) => {
      const eventKey = e?.detail?.accountKey;
      if (!eventKey || eventKey === currentUserEmail) {
        loadReplies();
      }
    };
    window.addEventListener("mfa_email_replies_updated", handler);
    return () => window.removeEventListener("mfa_email_replies_updated", handler);
  }, [open, currentUserEmail]);

  const unreadCount = replies.filter((r) => !r.read).length;

  const handleOpenReply = (item: EmailReply) => {
    markEmailReplyAsRead(item.id, currentUserEmail);
    setSelectedReply({ ...item, read: true });
    loadReplies();
  };

  const handleSendResponse = () => {
    if (!selectedReply || !responseDraft.trim()) return;
    setSendingResponse(true);

    appendUserResponse(
      selectedReply.id,
      currentUserName,
      currentUserEmail,
      responseDraft.trim(),
      currentUserEmail
    );

    toast.success(`Reply dispatched to ${selectedReply.sender_email}!`);
    setResponseDraft("");
    setSendingResponse(false);

    // Refresh selected item from storage
    const updatedAll = getEmailReplies(currentUserEmail);
    const updatedSelected = updatedAll.find((r) => r.id === selectedReply.id) || null;
    setSelectedReply(updatedSelected);
    loadReplies();
  };

  const handleMarkAllRead = () => {
    markAllEmailRepliesAsRead(currentUserEmail);
    loadReplies();
    toast.success("All inbox emails marked as read");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-card border-border">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedReply ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReply(null)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Inbound Replies & Email Inbox</span>
                  {unreadCount > 0 ? (
                    <Badge className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5">
                      {unreadCount} unread
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      All caught up
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Direct responses received from scholars, tutors, and faculty from broadcast emails.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs h-7 gap-1 font-medium"
                title="Refresh Reading Challenge messages"
              >
                <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
              </Button>
              {!selectedReply && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-5">
          {selectedReply ? (
            /* Single Email Thread View */
            <div className="h-full flex flex-col space-y-4">
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{selectedReply.subject}</h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-foreground">{selectedReply.sender_name}</span>
                      <span>&lt;{selectedReply.sender_email}&gt;</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {selectedReply.sender_role}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedReply.sent_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pt-1">
                  {selectedReply.body}
                </div>
              </div>

              {/* Thread history if user replied */}
              {selectedReply.replies && selectedReply.replies.length > 0 && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Your Response History
                  </div>
                  {selectedReply.replies.map((msg) => (
                    <div key={msg.id} className="rounded-xl p-3 bg-primary/5 border border-primary/20 text-xs">
                      <div className="flex items-center justify-between font-semibold text-primary mb-1">
                        <span>{msg.sender_name}</span>
                        <span className="text-[10px] font-mono opacity-70">
                          {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-foreground/90">{msg.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Box */}
              <div className="mt-auto space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Send In-App Response:</span>
                </div>
                <Textarea
                  placeholder={`Write your reply to ${selectedReply.sender_name}...`}
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Replies are logged in your dashboard and dispatched via email.
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSendResponse}
                    disabled={!responseDraft.trim() || sendingResponse}
                    className="h-8 text-xs gap-1.5 font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingResponse ? "Dispatching..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Email List View */
            <ScrollArea className="h-[55vh] pr-2">
              {replies.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Inbox className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">No replies in inbox yet</p>
                  <p className="text-xs">When users reply to your broadcast emails, their messages will arrive here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {replies.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenReply(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        !item.read
                          ? "bg-primary/5 border-primary/40 shadow-xs hover:border-primary"
                          : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            !item.read ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs ${!item.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                              {item.sender_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              &lt;{item.sender_email}&gt;
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                              {item.sender_role}
                            </Badge>
                          </div>
                          <div className={`text-xs mt-0.5 truncate ${!item.read ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                            {item.subject}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {item.body}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground shrink-0 font-mono flex flex-col items-end gap-1">
                        <span>
                          {new Date(item.sent_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!item.read && (
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
