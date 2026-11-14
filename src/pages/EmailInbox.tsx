import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  EmailReply,
  ReadingChallengeCategory,
  getEmailReplies,
  markEmailReplyAsRead,
  markAllEmailRepliesAsRead,
  appendUserResponse,
  syncSupabaseNotificationsToInbox,
  isReadingChallengeMessage,
} from '@/lib/emailRepliesManager';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  CheckCheck,
  Send,
  ExternalLink,
  Clock,
  User,
  Sparkles,
  Inbox,
  Search,
  CheckCircle2,
  Reply,
  RefreshCw,
  BookOpen,
  Award,
  Flame,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Download,
  Printer,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OfficialCertificateCard } from '@/components/OfficialCertificateCard';
import { OfficialEmailMessageCard } from '@/components/OfficialEmailMessageCard';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const EmailInboxPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { selectedChallenge, selectedChallengeId, challenges } = useChallenges();
  const currentUserName = profile?.full_name || user?.email?.split('@')[0] || 'Academy Reader';
  const currentUserEmail = profile?.email || user?.email || 'reader@mpesafoundationacademy.ac.ke';
  const accountKey = profile?.email || user?.email || user?.id || 'guest';

  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [filterType, setFilterType] = useState<
    'all' | 'unread' | 'review' | 'reflection' | 'milestone' | 'launch'
  >('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [challengeFilter, setChallengeFilter] = useState<string>('active');

  const activeChallengeId = selectedChallenge?.id || selectedChallengeId || '45450000-2025-4026-8000-000000000045';
  const activeChallengeTitle = selectedChallenge?.title || '45-Book Reading Challenge';

  const loadReplies = async () => {
    // getEmailReplies strictly filters for Reading Challenge relevance and purges mock entries
    const list = getEmailReplies(accountKey);
    setReplies(list);
    if (!selectedReplyId && list.length > 0) {
      setSelectedReplyId(list[0].id);
    }

    if (user?.id) {
      const synced = await syncSupabaseNotificationsToInbox(
        user.id,
        currentUserEmail,
        currentUserName
      );
      setReplies(synced);
      if (!selectedReplyId && synced.length > 0) {
        setSelectedReplyId(synced[0].id);
      }
    }
  };

  useEffect(() => {
    loadReplies();

    const handler = (e: any) => {
      const eventKey = e?.detail?.accountKey;
      if (!eventKey || eventKey === accountKey) {
        loadReplies();
      }
    };
    window.addEventListener('mfa_email_replies_updated', handler);
    window.addEventListener('mfa_notification_created', handler);

    // Supabase Realtime subscription for logged-in user notifications
    let channel: any = null;
    if (user?.id) {
      channel = supabase
        .channel(`realtime-inbox-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const newRecord = payload.new;
            if (
              isReadingChallengeMessage({
                subject: newRecord?.title,
                body: newRecord?.message,
                type: newRecord?.type,
              })
            ) {
              loadReplies();
              toast.info('📬 New Reading Challenge dispatch received!', { duration: 3000 });
            }
          }
        )
        .subscribe();
    }

    // Polling interval as failover
    const interval = setInterval(() => {
      loadReplies();
    }, 12000);

    return () => {
      window.removeEventListener('mfa_email_replies_updated', handler);
      window.removeEventListener('mfa_notification_created', handler);
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [accountKey, user?.id]);

  const normActiveId = normalizeChallengeId(activeChallengeId);

  // Strictly filter for messages belonging to this reading challenge
  const challengeScopedReplies = useMemo(() => {
    if (challengeFilter === 'all') return replies;

    return replies.filter((item) => {
      if (!item.challenge_id) {
        // If message has no explicit challenge_id, check if subject or body mentions this challenge
        const text = `${item.subject} ${item.body}`.toLowerCase();
        const titleWords = activeChallengeTitle.toLowerCase().split(' ').filter(w => w.length > 3);
        return titleWords.some(w => text.includes(w)) || text.includes('reading challenge') || text.includes('45-book');
      }
      return (
        item.challenge_id === activeChallengeId ||
        normalizeChallengeId(item.challenge_id) === normActiveId
      );
    });
  }, [replies, challengeFilter, activeChallengeId, normActiveId, activeChallengeTitle]);

  // Separate Received (Inbox) messages from Sent (Outbound) dispatches
  const inboxMessages = useMemo(() => {
    return challengeScopedReplies.filter((item) => {
      const senderClean = (item.sender_email?.includes("<") ? item.sender_email.match(/<([^>]+)>/)?.[1] : item.sender_email) || item.sender_email || "";
      const isSender =
        senderClean.toLowerCase().trim() === currentUserEmail.toLowerCase().trim() ||
        (Boolean(item.sender_name && currentUserName) && item.sender_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());

      const recipientClean = (item.recipient_email?.includes("<") ? item.recipient_email.match(/<([^>]+)>/)?.[1] : item.recipient_email) || item.recipient_email || "";
      const isRecipient = recipientClean.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

      // STRICT: If user sent this message to a student/another recipient, it belongs in Sent, NEVER in Inbox!
      if (isSender && !isRecipient) return false;
      if (item.direction === "outbound") return false;
      // If the message has an explicit recipient and it's not the current user, it is not for this inbox
      if (recipientClean && !isRecipient) return false;

      return true;
    });
  }, [challengeScopedReplies, currentUserEmail, currentUserName]);

  const sentMessages = useMemo(() => {
    return challengeScopedReplies.filter((item) => {
      const senderClean = (item.sender_email?.includes("<") ? item.sender_email.match(/<([^>]+)>/)?.[1] : item.sender_email) || item.sender_email || "";
      const isSender =
        senderClean.toLowerCase().trim() === currentUserEmail.toLowerCase().trim() ||
        (Boolean(item.sender_name && currentUserName) && item.sender_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());

      const recipientClean = (item.recipient_email?.includes("<") ? item.recipient_email.match(/<([^>]+)>/)?.[1] : item.recipient_email) || item.recipient_email || "";
      const isRecipient = recipientClean.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

      if (item.direction === "outbound") return true;
      if (isSender && !isRecipient) return true;
      return false;
    });
  }, [challengeScopedReplies, currentUserEmail, currentUserName]);

  const activeFolderReplies = folder === 'inbox' ? inboxMessages : sentMessages;

  const selectedReply = useMemo(() => {
    return activeFolderReplies.find((r) => r.id === selectedReplyId) || activeFolderReplies[0] || null;
  }, [activeFolderReplies, selectedReplyId]);

  const certDetails = useMemo(() => {
    if (!selectedReply) return null;
    const bodyText = selectedReply.body || '';
    const subjectText = selectedReply.subject || '';
    const combined = `${subjectText} ${bodyText}`.toLowerCase();

    const isCert =
      selectedReply.category === 'milestone' ||
      combined.includes('certificate') ||
      combined.includes('parchment') ||
      combined.includes('congratulations on your distinguished reading milestone') ||
      combined.includes('reader award');

    if (!isCert) return null;

    // Student Name extraction
    let studentName = selectedReply.recipient_name;
    if (!studentName || studentName === 'Student' || studentName === 'Academy Scholar') {
      const dearMatch = bodyText.match(/Dear\s+([^,\n\r]+)/i);
      if (dearMatch && dearMatch[1]) {
        studentName = dearMatch[1].trim();
      } else if (profile?.full_name) {
        studentName = profile.full_name;
      } else if (selectedReply.recipient_email) {
        studentName = selectedReply.recipient_email.split('@')[0].replace(/\./g, ' ');
      } else {
        studentName = 'Academy Scholar';
      }
    }

    studentName = studentName.trim();

    // Level detection
    let level = 'Beginner';
    if (combined.includes('gold')) level = 'Gold';
    else if (combined.includes('silver')) level = 'Silver';
    else if (combined.includes('bronze')) level = 'Bronze';
    else if (combined.includes('beginner')) level = 'Beginner';

    // Books count detection
    let booksCount = level === 'Gold' ? 45 : level === 'Silver' ? 30 : level === 'Bronze' ? 15 : 3;
    const booksMatch = bodyText.match(/(\d+)\s*(?:verified\s*)?books/i);
    if (booksMatch && booksMatch[1]) {
      booksCount = parseInt(booksMatch[1], 10);
    }

    // House detection
    let house = profile?.house || 'Kenya House';
    const houseMatch = bodyText.match(/(Kenya|Mara|Kilimanjaro|Longonot|Elgon|Serengeti)\s*(?:House)?/i);
    if (houseMatch && houseMatch[1]) {
      house = `${houseMatch[1]} House`;
    }

    // Year Group detection
    let yearGroup = profile?.year_group || 'DP1';
    const yearMatch = bodyText.match(/\b(DP1|DP2|G10|Grade\s*10|Grade\s*11|Grade\s*12)\b/i);
    if (yearMatch && yearMatch[1]) {
      yearGroup = yearMatch[1];
    }

    // Verification code
    let verificationCode = '';
    const codeMatch = bodyText.match(/MFA-[A-Z0-9-]+/i);
    if (codeMatch && codeMatch[0]) {
      verificationCode = codeMatch[0].toUpperCase();
    } else {
      const hashVal = Math.abs((selectedReply.id || selectedReply.subject || 'seed').split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000 + 1000);
      verificationCode = `MFA-CERT-KEN-${hashVal}`;
    }

    const signatoryName = selectedReply.sender_name || 'Admin01';
    const signatoryTitle = selectedReply.sender_role || 'Head Librarian & Director of Literacy';

    return {
      studentName,
      studentEmail: selectedReply.recipient_email || currentUserEmail,
      house,
      yearGroup,
      level,
      booksCount,
      verificationCode,
      signatoryName,
      signatoryTitle,
      challengeTitle: selectedChallenge?.title || '45-Book Reading Challenge 2025/2026: Beyond the Pages',
    };
  }, [selectedReply, profile, currentUserEmail, selectedChallenge]);

  const unreadCount = inboxMessages.filter((r) => !r.read).length;

  const filteredReplies = useMemo(() => {
    return activeFolderReplies.filter((item) => {
      if (filterType === 'unread' && item.read) return false;
      if (filterType === 'review' && item.category !== 'review') return false;
      if (filterType === 'reflection' && item.category !== 'reflection') return false;
      if (filterType === 'milestone' && item.category !== 'milestone') return false;
      if (filterType === 'launch' && item.category !== 'launch') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.subject.toLowerCase().includes(q) ||
        item.sender_name.toLowerCase().includes(q) ||
        item.sender_email.toLowerCase().includes(q) ||
        (item.recipient_name && item.recipient_name.toLowerCase().includes(q)) ||
        (item.recipient_email && item.recipient_email.toLowerCase().includes(q)) ||
        item.body.toLowerCase().includes(q)
      );
    });
  }, [activeFolderReplies, filterType, searchQuery]);

  const handleSelectReply = (item: EmailReply) => {
    setSelectedReplyId(item.id);
    if (!item.read) {
      markEmailReplyAsRead(item.id, accountKey);
      loadReplies();
    }
  };

  const handleSendResponse = () => {
    if (!selectedReply || !responseDraft.trim()) return;
    setSendingResponse(true);

    appendUserResponse(
      selectedReply.id,
      currentUserName,
      currentUserEmail,
      responseDraft.trim(),
      accountKey
    );

    toast.success(`Reading Challenge response dispatched to ${selectedReply.sender_email}!`);
    setResponseDraft('');
    setSendingResponse(false);
    loadReplies();
  };

  const handleMarkAllRead = () => {
    markAllEmailRepliesAsRead(accountKey);
    loadReplies();
    toast.success('All Reading Challenge messages marked as read');
  };

  // Auto-mark selected email as read when opened
  useEffect(() => {
    if (selectedReply && !selectedReply.read) {
      markEmailReplyAsRead(selectedReply.id, accountKey);
    }
  }, [selectedReply, accountKey]);

  const handleRefreshInbox = async () => {
    setIsRefreshing(true);
    await loadReplies();
    setIsRefreshing(false);
    toast.success('Reading Challenge Inbox refreshed with latest dispatches.');
  };

  const renderCategoryBadge = (category?: ReadingChallengeCategory) => {
    switch (category) {
      case 'review':
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-semibold">
            <BookOpen className="w-3 h-3" /> Book Review
          </Badge>
        );
      case 'reflection':
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-2 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 gap-1 font-semibold">
            <FileText className="w-3 h-3" /> Reflection
          </Badge>
        );
      case 'milestone':
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 font-semibold">
            <Award className="w-3 h-3" /> Milestone
          </Badge>
        );
      case 'launch':
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-2 border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10 gap-1 font-semibold">
            <Flame className="w-3 h-3" /> Challenge Launch
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-2 border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 gap-1 font-semibold">
            <Mail className="w-3 h-3" /> Reading Update
          </Badge>
        );
    }
  };

  const activeThreads = selectedReply?.replies || selectedReply?.responses || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Reading Challenge Mailbox — MFA 45-Book Challenge</title>
        <meta
          name="description"
          content="Dedicated inbox exclusively for Reading Challenge student reviews, librarian notices, reflections, and reading milestones."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="w-full max-w-none px-3 sm:px-6 lg:px-8 py-6">
        {/* Header Workspace */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Reading Challenge Only
              </Badge>
              {unreadCount > 0 ? (
                <Badge className="bg-red-500 text-white font-bold text-xs px-2.5 py-0.5 animate-pulse">
                  {unreadCount} Unread
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> All Caught Up
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono border-border bg-muted/40 gap-1 text-muted-foreground">
                <User className="w-3 h-3 text-primary" /> {currentUserEmail}
              </Badge>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Reading Challenge Inbox 📚
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Strictly filtered for <strong>M-Pesa Foundation Academy Reading Challenges</strong> — book review verification, scholar reflections, realm milestones, and librarian announcements.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleRefreshInbox}
              disabled={isRefreshing}
              className="text-xs h-9 font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              title="Refresh Reading Challenge messages"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Messages"}</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs h-9 font-semibold gap-1.5"
              >
                <CheckCheck className="w-4 h-4 text-emerald-500" /> Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Informational Scope Banner & Challenge Filter */}
        <div className="mb-6 p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>Reading Challenge Communications Only</span>
                <Badge className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0">STRICT SCOPE</Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                Displays real dispatches sent within <strong>{activeChallengeTitle}</strong>. Mock entries have been permanently removed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">Scope:</span>
            <Select value={challengeFilter} onValueChange={setChallengeFilter}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border min-w-[210px]">
                <SelectValue placeholder="Select Challenge Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  Active Challenge ({activeChallengeTitle.slice(0, 24)}...)
                </SelectItem>
                <SelectItem value="all">
                  All Reading Challenges ({replies.length} msgs)
                </SelectItem>
                {challenges.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title.slice(0, 28)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two-Pane Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
          {/* Left Column: Email Thread List (5 cols) */}
          <Card className="lg:col-span-5 rounded-3xl border-border bg-card flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="p-4 border-b border-border/80 space-y-3">
              {/* PRIMARY FOLDER TOGGLE: RECEIVED INBOX VS SENT DISPATCHES */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted border border-border/80 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFolder('inbox');
                    if (inboxMessages.length > 0) setSelectedReplyId(inboxMessages[0].id);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    folder === 'inbox'
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Received Inbox</span>
                  {unreadCount > 0 ? (
                    <span className="bg-red-500 text-white font-mono text-[10px] px-1.5 py-0 rounded-full animate-pulse">
                      {unreadCount}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] opacity-70">({inboxMessages.length})</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFolder('sent');
                    if (sentMessages.length > 0) setSelectedReplyId(sentMessages[0].id);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    folder === 'sent'
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Sent Dispatches</span>
                  <span className="font-mono text-[10px] opacity-70">({sentMessages.length})</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={folder === 'sent' ? "Search sent dispatches..." : "Search received reviews, scholars, topics..."}
                  className="pl-9 h-9 text-xs bg-muted/40 rounded-xl"
                />
              </div>

              {/* Challenge-Specific Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                    filterType === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({activeFolderReplies.length})
                </button>
                {folder === 'inbox' && (
                  <button
                    type="button"
                    onClick={() => setFilterType('unread')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                      filterType === 'unread'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Unread ({unreadCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterType('review')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                    filterType === 'review'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Reviews
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('reflection')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                    filterType === 'reflection'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Reflections
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('milestone')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                    filterType === 'milestone'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Milestones
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('launch')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg transition-all shrink-0',
                    filterType === 'launch'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Launches
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-[560px]">
                {filteredReplies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground">No Messages Yet for this Reading Challenge</h4>
                    <p className="text-[11px] max-w-xs mx-auto leading-relaxed text-muted-foreground">
                      Only authentic communications sent within this reading challenge will appear here. When you submit reflections, send unlock notices to Tonny Odundo, or receive cohort briefings, they will display instantly.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredReplies.map((item) => {
                      const isSelected = selectedReply?.id === item.id;
                      const threadList = item.replies || item.responses || [];
                      const hasResponses = threadList.length > 0;
                      const dateVal = item.sent_at || item.received_at || new Date().toISOString();

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectReply(item)}
                          className={cn(
                            'w-full text-left p-4 transition-all flex flex-col gap-1.5',
                            isSelected
                              ? 'bg-primary/10 border-l-4 border-amber-500'
                              : 'hover:bg-muted/30',
                            !item.read && !isSelected ? 'bg-amber-500/5 font-semibold' : ''
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate text-foreground flex items-center gap-1.5">
                              {folder === 'inbox' && !item.read && (
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                              )}
                              {folder === 'sent' ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <Send className="w-3 h-3 text-blue-500" />
                                  <span>To: {item.recipient_name || item.recipient_email || 'Academy Scholar'}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span>{item.sender_name}</span>
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              {new Date(dateVal).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderCategoryBadge(item.category)}
                            <span className="text-xs font-semibold text-foreground truncate flex-1">
                              {item.subject}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.body}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground truncate">
                              {folder === 'sent' ? `Sent to: ${item.recipient_email || 'recipient'}` : item.sender_email}
                            </span>
                            {hasResponses && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 ml-auto">
                                <CheckCheck className="w-2.5 h-2.5" /> Replied ({threadList.length})
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column: Active Reading Challenge Message Detail & Reply Composer */}
          <Card className="lg:col-span-7 rounded-2xl border-border bg-card flex flex-col overflow-hidden shadow-xs">
            {selectedReply ? (
              <>
                <CardHeader className="p-5 border-b border-border/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {renderCategoryBadge(selectedReply.category)}
                        {selectedReply.direction === 'outbound' ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold gap-1">
                            <Send className="w-2.5 h-2.5" /> Outbound Dispatch
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1">
                            <Inbox className="w-2.5 h-2.5" /> Incoming Message
                          </Badge>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-bold text-foreground leading-snug">
                        {selectedReply.subject}
                      </h2>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                        {selectedReply.direction === 'outbound' ? (
                          <>
                            <span className="font-semibold text-foreground flex items-center gap-1 text-primary">
                              <Send className="w-3.5 h-3.5 text-blue-500" /> To: {selectedReply.recipient_name || selectedReply.recipient_email}
                            </span>
                            <span className="text-[11px]">&lt;{selectedReply.recipient_email}&gt;</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono">
                              From: You ({selectedReply.sender_email})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-amber-500" /> From: {selectedReply.sender_name}
                            </span>
                            <span className="text-[11px]">&lt;{selectedReply.sender_email}&gt;</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono">
                              {selectedReply.sender_role}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Dispatched: {new Date(selectedReply.sent_at || selectedReply.received_at || '').toLocaleString()}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col space-y-5 overflow-y-auto max-h-[640px]">
                  {/* Authentic Academy Email Presentation (Matching Reference Design) */}
                  <OfficialEmailMessageCard
                    subject={selectedReply.subject}
                    senderBadge={selectedReply.sender_role || "Office of the Academy Librarian"}
                    senderName={selectedReply.sender_name}
                    senderEmail={selectedReply.sender_email}
                    recipientName={selectedReply.recipient_name}
                    recipientEmail={selectedReply.recipient_email}
                    body={selectedReply.body}
                    dispatchedAt={selectedReply.sent_at || selectedReply.received_at}
                    certificateDetails={certDetails}
                  />

                  {/* Thread Responses */}
                  {activeThreads.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <Reply className="w-3.5 h-3.5 text-primary" />
                        Thread Correspondence ({activeThreads.length})
                      </div>

                      <div className="space-y-2.5">
                        {activeThreads.map((resp: any, i: number) => (
                          <div
                            key={resp.id || i}
                            className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 ml-4"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <User className="w-3.5 h-3.5" /> {resp.sender_name || resp.author_name}
                              </span>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                {new Date(resp.sent_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                              {resp.body || resp.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Composer */}
                  <div className="pt-2 border-t border-border/70 space-y-3 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Reply className="w-3.5 h-3.5 text-amber-500" />
                        Respond to {selectedReply.sender_name} regarding this Reading Challenge
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Replying as: <strong>{currentUserName}</strong>
                      </span>
                    </div>

                    <Textarea
                      value={responseDraft}
                      onChange={(e) => setResponseDraft(e.target.value)}
                      placeholder="Type your reading challenge reply here... (e.g. Thank you for verifying my African Literature reflection! I will submit my next book today.)"
                      className="min-h-[110px] text-xs resize-none bg-background"
                    />

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Delivered directly into the reading challenge thread history.
                      </div>

                      <Button
                        size="sm"
                        onClick={handleSendResponse}
                        disabled={!responseDraft.trim() || sendingResponse}
                        className="text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 h-9 px-4 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingResponse ? 'Dispatching...' : 'Send Challenge Reply'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="p-16 text-center text-muted-foreground space-y-3 m-auto">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground/40 text-amber-500/50" />
                <h3 className="text-base font-bold text-foreground">No Message Selected</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Select a Reading Challenge message from the list on the left to review reflections, questions, or announcements.
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmailInboxPage;
