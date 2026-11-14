import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '@/contexts/AuthContext';
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
  markEmailReplyAsUnread,
  markAllEmailRepliesAsRead,
  appendUserResponse,
  syncSupabaseNotificationsToInbox,
  subscribeToInboxRealtime,
  validateReadingChallengeEmail,
  dispatchReadingChallengeMessage,
  moveEmailToTrash,
  deleteEmailPermanently,
  saveEmailDraft,
  deleteEmailDraft,
  getReadingChallengeCategory,
} from '@/lib/emailRepliesManager';
import {
  connectGmail,
  disconnectGmail,
  getGmailConnectionStatus,
  sendViaGoogleGmail,
} from '@/lib/gmailService';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail,
  CheckCheck,
  Send,
  Clock,
  User,
  Inbox as InboxIcon,
  Search,
  CheckCircle2,
  Reply,
  Forward,
  RefreshCw,
  BookOpen,
  Award,
  Flame,
  FileText,
  Trash2,
  Edit3,
  FileEdit,
  ArrowLeft,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  MailOpen,
  RotateCcw,
  Columns2,
  PanelTop,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OfficialEmailMessageCard } from '@/components/OfficialEmailMessageCard';
import { useChallenges, normalizeChallengeId } from '@/contexts/ChallengeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';
type TopicFilter = 'all' | 'unread' | 'review' | 'reflection' | 'milestone' | 'launch';

interface DirectoryPerson {
  user_id?: string;
  full_name: string;
  email: string;
  role: string;
  house?: string | null;
  year_group?: string | null;
  class_name?: string | null;
}

const READING_TEMPLATES: Array<{
  label: string;
  category: ReadingChallengeCategory;
  subject: string;
  body: string;
}> = [
  {
    label: 'Book Review Feedback',
    category: 'review',
    subject: 'Reading Challenge Book Review Update',
    body: 'Hello,\n\nI wanted to follow up regarding the book review and reflection submitted for the Reading Challenge. Could you share any reading insights or verification notes on this book?\n\nBest regards,\nM-Pesa Foundation Academy Reader',
  },
  {
    label: 'Book Recommendation',
    category: 'reflection',
    subject: 'Reading Challenge Book Recommendation & Reflection',
    body: 'Hello,\n\nI recently completed a remarkable novel for the 45-Book Reading Challenge and wanted to recommend it for your current literary realm. Happy to discuss its themes and key reflections!\n\nHappy reading!',
  },
  {
    label: 'Milestone Check-In',
    category: 'milestone',
    subject: 'Reading Challenge Milestone & Points Check-In',
    body: 'Hello,\n\nChecking in on our latest Reading Challenge progress, verified books count, and upcoming milestone badges for this term.\n\nWarm regards,',
  },
  {
    label: 'Challenge Inquiry',
    category: 'launch',
    subject: 'Question About Active Reading Challenge Realms',
    body: 'Hello,\n\nCould you clarify which book categories and literary realms count toward our active Reading Challenge target this term?\n\nThank you!',
  },
];

export const EmailInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedChallenge, selectedChallengeId, challenges } = useChallenges();
  const currentUserName = profile?.full_name || user?.email?.split('@')[0] || 'Academy Reader';
  const currentUserEmail = profile?.email || user?.email || 'reader@mpesafoundationacademy.ac.ke';
  const accountKey = profile?.email || user?.email || user?.id || 'guest';

  const isCreatorAccount = Boolean(
    profile?.email?.toLowerCase().includes('tonny') ||
    user?.email?.toLowerCase().includes('tonny')
  );
  const isAdminOrLibrarian = Boolean(
    !isCreatorAccount && (
      profile?.role === 'admin' ||
      profile?.role === 'librarian' ||
      profile?.email?.toLowerCase().includes('admin') ||
      profile?.email?.toLowerCase().includes('librarian') ||
      user?.email?.toLowerCase().includes('admin') ||
      user?.email?.toLowerCase().includes('librarian')
    )
  );

  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gmail' | 'split'>('gmail');
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [filterType, setFilterType] = useState<TopicFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Thread inline reply / forward state
  const [threadAction, setThreadAction] = useState<'none' | 'reply' | 'forward'>('reply');
  const [responseDraft, setResponseDraft] = useState('');
  const [forwardRecipients, setForwardRecipients] = useState<DirectoryPerson[]>([]);
  const [forwardInput, setForwardInput] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [showFormattedCard, setShowFormattedCard] = useState(true);

  // Compose modal state (Gmail floating window)
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [toRecipients, setToRecipients] = useState<DirectoryPerson[]>([]);
  const [toQuery, setToQuery] = useState('');
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeChallengeId, setComposeChallengeId] = useState<string>(
    selectedChallenge?.id || selectedChallengeId || '45450000-2025-4026-8000-000000000045'
  );
  const [sendingCompose, setSendingCompose] = useState(false);
  const [alsoSendViaGmail, setAlsoSendViaGmail] = useState(true);

  // Academy directory & Gmail connection status
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [gmailStatus, setGmailStatus] = useState(() => getGmailConnectionStatus());

  const activeChallengeId =
    selectedChallenge?.id || selectedChallengeId || '45450000-2025-4026-8000-000000000045';
  const activeChallengeTitle = selectedChallenge?.title || '45-Book Reading Challenge';

  const loadReplies = useCallback(async () => {
    const list = getEmailReplies(accountKey);
    setReplies(list);

    if (user?.id) {
      const synced = await syncSupabaseNotificationsToInbox(
        user.id,
        currentUserEmail,
        currentUserName
      );
      setReplies(synced);
    }
  }, [accountKey, user?.id, currentUserEmail, currentUserName]);

  // Load Academy Directory for real recipient autocomplete (profiles + demo accounts fallback)
  useEffect(() => {
    const demoPeople: DirectoryPerson[] = Object.values(DEMO_ACCOUNTS).map((d) => ({
      user_id: d.id,
      full_name: d.full_name,
      email: d.email,
      role: d.role,
      house: d.house,
      year_group: d.year_group,
      class_name: d.class_name,
    }));

    const fetchDirectory = async () => {
      const merged = new Map<string, DirectoryPerson>();
      for (const p of demoPeople) {
        merged.set(p.email.toLowerCase(), p);
      }

      try {
        const { data: rpcRows } = await supabase.rpc('search_directory', { q: '' });
        if (Array.isArray(rpcRows)) {
          for (const row of rpcRows) {
            if (row.email) {
              merged.set(row.email.toLowerCase(), {
                user_id: row.user_id,
                full_name: row.full_name || row.email.split('@')[0],
                email: row.email,
                role: row.role || 'student',
                house: row.house,
                year_group: row.year_group,
                class_name: row.class_name,
              });
            }
          }
        }
      } catch {
        // fallback to profiles query
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role, house, year_group, class_name')
          .order('full_name', { ascending: true })
          .limit(200);

        if (Array.isArray(data)) {
          for (const row of data) {
            if (row.email && !merged.has(row.email.toLowerCase())) {
              merged.set(row.email.toLowerCase(), {
                user_id: row.user_id,
                full_name: row.full_name || row.email.split('@')[0],
                email: row.email,
                role: row.role || 'student',
                house: row.house,
                year_group: row.year_group,
                class_name: row.class_name,
              });
            }
          }
        }
      } catch {
        // demoPeople already loaded
      }

      setDirectory(Array.from(merged.values()));
    };

    fetchDirectory();
  }, []);

  useEffect(() => {
    loadReplies();

    const unsub = subscribeToInboxRealtime(accountKey, user?.id, (detail) => {
      loadReplies();
      if (detail?.fromRemote && detail?.subject) {
        toast.info(`New Reading Challenge email: ${detail.subject}`, { duration: 3500 });
      }
    });

    const interval = setInterval(() => {
      loadReplies();
    }, 8000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [accountKey, user?.id, loadReplies]);

  const normActiveId = normalizeChallengeId(activeChallengeId);

  const challengeScopedReplies = useMemo(() => {
    if (challengeFilter === 'all') return replies;

    return replies.filter((item) => {
      if (item.is_draft) return true;
      if (!item.challenge_id) {
        const text = `${item.subject} ${item.body}`.toLowerCase();
        const titleWords = activeChallengeTitle
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 3);
        return (
          titleWords.some((w) => text.includes(w)) ||
          text.includes('reading challenge') ||
          text.includes('45-book')
        );
      }
      if (challengeFilter === 'active') {
        return (
          item.challenge_id === activeChallengeId ||
          normalizeChallengeId(item.challenge_id) === normActiveId
        );
      }
      return (
        item.challenge_id === challengeFilter ||
        normalizeChallengeId(item.challenge_id) === normalizeChallengeId(challengeFilter)
      );
    });
  }, [replies, challengeFilter, activeChallengeId, normActiveId, activeChallengeTitle]);

  const isMessageInboundForUser = useCallback(
    (item: EmailReply) => {
      const cleanMe = currentUserEmail.toLowerCase().trim();
      const senderClean =
        (item.sender_email?.includes('<')
          ? item.sender_email.match(/<([^>]+)>/)?.[1]
          : item.sender_email) ||
        item.sender_email ||
        '';
      const recipientClean =
        (item.recipient_email?.includes('<')
          ? item.recipient_email.match(/<([^>]+)>/)?.[1]
          : item.recipient_email) ||
        item.recipient_email ||
        '';

      const isSender =
        senderClean.toLowerCase().trim() === cleanMe ||
        (Boolean(item.sender_name && currentUserName) &&
          item.sender_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());
      const isRecipient = recipientClean.toLowerCase().trim() === cleanMe;

      if (item.is_draft) return false;
      if (item.direction === 'outbound') return false;
      if (isSender && !isRecipient) return false;
      if (recipientClean && !isRecipient) return false;
      return true;
    },
    [currentUserEmail, currentUserName]
  );

  const isMessageOutboundFromUser = useCallback(
    (item: EmailReply) => {
      if (item.is_draft) return false;
      const cleanMe = currentUserEmail.toLowerCase().trim();
      const senderClean =
        (item.sender_email?.includes('<')
          ? item.sender_email.match(/<([^>]+)>/)?.[1]
          : item.sender_email) ||
        item.sender_email ||
        '';
      const recipientClean =
        (item.recipient_email?.includes('<')
          ? item.recipient_email.match(/<([^>]+)>/)?.[1]
          : item.recipient_email) ||
        item.recipient_email ||
        '';

      const isSender =
        senderClean.toLowerCase().trim() === cleanMe ||
        (Boolean(item.sender_name && currentUserName) &&
          item.sender_name.toLowerCase().trim() === currentUserName.toLowerCase().trim());
      const isRecipient = recipientClean.toLowerCase().trim() === cleanMe;

      if (item.direction === 'outbound') return true;
      return isSender && !isRecipient;
    },
    [currentUserEmail, currentUserName]
  );

  const folderLists = useMemo(() => {
    const inbox = challengeScopedReplies.filter(
      (m) => !m.trashed && !m.is_draft && isMessageInboundForUser(m)
    );
    const sent = challengeScopedReplies.filter(
      (m) => !m.trashed && !m.is_draft && isMessageOutboundFromUser(m)
    );
    const drafts = challengeScopedReplies.filter((m) => !m.trashed && Boolean(m.is_draft));
    const trash = challengeScopedReplies.filter((m) => Boolean(m.trashed));

    return { inbox, sent, drafts, trash };
  }, [challengeScopedReplies, isMessageInboundForUser, isMessageOutboundFromUser]);

  const unreadCount = useMemo(
    () => folderLists.inbox.filter((m) => !m.read).length,
    [folderLists.inbox]
  );

  const activeFolderReplies = folderLists[folder];

  const filteredReplies = useMemo(() => {
    const sorted = [...activeFolderReplies].sort(
      (a, b) =>
        new Date(b.sent_at || b.received_at || 0).getTime() -
        new Date(a.sent_at || a.received_at || 0).getTime()
    );

    return sorted.filter((item) => {
      if (filterType === 'unread' && item.read) return false;
      if (filterType === 'review' && item.category !== 'review') return false;
      if (filterType === 'reflection' && item.category !== 'reflection') return false;
      if (filterType === 'milestone' && item.category !== 'milestone') return false;
      if (filterType === 'launch' && item.category !== 'launch') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const threadText = (item.replies || item.responses || [])
        .map((r) => `${r.sender_name} ${r.body}`)
        .join(' ')
        .toLowerCase();

      return (
        item.subject.toLowerCase().includes(q) ||
        item.sender_name.toLowerCase().includes(q) ||
        item.sender_email.toLowerCase().includes(q) ||
        (item.recipient_name && item.recipient_name.toLowerCase().includes(q)) ||
        (item.recipient_email && item.recipient_email.toLowerCase().includes(q)) ||
        item.body.toLowerCase().includes(q) ||
        threadText.includes(q)
      );
    });
  }, [activeFolderReplies, filterType, searchQuery]);

  const selectedReply = useMemo(() => {
    if (!selectedReplyId) {
      return viewMode === 'split' ? filteredReplies[0] || null : null;
    }
    return filteredReplies.find((r) => r.id === selectedReplyId) || null;
  }, [filteredReplies, selectedReplyId, viewMode]);

  const certDetails = useMemo(() => {
    if (!selectedReply) return null;
    const bodyText = selectedReply.body || '';
    const subjectText = selectedReply.subject || '';
    const combined = `${subjectText} ${bodyText}`.toLowerCase();

    const isCert =
      combined.includes('certificate of achievement') ||
      combined.includes('parchment') ||
      combined.includes('congratulations on your distinguished reading milestone') ||
      combined.includes('reader award');

    if (!isCert) return null;

    let studentName = selectedReply.recipient_name;
    if (!studentName || studentName === 'Student' || studentName === 'Academy Scholar') {
      const dearMatch = bodyText.match(/Dear\s+([^,\n\r]+)/i);
      if (dearMatch?.[1]) {
        studentName = dearMatch[1].trim();
      } else if (profile?.full_name) {
        studentName = profile.full_name;
      } else if (selectedReply.recipient_email) {
        studentName = selectedReply.recipient_email.split('@')[0].replace(/\./g, ' ');
      } else {
        studentName = 'Academy Scholar';
      }
    }

    let level = 'Beginner';
    if (combined.includes('gold')) level = 'Gold';
    else if (combined.includes('silver')) level = 'Silver';
    else if (combined.includes('bronze')) level = 'Bronze';

    let booksCount = level === 'Gold' ? 45 : level === 'Silver' ? 30 : level === 'Bronze' ? 15 : 3;
    const booksMatch = bodyText.match(/(\d+)\s*(?:verified\s*)?books/i);
    if (booksMatch?.[1]) {
      booksCount = parseInt(booksMatch[1], 10);
    }

    let house = profile?.house || 'Kenya House';
    const houseMatch = bodyText.match(/(Kenya|Longonot|Kilimanjaro|Elgon)\s*(?:House)?/i);
    if (houseMatch?.[1]) {
      house = `${houseMatch[1]} House`;
    }

    let yearGroup = profile?.year_group || 'DP1';
    const yearMatch = bodyText.match(/\b(DP1|DP2|MYP5|G10|G11|G12|Grade\s*10|Grade\s*11|Grade\s*12)\b/i);
    if (yearMatch?.[1]) {
      yearGroup = yearMatch[1];
    }

    let verificationCode = '';
    const codeMatch = bodyText.match(/MFA-[A-Z0-9-]+/i);
    if (codeMatch?.[0]) {
      verificationCode = codeMatch[0].toUpperCase();
    } else {
      const hashVal = Math.abs(
        (selectedReply.id || selectedReply.subject || 'seed')
          .split('')
          .reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 9000 +
          1000
      );
      verificationCode = `MFA-CERT-KEN-${hashVal}`;
    }

    return {
      studentName: studentName.trim(),
      studentEmail: selectedReply.recipient_email || currentUserEmail,
      house,
      yearGroup,
      level,
      booksCount,
      verificationCode,
      signatoryName: selectedReply.sender_name || 'Academy Head Librarian',
      signatoryTitle: selectedReply.sender_role || 'Head Librarian & Director of Literacy',
      challengeTitle:
        selectedChallenge?.title || '45-Book Reading Challenge 2025/2026: Beyond the Pages',
    };
  }, [selectedReply, profile, currentUserEmail, selectedChallenge]);

  // Directory filtering for Compose & Forward
  const filteredDirectory = useMemo(() => {
    const q = toQuery.toLowerCase().trim();
    const existingEmails = new Set(toRecipients.map((r) => r.email.toLowerCase()));
    return directory
      .filter((p) => !existingEmails.has(p.email.toLowerCase()))
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q) ||
          (p.house && p.house.toLowerCase().includes(q)) ||
          (p.year_group && p.year_group.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [directory, toQuery, toRecipients]);

  const filteredForwardDirectory = useMemo(() => {
    const q = forwardInput.toLowerCase().trim();
    const existing = new Set(forwardRecipients.map((r) => r.email.toLowerCase()));
    return directory
      .filter((p) => !existing.has(p.email.toLowerCase()))
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [directory, forwardInput, forwardRecipients]);

  const composeValidation = useMemo(
    () => validateReadingChallengeEmail(composeSubject, composeBody),
    [composeSubject, composeBody]
  );

  // Handlers
  const handleSelectFolder = (nextFolder: MailFolder) => {
    setFolder(nextFolder);
    setSelectedIds(new Set());
    if (viewMode === 'gmail') {
      setSelectedReplyId(null);
    } else {
      const nextList = folderLists[nextFolder];
      setSelectedReplyId(nextList[0]?.id || null);
    }
  };

  const handleOpenMessage = (item: EmailReply) => {
    if (item.is_draft) {
      // Open draft directly in Gmail Compose window
      setDraftId(item.id);
      if (item.recipient_email) {
        const matched = directory.find(
          (d) => d.email.toLowerCase() === item.recipient_email?.toLowerCase()
        );
        setToRecipients([
          matched || {
            full_name: item.recipient_name || item.recipient_email.split('@')[0],
            email: item.recipient_email,
            role: 'reader',
          },
        ]);
      } else {
        setToRecipients([]);
      }
      setComposeSubject(item.subject === '(No Reading Challenge Subject)' ? '' : item.subject);
      setComposeBody(item.body || '');
      if (item.challenge_id) setComposeChallengeId(item.challenge_id);
      setComposeOpen(true);
      setComposeMinimized(false);
      return;
    }

    setSelectedReplyId(item.id);
    setThreadAction('reply');
    if (!item.read) {
      markEmailReplyAsRead(item.id, accountKey);
      loadReplies();
    }
  };

  const handleTrashMessage = (id: string, trashed = true) => {
    moveEmailToTrash(id, trashed, accountKey);
    if (selectedReplyId === id && viewMode === 'gmail') setSelectedReplyId(null);
    loadReplies();
    toast.success(trashed ? 'Moved to Trash' : 'Restored from Trash');
  };

  const handleDeleteForever = (id: string) => {
    deleteEmailPermanently(id, accountKey);
    if (selectedReplyId === id) setSelectedReplyId(null);
    loadReplies();
    toast.success('Deleted permanently');
  };

  const handleToggleSelectId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredReplies.length && filteredReplies.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReplies.map((r) => r.id)));
    }
  };

  const handleBulkAction = (action: 'read' | 'unread' | 'trash' | 'restore' | 'delete') => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => {
      if (action === 'read') markEmailReplyAsRead(id, accountKey);
      if (action === 'unread') markEmailReplyAsUnread(id, accountKey);
      if (action === 'trash') moveEmailToTrash(id, true, accountKey);
      if (action === 'restore') {
        moveEmailToTrash(id, false, accountKey);
      }
      if (action === 'delete') deleteEmailPermanently(id, accountKey);
    });
    setSelectedIds(new Set());
    loadReplies();
    toast.success(`Updated ${selectedIds.size} conversation(s)`);
  };

  const handleRefreshInbox = async () => {
    setIsRefreshing(true);
    await loadReplies();
    setIsRefreshing(false);
    toast.success('Inbox synced with latest Reading Challenge dispatches');
  };

  const handleMarkAllRead = () => {
    markAllEmailRepliesAsRead(accountKey);
    loadReplies();
    toast.success('All Inbox messages marked as read');
  };

  const addRecipientFromInput = (
    rawInput: string,
    list: DirectoryPerson[],
    setter: React.Dispatch<React.SetStateAction<DirectoryPerson[]>>,
    clearInput: () => void
  ) => {
    const email = rawInput.trim().replace(/,$/, '');
    if (!email || !email.includes('@')) return;
    if (list.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      clearInput();
      return;
    }
    const matched = directory.find((d) => d.email.toLowerCase() === email.toLowerCase());
    setter([
      ...list,
      matched || {
        full_name: email.split('@')[0].replace(/\./g, ' '),
        email,
        role: 'reader',
      },
    ]);
    clearInput();
  };

  const handleOpenCompose = () => {
    if (isAdminOrLibrarian) {
      navigate('/admin?s=broadcast');
      return;
    }
    setDraftId(undefined);
    setToRecipients([]);
    setToQuery('');
    setComposeSubject('');
    setComposeBody('');
    setComposeChallengeId(activeChallengeId);
    setComposeOpen(true);
    setComposeMinimized(false);
  };

  const handleCloseCompose = (saveIfNonEmpty = true) => {
    const hasContent = Boolean(composeSubject.trim() || composeBody.trim() || toRecipients.length > 0);
    if (saveIfNonEmpty && hasContent) {
      saveEmailDraft(
        {
          id: draftId,
          senderName: currentUserName,
          senderEmail: currentUserEmail,
          senderRole: profile?.role || 'Reader',
          recipientEmail: toRecipients.map((r) => r.email).join(', '),
          recipientName: toRecipients.map((r) => r.full_name).join(', '),
          subject: composeSubject.trim(),
          body: composeBody,
          challengeId: composeChallengeId,
        },
        accountKey
      );
      toast.info('Draft saved to Drafts folder');
      loadReplies();
    }
    setComposeOpen(false);
  };

  const handleDiscardDraft = () => {
    if (draftId) {
      deleteEmailDraft(draftId, accountKey);
      loadReplies();
    }
    setDraftId(undefined);
    setToRecipients([]);
    setToQuery('');
    setComposeSubject('');
    setComposeBody('');
    setComposeOpen(false);
    toast.success('Draft discarded');
  };

  const handleSendCompose = async () => {
    // Allow typed email in input box if user forgot to press Enter
    const finalRecipients = [...toRecipients];
    if (toQuery.trim().includes('@')) {
      const typedEmail = toQuery.trim().replace(/,$/, '');
      if (!finalRecipients.some((r) => r.email.toLowerCase() === typedEmail.toLowerCase())) {
        const matched = directory.find((d) => d.email.toLowerCase() === typedEmail.toLowerCase());
        finalRecipients.push(
          matched || {
            full_name: typedEmail.split('@')[0].replace(/\./g, ' '),
            email: typedEmail,
            role: 'reader',
          }
        );
      }
    }

    if (finalRecipients.length === 0) {
      toast.error('Please add at least one Reading Challenge recipient');
      return;
    }

    const validation = validateReadingChallengeEmail(composeSubject, composeBody);
    if (!validation.valid) {
      toast.error(validation.reason || 'Only Reading Challenge emails can be sent.');
      return;
    }

    setSendingCompose(true);
    try {
      const challengeObj = challenges.find((c) => c.id === composeChallengeId);
      const category = getReadingChallengeCategory({
        subject: composeSubject,
        body: composeBody,
      });

      for (const recipient of finalRecipients) {
        dispatchReadingChallengeMessage({
          challengeId: composeChallengeId,
          challengeTitle: challengeObj?.title || activeChallengeTitle,
          senderName: currentUserName,
          senderEmail: currentUserEmail,
          senderRole: profile?.role ? profile.role.replace(/_/g, ' ') : 'Academy Reader',
          recipientEmail: recipient.email,
          recipientName: recipient.full_name,
          recipientUserId: recipient.user_id,
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          category,
        });
      }

      // Optional live Google Gmail relay if user has connected Gmail
      if (gmailStatus.isConnected && alsoSendViaGmail) {
        await sendViaGoogleGmail(
          finalRecipients.map((r) => r.email),
          composeSubject.trim(),
          composeBody.trim(),
          {
            senderBadge: profile?.role
              ? `${profile.role.replace(/_/g, ' ')} • MFA Reading Challenge`
              : 'MFA Reading Challenge',
          }
        ).catch(() => {});
      }

      if (draftId) {
        deleteEmailDraft(draftId, accountKey);
      }

      toast.success(
        `Sent Reading Challenge email to ${finalRecipients
          .map((r) => r.full_name || r.email)
          .join(', ')}`
      );
      setComposeOpen(false);
      setDraftId(undefined);
      setToRecipients([]);
      setToQuery('');
      setComposeSubject('');
      setComposeBody('');
      loadReplies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send email';
      toast.error(msg);
    } finally {
      setSendingCompose(false);
    }
  };

  const handleSendThreadResponse = async () => {
    if (!selectedReply || !responseDraft.trim()) return;

    if (threadAction === 'forward') {
      const fwdList = [...forwardRecipients];
      if (forwardInput.trim().includes('@')) {
        const cleanEmail = forwardInput.trim().replace(/,$/, '');
        fwdList.push({
          full_name: cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'reader',
        });
      }
      if (fwdList.length === 0) {
        toast.error('Select a recipient to forward this Reading Challenge email to');
        return;
      }

      const fwdSubject = selectedReply.subject.startsWith('Fwd:')
        ? selectedReply.subject
        : `Fwd: ${selectedReply.subject}`;
      const fwdBody = `${responseDraft.trim()}\n\n---------- Forwarded Reading Challenge Message ----------\nFrom: ${selectedReply.sender_name} <${selectedReply.sender_email}>\nDate: ${new Date(selectedReply.sent_at).toLocaleString()}\nSubject: ${selectedReply.subject}\n\n${selectedReply.body}`;

      const validation = validateReadingChallengeEmail(fwdSubject, fwdBody);
      if (!validation.valid) {
        toast.error(validation.reason || 'Only Reading Challenge emails can be forwarded.');
        return;
      }

      setSendingResponse(true);
      try {
        for (const r of fwdList) {
          dispatchReadingChallengeMessage({
            challengeId: selectedReply.challenge_id || activeChallengeId,
            challengeTitle: activeChallengeTitle,
            senderName: currentUserName,
            senderEmail: currentUserEmail,
            senderRole: profile?.role?.replace(/_/g, ' ') || 'Academy Reader',
            recipientEmail: r.email,
            recipientName: r.full_name,
            recipientUserId: r.user_id,
            subject: fwdSubject,
            body: fwdBody,
            category: selectedReply.category,
            forwardedFrom: selectedReply.sender_email,
          });
        }
        toast.success(`Forwarded Reading Challenge thread to ${fwdList.map((f) => f.full_name).join(', ')}`);
        setResponseDraft('');
        setForwardRecipients([]);
        setForwardInput('');
        setThreadAction('reply');
        loadReplies();
      } finally {
        setSendingResponse(false);
      }
      return;
    }

    // Reply mode — validate reading challenge relevance (thread subject already anchors context, check body too)
    const validation = validateReadingChallengeEmail(selectedReply.subject, `${selectedReply.subject} ${responseDraft}`);
    if (!validation.valid) {
      toast.error(validation.reason || 'Please keep replies focused on the Reading Challenge.');
      return;
    }

    setSendingResponse(true);
    try {
      appendUserResponse(
        selectedReply.id,
        currentUserName,
        currentUserEmail,
        responseDraft.trim(),
        accountKey
      );

      const replyTargetEmail =
        selectedReply.direction === 'outbound'
          ? selectedReply.recipient_email
          : selectedReply.sender_email;

      if (gmailStatus.isConnected && alsoSendViaGmail && replyTargetEmail) {
        await sendViaGoogleGmail(
          [replyTargetEmail],
          selectedReply.subject.startsWith('Re:')
            ? selectedReply.subject
            : `Re: ${selectedReply.subject}`,
          responseDraft.trim(),
          { senderBadge: 'MFA Reading Challenge Reply' }
        ).catch(() => {});
      }

      toast.success(`Reply delivered to ${replyTargetEmail || selectedReply.sender_name}`);
      setResponseDraft('');
      loadReplies();
    } finally {
      setSendingResponse(false);
    }
  };

  const handleToggleGmailConnect = async () => {
    if (gmailStatus.isConnected) {
      await disconnectGmail();
      setGmailStatus(getGmailConnectionStatus());
      toast.info('Disconnected external Gmail relay. In-app Reading Mail remains active.');
    } else {
      try {
        await connectGmail();
        setGmailStatus(getGmailConnectionStatus());
        toast.success('Google Gmail connected for live Reading Challenge sending!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Could not connect Google Gmail');
      }
    }
  };

  const renderCategoryBadge = (category?: ReadingChallengeCategory) => {
    switch (category) {
      case 'review':
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-semibold whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3 h-3" /> Book Review
          </Badge>
        );
      case 'reflection':
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 gap-1 font-semibold whitespace-nowrap shrink-0"
          >
            <FileText className="w-3 h-3" /> Reflection
          </Badge>
        );
      case 'milestone':
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 font-semibold whitespace-nowrap shrink-0"
          >
            <Award className="w-3 h-3" /> Milestone
          </Badge>
        );
      case 'launch':
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10 gap-1 font-semibold whitespace-nowrap shrink-0"
          >
            <Flame className="w-3 h-3" /> Challenge Info
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/10 gap-1 font-semibold whitespace-nowrap shrink-0"
          >
            <Mail className="w-3 h-3" /> Reading Update
          </Badge>
        );
    }
  };

  const activeThreads = selectedReply?.replies || selectedReply?.responses || [];

  const currentIdx = selectedReply
    ? filteredReplies.findIndex((r) => r.id === selectedReply.id)
    : -1;

  const folderItems: Array<{
    key: MailFolder;
    label: string;
    icon: React.FC<{ className?: string }>;
    count: number;
    accent: string;
  }> = [
    { key: 'inbox', label: 'Inbox', icon: InboxIcon, count: unreadCount, accent: 'text-emerald-500' },
    { key: 'sent', label: 'Sent', icon: Send, count: folderLists.sent.length, accent: 'text-sky-500' },
    { key: 'drafts', label: 'Drafts', icon: FileEdit, count: folderLists.drafts.length, accent: 'text-orange-400' },
    { key: 'trash', label: 'Trash', icon: Trash2, count: folderLists.trash.length, accent: 'text-rose-400' },
  ];

  const renderMessageDetail = (reply: EmailReply) => {
    const replyTargetLabel =
      reply.direction === 'outbound'
        ? reply.recipient_name || reply.recipient_email || 'Recipient'
        : reply.sender_name || reply.sender_email;

    return (
      <div className="flex flex-col h-full min-h-[580px]">
        {/* Gmail Thread Action Toolbar */}
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 flex-wrap bg-muted/20">
          <div className="flex items-center gap-1.5 flex-wrap">
            {viewMode === 'gmail' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReplyId(null)}
                className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            )}

            {reply.trashed ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTrashMessage(reply.id, false)}
                  className="h-8 px-2.5 rounded-xl text-xs gap-1 text-emerald-500"
                >
                  <RotateCcw className="w-4 h-4" /> Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteForever(reply.id)}
                  className="h-8 px-2.5 rounded-xl text-xs gap-1 text-rose-500"
                >
                  <Trash2 className="w-4 h-4" /> Delete Forever
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleTrashMessage(reply.id, true)}
                title="Delete to Trash"
                className="h-8 px-2.5 rounded-xl text-xs gap-1"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                markEmailReplyAsUnread(reply.id, accountKey);
                if (viewMode === 'gmail') setSelectedReplyId(null);
                loadReplies();
                toast.info('Marked as unread');
              }}
              title="Mark as unread"
              className="h-8 px-2.5 rounded-xl text-xs gap-1"
            >
              <MailOpen className="w-4 h-4 text-sky-500" />
              <span className="hidden sm:inline">Mark Unread</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFormattedCard((v) => !v)}
              className="h-7 px-2.5 rounded-xl text-[11px] font-semibold"
            >
              {showFormattedCard ? 'Clean Mail View' : 'Official Letter View'}
            </Button>
            {filteredReplies.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground tabular-nums">
                <span>
                  {currentIdx + 1} / {filteredReplies.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentIdx <= 0}
                  onClick={() => handleOpenMessage(filteredReplies[currentIdx - 1])}
                  className="h-7 w-7 p-0 rounded-lg"
                >
                  ‹
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentIdx >= filteredReplies.length - 1}
                  onClick={() => handleOpenMessage(filteredReplies[currentIdx + 1])}
                  className="h-7 w-7 p-0 rounded-lg"
                >
                  ›
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Thread Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Subject & Labels Header */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug">
                {reply.subject}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {renderCategoryBadge(reply.category)}
                {reply.direction === 'outbound' ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-semibold gap-1 whitespace-nowrap"
                  >
                    <Send className="w-2.5 h-2.5" /> Sent
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 whitespace-nowrap"
                  >
                    <InboxIcon className="w-2.5 h-2.5" /> Inbox
                  </Badge>
                )}
              </div>
            </div>

            {/* Sender Metadata Header Row (Gmail style) */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
                  {(reply.sender_name || 'R').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate">
                      {reply.sender_name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      &lt;{reply.sender_email}&gt;
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
                      {reply.sender_role}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    To: {reply.recipient_name ? `${reply.recipient_name} ` : ''}
                    &lt;{reply.recipient_email || currentUserEmail}&gt;
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(reply.sent_at || reply.received_at || '').toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Message Body Presentation */}
          {showFormattedCard && (certDetails || reply.sender_role?.toLowerCase().includes('librarian') || reply.sender_role?.toLowerCase().includes('admin')) ? (
            <OfficialEmailMessageCard
              subject={reply.subject}
              senderBadge={reply.sender_role || 'Office of the Academy Librarian'}
              senderName={reply.sender_name}
              senderEmail={reply.sender_email}
              recipientName={reply.recipient_name}
              recipientEmail={reply.recipient_email}
              body={reply.body}
              dispatchedAt={reply.sent_at || reply.received_at}
              certificateDetails={certDetails}
            />
          ) : (
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card/80 text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-2xs">
              {reply.body}
            </div>
          )}

          {/* Chronological Thread Replies */}
          {activeThreads.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Reply className="w-3.5 h-3.5 text-emerald-500" />
                Conversation Thread ({activeThreads.length})
              </div>

              <div className="space-y-2.5">
                {activeThreads.map((resp, i) => {
                  const isMe =
                    (resp.sender_email || '').toLowerCase().trim() ===
                    currentUserEmail.toLowerCase().trim();
                  return (
                    <div
                      key={resp.id || i}
                      className={cn(
                        'p-4 rounded-2xl border space-y-2 transition-all',
                        isMe
                          ? 'bg-emerald-500/8 border-emerald-500/25 ml-4 sm:ml-8'
                          : 'bg-sky-500/8 border-sky-500/25 mr-4 sm:mr-8'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                              isMe ? 'bg-emerald-600' : 'bg-sky-600'
                            )}
                          >
                            {(resp.sender_name || 'U').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="font-bold text-foreground truncate">
                            {resp.sender_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline">
                            &lt;{resp.sender_email}&gt;
                          </span>
                        </div>
                        <span className="text-muted-foreground font-mono text-[10px] tabular-nums shrink-0">
                          {new Date(resp.sent_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {resp.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gmail Quick Reply / Forward Actions */}
          <div className="pt-3 border-t border-border/70 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={threadAction === 'reply' ? 'default' : 'outline'}
                onClick={() => setThreadAction('reply')}
                className="h-8 px-3.5 rounded-xl text-xs font-semibold gap-1.5 whitespace-nowrap"
              >
                <Reply className="w-3.5 h-3.5" /> Reply to {replyTargetLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={threadAction === 'forward' ? 'default' : 'outline'}
                onClick={() => setThreadAction('forward')}
                className="h-8 px-3.5 rounded-xl text-xs font-semibold gap-1.5 whitespace-nowrap"
              >
                <Forward className="w-3.5 h-3.5" /> Forward
              </Button>
            </div>

            {threadAction !== 'none' && (
              <div className="p-4 rounded-2xl border border-border bg-muted/25 space-y-3">
                {threadAction === 'forward' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground">Forward To:</span>
                      {forwardRecipients.map((r) => (
                        <Badge
                          key={r.email}
                          variant="secondary"
                          className="text-xs gap-1 rounded-lg px-2 py-0.5"
                        >
                          {r.full_name}
                          <button
                            type="button"
                            onClick={() =>
                              setForwardRecipients((prev) =>
                                prev.filter((p) => p.email !== r.email)
                              )
                            }
                            className="hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        value={forwardInput}
                        onChange={(e) => setForwardInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addRecipientFromInput(
                              forwardInput,
                              forwardRecipients,
                              setForwardRecipients,
                              () => setForwardInput('')
                            );
                          }
                        }}
                        placeholder="Search scholar or staff email..."
                        className="h-8 text-xs flex-1 min-w-[180px] rounded-xl bg-background"
                      />
                    </div>
                    {forwardInput.trim() && filteredForwardDirectory.length > 0 && (
                      <div className="rounded-xl border border-border bg-popover p-1.5 shadow-md space-y-1 max-h-36 overflow-y-auto">
                        {filteredForwardDirectory.map((person) => (
                          <button
                            key={person.email}
                            type="button"
                            onClick={() => {
                              setForwardRecipients((prev) => [...prev, person]);
                              setForwardInput('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-semibold truncate">{person.full_name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {person.email} ({person.role.replace(/_/g, ' ')})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Textarea
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  placeholder={
                    threadAction === 'forward'
                      ? 'Add a Reading Challenge note to forward with this thread...'
                      : `Reply to ${replyTargetLabel} about this Reading Challenge...`
                  }
                  className="min-h-[100px] text-xs sm:text-sm resize-none rounded-xl bg-background"
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Reading Challenge Mail Only &bull; Delivered directly to recipient Inbox
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendThreadResponse}
                    disabled={!responseDraft.trim() || sendingResponse}
                    className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-sky-600 text-white border-0 shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingResponse
                      ? 'Sending...'
                      : threadAction === 'forward'
                      ? 'Forward Mail'
                      : 'Send Reply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Inbox — Reading Challenge Mail</title>
        <meta
          name="description"
          content="Gmail-style Reading Challenge Inbox for sending and receiving book review updates, scholar reflections, milestones, and librarian notices."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="w-full max-w-none px-3 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Top Floating Gmail Header + Search Div */}
        <div
          className="rotating-gradient-card rounded-3xl p-4 sm:p-5 shadow-md"
          style={
            {
              '--rg-c1': '160 84% 39%',
              '--rg-c2': '217 91% 60%',
              '--rg-c3': '38 92% 50%',
            } as React.CSSProperties
          }
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                <InboxIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                    Inbox
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 whitespace-nowrap"
                  >
                    <BookOpen className="w-3 h-3" /> Reading Challenge Only
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10 gap-1.5 whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Real-Time
                  </Badge>
                  {unreadCount > 0 ? (
                    <Badge className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 tabular-nums whitespace-nowrap">
                      {unreadCount} Unread
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Caught Up
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Send &amp; receive authentic Reading Challenge emails as{' '}
                  <span className="font-mono text-foreground">{currentUserEmail}</span>
                </p>
              </div>
            </div>

            {/* Gmail Search Input & Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 lg:max-w-2xl justify-end">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mail by scholar, book, reflection, realm..."
                  className="pl-10 pr-8 h-10 text-xs rounded-2xl bg-background/80 border-border/80"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Select value={challengeFilter} onValueChange={setChallengeFilter}>
                <SelectTrigger className="h-10 text-xs rounded-2xl bg-background/80 border-border/80 w-full sm:w-[205px]">
                  <SelectValue placeholder="Challenge Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Challenges ({replies.length})</SelectItem>
                  <SelectItem value="active">Active: {activeChallengeTitle.slice(0, 20)}</SelectItem>
                  {challenges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title.slice(0, 28)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode((m) => (m === 'gmail' ? 'split' : 'gmail'))}
                  title={viewMode === 'gmail' ? 'Switch to Split Reading Pane' : 'Switch to Classic Gmail View'}
                  className="h-10 px-3 rounded-2xl text-xs font-semibold gap-1.5 whitespace-nowrap"
                >
                  {viewMode === 'gmail' ? (
                    <>
                      <Columns2 className="w-3.5 h-3.5 text-sky-500" />
                      <span className="hidden xl:inline">Split</span>
                    </>
                  ) : (
                    <>
                      <PanelTop className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="hidden xl:inline">Classic</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRefreshInbox}
                  disabled={isRefreshing}
                  className="h-10 px-3.5 rounded-2xl text-xs font-semibold gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                  <span className="hidden sm:inline">{isRefreshing ? 'Syncing' : 'Sync'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Gmail 2/3-Column Floating Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Gmail Rail (Folders, Compose, Reading Topics, Gmail Relay) */}
          <aside className="lg:col-span-3 xl:col-span-2 space-y-3">
            {/* Compose Button + Folders Card */}
            <div
              className="rotating-gradient-card rounded-3xl p-3.5 space-y-3 shadow-sm"
              style={
                {
                  '--rg-c1': '199 89% 48%',
                  '--rg-c2': '160 84% 39%',
                  '--rg-c3': '262 83% 58%',
                } as React.CSSProperties
              }
            >
              <Button
                type="button"
                onClick={handleOpenCompose}
                title={isAdminOrLibrarian ? 'Open Mass Broadcaster' : 'Compose Reading Challenge Email'}
                className="w-full h-11 rounded-2xl font-bold text-sm gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 hover:opacity-95 text-white border-0 shadow-md whitespace-nowrap"
              >
                <Edit3 className="w-4 h-4" />
                <span>Compose</span>
              </Button>

              <div className="space-y-1">
                {folderItems.map((item) => {
                  const Icon = item.icon;
                  const active = folder === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectFolder(item.key)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground/80 hover:bg-muted/70'
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary-foreground' : item.accent)} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.count > 0 && (
                        <span
                          className={cn(
                            'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums',
                            active
                              ? 'bg-white/20 text-white'
                              : item.key === 'inbox'
                              ? 'bg-rose-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reading Topics
                </div>
                {(
                  [
                    { key: 'all', label: 'All Mail' },
                    { key: 'unread', label: 'Unread Only' },
                    { key: 'review', label: 'Book Reviews' },
                    { key: 'reflection', label: 'Reflections' },
                    { key: 'milestone', label: 'Milestones' },
                    { key: 'launch', label: 'Challenge Info' },
                  ] as Array<{ key: TopicFilter; label: string }>
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterType(t.key)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors',
                      filterType === t.key
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* External Google Gmail Relay Status Card */}
            <div className="rounded-3xl border border-border/80 bg-card/80 p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Mail Relay
                </span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    gmailStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {gmailStatus.isConnected
                  ? `Connected: ${gmailStatus.email}`
                  : 'In-App Reading Mail active. Connect Google Gmail to also mirror outgoing dispatches.'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleGmailConnect}
                className="w-full h-8 rounded-xl text-[11px] font-semibold"
              >
                {gmailStatus.isConnected ? 'Disconnect Gmail' : 'Connect Google Gmail'}
              </Button>
            </div>
          </aside>

          {/* Main Workspace Area (Classic List/Thread OR Split View) */}
          <section className="lg:col-span-9 xl:col-span-10">
            <div
              className="rotating-gradient-card rounded-3xl overflow-hidden shadow-md min-h-[620px]"
              style={
                {
                  '--rg-c1': '217 91% 60%',
                  '--rg-c2': '262 83% 58%',
                  '--rg-c3': '160 84% 39%',
                } as React.CSSProperties
              }
            >
              {viewMode === 'split' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[620px]">
                  {/* Left List Pane in Split Mode */}
                  <div className="xl:col-span-5 border-b xl:border-b-0 xl:border-r border-border/70 flex flex-col">
                    <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            filteredReplies.length > 0 &&
                            selectedIds.size === filteredReplies.length
                          }
                          onChange={handleSelectAllVisible}
                          className="rounded border-border cursor-pointer"
                        />
                        <span className="text-xs font-bold capitalize text-foreground">
                          {folder}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                          ({filteredReplies.length})
                        </span>
                      </div>
                      {unreadCount > 0 && folder === 'inbox' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllRead}
                          className="h-7 px-2.5 rounded-xl text-[11px] font-semibold gap-1 text-emerald-500"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Read All
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[560px]">
                      {filteredReplies.length === 0 ? (
                        <div className="p-10 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                            <InboxIcon className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground">
                            No Reading Challenge emails in {folder}
                          </h4>
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            Compose a new Reading Challenge email to start a book discussion, request a review check, or message a scholar.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleOpenCompose}
                            className="rounded-xl text-xs font-bold gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Compose Email
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {filteredReplies.map((item) => {
                            const isSelected = selectedReply?.id === item.id;
                            const threadLen = (item.replies || item.responses || []).length;
                            const dateStr = item.sent_at || item.received_at || new Date().toISOString();
                            const displayParty = item.is_draft
                              ? `Draft → ${item.recipient_name || item.recipient_email || 'No recipient'}`
                              : folder === 'sent' || item.direction === 'outbound'
                              ? `To: ${item.recipient_name || item.recipient_email || 'Scholar'}`
                              : item.sender_name;

                            return (
                              <div
                                key={item.id}
                                onClick={() => handleOpenMessage(item)}
                                className={cn(
                                  'p-3.5 cursor-pointer transition-all flex items-start gap-2.5 group',
                                  isSelected
                                    ? 'bg-primary/10 border-l-4 border-l-emerald-500'
                                    : 'hover:bg-muted/40',
                                  !item.read && !isSelected && 'bg-emerald-500/5'
                                )}
                              >
                                <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(item.id)}
                                    onClick={(e) => handleToggleSelectId(e, item.id)}
                                    onChange={() => {}}
                                    className="rounded border-border cursor-pointer"
                                  />
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={cn(
                                        'text-xs truncate flex items-center gap-1.5',
                                        !item.read ? 'font-bold text-foreground' : 'font-medium text-foreground/85'
                                      )}
                                    >
                                      {!item.read && !item.is_draft && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                      )}
                                      <span className={cn(item.is_draft && 'text-rose-500 font-semibold')}>
                                        {displayParty}
                                      </span>
                                      {threadLen > 0 && (
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          ({threadLen + 1})
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
                                      {new Date(dateStr).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {renderCategoryBadge(item.category)}
                                    <span
                                      className={cn(
                                        'text-xs truncate',
                                        !item.read ? 'font-bold text-foreground' : 'font-medium text-foreground/90'
                                      )}
                                    >
                                      {item.subject}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {item.body}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Right Reading Pane in Split Mode */}
                  <div className="xl:col-span-7 flex flex-col">
                    {selectedReply ? (
                      renderMessageDetail(selectedReply)
                    ) : (
                      <div className="p-16 text-center m-auto space-y-3 text-muted-foreground">
                        <Mail className="w-12 h-12 mx-auto text-emerald-500/40" />
                        <h3 className="text-base font-bold text-foreground">Select a Reading Challenge Thread</h3>
                        <p className="text-xs max-w-sm mx-auto">
                          Pick a conversation on the left or click Compose to start a new Reading Challenge thread.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedReply ? (
                /* Gmail Classic: Open Thread View */
                renderMessageDetail(selectedReply)
              ) : (
                /* Gmail Classic: Full-Width Inbox List View */
                <div className="flex flex-col min-h-[620px]">
                  {/* Gmail Top Bulk Toolbar */}
                  <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 flex-wrap bg-muted/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded-xl hover:bg-muted/60">
                        <input
                          type="checkbox"
                          checked={
                            filteredReplies.length > 0 &&
                            selectedIds.size === filteredReplies.length
                          }
                          onChange={handleSelectAllVisible}
                          className="rounded border-border cursor-pointer"
                        />
                        <span className="text-xs font-bold capitalize text-foreground">
                          {folder}
                        </span>
                      </label>

                      {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap pl-2 border-l border-border">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBulkAction('read')}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1"
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Mark Read
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBulkAction('unread')}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1"
                          >
                            <MailOpen className="w-3.5 h-3.5 text-sky-500" /> Unread
                          </Button>
                          {folder === 'trash' ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBulkAction('restore')}
                                className="h-8 px-2.5 rounded-xl text-xs gap-1 text-emerald-500"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBulkAction('delete')}
                                className="h-8 px-2.5 rounded-xl text-xs gap-1 text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBulkAction('trash')}
                              className="h-8 px-2.5 rounded-xl text-xs gap-1 text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          )}
                        </div>
                      ) : (
                        unreadCount > 0 &&
                        folder === 'inbox' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 text-emerald-500"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
                          </Button>
                        )
                      )}
                    </div>

                    <div className="text-xs font-mono text-muted-foreground tabular-nums">
                      {filteredReplies.length === 0
                        ? '0 conversations'
                        : `1–${filteredReplies.length} of ${filteredReplies.length}`}
                    </div>
                  </div>

                  {/* Gmail Rows */}
                  <ScrollArea className="flex-1 h-[560px]">
                    {filteredReplies.length === 0 ? (
                      <div className="p-14 text-center space-y-3">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                          <InboxIcon className="w-7 h-7" />
                        </div>
                        <h4 className="text-base font-bold text-foreground">
                          Your {folder} folder is empty
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                          This Gmail-style Inbox exclusively delivers and sends{' '}
                          <strong>Reading Challenge emails</strong> (book reviews, reflections, milestones, and librarian dispatches).
                        </p>
                        <Button
                          type="button"
                          onClick={handleOpenCompose}
                          className="rounded-2xl font-bold text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-sky-600 text-white border-0 shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Compose Reading Challenge Email
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {filteredReplies.map((item) => {
                          const threadLen = (item.replies || item.responses || []).length;
                          const dateStr = item.sent_at || item.received_at || new Date().toISOString();
                          const displayParty = item.is_draft
                            ? `Draft → ${item.recipient_name || item.recipient_email || 'No recipient'}`
                            : folder === 'sent' || item.direction === 'outbound'
                            ? `To: ${item.recipient_name || item.recipient_email || 'Scholar'}`
                            : item.sender_name;

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleOpenMessage(item)}
                              className={cn(
                                'px-4 py-3 cursor-pointer transition-all flex items-center gap-3 group',
                                'hover:bg-muted/40 hover:shadow-[inset_0_0_0_1px_hsl(var(--border))]',
                                !item.read && !item.is_draft && 'bg-emerald-500/[0.06]'
                              )}
                            >
                              {/* Checkbox */}
                              <div className="flex items-center gap-2 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(item.id)}
                                  onClick={(e) => handleToggleSelectId(e, item.id)}
                                  onChange={() => {}}
                                  className="rounded border-border cursor-pointer"
                                />
                              </div>

                              {/* Sender / Recipient Column */}
                              <div className="w-44 sm:w-52 shrink-0 flex items-center gap-2 min-w-0">
                                {!item.read && !item.is_draft && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                )}
                                <span
                                  className={cn(
                                    'text-xs sm:text-sm truncate',
                                    item.is_draft
                                      ? 'text-rose-500 font-semibold'
                                      : !item.read
                                      ? 'font-bold text-foreground'
                                      : 'font-medium text-foreground/85'
                                  )}
                                >
                                  {displayParty}
                                </span>
                                {threadLen > 0 && (
                                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                    ({threadLen + 1})
                                  </span>
                                )}
                              </div>

                              {/* Category + Subject + Snippet */}
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="hidden md:inline-flex shrink-0">
                                  {renderCategoryBadge(item.category)}
                                </span>
                                <div className="min-w-0 flex-1 truncate text-xs sm:text-sm">
                                  <span
                                    className={cn(
                                      !item.read ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'
                                    )}
                                  >
                                    {item.subject}
                                  </span>
                                  <span className="text-muted-foreground font-normal ml-2">
                                    — {item.body.replace(/\s+/g, ' ').slice(0, 120)}
                                  </span>
                                </div>
                              </div>

                              {/* Hover Quick Actions OR Date */}
                              <div className="shrink-0 flex items-center gap-1">
                                <div className="hidden group-hover:flex items-center gap-0.5">
                                  {item.trashed ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTrashMessage(item.id, false);
                                      }}
                                      title="Restore"
                                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-500"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.is_draft) {
                                          deleteEmailDraft(item.id, accountKey);
                                        } else {
                                          handleTrashMessage(item.id, true);
                                        }
                                        loadReplies();
                                      }}
                                      title="Delete"
                                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {!item.is_draft && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.read) {
                                          markEmailReplyAsUnread(item.id, accountKey);
                                        } else {
                                          markEmailReplyAsRead(item.id, accountKey);
                                        }
                                        loadReplies();
                                      }}
                                      title={item.read ? 'Mark unread' : 'Mark read'}
                                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-sky-500"
                                    >
                                      <MailOpen className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-muted-foreground tabular-nums group-hover:hidden min-w-[54px] text-right">
                                  {new Date(dateStr).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Gmail Floating Compose Window */}
      {composeOpen && (
        <div
          className={cn(
            'fixed z-50 flex flex-col bg-card border border-border shadow-2xl overflow-hidden transition-all',
            composeExpanded
              ? 'inset-4 sm:inset-10 rounded-3xl'
              : composeMinimized
              ? 'bottom-0 right-4 sm:right-8 w-80 rounded-t-2xl'
              : 'bottom-0 right-0 sm:right-8 w-full sm:w-[560px] max-h-[86vh] rounded-t-3xl sm:rounded-3xl sm:bottom-4'
          )}
        >
          {/* Compose Header Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#00205B] via-slate-900 to-emerald-950 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold truncate">
                {composeSubject.trim() || 'New Reading Challenge Email'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setComposeMinimized((m) => !m)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposeMinimized(false);
                  setComposeExpanded((e) => !e);
                }}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"
                title="Expand"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleCloseCompose(true)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white"
                title="Save & Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!composeMinimized && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-3">
              {/* Reading Challenge Tag & Quick Templates */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Select value={composeChallengeId} onValueChange={setComposeChallengeId}>
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-muted/40 border-border/80 flex-1">
                    <SelectValue placeholder="Associate with Reading Challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    {challenges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {READING_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setComposeSubject(tpl.subject);
                        setComposeBody(tpl.body);
                      }}
                      className="px-2.5 py-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-[10px] font-semibold text-foreground whitespace-nowrap shrink-0"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* To Recipient Picker with Academy Directory Autocomplete */}
              <div className="relative rounded-2xl border border-border bg-background/70 px-3 py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">To</span>
                  {toRecipients.map((r) => (
                    <Badge
                      key={r.email}
                      variant="secondary"
                      className="text-xs rounded-xl gap-1 px-2 py-0.5"
                    >
                      <User className="w-3 h-3 text-emerald-500" />
                      <span>{r.full_name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setToRecipients((prev) => prev.filter((p) => p.email !== r.email))
                        }
                        className="hover:text-rose-500 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={toQuery}
                    onFocus={() => setShowToDropdown(true)}
                    onBlur={() => setTimeout(() => setShowToDropdown(false), 180)}
                    onChange={(e) => {
                      setToQuery(e.target.value);
                      setShowToDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addRecipientFromInput(toQuery, toRecipients, setToRecipients, () =>
                          setToQuery('')
                        );
                      }
                    }}
                    placeholder="Type name or @mpesafoundationacademy.ac.ke..."
                    className="flex-1 min-w-[180px] bg-transparent text-xs outline-none py-1 text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {showToDropdown && filteredDirectory.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-2xl border border-border bg-popover shadow-xl p-1.5 max-h-48 overflow-y-auto space-y-0.5">
                    {filteredDirectory.map((person) => (
                      <button
                        key={person.email}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setToRecipients((prev) => [...prev, person]);
                          setToQuery('');
                          setShowToDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{person.full_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {person.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                          {person.role.replace(/_/g, ' ')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject Input */}
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Reading Challenge Subject (e.g., Book Review: Things Fall Apart)"
                className="h-10 text-xs sm:text-sm font-semibold rounded-2xl bg-background/70"
              />

              {/* Message Body */}
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your Reading Challenge message, book reflection feedback, recommendation, or milestone note..."
                className="min-h-[170px] flex-1 text-xs sm:text-sm resize-none rounded-2xl bg-background/70"
              />

              {/* Live Reading Challenge Scope Guard Banner */}
              <div
                className={cn(
                  'px-3 py-2 rounded-2xl border text-[11px] flex items-center gap-2',
                  !composeSubject.trim() && !composeBody.trim()
                    ? 'bg-muted/40 border-border text-muted-foreground'
                    : composeValidation.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                )}
              >
                {composeValidation.valid ? (
                  <>
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Reading Challenge scope verified — ready to deliver.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {composeSubject.trim() || composeBody.trim()
                        ? composeValidation.reason
                        : 'Only Reading Challenge emails (books, reviews, reflections, realms, milestones) can be sent.'}
                    </span>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSendCompose}
                    disabled={sendingCompose || (!composeValidation.valid && Boolean(composeSubject.trim() || composeBody.trim()))}
                    className="h-9 px-5 rounded-2xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-sky-600 text-white border-0 shadow-md whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingCompose ? 'Sending...' : 'Send Email'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloseCompose(true)}
                    className="h-9 px-3 rounded-2xl text-xs font-semibold"
                  >
                    Save Draft
                  </Button>

                  {gmailStatus.isConnected && (
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoSendViaGmail}
                        onChange={(e) => setAlsoSendViaGmail(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>Also send via Gmail</span>
                    </label>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscardDraft}
                  title="Discard draft"
                  className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailInboxPage;
