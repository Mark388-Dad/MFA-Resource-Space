import React, { useState, useEffect } from "react";
import { Megaphone, X, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BroadcastItem, getBroadcasts, markBroadcastAsRead } from "@/lib/broadcastManager";

export const BroadcastBanner: React.FC<{
  userId?: string;
  onOpenCenter?: () => void;
}> = ({ userId = "", onOpenCenter }) => {
  const navigate = useNavigate();
  const [latestBroadcast, setLatestBroadcast] = useState<BroadcastItem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const checkLatest = () => {
    const list = getBroadcasts();
    setTotalCount(list.length);
    if (list.length === 0) {
      setLatestBroadcast(null);
      return;
    }
    const newest = list[0];
    // Check if dismissed in session
    const disId = sessionStorage.getItem("mfa-dismissed-broadcast-id");
    if (disId === newest.id) {
      setDismissed(true);
    } else {
      setDismissed(false);
      setLatestBroadcast(newest);
    }
  };

  useEffect(() => {
    checkLatest();
    const handleReceived = (e: any) => {
      // Whenever a fresh broadcast is received, show it even if previous was dismissed
      sessionStorage.removeItem("mfa-dismissed-broadcast-id");
      setDismissed(false);
      if (e?.detail) {
        setLatestBroadcast(e.detail);
      } else {
        checkLatest();
      }
    };
    const handleUpdate = () => checkLatest();

    window.addEventListener("mfa-broadcast-received", handleReceived);
    window.addEventListener("mfa-broadcast-updated", handleUpdate);
    return () => {
      window.removeEventListener("mfa-broadcast-received", handleReceived);
      window.removeEventListener("mfa-broadcast-updated", handleUpdate);
    };
  }, []);

  if (!latestBroadcast || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (latestBroadcast) {
      sessionStorage.setItem("mfa-dismissed-broadcast-id", latestBroadcast.id);
      if (userId) {
        markBroadcastAsRead(latestBroadcast.id, userId);
      }
    }
  };

  const handleAction = () => {
    handleDismiss();
    if (latestBroadcast.challenge_id) {
      navigate(`/challenges?id=${latestBroadcast.challenge_id}`);
    } else if (onOpenCenter) {
      onOpenCenter();
    } else {
      navigate("/challenges");
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-background p-3.5 relative shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
            {latestBroadcast.type === "challenge" ? (
              <Trophy className="w-4 h-4" />
            ) : (
              <Megaphone className="w-4 h-4" />
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-foreground truncate">
                {latestBroadcast.title}
              </span>
              <Badge variant="outline" className="text-[9px] py-0 h-4 border-primary/40 text-primary">
                Official Broadcast
              </Badge>
              {totalCount > 1 && onOpenCenter && (
                <button
                  onClick={onOpenCenter}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
                >
                  View all ({totalCount})
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {latestBroadcast.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            size="sm"
            onClick={handleAction}
            className="text-xs h-7 font-semibold gap-1 px-3"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
