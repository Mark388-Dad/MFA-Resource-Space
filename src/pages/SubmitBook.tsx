import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChallenges, DEFAULT_CHALLENGES, normalizeChallengeId, MAIN_CHALLENGE_ID } from '@/contexts/ChallengeContext';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, Calendar, User, FileText, Lock, Trophy, Sparkles, CheckCircle2, ShieldAlert, ArrowRight, UserCheck, Feather, AlertCircle, KeyRound, ShieldCheck, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import {
  MAX_BOOKS_PER_CATEGORY,
  TOTAL_BOOK_GOAL,
  POINTS_PER_BOOK,
  MILESTONES,
  YEAR_GROUPS,
} from '@/lib/constants';
import { useCategories } from '@/hooks/useCategories';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { AppDownloadButton } from '@/components/AppDownloadBanner';
import { useSessionDates, SessionCountdownBanner } from '@/components/SessionCountdownBanner';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';
import { LockedChallengeNotice } from '@/components/LockedChallengeNotice';

const submissionSchema = z.object({
  categoryNumber: z.number().min(1),
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(100),
  dateStarted: z.string().min(1, 'Start date is required'),
  dateFinished: z.string().min(1, 'Finish date is required'),
  reflection: z.string().min(50, 'Reflection must be at least 50 characters').max(2000),
  yearGroup: z.string().optional(),
});

const SubmitBook = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isStaff = profile?.role && profile.role !== 'student';
  const { categories: defaultCategories } = useCategories();
  const [searchParams] = useSearchParams();
  const {
    challenges,
    activeChallenges,
    userVisibleChallenges,
    selectedChallengeId,
    setSelectedChallengeId,
    isRegistered,
    registerForChallenge,
    joinChallengeWithCode,
  } = useChallenges();

  const eligibleChallenges = useMemo(() => {
    const list = userVisibleChallenges && userVisibleChallenges.length > 0 ? userVisibleChallenges : challenges;
    return list.filter((c) => c.id !== 'all' && c.is_active && c.status !== 'closed');
  }, [userVisibleChallenges, challenges]);

  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [inlineCode, setInlineCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Selected challenge for submission (must be a specific active challenge, not "all")
  const [submissionChallengeId, setSubmissionChallengeId] = useState<string>(() => {
    const fromUrl = searchParams.get('challenge');
    if (fromUrl && fromUrl !== 'all') return fromUrl;
    if (selectedChallengeId && selectedChallengeId !== 'all') return selectedChallengeId;
    return activeChallenges[0]?.id || challenges[0]?.id || '';
  });

  useEffect(() => {
    const fromUrl = searchParams.get('challenge');
    if (fromUrl && fromUrl !== 'all' && challenges.some((c) => c.id === fromUrl)) {
      setSubmissionChallengeId(fromUrl);
      setSelectedChallengeId(fromUrl);
    }
  }, [searchParams, challenges, setSelectedChallengeId]);

  const targetChallenge = useMemo(() => {
    const norm = normalizeChallengeId(submissionChallengeId);
    return (
      challenges.find((c) => c && (c.id === submissionChallengeId || c.id === norm) && c.id !== 'all') ||
      activeChallenges.find((c) => c && c.id !== 'all') ||
      challenges.find((c) => c && c.id !== 'all') ||
      challenges[0] ||
      DEFAULT_CHALLENGES[0]
    );
  }, [challenges, submissionChallengeId, activeChallenges]);

  const isTargetRegistered = targetChallenge?.id
    ? isRegistered(targetChallenge.id)
    : isStaff
    ? true
    : false;
  const submissionType = targetChallenge?.submission_type || 'book';

  const labels = useMemo(() => {
    switch (submissionType) {
      case 'poem':
        return {
          title: 'Poem Title / Stanza Theme *',
          titlePlaceholder: 'Enter the poem title or theme',
          author: 'Poet / Stanza Origin *',
          authorPlaceholder: 'Poet name (or your name for original poetry)',
          reflection: 'Poem Reflection & Stanza Analysis *',
          reflectionPlaceholder: 'Share your verses, lyrical analysis, metaphors, or emotional response to this poem...',
          unitName: 'Poem',
          unitNamePlural: 'Poems',
          badgeText: '✍️ Poetry Submission',
        };
      case 'art':
        return {
          title: 'Artwork / Comic Title *',
          titlePlaceholder: 'Enter the title of the artwork or visual narrative',
          author: 'Artist / Illustrator *',
          authorPlaceholder: 'Artist / creator name',
          reflection: 'Artistic Statement & Narrative Reflection *',
          reflectionPlaceholder: 'Describe your visual storytelling choices, paneling techniques, and themes...',
          unitName: 'Artwork',
          unitNamePlural: 'Artworks',
          badgeText: '🎨 Visual Art Submission',
        };
      case 'essay':
        return {
          title: 'Essay / Thesis Title *',
          titlePlaceholder: 'Enter your essay or research title',
          author: 'Author / Scholar *',
          authorPlaceholder: 'Primary author or researcher',
          reflection: 'Thesis Summary & Critical Reflection *',
          reflectionPlaceholder: 'Outline the core arguments, evidence examined, and personal conclusions...',
          unitName: 'Essay',
          unitNamePlural: 'Essays',
          badgeText: '📝 Research Essay Submission',
        };
      case 'article':
        return {
          title: 'Article / Op-Ed Title *',
          titlePlaceholder: 'Enter the article or publication headline',
          author: 'Journalist / Source *',
          authorPlaceholder: 'Journalist or publisher name',
          reflection: 'Critical Analysis & Synthesis *',
          reflectionPlaceholder: 'Analyze the societal context, journalistic credibility, and takeaways...',
          unitName: 'Article',
          unitNamePlural: 'Articles',
          badgeText: '📰 Article Submission',
        };
      case 'audio':
        return {
          title: 'Audio Episode / Track Title *',
          titlePlaceholder: 'Enter podcast episode or audio recording title',
          author: 'Host / Narrator *',
          authorPlaceholder: 'Host, speaker, or narrator name',
          reflection: 'Listening Synthesis & Reflection *',
          reflectionPlaceholder: 'Synthesize the spoken discussion, key soundbites, and learnings...',
          unitName: 'Recording',
          unitNamePlural: 'Recordings',
          badgeText: '🎙️ Audio Submission',
        };
      default:
        return {
          title: 'Book Title *',
          titlePlaceholder: 'Enter the book title',
          author: 'Author *',
          authorPlaceholder: "Enter the author's name",
          reflection: 'Reflection *',
          reflectionPlaceholder: 'Share your thoughts, insights, and reflections on the book...',
          unitName: 'Book',
          unitNamePlural: 'Books',
          badgeText: '📚 Book Submission',
        };
    }
  }, [submissionType]);

  // Challenge-specific categories and rules
  const categories = useMemo(() => {
    if (targetChallenge?.categories && targetChallenge.categories.length > 0) {
      return targetChallenge.categories;
    }
    return defaultCategories;
  }, [targetChallenge, defaultCategories]);

  const targetGoal = targetChallenge?.target_books || TOTAL_BOOK_GOAL;
  const maxBooksPerCategory = targetChallenge?.max_books_per_category || MAX_BOOKS_PER_CATEGORY;
  const pointsPerBook = targetChallenge?.points_per_book || POINTS_PER_BOOK;
  const minReflectionChars = targetChallenge?.min_reflection_chars || 50;

  // Auto-reset selectedCategory if not in new challenge
  useEffect(() => {
    if (selectedCategory && !categories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [categories, selectedCategory]);

  const { startDate, endDate, status: sessionStatus } = useSessionDates();

  const [lockTicker, setLockTicker] = useState(0);

  // Effective challenge status: explicit admin setting takes immediate precedence
  const effectiveStatus = useMemo(() => {
    if (!targetChallenge?.id) return 'open';
    const local = safeStorage.getItem(`mfa_challenge_status_${targetChallenge.id}`);
    if (local === 'locked' || local === 'closed' || local === 'open') {
      return local;
    }
    return targetChallenge.status || 'open';
  }, [targetChallenge?.id, targetChallenge?.status, lockTicker]);

  const isChallengeLocked = effectiveStatus === 'locked';
  const isChallengeClosed = effectiveStatus === 'closed' || targetChallenge?.is_active === false;
  const isChallengeActive = effectiveStatus === 'open';

  const isSessionLocked = sessionStatus !== 'active' && effectiveStatus !== 'open';
  const isSelectedChallengeOpen = !isChallengeLocked && !isChallengeClosed && isChallengeActive && !isSessionLocked;

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    dateStarted: '',
    dateFinished: '',
    reflection: '',
    yearGroup: profile?.year_group || 'Grade 11',
  });

  useEffect(() => {
    if (profile?.year_group) {
      setFormData((prev) => ({
        ...prev,
        yearGroup: prev.yearGroup && prev.yearGroup !== 'Grade 11' ? prev.yearGroup : profile.year_group || 'Grade 11',
      }));
    }
  }, [profile?.year_group]);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'reading_challenge_active')
          .maybeSingle();
        if (data && data.setting_value === 'false') {
          const localStatus = targetChallenge?.id ? safeStorage.getItem(`mfa_challenge_status_${targetChallenge.id}`) : null;
          if (localStatus !== 'open') {
            setLockTicker((t) => t + 1);
          }
        }
      } catch (err) {
        // Fallback gracefully on network timeout
      }
    })();
  }, [targetChallenge?.id]);

  useEffect(() => {
    const handleStatusUpdate = (e: any) => {
      setLockTicker((t) => t + 1);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('mfa_challenge_status_')) {
        setLockTicker((t) => t + 1);
      }
    };

    window.addEventListener('mfa_challenge_status_changed', handleStatusUpdate as any);
    window.addEventListener('storage', handleStorage as any);

    // Real-time broadcast channel from Supabase for instant multi-tab & multi-device lock sync
    const realtimeChannel = supabase
      .channel('mfa_challenge_realtime_feed')
      .on('broadcast', { event: 'status_changed' }, (payload) => {
        if (payload?.payload?.id && payload?.payload?.status) {
          safeStorage.setItem(`mfa_challenge_status_${payload.payload.id}`, payload.payload.status);
          setLockTicker((t) => t + 1);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('mfa_challenge_status_changed', handleStatusUpdate as any);
      window.removeEventListener('storage', handleStorage as any);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const loadCounts = async () => {
    if (!user) return;
    const map: Record<number, number> = {};
    const normId = normalizeChallengeId(targetChallenge?.id);
    const isMain45 = !normId || normId === '45450000-2025-4026-8000-000000000045';

    if (!isMain45) {
      try {
        const queryIds = Array.from(new Set([normId, targetChallenge?.id].filter(Boolean) as string[]));
        const { data } = await supabase
          .from('challenge_submissions')
          .select('category_number, approval_status')
          .in('challenge_id', queryIds)
          .eq('user_id', user.id);
        (data ?? [])
          .filter((r: any) => r.approval_status !== 'rejected')
          .forEach((r: Record<string, unknown>) => {
            const num = Number(r.category_number) || 1;
            map[num] = (map[num] || 0) + 1;
          });
      } catch (err) {
        console.warn('Could not query challenge_submissions counts:', err);
      }
    } else {
      try {
        const { data } = await supabase
          .from('book_submissions')
          .select('category_number, approval_status')
          .eq('user_id', user.id);
        (data ?? [])
          .filter((r: any) => r.approval_status !== 'rejected')
          .forEach((r: Record<string, unknown>) => {
            const num = Number(r.category_number) || 1;
            map[num] = (map[num] || 0) + 1;
          });
      } catch (err) {
        console.warn('Could not query book_submissions counts:', err);
      }
    }

    // Always merge resilient local challenge submissions cache
    if (typeof window !== 'undefined') {
      try {
        const candidateKeys = Array.from(new Set([
          `mfa_backup_submissions_${targetChallenge?.id}`,
          `mfa_backup_submissions_${normId}`,
        ].filter(Boolean)));

        candidateKeys.forEach((k) => {
          const raw = safeStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const localMap: Record<number, number> = {};
              list.forEach((item: any) => {
                const cNum = Number(item.categoryNumber ?? item.category_number);
                if (cNum) {
                  localMap[cNum] = (localMap[cNum] || 0) + 1;
                }
              });
              Object.keys(localMap).forEach((cStr) => {
                const cNum = Number(cStr);
                map[cNum] = Math.max(map[cNum] || 0, localMap[cNum]);
              });
            }
          }
        });
      } catch (e) {
        console.warn('Could not parse local submission backup cache:', e);
      }
    }

    setCounts(map);
  };

  useEffect(() => {
    loadCounts();

    const channel = supabase
      .channel('realtime-submit-book-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_submissions' }, () => {
        loadCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_submissions' }, () => {
        loadCounts();
      })
      .subscribe();

    const onSubmissionCreated = () => loadCounts();
    window.addEventListener('mfa_submission_created', onSubmissionCreated);
    window.addEventListener('mfa_submission_updated', onSubmissionCreated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('mfa_submission_created', onSubmissionCreated);
      window.removeEventListener('mfa_submission_updated', onSubmissionCreated);
    };
  }, [user?.id, targetChallenge?.id]);

  const getCatCap = (id: number) => {
    const cat = categories.find((c) => c.id === id);
    return (cat as any)?.max_books || maxBooksPerCategory;
  };

  const countedBooks = useMemo(() => {
    const total = Object.entries(counts).reduce((sum, [catId, n]) => {
      const cap = getCatCap(Number(catId));
      return sum + Math.min(n, cap);
    }, 0);
    return Math.min(total, targetGoal);
  }, [counts, categories, maxBooksPerCategory, targetGoal]);

  const challengeComplete = countedBooks >= targetGoal;
  const categoryFull = (id: number) => (counts[id] || 0) >= getCatCap(id);

  const handleVerifyInlineCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetChallenge?.id) return;
    const clean = inlineCode.trim().toUpperCase();
    if (!clean) {
      toast.error('Please enter an access code to verify');
      return;
    }
    setVerifyingCode(true);
    try {
      const res = await joinChallengeWithCode(targetChallenge.id, clean);
      if (res.ok) {
        toast.success(res.message || `Verified! You are enrolled in "${targetChallenge.title}".`);
        setInlineCode('');
        loadCounts();
      } else {
        toast.error(res.message || 'Invalid access code. Please check with your librarian or homeroom tutor.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      toast.error(msg);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStaff) {
      toast.error('Admin and staff accounts cannot submit books. Book submissions are student-only.');
      return;
    }

    if (!user || !selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    const liveStatus = (targetChallenge?.id ? safeStorage.getItem(`mfa_challenge_status_${targetChallenge.id}`) : null) || targetChallenge?.status || 'open';
    if (liveStatus === 'locked' || isChallengeLocked) {
      toast.error('This challenge has been temporarily locked by the Librarian. No new book submissions can be accepted at this time.');
      return;
    }

    if (liveStatus === 'closed' || isChallengeClosed) {
      toast.error(`"${targetChallenge?.title || 'Selected challenge'}" is closed or concluded.`);
      return;
    }

    if (!isChallengeActive) {
      toast.error('Reading challenge submissions are currently paused academy-wide by the librarian.');
      return;
    }

    if (!isTargetRegistered && targetChallenge?.id) {
      registerForChallenge(targetChallenge.id);
      const stored = safeStorage.getJSON<string[]>('mfa_registered_challenges', []);
      if (!stored.includes(targetChallenge.id)) {
        stored.push(targetChallenge.id);
        safeStorage.setJSON('mfa_registered_challenges', stored);
      }
    }

    if (challengeComplete) {
      toast.error(`Challenge complete — you have reached the ${targetGoal}-book goal!`);
      return;
    }

    if (formData.reflection.trim().length < minReflectionChars) {
      toast.error(`Reflection must be at least ${minReflectionChars} characters for this challenge (currently ${formData.reflection.trim().length} chars).`);
      return;
    }

    const catCap = getCatCap(selectedCategory);
    if ((counts[selectedCategory] || 0) >= catCap) {
      toast.error(`You have already completed the maximum allowed ${catCap} books in "${currentCategory?.name}" for this challenge.`);
      return;
    }

    try {
      const validatedData = submissionSchema.parse({
        categoryNumber: selectedCategory,
        ...formData,
      });

      if (new Date(validatedData.dateFinished) < new Date(validatedData.dateStarted)) {
        toast.error('Finish date cannot be before start date');
        return;
      }

      setLoading(true);

      const lowerRefl = validatedData.reflection.toLowerCase();
      const aiClichés = [
        "delves into the intricate tapestry",
        "delves deep into",
        "testament to",
        "in conclusion",
        "poignant reminder",
        "it is important to remember",
        "a compelling narrative",
        "seamlessly weaves",
        "leaves an indelible mark",
      ];
      let aiClichéHits = 0;
      aiClichés.forEach((c) => {
        if (lowerRefl.includes(c)) aiClichéHits++;
      });
      const hasPersonalVoice = [" i ", " my ", " me ", " we "].some((p) => lowerRefl.includes(p));
      const isAIFlagged = aiClichéHits >= 2 || (aiClichéHits >= 1 && !hasPersonalVoice);

      const approvalStatus = isAIFlagged ? "flagged" : "pending";
      const aiFeedback = isAIFlagged
        ? "AI Flagged: Reflection contains formulaic AI markers. Under review by librarian."
        : null;

      const newBookNumber = countedBooks + 1;
      const milestone = MILESTONES.find((m) => m.books === newBookNumber);
      const totalPoints = pointsPerBook + (milestone?.bonus ?? 0);

      const normId = normalizeChallengeId(targetChallenge?.id);
      const isMain45Challenge = !normId || normId === '45450000-2025-4026-8000-000000000045';

      let submissionSaved = false;

      // 1. Insert into challenge_submissions with the normalized challenge_id
      try {
        const { error: chErr } = await supabase.from('challenge_submissions').insert({
          user_id: user.id,
          challenge_id: normId,
          category_number: validatedData.categoryNumber,
          category_name: currentCategory?.name || '',
          title: validatedData.title.trim(),
          author: validatedData.author.trim(),
          reflection: validatedData.reflection.trim(),
          points_earned: totalPoints,
        });
        if (!chErr) {
          submissionSaved = true;
        } else {
          console.warn("challenge_submissions insert note:", chErr);
        }
      } catch (cErr) {
        console.warn("Exception writing to challenge_submissions:", cErr);
      }

      // 2. Also insert into book_submissions for whole-school logging, librarian review & certificates
      try {
        const { error: bErr } = await supabase.from('book_submissions').insert({
          user_id: user.id,
          challenge_id: normId || MAIN_CHALLENGE_ID,
          category_number: validatedData.categoryNumber,
          category_name: currentCategory?.name || '',
          title: validatedData.title.trim(),
          author: validatedData.author.trim(),
          date_started: validatedData.dateStarted,
          date_finished: validatedData.dateFinished,
          reflection: validatedData.reflection.trim(),
          points_earned: totalPoints,
          approval_status: approvalStatus,
          ai_feedback: aiFeedback,
        });
        if (!bErr) {
          submissionSaved = true;
        } else {
          console.warn("book_submissions insert note:", bErr);
        }
      } catch (bErr) {
        console.warn("Exception writing to book_submissions:", bErr);
      }

      // 2.2 Update student_progress table
      try {
        await supabase.from('student_progress').upsert({
          user_id: user.id,
          books_read: newBookNumber,
          total_points: totalPoints,
          achievement_level: newBookNumber >= 45 ? 'gold' : newBookNumber >= 30 ? 'silver' : newBookNumber >= 15 ? 'bronze' : 'none',
        });
      } catch (err) {
        console.warn("Student progress upsert warning:", err);
      }

      // 2.5 Local resilient backup log with full category mapping
      if (typeof window !== "undefined" && targetChallenge?.id) {
        try {
          const keysToSave = Array.from(new Set([
            `mfa_backup_submissions_${targetChallenge?.id}`,
            `mfa_backup_submissions_${normId}`,
          ].filter(Boolean)));

          const newEntry = {
            studentName: profile?.full_name || user.email?.split('@')[0] || 'Student Reader',
            title: validatedData.title.trim(),
            author: validatedData.author.trim(),
            categoryName: currentCategory?.name || '',
            categoryNumber: validatedData.categoryNumber,
            category_number: validatedData.categoryNumber,
            dateFinished: validatedData.dateFinished,
            pointsEarned: totalPoints,
            yearGroup: profile?.year_group || 'Grade 11',
            created_at: new Date().toISOString(),
          };

          keysToSave.forEach((k) => {
            const currentList = safeStorage.getJSON<any[]>(k, []);
            currentList.unshift(newEntry);
            safeStorage.setJSON(k, currentList.slice(0, 100));
          });

          const auditList = safeStorage.getJSON<any[]>('mfa_submissions_audit', []);
          auditList.unshift({
            ...newEntry,
            id: `sub-${Date.now()}`,
            user_id: user.id,
            challenge_id: normId,
            points_earned: totalPoints,
          });
          safeStorage.setJSON('mfa_submissions_audit', auditList.slice(0, 250));
        } catch (err) {
          console.warn("Could not save to local resilient backup:", err);
        }
      }

      // Immediately update local category counter state so 0/4 changes to 1/4 without delay
      setCounts((prev) => ({
        ...prev,
        [validatedData.categoryNumber]: (prev[validatedData.categoryNumber] || 0) + 1,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('mfa_submission_created'));
      }

      if (isAIFlagged) {
        toast.warning(`Book submitted for "${targetChallenge?.title || 'Challenge'}", but flagged for teacher review due to automated AI content heuristics.`);
      } else if (milestone) {
        toast.success(`🎉 ${milestone.level} unlocked in "${targetChallenge?.title || 'Challenge'}"! Book #${newBookNumber} → +${pointsPerBook} base +${milestone.bonus} bonus = +${totalPoints} points! (Locked & submitted to librarian)`);
      } else {
        toast.success(`Book submitted and locked for "${targetChallenge?.title || 'Challenge'}"! Entry is private to you and the librarian. +${totalPoints} points earned!`);
      }
      navigate(targetChallenge?.id ? `/challenges?id=${targetChallenge.id}` : '/challenges');
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit book');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Student Submissions Only — MFA Reading Challenge</title>
        </Helmet>
        <Navbar />
        <main className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="rounded-2xl border-border bg-card p-8 text-center space-y-4 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
              🛡️
            </div>
            <div className="space-y-1.5">
              <Badge variant="outline" className="text-xs font-mono border-amber-500/40 text-amber-500">
                Staff / Admin Account Detected
              </Badge>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Book Submissions are Student-Only
              </h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              You are signed in as a staff member (<strong>{profile?.role?.replace(/_/g, ' ')}</strong>). 
              Administrators and teachers oversee reading progress, review flagged submissions, and issue award certificates, but cannot submit student book logs.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="w-full sm:w-auto font-semibold">
                <Link to="/dashboard">Go to Staff Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/challenges">View Reading Challenges</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Submit a Book — 45-Book Reading Challenge</title>
        <meta name="description" content="Log a book and reflection for the Mpesa Foundation Academy 45-Book Reading Challenge." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      
      <main className="w-full max-w-none px-3 sm:px-4 md:px-6 py-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Submit a Book 📚
              </h1>
              {isChallengeLocked ? (
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50 text-xs px-2.5 py-1 gap-1.5 font-bold animate-pulse shadow-xs">
                  <Lock className="w-3.5 h-3.5" /> Submissions Locked
                </Badge>
              ) : isChallengeClosed ? (
                <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/50 text-xs px-2.5 py-1 gap-1.5 font-bold shadow-xs">
                  <Lock className="w-3.5 h-3.5" /> Submissions Closed
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 text-xs px-2.5 py-1 gap-1.5 font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Submissions Open &amp; Active
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Record your reading journey and earn points for {targetChallenge?.title || 'the 45-Book Reading Challenge'}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AppDownloadButton label="Download App" className="text-xs h-9 shrink-0" />
          </div>
        </div>

        {/* Academy Reading Session Window Banner */}
        <SessionCountdownBanner isLibrarian={isStaff} />

        {/* Visual Real-Time Status Indicator Card */}
        {isChallengeLocked ? (
          <LockedChallengeNotice challenge={targetChallenge} className="mb-6" />
        ) : isChallengeClosed ? (
          <div className="mb-6 p-4 rounded-2xl border-2 border-red-500/50 bg-red-500/15 text-red-950 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/40 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-base text-red-900 dark:text-red-200">
                    Challenge Concluded &amp; Submissions Closed
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-red-500/30 text-red-800 dark:text-red-100 border border-red-500/40">
                    Concluded
                  </span>
                </div>
                <p className="text-xs text-red-900/80 dark:text-red-200/90 mt-1 leading-relaxed">
                  The official submission deadline for this reading quest has passed. Review your verified books and certificates on your progress dashboard.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="shrink-0 text-xs border-red-500/50 text-red-900 dark:text-red-100 bg-red-500/10 hover:bg-red-500/20 font-bold"
            >
              <Link to="/progress">View My Progress</Link>
            </Button>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-base text-emerald-900 dark:text-emerald-200">
                    Submissions are Open &amp; Active
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    Real-time Verified
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 mt-1 leading-relaxed">
                  The portal is actively accepting reflections. Select your category, complete your reflection prompt, and submit below to earn house points!
                </p>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium shrink-0 hidden md:block">
              Live Portal Status
            </span>
          </div>
        )}

        {/* Journey progress */}
        <div
          className="mb-6 rounded-2xl p-5 border"
          style={{
            background: "linear-gradient(135deg, hsl(var(--v-electric-blue) / 0.14), hsl(var(--v-fuchsia) / 0.10))",
            borderColor: "hsl(var(--v-electric-blue) / 0.35)",
          }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5" style={{ color: "hsl(var(--v-yellow))" }} />
              <div>
                <div className="font-display text-xl font-bold">
                  {countedBooks}/{targetGoal} counted books for {targetChallenge?.title || 'Reading Challenge'}
                </div>
                <div className="text-xs text-muted-foreground">
                  +{pointsPerBook} pts per book · Bonus rewards upon completing goal
                </div>
              </div>
            </div>
            <div className="h-2 w-full sm:w-64 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(countedBooks / targetGoal) * 100}%`,
                  background: "linear-gradient(90deg, hsl(var(--v-green)), hsl(var(--v-yellow)), hsl(var(--v-orange)))",
                }}
              />
            </div>
          </div>
        </div>

        {isChallengeLocked && (
          <LockedChallengeNotice challenge={targetChallenge} className="mb-6" />
        )}

        {isChallengeClosed && (
          <div className="mb-6 p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200 flex items-center gap-3 shadow-sm">
            <Lock className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">Challenge Concluded / Closed</p>
              <p className="text-xs opacity-90">
                This challenge has ended and submissions are officially concluded. Student certificates are now unlocked and verifiable.
              </p>
            </div>
          </div>
        )}

        {challengeComplete && (
          <div
            className="mb-6 rounded-2xl p-5 border flex items-start gap-3"
            style={{
              background: "hsl(var(--v-green) / 0.12)",
              borderColor: "hsl(var(--v-green) / 0.4)",
            }}
          >
            <Lock className="w-5 h-5 mt-0.5" style={{ color: "hsl(var(--v-green))" }} />
            <div>
              <div className="font-semibold">Challenge goal achieved! 🏅</div>
              <p className="text-sm text-muted-foreground">
                You have reached the full {targetGoal}-book goal for "{targetChallenge?.title || 'Reading Challenge'}".
              </p>
            </div>
          </div>
        )}

        <Card
          className="rounded-3xl shadow-xl overflow-hidden"
          style={{
            background:
              "linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--v-electric-blue) / 0.06) 50%, hsl(var(--v-emerald) / 0.03) 100%)",
            border: "1px solid hsl(var(--v-electric-blue) / 0.25)",
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-display font-bold text-foreground">
              <BookOpen className="w-5 h-5 text-gold" />
              Book Submission Form
            </CardTitle>
            <CardDescription>
              Submit your book against the specific categories and prompts for {targetChallenge?.title || 'this challenge'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled={challengeComplete || isChallengeLocked || isChallengeClosed} className={challengeComplete || isChallengeLocked || isChallengeClosed ? 'opacity-60' : ''}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Active Challenge Selection */}
              <div className="space-y-2 p-3.5 rounded-2xl border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Active Challenge Workspace
                  </Label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                      {labels.badgeText}
                    </Badge>
                    {isChallengeLocked ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                        🔒 Locked
                      </Badge>
                    ) : isChallengeClosed ? (
                      <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold">
                        🏆 Closed
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                        🟢 Open
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Challenge Info Card */}
                <div className="p-3.5 rounded-2xl border border-border bg-card/80 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-lg">
                      <span>{targetChallenge?.badge_icon || "🏆"}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">
                        {targetChallenge?.title || "Active Challenge"}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span>Goal: <strong>{targetGoal} {labels.unitNamePlural}</strong></span>
                        <span>·</span>
                        <span>+{pointsPerBook} pts / {labels.unitName.toLowerCase()}</span>
                        <span>·</span>
                        <span className="text-amber-500 font-bold">+{targetChallenge?.points_reward || 100} completion pts</span>
                      </div>
                    </div>
                  </div>

                  {isTargetRegistered ? (
                    <Badge variant="outline" className="shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold gap-1 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold gap-1 py-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Not Registered
                    </Badge>
                  )}
                </div>

                {/* Registration Gate Banner: Required once per challenge */}
                {!isTargetRegistered && (
                  <div className="p-4 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 space-y-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <KeyRound className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-2">
                          <span>Access Code Verification Required</span>
                          <Badge variant="outline" className="text-[10px] bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold">
                            One-Time Verification
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          You cannot submit books until verified by your official academy access code for <strong>{targetChallenge?.title}</strong>. Once verified, you will not be asked again for this challenge until you enter a new challenge.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <KeyRound className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="Enter Access Code (e.g. STU-DP1, DP1-2026, KENYA-2026)"
                          value={inlineCode}
                          onChange={(e) => setInlineCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleVerifyInlineCode();
                            }
                          }}
                          className="h-9 pl-8 text-xs font-mono font-bold tracking-wider uppercase bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyInlineCode}
                        disabled={verifyingCode || !inlineCode.trim()}
                        className="h-9 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black border-0 shrink-0 gap-1.5 shadow-xs"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {verifyingCode ? "Verifying..." : "Verify Code & Unlock"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!targetChallenge?.id) return;
                          setRegistering(true);
                          await registerForChallenge(targetChallenge.id);
                          setRegistering(false);
                        }}
                        disabled={registering}
                        className="h-9 text-xs shrink-0"
                      >
                        Code Directory
                      </Button>
                    </div>
                  </div>
                )}

                {/* Challenge Switcher for Students */}
                {eligibleChallenges.length > 1 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Switch Challenge to Submit For:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {eligibleChallenges.map((c) => {
                        const isCur = targetChallenge?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSubmissionChallengeId(c.id);
                              setSelectedChallengeId(c.id);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                              isCur
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-card hover:bg-muted border-border text-foreground/80 hover:text-foreground"
                            )}
                          >
                            <span>{c.badge_icon || "🏆"}</span>
                            <span className="truncate max-w-[140px]">{c.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground flex items-center justify-between px-1">
                  <span>💡 Select an eligible challenge above or switch using the topbar menu.</span>
                  <span className="font-mono text-[10px]">Min Reflection: {minReflectionChars} chars</span>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Challenge Category & Realm *
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {categories.length} specific categories in this challenge
                  </span>
                </div>

                {/* Visual Category Picker & Progress Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {categories.map((cat) => {
                    const used = counts[cat.id] || 0;
                    const cap = getCatCap(cat.id);
                    const isSelected = selectedCategory === cat.id;
                    const isFull = used >= cap;
                    const pct = Math.min(100, Math.round((used / cap) * 100));

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`text-left p-3 rounded-2xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                            : isFull
                            ? "opacity-50 border-border bg-muted/40 cursor-not-allowed"
                            : "border-border bg-card/60 hover:bg-card hover:border-primary/40 cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-bold text-primary truncate">
                              #{cat.id} · {cat.realm || "Realm"}
                            </span>
                            <Badge
                              variant={isFull ? "secondary" : isSelected ? "default" : "outline"}
                              className={`text-[10px] py-0 px-2 font-mono ${
                                isFull
                                  ? "bg-muted text-muted-foreground"
                                  : isSelected
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : "text-foreground"
                              }`}
                            >
                              {used}/{cap} books {isFull ? "(Full)" : ""}
                            </Badge>
                          </div>
                          <div className="font-semibold text-xs text-foreground line-clamp-1">
                            {cat.name}
                          </div>
                        </div>

                        {/* Category specific mini-progress */}
                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isFull ? "hsl(var(--v-yellow))" : "hsl(var(--v-green))",
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Select 
                  value={selectedCategory?.toString() || ''} 
                  onValueChange={(value) => setSelectedCategory(parseInt(value))}
                >
                  <SelectTrigger className="h-auto py-2.5 text-xs bg-background">
                    <SelectValue placeholder="Or select from dropdown list..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {categories.map((category) => {
                      const used = counts[category.id] || 0;
                      const cap = getCatCap(category.id);
                      const full = used >= cap;
                      return (
                        <SelectItem key={category.id} value={category.id.toString()} disabled={full}>
                          <span className="font-medium">#{category.id}</span> — {category.name}
                          {category.realm ? <span className="text-muted-foreground"> · {category.realm}</span> : null}
                          <span className={full ? 'ml-2 text-destructive font-semibold' : 'ml-2 text-muted-foreground font-mono text-xs'}>
                            {used}/{cap} books
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedCategory && (
                  <p className="text-xs text-muted-foreground">
                    Category allowance: <strong>{counts[selectedCategory] || 0}/{getCatCap(selectedCategory)} books</strong> logged in "{currentCategory?.name}" for {targetChallenge?.title || 'this challenge'}.
                  </p>
                )}

                {selectedCategory && categoryFull(selectedCategory) && (
                  <p className="text-xs text-destructive font-medium">
                    This category is full ({getCatCap(selectedCategory)}/{getCatCap(selectedCategory)} books) — please select another category.
                  </p>
                )}

                {currentCategory && (
                  <div className="p-4 rounded-xl bg-gold/5 border border-gold/30 mt-2 space-y-1">
                    <div className="text-xs font-bold text-amber-500 uppercase tracking-wide flex items-center justify-between">
                      <span>Traveller's Reflection Prompt:</span>
                      <span className="font-mono text-[10px] text-muted-foreground">Category #{currentCategory.id}</span>
                    </div>
                    <p className="text-sm text-foreground italic leading-relaxed">
                      "{currentCategory.prompt}"
                    </p>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Answer this prompt thoughtfully (minimum {minReflectionChars} characters required by the challenge rules).
                    </p>
                  </div>
                )}
              </div>

              {/* Academic Year Group / Cohort - Auto-Verified via Registration & Code */}
              <div 
                className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                style={{
                  background: "linear-gradient(135deg, hsl(140 85% 48% / 0.12) 0%, hsl(222 35% 12% / 0.95) 100%)",
                  border: "1px solid hsl(140 85% 48% / 0.3)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-xs flex items-center gap-2">
                      <span>Registered Cohort: {profile?.year_group || 'Grade 11'}</span>
                      {profile?.class_name && (
                        <span className="text-[11px] font-normal text-muted-foreground">({profile.class_name})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      House: {profile?.house || 'Kenya'} · Points and readings credit to your verified cohort.
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/35 font-semibold gap-1 shrink-0 self-start sm:self-center">
                  <ShieldCheck className="w-3.5 h-3.5" /> Auto-Verified
                </Badge>
              </div>

              {/* Submission Item Details Div */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "linear-gradient(135deg, hsl(50 100% 58% / 0.10) 0%, hsl(222 35% 12% / 0.95) 100%)",
                  border: "1px solid hsl(50 100% 58% / 0.28)",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Book Identification Details</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-semibold text-foreground">
                      {labels.title} *
                    </Label>
                    <Input
                      id="title"
                      placeholder={labels.titlePlaceholder}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-background/80 border-border/70 rounded-xl text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="author" className="text-xs font-semibold text-foreground">
                      {labels.author} *
                    </Label>
                    <Input
                      id="author"
                      placeholder={labels.authorPlaceholder}
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="bg-background/80 border-border/70 rounded-xl text-xs h-9"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Reading Timeline Dates Div */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "linear-gradient(135deg, hsl(188 100% 55% / 0.10) 0%, hsl(222 35% 12% / 0.95) 100%)",
                  border: "1px solid hsl(188 100% 55% / 0.28)",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Reading Session Timeline</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dateStarted" className="text-xs font-semibold text-foreground">
                      Date Started *
                    </Label>
                    <Input
                      id="dateStarted"
                      type="date"
                      value={formData.dateStarted}
                      onChange={(e) => setFormData({ ...formData, dateStarted: e.target.value })}
                      className="bg-background/80 border-border/70 rounded-xl text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dateFinished" className="text-xs font-semibold text-foreground">
                      Date Completed *
                    </Label>
                    <Input
                      id="dateFinished"
                      type="date"
                      value={formData.dateFinished}
                      onChange={(e) => setFormData({ ...formData, dateFinished: e.target.value })}
                      className="bg-background/80 border-border/70 rounded-xl text-xs h-9"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Reflection Div */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "linear-gradient(135deg, hsl(270 90% 62% / 0.10) 0%, hsl(222 35% 12% / 0.95) 100%)",
                  border: "1px solid hsl(270 90% 62% / 0.28)",
                }}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="reflection" className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>{labels.reflection}</span>
                  </Label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Min {minReflectionChars} characters required
                  </span>
                </div>
                <Textarea
                  id="reflection"
                  placeholder={labels.reflectionPlaceholder}
                  value={formData.reflection}
                  onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                  className="min-h-[140px] rounded-xl bg-background/80 border-border/70 text-xs leading-relaxed font-serif"
                  required
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-[11px]">Honest, substantive reflection on themes and personal takeaways.</span>
                  <span className={formData.reflection.length >= minReflectionChars ? "text-emerald-400 font-bold font-mono" : "text-amber-400 font-semibold font-mono"}>
                    {formData.reflection.length}/2000 characters
                  </span>
                </div>
              </div>

              {/* Submission Action Div */}
              <div
                className="p-5 rounded-2xl space-y-3"
                style={{
                  background: "linear-gradient(135deg, hsl(140 85% 48% / 0.14) 0%, hsl(50 100% 58% / 0.08) 100%)",
                  border: "1px solid hsl(140 85% 48% / 0.35)",
                }}
              >
                <div className="flex items-center justify-between text-xs text-foreground/90 flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Points Credited Instantly to House &amp; Profile
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    +{pointsPerBook} Pts per verified entry
                  </span>
                </div>

                {isChallengeLocked ? (
                  <Button
                    type="button"
                    disabled
                    className="w-full bg-amber-600/70 text-white h-12 text-base font-bold gap-2 cursor-not-allowed shadow-none rounded-xl"
                  >
                    <Lock className="w-5 h-5 text-amber-200" />
                    🔒 Challenge Locked by Librarian — Submissions Paused
                  </Button>
                ) : isChallengeClosed ? (
                  <Button
                    type="button"
                    disabled
                    className="w-full bg-red-600/70 text-white h-12 text-base font-bold gap-2 cursor-not-allowed shadow-none rounded-xl"
                  >
                    <Lock className="w-5 h-5 text-red-200" />
                    Challenge Concluded &amp; Closed
                  </Button>
                ) : !isChallengeActive ? (
                  <Button
                    type="button"
                    disabled
                    className="w-full bg-muted text-muted-foreground h-12 text-base font-bold gap-2 cursor-not-allowed shadow-none rounded-xl"
                  >
                    <Lock className="w-5 h-5" />
                    Reading Challenges Paused by Librarian
                  </Button>
                ) : !isTargetRegistered ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!targetChallenge?.id) return;
                      setRegistering(true);
                      await registerForChallenge(targetChallenge.id);
                      setRegistering(false);
                    }}
                    disabled={registering}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black h-12 text-base font-bold gap-2 shadow-sm rounded-xl"
                  >
                    <KeyRound className="w-5 h-5" />
                    {registering ? "Registering..." : `Verify Access Code to Submit for "${targetChallenge?.title || "Challenge"}"`}
                  </Button>
                ) : isChallengeLocked ? (
                  <Button 
                    type="button" 
                    disabled
                    className="w-full bg-amber-500/20 text-amber-300 border-2 border-amber-500/40 h-13 text-base font-bold shadow-md rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
                    Challenge Locked by Librarian — Submissions Paused
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:opacity-95 text-slate-950 h-13 text-base font-black shadow-lg rounded-xl cursor-pointer"
                    disabled={loading || !selectedCategory || challengeComplete || (!!selectedCategory && categoryFull(selectedCategory))}
                  >
                    {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                    {challengeComplete ? 'Submissions locked' : `Submit ${labels.unitName} (+${pointsPerBook} points)`}
                  </Button>
                )}
              </div>
            </form>
            </fieldset>
          </CardContent>

        </Card>
      </main>
    </div>
  );
};

export default SubmitBook;
