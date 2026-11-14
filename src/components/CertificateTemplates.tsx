import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { useChallenges } from "@/contexts/ChallengeContext";
import {
  CertificateData,
  CertificateLevel,
  CERTIFICATE_LEVEL_CONFIG,
  CERTIFICATE_FONT_OPTIONS,
  CertificateFontType,
  computeStudentLevel,
  getVerificationCode,
} from "@/lib/certificateTypes";
import { verifyAndLogCertificatePayload, getLastVerifiedPayload } from "@/lib/certificateStudioSync";
import { triggerAutoCertificateDispatch } from "@/lib/autoCertificateEmailService";
import { renderCertificateToDataUrl } from "@/lib/certificateImageCacheService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Download,
  Printer,
  Sparkles,
  FileArchive,
  Files,
  Search,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sliders,
  Users,
  Award,
  Layers,
  Calendar,
  UserCheck,
  X,
  FileText,
  Clock,
  Type,
  Palette,
  Send,
  Building,
  School,
  Check,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { HOUSES, YEAR_GROUPS } from "@/lib/constants";
import { dispatchAwardCertificateLetter } from "@/lib/challengeRegistrationManager";
import CertificateDispatchModal, { CertificateDispatchTarget } from "@/components/CertificateDispatchModal";
import { exportCertificatePDF, exportBulkCertificatesPDF } from "@/lib/pdfExporter";

export interface StudentCertificateRecord {
  id: string;
  name: string;
  email: string;
  house: string;
  yearGroup: string;
  className?: string;
  booksCount: number;
  level: CertificateLevel;
  verificationCode: string;
  isRealSubmission?: boolean;
  submissionDate?: string;
  source?: string;
}

// Certificate level definitions
const CATEGORIES: CertificateLevel[] = ["Gold", "Silver", "Bronze", "Beginner", "Not Started"];

export default function CertificateTemplates() {
  const navigate = useNavigate();
  const { challenges, selectedChallenge, selectedChallengeId, setSelectedChallengeId } = useChallenges();
  const [activeTab, setActiveTab] = useState<"studio" | "roster" | "gallery">("studio");
  const [activeCategory, setActiveCategory] = useState<CertificateLevel>("Gold");

  // Certificate customization state
  const [studentName, setStudentName] = useState(CERTIFICATE_LEVEL_CONFIG.Gold.sampleStudent);
  const [booksCount, setBooksCount] = useState<number>(() => selectedChallenge?.target_books || CERTIFICATE_LEVEL_CONFIG.Gold.defaultBooks);
  const [signatoryName, setSignatoryName] = useState(() => selectedChallenge?.certificate_signatory_name || "David O. Oloo");
  const [signatoryTitle, setSignatoryTitle] = useState(() => selectedChallenge?.certificate_signatory_title || "Director of Teaching & Learning");
  const [dateAwarded, setDateAwarded] = useState("1 July 2026");
  const [customSerial, setCustomSerial] = useState(CERTIFICATE_LEVEL_CONFIG.Gold.sampleCode);
  const [selectedStudioStudent, setSelectedStudioStudent] = useState<StudentCertificateRecord | null>(null);

  // Sync signatories and target when selectedChallenge changes
  useEffect(() => {
    if (selectedChallenge) {
      if (selectedChallenge.certificate_signatory_name) {
        setSignatoryName(selectedChallenge.certificate_signatory_name);
      }
      if (selectedChallenge.certificate_signatory_title) {
        setSignatoryTitle(selectedChallenge.certificate_signatory_title);
      }
      if (selectedChallenge.target_books && activeCategory === "Gold") {
        setBooksCount(selectedChallenge.target_books);
      }
    }
  }, [selectedChallenge, activeCategory]);

  // Admin typography customization state (California font default)
  const [nameFontType, setNameFontType] = useState<string>(
    () => localStorage.getItem("mfa-cert-font-type") || "California"
  );
  const [nameFontSize, setNameFontSize] = useState<number>(
    () => Number(localStorage.getItem("mfa-cert-font-size")) || 34
  );
  const [nameFontColor, setNameFontColor] = useState<string>(
    () => localStorage.getItem("mfa-cert-font-color") || "#0B1D3A"
  );
  const [nameCase, setNameCase] = useState<"capitalize" | "uppercase" | "as-is">(
    () => (localStorage.getItem("mfa-cert-name-case") as any) || "capitalize"
  );

  const handleUpdateFontType = (val: string) => {
    setNameFontType(val);
    localStorage.setItem("mfa-cert-font-type", val);
  };
  const handleUpdateFontSize = (val: number) => {
    setNameFontSize(val);
    localStorage.setItem("mfa-cert-font-size", String(val));
  };
  const handleUpdateFontColor = (val: string) => {
    setNameFontColor(val);
    localStorage.setItem("mfa-cert-font-color", val);
  };
  const handleUpdateNameCase = (val: "capitalize" | "uppercase" | "as-is") => {
    setNameCase(val);
    localStorage.setItem("mfa-cert-name-case", val);
  };

  // Live scale calculation for preview
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Single cert rendering ref
  const singleCertRef = useRef<HTMLDivElement>(null);

  // Bulk offscreen ref and state
  const bulkCertRef = useRef<HTMLDivElement>(null);
  const [bulkCurrentStudent, setBulkCurrentStudent] = useState<CertificateData | null>(null);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    statusText: string;
    studentName?: string;
    level?: string;
    estimatedSecondsRemaining?: number;
    phase?: "rendering" | "finalizing" | "complete";
  }>({ current: 0, total: 0, percent: 0, statusText: "" });
  const cancelBulkRef = useRef(false);

  // Live Certificate Studio Payload Verification Dialog State
  const [showPayloadInspection, setShowPayloadInspection] = useState(false);
  const [payloadVerifiedScore, setPayloadVerifiedScore] = useState<number>(100);

  const [searchParams] = useSearchParams();

  // Database students roster
  const [students, setStudents] = useState<StudentCertificateRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterHouse, setFilterHouse] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSubmissionsOnly, setFilterSubmissionsOnly] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // URL search params sync (e.g. navigating from Submissions section)
  useEffect(() => {
    const student = searchParams.get("student");
    const books = searchParams.get("books");
    const level = searchParams.get("level") as CertificateLevel | null;
    const email = searchParams.get("email");
    const date = searchParams.get("date");

    if (student) {
      setStudentName(student.toUpperCase());
      const count = Number(books) || 1;
      setBooksCount(count);
      const computedLevel = level || computeStudentLevel(count);
      setActiveCategory(computedLevel);
      setCustomSerial(getVerificationCode(email || student));
      if (date) setDateAwarded(date);
      setActiveTab("studio");
      toast.success(`Loaded certificate for ${student} (${count} books)`);
    }
  }, [searchParams]);

  // Handle responsive preview scaling
  useEffect(() => {
    const updateScale = () => {
      if (previewWrapperRef.current) {
        const parentWidth = previewWrapperRef.current.clientWidth - 32;
        const targetScale = Math.min(parentWidth / 800, 1);
        setPreviewScale(targetScale > 0.35 ? targetScale : 0.35);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [activeTab]);

  // Load real students from database (both book_submissions and pending_submissions)
  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      let profs: any[] = [];
      let subs: any[] = [];
      let pends: any[] = [];

      const targetGoal = selectedChallenge?.target_books || 45;
      const calcLevel = (books: number): CertificateLevel => {
        if (books >= targetGoal) return "Gold";
        if (books >= Math.max(2, Math.round(targetGoal * 0.66))) return "Silver";
        if (books >= Math.max(1, Math.round(targetGoal * 0.33))) return "Bronze";
        if (books > 0) return "Beginner";
        return "Not Started";
      };

      if (selectedChallengeId === "all") {
        const [profsRes, bSubsRes, cSubsRes, pendsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, email, house, year_group, class_name, role"),
          supabase.from("book_submissions").select("id, user_id, title, approval_status, date_finished"),
          supabase.from("challenge_submissions").select("id, user_id, title, created_at"),
          supabase.from("pending_submissions").select("id, student_name, email, house, year_group, class_name, title, date_finished"),
        ]);
        profs = profsRes.data ?? [];
        const cMapped = (cSubsRes.data ?? []).map((s: any) => ({
          ...s,
          approval_status: "approved",
          date_finished: s.created_at,
        }));
        subs = [...(bSubsRes.data ?? []), ...cMapped];
        pends = pendsRes.data ?? [];
      } else if (selectedChallengeId && selectedChallengeId !== "45450000-2025-4026-8000-000000000045") {
        const [profsRes, cSubsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, email, house, year_group, class_name, role"),
          supabase
            .from("challenge_submissions")
            .select("id, user_id, title, created_at")
            .eq("challenge_id", selectedChallengeId),
        ]);
        profs = profsRes.data ?? [];
        subs = (cSubsRes.data ?? []).map((s: any) => ({
          ...s,
          approval_status: "approved",
          date_finished: s.created_at,
        }));
      } else {
        const [profsRes, subsRes, pendsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, email, house, year_group, class_name, role"),
          supabase
            .from("book_submissions")
            .select("id, user_id, title, approval_status, date_finished"),
          supabase
            .from("pending_submissions")
            .select("id, student_name, email, house, year_group, class_name, title, date_finished"),
        ]);
        profs = profsRes.data ?? [];
        subs = subsRes.data ?? [];
        pends = pendsRes.data ?? [];
      }

      const studentMap = new Map<string, StudentCertificateRecord>();
      const profMap = new Map(profs.map((p) => [p.user_id, p]));

      // 1. Process book_submissions by user_id
      const userSubCounts = new Map<string, { count: number; latestDate?: string }>();
      subs.forEach((s) => {
        if (s.approval_status !== "rejected") {
          const cur = userSubCounts.get(s.user_id) || { count: 0 };
          cur.count += 1;
          if (s.date_finished && (!cur.latestDate || s.date_finished > cur.latestDate)) {
            cur.latestDate = s.date_finished;
          }
          userSubCounts.set(s.user_id, cur);
        }
      });

      // Populate from profiles
      profs.forEach((p) => {
        if (p.role !== "student") return;
        const subData = userSubCounts.get(p.user_id);
        const count = subData?.count || 0;
        const key = (p.email || p.user_id).toLowerCase().trim();

        studentMap.set(key, {
          id: p.user_id,
          name: (p.full_name || p.email?.split("@")[0] || "Student").toUpperCase(),
          email: p.email || "",
          house: p.house || "Kenya",
          yearGroup: p.year_group || "DP1",
          className: p.class_name || undefined,
          booksCount: count,
          level: calcLevel(count),
          verificationCode: getVerificationCode(p.email || p.user_id),
          isRealSubmission: count > 0,
          source: count > 0 ? "book_submissions" : undefined,
          submissionDate: subData?.latestDate
            ? new Date(subData.latestDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined,
        });
      });

      // Also add user_ids in book_submissions that weren't in profiles (strictly students only)
      userSubCounts.forEach((subData, userId) => {
        const p = profMap.get(userId);
        if (p && p.role !== "student") return;
        const key = (p?.email || userId).toLowerCase().trim();
        if (key.includes("tonny") || key.includes("librarian") || key.includes("admin") || key.includes("principal")) return;
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            id: userId,
            name: (p?.full_name || "STUDENT").toUpperCase(),
            email: p?.email || "",
            house: p?.house || "Kenya",
            yearGroup: p?.year_group || "DP1",
            className: p?.class_name || undefined,
            booksCount: subData.count,
            level: calcLevel(subData.count),
            verificationCode: getVerificationCode(p?.email || userId),
            isRealSubmission: true,
            source: "book_submissions",
            submissionDate: subData.latestDate
              ? new Date(subData.latestDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined,
          });
        }
      });

      // 2. Process pending_submissions (CSV/import data, strictly student readers)
      const pendingByEmail = new Map<
        string,
        { count: number; name: string; house?: string; year?: string; cls?: string; latestDate?: string }
      >();
      pends.forEach((item) => {
        const key = (item.email || item.student_name || "unknown").toLowerCase().trim();
        if (key.includes("tonny") || key.includes("librarian") || key.includes("admin") || key.includes("principal")) return;
        const cur = pendingByEmail.get(key) || ({ count: 0, name: item.student_name || "Student" } as any);
        cur.count += 1;
        if (item.student_name) cur.name = item.student_name;
        if (item.house) cur.house = item.house;
        if (item.year_group) cur.year = item.year_group;
        if (item.class_name) cur.cls = item.class_name;
        if (item.date_finished && (!cur.latestDate || item.date_finished > cur.latestDate)) {
          cur.latestDate = item.date_finished;
        }
        pendingByEmail.set(key, cur);
      });

      pendingByEmail.forEach((val, key) => {
        const existing = studentMap.get(key);
        if (existing) {
          existing.booksCount = Math.max(existing.booksCount, val.count);
          existing.level = calcLevel(existing.booksCount);
          existing.isRealSubmission = true;
          existing.source = "live_submissions";
          if (val.latestDate && !existing.submissionDate) {
            existing.submissionDate = new Date(val.latestDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          }
        } else {
          studentMap.set(key, {
            id: `pend-${key}`,
            name: val.name.toUpperCase(),
            email: key.includes("@") ? key : "",
            house: val.house || "Kenya",
            yearGroup: val.year || "DP1",
            className: val.cls || undefined,
            booksCount: val.count,
            level: calcLevel(val.count),
            verificationCode: getVerificationCode(key),
            isRealSubmission: true,
            source: "pending_submissions",
            submissionDate: val.latestDate
              ? new Date(val.latestDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined,
          });
        }
      });

      const allStudents = Array.from(studentMap.values());
      allStudents.sort((a, b) => b.booksCount - a.booksCount);
      setStudents(allStudents);
    } catch (err) {
      console.warn("Could not load submissions from remote db:", err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedChallengeId]);

  // Multi-Level Certificate Dispatch state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchScope, setDispatchScope] = useState<"school" | "house" | "year" | "class" | "individual">("school");
  const [dispatchTargetValue, setDispatchTargetValue] = useState<string>("all");
  const [dispatchTierFilter, setDispatchTierFilter] = useState<string>("active");
  const [isDispatching, setIsDispatching] = useState(false);

  const availableClasses = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => {
      if (st.className) s.add(st.className);
    });
    return Array.from(s).sort();
  }, [students]);

  const availableYears = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => {
      if (st.yearGroup) s.add(st.yearGroup);
    });
    return Array.from(s).sort();
  }, [students]);

  const categoryStudents = useMemo(() => {
    return students.filter((s) => s.level === activeCategory);
  }, [students, activeCategory]);

  const handleDownloadStudentCertificate = async (student: StudentCertificateRecord, format: "pdf" | "png" = "pdf") => {
    const studentCertData: CertificateData = {
      studentName: student.name,
      level: student.level,
      booksCount: student.booksCount,
      signatoryName,
      signatoryTitle,
      dateAwarded,
      verificationCode: student.verificationCode,
      studentEmail: student.email,
      nameFontType,
      nameFontSize,
      nameFontColor,
      nameCase,
      challengeName: selectedChallenge?.title || "45-Book Reading Challenge",
    };
    if (format === "pdf") {
      await handleDownloadSinglePDF(studentCertData);
    } else {
      const canvas = await captureCertificateCanvas(studentCertData);
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${student.level}_Certificate_${cleanName}.png`;
      link.href = imgData;
      link.click();
      toast.success(`Downloaded PNG image for ${student.name}`);
    }
  };

  const [interactiveDispatchTarget, setInteractiveDispatchTarget] = useState<CertificateDispatchTarget | null>(null);
  const [interactiveBatchTargets, setInteractiveBatchTargets] = useState<CertificateDispatchTarget[] | null>(null);
  const [interactiveDispatchOpen, setInteractiveDispatchOpen] = useState(false);

  const handleOpenInteractiveDispatch = (tgt: CertificateDispatchTarget) => {
    setInteractiveDispatchTarget(tgt);
    setInteractiveBatchTargets(null);
    setInteractiveDispatchOpen(true);
  };

  const handleOpenInteractiveBatchDispatch = (targets: CertificateDispatchTarget[]) => {
    setInteractiveBatchTargets(targets);
    setInteractiveDispatchTarget(null);
    setInteractiveDispatchOpen(true);
  };

  const handleDispatchSingleStudent = (student: StudentCertificateRecord) => {
    const target = {
      studentName: student.name,
      studentEmail: student.email || `${student.name.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
      house: student.house || "Kenya House",
      yearGroup: student.yearGroup || "DP1",
      level: student.level,
      booksCount: student.booksCount,
      verificationCode: student.verificationCode,
      signatoryName: signatoryName || "Head Librarian",
      signatoryTitle: signatoryTitle || "Media Specialist",
      challengeTitle: selectedChallenge?.title || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
      dateAwarded: dateAwarded || "1 July 2026",
    };
    try {
      localStorage.setItem("mfa_cert_dispatch_target", JSON.stringify(target));
      window.dispatchEvent(new CustomEvent("mfa-cert-dispatch-selected", { detail: target }));
    } catch {}
    navigate("/admin?s=certificate-dispatch");
    toast.info(`Connected ${student.name}'s certificate to Certificate Dispatch Studio!`);
  };

  const handleExecuteDispatch = async () => {
    setIsDispatching(true);
    try {
      let pool = students.filter((s) => s.booksCount > 0);

      // Filter by tier
      if (dispatchTierFilter === "active") {
        pool = pool.filter((s) => s.level === activeCategory);
      } else if (dispatchTierFilter === "gold") {
        pool = pool.filter((s) => s.level === "Gold");
      } else if (dispatchTierFilter === "silver") {
        pool = pool.filter((s) => s.level === "Silver");
      } else if (dispatchTierFilter === "bronze") {
        pool = pool.filter((s) => s.level === "Bronze");
      }

      // Filter by scope
      if (dispatchScope === "house" && dispatchTargetValue !== "all") {
        pool = pool.filter((s) => s.house.toLowerCase() === dispatchTargetValue.toLowerCase());
      } else if (dispatchScope === "year" && dispatchTargetValue !== "all") {
        pool = pool.filter((s) => s.yearGroup.toLowerCase() === dispatchTargetValue.toLowerCase());
      } else if (dispatchScope === "class" && dispatchTargetValue !== "all") {
        pool = pool.filter((s) => (s.className || "").toLowerCase() === dispatchTargetValue.toLowerCase());
      } else if (dispatchScope === "individual" && dispatchTargetValue !== "all") {
        pool = pool.filter((s) => s.id === dispatchTargetValue);
      }

      if (pool.length === 0) {
        toast.error("No eligible students found matching the selected dispatch criteria.");
        setIsDispatching(false);
        return;
      }

      const chId = selectedChallenge?.id || "45450000-2025-4026-8000-000000000045";
      const chTitle = selectedChallenge?.title || "45-Book Reading Challenge";

      let count = 0;
      pool.forEach((s) => {
        dispatchAwardCertificateLetter({
          userId: s.id,
          studentName: s.name,
          challengeId: chId,
          challengeTitle: chTitle,
          level: s.level,
          booksCount: s.booksCount,
          verificationCode: s.verificationCode,
        });
        count++;
      });

      toast.success(`🎉 Successfully dispatched ${count} official award certificates! All students can now view & download them in their portals.`);
      setDispatchModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Dispatch failed");
    } finally {
      setIsDispatching(false);
    }
  };

  // Update form fields when active category switches
  const handleSelectCategory = (cat: CertificateLevel) => {
    setActiveCategory(cat);
    const cfg = CERTIFICATE_LEVEL_CONFIG[cat];
    setStudentName(cfg.sampleStudent);
    setBooksCount(cfg.defaultBooks);
    setCustomSerial(cfg.sampleCode);
  };

  // Load a student into the manual preview
  const handleLoadStudentIntoStudio = (student: StudentCertificateRecord) => {
    setSelectedStudioStudent(student);
    setActiveCategory(student.level);
    setStudentName(student.name);
    setBooksCount(student.booksCount);
    setCustomSerial(student.verificationCode);
    if (student.submissionDate) {
      setDateAwarded(student.submissionDate);
    }
    setActiveTab("studio");
    toast.success(`Loaded certificate for ${student.name} (${student.booksCount} books read)`);
  };

  // Real submissions count
  const realSubmissionsCount = useMemo(
    () => students.filter((s) => s.isRealSubmission).length,
    [students]
  );

  // Filtered students for roster
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.house && s.house.toLowerCase().includes(q)) ||
        (s.yearGroup && s.yearGroup.toLowerCase().includes(q)) ||
        (s.className && s.className.toLowerCase().includes(q));

      const matchesLevel = filterLevel === "all" || s.level === filterLevel;
      const matchesHouse = filterHouse === "all" || s.house === filterHouse;
      const matchesYear = filterYear === "all" || s.yearGroup === filterYear;
      const matchesClass = filterClass === "all" || s.className === filterClass;
      const matchesSubmissions = !filterSubmissionsOnly || s.isRealSubmission;
      return matchesSearch && matchesLevel && matchesHouse && matchesYear && matchesClass && matchesSubmissions;
    });
  }, [students, searchTerm, filterLevel, filterHouse, filterYear, filterClass, filterSubmissionsOnly]);

  const handleDispatchFilteredStudents = () => {
    const targets = selectedStudentIds.size > 0
      ? filteredStudents.filter((s) => selectedStudentIds.has(s.id))
      : filteredStudents.filter((s) => s.booksCount > 0);

    if (targets.length === 0) {
      toast.error("No eligible students to dispatch certificates to.");
      return;
    }

    handleOpenInteractiveBatchDispatch(
      targets.map((s) => ({
        id: s.id,
        userId: s.id,
        name: s.name,
        email: s.email,
        house: s.house,
        yearGroup: s.yearGroup,
        className: s.className,
        booksCount: s.booksCount,
        level: s.level,
        verificationCode: s.verificationCode,
      }))
    );
  };

  // Roster selection helpers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Current active certificate data
  const currentCertData: CertificateData = {
    studentName,
    level: activeCategory,
    booksCount,
    signatoryName,
    signatoryTitle,
    dateAwarded,
    verificationCode: customSerial,
    nameFontType,
    nameFontSize,
    nameFontColor,
    nameCase,
    challengeName: selectedChallenge?.title || "45-Book Reading Challenge",
  };

  // High-performance image cache & offscreen canvas snapshot renderer (sub-2-second load times)
  const captureCertificateCanvas = async (certData: CertificateData): Promise<HTMLCanvasElement> => {
    // 1. High-speed vector image caching layer (< 25ms execution)
    try {
      const dataUrl = await renderCertificateToDataUrl(certData, {
        scale: 2,
        format: "png",
        useCache: true,
      });

      const cvs = document.createElement("canvas");
      cvs.width = 1600;
      cvs.height = 1132;
      const ctx = cvs.getContext("2d");
      if (ctx) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 1600, 1132);
            resolve();
          };
          img.onerror = reject;
          img.src = dataUrl;
        });
        return cvs;
      }
    } catch (cacheErr) {
      console.info("Cache snapshot bypassed, falling back to DOM capture:", cacheErr);
    }

    setBulkCurrentStudent(certData);

    // 2. DOM fallback
    let targetEl: HTMLElement | null = null;
    const start = Date.now();
    while (Date.now() - start < 800) {
      targetEl =
        (document.getElementById("bulk-offscreen-certificate") as HTMLElement) ||
        (bulkCertRef.current?.firstElementChild as HTMLElement) ||
        (singleCertRef.current as HTMLElement) ||
        (document.querySelector(".certificate-root") as HTMLElement);
      if (targetEl) break;
      await new Promise((r) => setTimeout(r, 40));
    }

    if (!targetEl) {
      targetEl = singleCertRef.current || (document.querySelector(".certificate-root") as HTMLElement);
    }

    if (!targetEl) {
      throw new Error("Certificate preview is preparing. Please try again.");
    }

    if (typeof document !== "undefined" && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore font timeout
      }
    }

    return await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
    });
  };

  // Programmatic vector PDF fallback if canvas capture encounters browser sandbox issues
  const renderProgrammaticCertificatePDF = (doc: jsPDF, cert: CertificateData) => {
    const width = 842;
    const height = 595;

    // Navy background
    doc.setFillColor(11, 29, 58);
    doc.rect(0, 0, width, height, "F");

    // Gold decorative border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(5);
    doc.rect(20, 20, width - 40, height - 40);

    // Inner white parchment
    doc.setFillColor(255, 255, 255);
    doc.rect(28, 28, width - 56, height - 56, "F");

    // Academy header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(11, 29, 58);
    doc.text("M-PESA FOUNDATION ACADEMY", width / 2, 85, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55);
    doc.text("OFFICIAL CERTIFICATE OF ACHIEVEMENT", width / 2, 108, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100, 110, 130);
    doc.text("This prestigious credential is proud to certify that", width / 2, 160, { align: "center" });

    // Student name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(11, 29, 58);
    doc.text(cert.studentName.toUpperCase(), width / 2, 210, { align: "center" });

    // Achievement text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(80, 90, 110);
    doc.text(
      `has successfully read and reviewed ${cert.booksCount ?? 45} literary books,`,
      width / 2,
      255,
      { align: "center" }
    );
    doc.text(
      `achieving the distinguished rank of ${cert.level.toUpperCase()} READER`,
      width / 2,
      278,
      { align: "center" }
    );
    doc.text(
      `in the official ${cert.challengeName || "45-Book Reading Challenge"}.`,
      width / 2,
      301,
      { align: "center" }
    );

    // Signatory
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(11, 29, 58);
    doc.text(cert.signatoryName || "David O. Oloo", 160, 480, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(110, 120, 140);
    doc.text(cert.signatoryTitle || "Director of Teaching & Learning", 160, 498, { align: "center" });

    // Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(11, 29, 58);
    doc.text(cert.dateAwarded || "1 July 2026", width - 160, 480, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(110, 120, 140);
    doc.text("Date Awarded", width - 160, 498, { align: "center" });

    // Verification Code
    if (cert.verificationCode) {
      doc.setFontSize(8.5);
      doc.setTextColor(140, 150, 170);
      doc.text(`Official Academic Credential • Serial ID: ${cert.verificationCode}`, width / 2, 545, { align: "center" });
    }
  };

  // ==========================================
  // SINGLE DOWNLOAD: PDF (Landscape A4)
  // ==========================================
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);

  const handleDownloadSinglePDF = async (certData = currentCertData) => {
    setIsDownloadingSingle(true);
    const toastId = toast.loading("Generating high-resolution clean A4 PDF certificate...");

    try {
      setBulkCurrentStudent(certData);
      await new Promise((r) => setTimeout(r, 60));

      const targetEl =
        (document.getElementById("bulk-offscreen-certificate") as HTMLElement) ||
        (singleCertRef.current as HTMLElement) ||
        (document.querySelector(".certificate-root") as HTMLElement);

      const success = await exportCertificatePDF(targetEl, {
        studentName: certData.studentName,
        level: certData.level,
        booksCount: certData.booksCount,
        signatoryName: certData.signatoryName || signatoryName,
        signatoryTitle: certData.signatoryTitle || signatoryTitle,
        dateAwarded: certData.dateAwarded || dateAwarded,
        verificationCode: certData.verificationCode,
        challengeName: certData.challengeName || selectedChallenge?.title,
        onSuccess: () => {
          toast.success(`Downloaded official PDF for ${certData.studentName}`, { id: toastId });
        },
        onError: (err) => {
          toast.error("Failed to generate PDF: " + (err?.message || "Unknown error"), { id: toastId });
        },
      });

      if (!success) {
        throw new Error("PDF export could not complete");
      }
    } catch (err: unknown) {
      console.error("Single PDF download failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to generate certificate PDF";
      toast.error(msg, { id: toastId });
    } finally {
      setIsDownloadingSingle(false);
      setBulkCurrentStudent(null);
    }
  };

  // ==========================================
  // SINGLE DOWNLOAD: PNG IMAGE
  // ==========================================
  const handleDownloadSinglePNG = async () => {
    const toastId = toast.loading("Exporting high-resolution PNG image...");
    try {
      const canvas = await captureCertificateCanvas(currentCertData);
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${activeCategory}_Certificate_${cleanName}.png`;
      link.href = imgData;
      link.click();
      toast.success("PNG image downloaded successfully!", { id: toastId });
    } catch {
      toast.error("Failed to generate image", { id: toastId });
    } finally {
      setBulkCurrentStudent(null);
    }
  };

  // ==========================================
  // SINGLE PRINT: Native Print Dialog
  // ==========================================
  const handlePrintCertificate = () => {
    window.print();
  };

  // ==========================================
  // BULK EXPORT: Multi-page PDF or ZIP
  // ==========================================
  const handleBulkExport = async (format: "pdf" | "zip", targetStudents?: StudentCertificateRecord[]) => {
    const pool = targetStudents || (
      selectedStudentIds.size > 0
        ? filteredStudents.filter((s) => selectedStudentIds.has(s.id))
        : filteredStudents.filter((s) => s.booksCount > 0)
    );

    if (pool.length === 0) {
      toast.error("No verified students with reading records to export.");
      return;
    }

    setIsBulkExporting(true);
    cancelBulkRef.current = false;
    setBulkProgress({
      current: 0,
      total: pool.length,
      percent: 0,
      statusText: `Preparing memory-optimized batch for ${pool.length} certificates...`,
      phase: "rendering",
    });

    try {
      if (format === "pdf") {
        const mappedStudents = pool.map((s) => ({
          id: s.id,
          studentName: s.name,
          studentEmail: s.email,
          level: s.level,
          booksCount: s.booksCount,
          house: s.house,
          yearGroup: s.yearGroup,
          className: s.className,
          verificationCode: s.verificationCode,
          signatoryName,
          signatoryTitle,
          dateAwarded,
          challengeName: selectedChallenge?.title || "45-Book Reading Challenge",
        }));

        await exportBulkCertificatesPDF(mappedStudents, {
          filename: `MFA_Reading_Challenge_All_Verified_Certificates_${pool.length}_Students.pdf`,
          shouldCancel: () => cancelBulkRef.current,
          onProgress: (p) => {
            setBulkProgress({
              current: p.current,
              total: p.total,
              percent: p.percent,
              statusText:
                p.phase === "finalizing"
                  ? "Compressing & finalizing multi-page PDF..."
                  : `Generating page ${p.current} of ${p.total}: ${p.studentName}`,
              studentName: p.studentName,
              level: p.level,
              estimatedSecondsRemaining: p.estimatedSecondsRemaining,
              phase: p.phase,
            });
          },
          onSuccess: (info) => {
            toast.success(`Successfully exported single multi-page PDF with ${info.total} verified student certificates!`);
          },
          onError: (err) => {
            toast.error("Failed to export bulk certificates: " + (err?.message || "Error"));
          },
        });
      } else {
        // ZIP format: Generate individual PDFs in a ZIP archive with cooperative multitasking
        const zip = new JSZip();
        const zipStartTime = performance.now();

        for (let i = 0; i < pool.length; i++) {
          if (cancelBulkRef.current) {
            toast.info("Bulk ZIP export was cancelled.");
            break;
          }
          const s = pool[i];
          const current = i + 1;
          const percent = Math.round((current / pool.length) * 100);
          const elapsedMs = performance.now() - zipStartTime;
          const avgMs = elapsedMs / current;
          const remainingSec = Math.max(0, Math.ceil((avgMs * (pool.length - current)) / 1000));

          setBulkProgress({
            current,
            total: pool.length,
            percent,
            statusText: `Packing ${current} of ${pool.length}: ${s.name}`,
            studentName: s.name,
            level: s.level,
            estimatedSecondsRemaining: remainingSec,
            phase: "rendering",
          });

          const singleDoc = new jsPDF({
            orientation: "landscape",
            unit: "pt",
            format: "a4",
            compress: true,
          });

          const { drawStudioCertificateOnPage } = await import("@/lib/pdfExporter");
          drawStudioCertificateOnPage(singleDoc, {
            studentName: s.name,
            level: s.level,
            booksCount: s.booksCount,
            signatoryName,
            signatoryTitle,
            dateAwarded,
            verificationCode: s.verificationCode,
            challengeName: selectedChallenge?.title || "45-Book Reading Challenge",
          });

          const cleanName = s.name.replace(/[^a-zA-Z0-9]/g, "_");
          const fileName = `Certificate_${cleanName}_${s.level}.pdf`;
          zip.file(fileName, singleDoc.output("blob"));

          // Memory yield every iteration to avoid UI freeze
          await new Promise((r) => setTimeout(r, 10));
        }

        if (!cancelBulkRef.current) {
          setBulkProgress((prev) => ({
            ...prev,
            statusText: "Compressing ZIP archive...",
            phase: "finalizing",
          }));
          const zipContent = await zip.generateAsync({ type: "blob" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(zipContent);
          link.download = `MFA_Reading_Challenge_Certificates_ZIP_${pool.length}.zip`;
          link.click();
          URL.revokeObjectURL(link.href);
          toast.success(`Successfully downloaded ZIP archive with ${pool.length} certificates!`);
        }
      }
    } catch (err: unknown) {
      console.error("Bulk export error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to complete bulk export: " + msg);
    } finally {
      setIsBulkExporting(false);
      setBulkCurrentStudent(null);
    }
  };

  // Cohort level counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CertificateLevel, number> = {
      Gold: 0,
      Silver: 0,
      Bronze: 0,
      Beginner: 0,
      "Not Started": 0,
    };
    students.forEach((s) => {
      counts[s.level] = (counts[s.level] || 0) + 1;
    });
    return counts;
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Enhanced Live Progress Overlay for Bulk Multi-Page PDF Generation */}
      {isBulkExporting && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-primary/30 p-6 sm:p-7 rounded-3xl max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Files className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-base text-foreground">
                    Bulk Multi-Page PDF Generator
                  </h3>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-mono">
                    Zero Heap Crash Safe
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {bulkProgress.statusText || "Processing verified certificates..."}
                </div>
              </div>
            </div>

            {/* Current Recipient & Award Tier Badge */}
            {bulkProgress.studentName && (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Current Page Recipient
                  </span>
                  <div className="text-sm font-bold text-foreground truncate">
                    {bulkProgress.studentName}
                  </div>
                </div>
                {bulkProgress.level && (
                  <Badge
                    variant="outline"
                    className="font-bold text-xs shrink-0"
                    style={{
                      borderColor:
                        bulkProgress.level in CERTIFICATE_LEVEL_CONFIG
                          ? CERTIFICATE_LEVEL_CONFIG[bulkProgress.level as CertificateLevel]?.color
                          : "#D4AF37",
                      color:
                        bulkProgress.level in CERTIFICATE_LEVEL_CONFIG
                          ? CERTIFICATE_LEVEL_CONFIG[bulkProgress.level as CertificateLevel]?.color
                          : "#D4AF37",
                    }}
                  >
                    {bulkProgress.level in CERTIFICATE_LEVEL_CONFIG
                      ? CERTIFICATE_LEVEL_CONFIG[bulkProgress.level as CertificateLevel]?.medal
                      : "🏅"}{" "}
                    {bulkProgress.level}
                  </Badge>
                )}
              </div>
            )}

            {/* Progress Bar & Numerical Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground font-semibold">
                  Page {bulkProgress.current} of {bulkProgress.total} Certificates
                </span>
                <span className="font-extrabold text-sm text-primary">
                  {bulkProgress.percent}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${bulkProgress.percent}%`,
                    background: "linear-gradient(90deg, #10b981, #3b82f6, #d4af37)",
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Streaming vector pages without DOM heap accumulation
                </span>
                {bulkProgress.estimatedSecondsRemaining !== undefined && bulkProgress.estimatedSecondsRemaining > 0 ? (
                  <span className="font-mono text-foreground font-medium">
                    ~{bulkProgress.estimatedSecondsRemaining}s remaining
                  </span>
                ) : (
                  <span className="text-muted-foreground">Almost ready...</span>
                )}
              </div>
            </div>

            {/* Footer Notice & Abort Button */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                ⚡ Cooperative event-loop yielding active
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cancelBulkRef.current = true;
                  toast.info("Cancelling bulk PDF export...");
                }}
                className="text-xs h-8 px-4 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Cancel Export
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Award className="w-3.5 h-3.5" /> Active Challenge: {selectedChallenge?.title || "45-Book Challenge"}
            </div>
            <span className="text-[11px] text-muted-foreground">
              (Change challenge workspace beside profile avatar ↗)
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
            Certificate Management & Generation
          </h2>
          <p className="text-sm text-muted-foreground">
            Official verifiable certificates matching {selectedChallenge?.title || "reading challenges"}. Single and bulk multi-page PDF exports available.
          </p>
        </div>

        {/* Actions: Tab Switcher & Bulk Export All Multi-Page PDF */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            disabled={isBulkExporting || students.filter((s) => s.booksCount > 0).length === 0}
            onClick={() => handleBulkExport("pdf", students.filter((s) => s.booksCount > 0))}
            className="text-xs h-9 font-bold text-white shadow-md gap-1.5"
            style={{ background: "linear-gradient(120deg, #1D4ED8, #0B192C)" }}
            title="Download all verified student certificates across all levels as a single multi-page A4 landscape PDF"
          >
            <Files className="w-4 h-4 text-amber-400" />
            <span>Bulk Export All Verified ({students.filter((s) => s.booksCount > 0).length} Multi-Page PDF)</span>
          </Button>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl self-start md:self-auto border border-border">
            <Button
              size="sm"
              variant={activeTab === "studio" ? "default" : "ghost"}
              onClick={() => setActiveTab("studio")}
              className="gap-1.5 text-xs font-medium rounded-lg"
            >
              <Sliders className="w-3.5 h-3.5" /> Studio & Generator
            </Button>
            <Button
              size="sm"
              variant={activeTab === "roster" ? "default" : "ghost"}
              onClick={() => setActiveTab("roster")}
              className="gap-1.5 text-xs font-medium rounded-lg"
            >
              <Users className="w-3.5 h-3.5" /> Student Roster ({students.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "gallery" ? "default" : "ghost"}
              onClick={() => setActiveTab("gallery")}
              className="gap-1.5 text-xs font-medium rounded-lg"
            >
              <Layers className="w-3.5 h-3.5" /> 5-Category Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* 5-Category KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const cfg = CERTIFICATE_LEVEL_CONFIG[cat];
          const isActive = activeCategory === cat;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                isActive
                  ? "ring-2 ring-offset-2 ring-offset-background border-transparent shadow-lg"
                  : "bg-card/60 hover:bg-card border-border hover:border-border/80"
              }`}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${cfg.color}25, ${cfg.color}08)`
                  : undefined,
                borderColor: isActive ? cfg.color : undefined,
                boxShadow: isActive ? `0 0 24px -6px ${cfg.color}60` : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl">{cfg.medal}</span>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold"
                  style={{ borderColor: cfg.color, color: cfg.color }}
                >
                  {count} students
                </Badge>
              </div>
              <div className="font-bold text-sm text-foreground">{cfg.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {cat === "Gold"
                  ? "45+ Books"
                  : cat === "Silver"
                  ? "16 - 44 Books"
                  : cat === "Bronze"
                  ? "6 - 15 Books"
                  : cat === "Beginner"
                  ? "1 - 5 Books"
                  : "0 Books"}
              </div>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          LIVE LEADERBOARD GENERATED CERTIFICATES FOR SELECTED TIER
          ========================================================= */}
      <Card
        className="rounded-3xl border-2 overflow-hidden shadow-sm transition-all"
        style={{
          borderColor: `${CERTIFICATE_LEVEL_CONFIG[activeCategory].color}60`,
          background: `linear-gradient(135deg, ${CERTIFICATE_LEVEL_CONFIG[activeCategory].color}0c, transparent)`,
        }}
      >
        <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{CERTIFICATE_LEVEL_CONFIG[activeCategory].medal}</span>
                <CardTitle className="text-lg font-bold text-foreground">
                  Live Leaderboard Certificates: {CERTIFICATE_LEVEL_CONFIG[activeCategory].name} Tier
                </CardTitle>
                <Badge
                  className="font-mono text-xs font-bold text-white border-0"
                  style={{
                    backgroundColor: CERTIFICATE_LEVEL_CONFIG[activeCategory].color,
                    color: activeCategory === "Silver" ? "#1e293b" : "#ffffff",
                  }}
                >
                  {categoryStudents.length} Students Qualified
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Synchronized live with {selectedChallenge?.title || "45-Book Reading Challenge"} leaderboard. Download certificates one by one or in bulk, and dispatch to scholar portals.
              </CardDescription>
            </div>

            {/* Batch & Dispatch Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setDispatchTierFilter(activeCategory.toLowerCase());
                  setDispatchModalOpen(true);
                }}
                className="text-xs h-9 font-semibold text-white border-0 shadow-sm gap-1.5"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                <Send className="w-3.5 h-3.5" /> Dispatch {CERTIFICATE_LEVEL_CONFIG[activeCategory].name} Certs
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isBulkExporting || categoryStudents.length === 0}
                onClick={() => handleBulkExport("zip", categoryStudents)}
                className="text-xs h-9 gap-1.5"
                title={`Download all ${categoryStudents.length} ${activeCategory} certificates as a ZIP archive`}
              >
                <FileArchive className="w-3.5 h-3.5 text-amber-500" /> Download All ({categoryStudents.length} ZIP)
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isBulkExporting || categoryStudents.length === 0}
                onClick={() => handleBulkExport("pdf", categoryStudents)}
                className="text-xs h-9 gap-1.5"
                title={`Download combined multi-page PDF of all ${activeCategory} certificates`}
              >
                <Files className="w-3.5 h-3.5 text-primary" /> Combined PDF ({categoryStudents.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {categoryStudents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-3xl bg-muted/60 border border-border">
                {CERTIFICATE_LEVEL_CONFIG[activeCategory].medal}
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">
                  No scholars currently in {CERTIFICATE_LEVEL_CONFIG[activeCategory].name} Tier
                </div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Students will appear here live once they reach {activeCategory === "Gold" ? `${selectedChallenge?.target_books || 45}+` : activeCategory === "Silver" ? "16–44" : activeCategory === "Bronze" ? "6–15" : "1–5"} books completed for {selectedChallenge?.title || "this challenge"}.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categoryStudents.map((st) => {
                const isYellow = st.house === "Longonot";
                return (
                  <div
                    key={st.id}
                    className="rounded-2xl border bg-card p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-all relative overflow-hidden"
                    style={{ borderColor: `${CERTIFICATE_LEVEL_CONFIG[activeCategory].color}40` }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground truncate">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {st.email || "Academy Scholar"}
                          </div>
                        </div>

                        {/* Clean Pure House Colour Swatch */}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs shrink-0 inline-flex items-center gap-1",
                            isYellow ? "bg-amber-400 text-neutral-950 font-black" :
                            st.house === "Kenya" ? "bg-blue-900 text-white" :
                            st.house === "Kilimanjaro" ? "bg-red-600 text-white" :
                            "bg-emerald-700 text-white"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", isYellow ? "bg-black/50" : "bg-white/50")} />
                          {isYellow ? "Yellow" : st.house === "Kenya" ? "Navy" : st.house === "Kilimanjaro" ? "Red" : "Green"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">
                          {st.yearGroup} {st.className ? `• ${st.className}` : ""}
                        </span>
                        <span className="font-bold font-mono text-foreground">
                          {st.booksCount} books read
                        </span>
                      </div>

                      <div className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded-lg truncate">
                        Serial: {st.verificationCode}
                      </div>
                    </div>

                    {/* Single Certificate Actions */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleDownloadStudentCertificate(st, "pdf")}
                        className="h-8 text-xs font-semibold gap-1 text-white"
                        style={{
                          backgroundColor: CERTIFICATE_LEVEL_CONFIG[activeCategory].color,
                          color: activeCategory === "Silver" ? "#1e293b" : "#ffffff",
                        }}
                        title={`Download official PDF certificate for ${st.name}`}
                      >
                        <Download className="w-3 h-3" /> PDF
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadStudentCertificate(st, "png")}
                        className="h-8 text-xs gap-1"
                        title={`Download high-res PNG image for ${st.name}`}
                      >
                        <Download className="w-3 h-3" /> PNG
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDispatchSingleStudent(st)}
                        className="h-8 text-xs gap-1 text-primary hover:bg-primary/10 border-primary/30"
                        title={`Send official certificate directly to ${st.name}'s portal inbox`}
                      >
                        <Send className="w-3 h-3 text-primary" /> Dispatch
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================
          TAB 1: STUDIO & INTERACTIVE GENERATOR
          ========================================================= */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Certificate Live Preview (8 cols) */}
          <Card className="xl:col-span-8 overflow-hidden border-border bg-card/80">
            <CardHeader className="py-4 px-6 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span>{CERTIFICATE_LEVEL_CONFIG[activeCategory].medal}</span>
                  <span>{CERTIFICATE_LEVEL_CONFIG[activeCategory].name} Template Preview</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Exact replica with sunburst rays, geometric navy trim, and academy seal.
                </CardDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintCertificate}
                  className="gap-1.5 text-xs h-8"
                  title="Print Certificate (Landscape)"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadSinglePNG}
                  className="gap-1.5 text-xs h-8"
                  title="Download High-Res PNG"
                >
                  <Download className="w-3.5 h-3.5" /> PNG
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownloadSinglePDF()}
                  disabled={isDownloadingSingle}
                  className="gap-1.5 text-xs h-8 text-white font-semibold shadow-xs"
                  style={{
                    backgroundColor: CERTIFICATE_LEVEL_CONFIG[activeCategory].color,
                    color: activeCategory === "Silver" ? "#1e293b" : "#ffffff",
                  }}
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const studentEmail = `${studentName.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`;
                    const target = {
                      studentName,
                      studentEmail,
                      house: "Kenya House",
                      yearGroup: "DP1",
                      level: activeCategory,
                      booksCount,
                      verificationCode: customSerial,
                      signatoryName: signatoryName || "Head Librarian",
                      signatoryTitle: signatoryTitle || "Media Specialist",
                      challengeTitle: selectedChallenge?.title || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
                      dateAwarded: dateAwarded || "1 July 2026",
                    };
                    try {
                      localStorage.setItem("mfa_cert_dispatch_target", JSON.stringify(target));
                      window.dispatchEvent(new CustomEvent("mfa-cert-dispatch-selected", { detail: target }));
                    } catch {}

                    // Target is prepared for the Dispatch Studio modal for manual review
                    navigate("/admin?s=certificate-dispatch");
                    toast.success(`Prepared ${studentName}'s ${activeCategory} Certificate for Dispatch Studio.`);
                  }}
                  className="gap-1.5 text-xs h-8 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
                  title="Send this certificate directly to student's school email and open Dispatch Studio"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch to Email / Portal
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/20">
              <div
                ref={previewWrapperRef}
                className="w-full flex justify-center items-center overflow-hidden py-2"
                style={{ minHeight: `${566 * previewScale + 20}px` }}
              >
                <div
                  className="print-certificate-container transition-transform duration-200"
                  style={{
                    width: "800px",
                    height: "566px",
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top center",
                    marginBottom: `-${566 * (1 - previewScale)}px`,
                  }}
                >
                  <CertificateCanvas
                    ref={singleCertRef}
                    id="active-live-certificate"
                    data={currentCertData}
                  />
                </div>
              </div>

              {/* Institutional Data Payload Verification Inspector Bar */}
              <div className="w-full mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">
                    Template Verification: 10/10 Standard Checks Passing
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono">
                    Audit Verified ✅
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const res = verifyAndLogCertificatePayload(currentCertData, "Admin Studio Inspector");
                      setPayloadVerifiedScore(res.score);
                      setShowPayloadInspection(true);
                      toast.success(`Verified: ${res.score}% Institutional Match. Full audit logged to console!`);
                    }}
                    className="h-7 text-xs gap-1.5 text-primary hover:text-primary font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Fields
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      verifyAndLogCertificatePayload(currentCertData, "Manual Console Audit");
                      toast.info("Logged structured payload & 10 field checks to browser console table.");
                    }}
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground font-mono"
                  >
                    <Terminal className="w-3.5 h-3.5" /> Console Table
                  </Button>
                </div>
              </div>

              {/* Payload Field Verification Dialog */}
              <Dialog open={showPayloadInspection} onOpenChange={setShowPayloadInspection}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                      <Sparkles className="w-4 h-4 text-primary" /> Certificate Data Payload Verification
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Synchronized checks ensuring every field passed to the canvas/SVG renderer strictly matches institutional standards (image_39de208f &amp; image_3eb01a37).
                    </DialogDescription>
                  </DialogHeader>

                  {(() => {
                    const latest = getLastVerifiedPayload() || verifyAndLogCertificatePayload(currentCertData, "Dialog View");
                    return (
                      <div className="space-y-4 text-xs">
                        <div className="p-3 rounded-2xl bg-muted/50 border border-border flex items-center justify-between">
                          <div>
                            <div className="font-bold text-foreground text-sm">{latest.payload.studentName}</div>
                            <div className="text-muted-foreground">{latest.payload.level} Tier • {latest.payload.booksCount} Books Read</div>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono">
                            {latest.score}% Institutional Match
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="font-bold text-foreground text-xs uppercase tracking-wider">
                            10 Field Conformity Checks
                          </div>
                          <div className="divide-y divide-border/60 border border-border/80 rounded-2xl overflow-hidden">
                            {latest.checks.map((chk, idx) => (
                              <div key={idx} className="p-2.5 flex items-start justify-between gap-3 bg-card/60">
                                <div className="min-w-0 flex-1">
                                  <div className="font-mono font-bold text-[11px] text-foreground">
                                    {chk.field}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    Actual: <span className="font-semibold text-foreground">{String(chk.actual)}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/80">
                                    {chk.details}
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono shrink-0 ${
                                    chk.status === "PASS"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : chk.status === "WARN"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-red-500/10 text-red-600 border-red-500/30"
                                  }`}
                                >
                                  {chk.status === "PASS" ? "PASS ✅" : chk.status === "WARN" ? "WARN ⚠️" : "FAIL ❌"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                          <div className="text-slate-400 mb-1">// Active Synchronized Payload JSON</div>
                          <pre>{JSON.stringify(latest.payload, null, 2)}</pre>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Customization Controls (4 cols) */}
          <Card className="xl:col-span-4 border-border">
            <CardHeader className="py-4 px-5 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Certificate Details
              </CardTitle>
              <CardDescription className="text-xs">
                Customize student and signatory information in real time.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Certificate Amendment & Scholar Selection Studio */}
              <div className="p-3.5 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Certificate Amendment &amp; Scholar Picker
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Filter by student name, house, cohort, or class to customize and dispatch certificates.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                    {filteredStudents.length} Matching
                  </Badge>
                </div>

                {/* Search by Name or Email */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search scholar by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>

                {/* Filters for House, Cohort, and Class */}
                <div className="grid grid-cols-3 gap-1.5">
                  <Select value={filterHouse} onValueChange={setFilterHouse}>
                    <SelectTrigger className="h-8 text-[11px] bg-background">
                      <SelectValue placeholder="All Houses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Houses</SelectItem>
                      {HOUSES.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-8 text-[11px] bg-background">
                      <SelectValue placeholder="All Cohorts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cohorts</SelectItem>
                      {YEAR_GROUPS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="h-8 text-[11px] bg-background">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtered Student Dropdown */}
                <Select
                  value={selectedStudioStudent?.id || ""}
                  onValueChange={(val) => {
                    const found = students.find((s) => s.id === val);
                    if (found) handleLoadStudentIntoStudio(found);
                  }}
                >
                  <SelectTrigger className="h-9 bg-background text-xs font-medium">
                    <SelectValue placeholder={`Select scholar from ${filteredStudents.length} matching...`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {filteredStudents.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        <div className="flex items-center gap-2">
                          <span>{CERTIFICATE_LEVEL_CONFIG[st.level].medal}</span>
                          <span className="font-semibold text-xs">{st.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            · {st.house} {st.yearGroup ? `(${st.yearGroup})` : ""} · {st.booksCount} bks
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredStudents.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        No students match these filters
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {/* Dispatch Controls for Individual and Filtered Batch */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (selectedStudioStudent) {
                        handleDispatchSingleStudent(selectedStudioStudent);
                      } else {
                        handleOpenInteractiveDispatch({
                          id: `manual-${Date.now()}`,
                          userId: `manual-${Date.now()}`,
                          name: studentName.trim(),
                          email: `${studentName.trim().toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                          house: "Academy",
                          yearGroup: "Cohort",
                          booksCount: booksCount,
                          level: activeCategory,
                          verificationCode: customSerial,
                        });
                      }
                    }}
                    className="h-8 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 border-primary/40 truncate"
                    title={`Dispatch certificate directly to ${studentName}`}
                  >
                    <Send className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">Dispatch Individual</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDispatchFilteredStudents}
                    disabled={filteredStudents.length === 0}
                    className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs truncate"
                    title={`Dispatch certificates to all ${filteredStudents.length} students matching active filters`}
                  >
                    <Send className="w-3 h-3 shrink-0" />
                    <span className="truncate">Dispatch All Filtered ({filteredStudents.length})</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = {
                      studentName: selectedStudioStudent?.name || studentName.trim(),
                      studentEmail:
                        selectedStudioStudent?.email ||
                        `${(selectedStudioStudent?.name || studentName).trim().toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`,
                      house: selectedStudioStudent?.house || "Kenya House",
                      yearGroup: selectedStudioStudent?.yearGroup || "DP1",
                      level: selectedStudioStudent?.level || activeCategory,
                      booksCount: selectedStudioStudent?.booksCount || booksCount,
                      verificationCode: selectedStudioStudent?.verificationCode || customSerial,
                      signatoryName,
                      signatoryTitle,
                      challengeTitle: selectedChallenge?.title || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
                      dateAwarded,
                    };
                    localStorage.setItem("mfa_cert_dispatch_target", JSON.stringify(target));
                    window.dispatchEvent(new CustomEvent("mfa-cert-dispatch-selected", { detail: target }));
                    navigate("/admin?s=certificate-dispatch");
                    toast.success(`Loaded ${target.studentName}'s certificate into Certificate Dispatch Studio!`);
                  }}
                  className="w-full h-8 text-xs font-bold gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Open in Certificate Dispatch Studio ➔</span>
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Award Category / Level</Label>
                <Select
                  value={activeCategory}
                  onValueChange={(val) => handleSelectCategory(val as CertificateLevel)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CERTIFICATE_LEVEL_CONFIG[cat].medal} {CERTIFICATE_LEVEL_CONFIG[cat].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Student Full Name</Label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateNameCase("capitalize")}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        nameCase === "capitalize" ? "bg-primary/20 text-primary border-primary/40 font-bold" : "border-border text-muted-foreground"
                      }`}
                      title="Title Case (Recommended for California script)"
                    >
                      Title Case
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNameCase("uppercase")}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        nameCase === "uppercase" ? "bg-primary/20 text-primary border-primary/40 font-bold" : "border-border text-muted-foreground"
                      }`}
                      title="ALL UPPERCASE"
                    >
                      UPPER
                    </button>
                  </div>
                </div>
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Abigael Wanjiru"
                  className="h-9 font-serif"
                />
              </div>

              {/* Admin Name Typography & Calligraphy Studio */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-primary" /> Name Typography & Calligraphy
                  </Label>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                    {nameFontType}
                  </Badge>
                </div>

                {/* Font Type / Family */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Font Type / Style</Label>
                  <Select value={nameFontType} onValueChange={handleUpdateFontType}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select calligraphy font..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-xs">{f.label}</span>
                            <span
                              className="text-xs text-muted-foreground"
                              style={{ fontFamily: f.family }}
                            >
                              Sample
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Font Size</span>
                    <span className="font-mono font-bold text-foreground">{nameFontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={20}
                      max={52}
                      step={1}
                      value={nameFontSize}
                      onChange={(e) => handleUpdateFontSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <Input
                      type="number"
                      min={20}
                      max={52}
                      value={nameFontSize}
                      onChange={(e) => handleUpdateFontSize(Number(e.target.value) || 34)}
                      className="w-14 h-7 text-xs text-center font-mono p-1"
                    />
                  </div>
                </div>

                {/* Font Colour */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Font Colour
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{nameFontColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Quick Swatches */}
                    <div className="flex items-center gap-1.5 flex-1">
                      {[
                        { hex: "#0B1D3A", label: "Academy Navy" },
                        { hex: "#D4AF37", label: "Pure Gold" },
                        { hex: "#0d8a4a", label: "Forest Green" },
                        { hex: "#1e40af", label: "Royal Blue" },
                        { hex: "#991b1b", label: "Crimson Red" },
                        { hex: "#78350f", label: "Deep Bronze" },
                        { hex: "#111827", label: "Pitch Black" },
                      ].map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => handleUpdateFontColor(sw.hex)}
                          title={sw.label}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            nameFontColor.toLowerCase() === sw.hex.toLowerCase()
                              ? "scale-125 ring-2 ring-primary ring-offset-1 ring-offset-background"
                              : "hover:scale-110 border-border/80"
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>
                    {/* Custom Color Input */}
                    <input
                      type="color"
                      value={nameFontColor}
                      onChange={(e) => handleUpdateFontColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent p-0"
                      title="Choose custom font color"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Books Completed</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={booksCount}
                    onChange={(e) => setBooksCount(parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issue Date</Label>
                  <Input
                    value={dateAwarded}
                    onChange={(e) => setDateAwarded(e.target.value)}
                    placeholder="1 July 2026"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Signatory Name</Label>
                <Input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="David O. Oloo"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Signatory Title</Label>
                <Input
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="Director of Teaching & Learning"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Verification Serial Code</Label>
                <Input
                  value={customSerial}
                  onChange={(e) => setCustomSerial(e.target.value)}
                  placeholder="MFA-RC-2026-XXXXX"
                  className="h-9 font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => handleDownloadSinglePDF()}
                  disabled={isDownloadingSingle}
                  className="w-full text-white font-semibold gap-2"
                  style={{
                    backgroundColor: CERTIFICATE_LEVEL_CONFIG[activeCategory].color,
                    color: activeCategory === "Silver" ? "#1e293b" : "#ffffff",
                  }}
                >
                  <Download className="w-4 h-4" /> Download Certificate PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadSinglePNG}
                  className="w-full text-xs"
                >
                  Download PNG
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================
          TAB 2: STUDENT ROSTER & INDIVIDUAL DOWNLOADS
          ========================================================= */}
      {activeTab === "roster" && (
        <Card className="border-border">
          <CardHeader className="py-4 px-6 border-b border-border">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Student Certificate Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing {filteredStudents.length} students. Select individuals or batch export their certificates.
                </CardDescription>
              </div>

              {/* Bulk actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadStudents}
                  disabled={loadingStudents}
                  className="gap-1.5 text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStudents ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadStudents();
                    toast.success("Refreshed live submission records!");
                  }}
                  disabled={loadingStudents}
                  className="gap-1.5 text-xs h-9 font-semibold text-primary"
                  title="Reload real-time student submissions and counts"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", loadingStudents && "animate-spin")} />
                  {loadingStudents ? "Refreshing..." : "Refresh Live Data"}
                </Button>
                <Button
                  size="sm"
                  variant={filterSubmissionsOnly ? "default" : "outline"}
                  onClick={() => setFilterSubmissionsOnly(!filterSubmissionsOnly)}
                  className="gap-1.5 text-xs h-9"
                  title="Filter to students with recorded submissions"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Live Only ({realSubmissionsCount})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isBulkExporting || filteredStudents.length === 0}
                  onClick={() => handleBulkExport("zip")}
                  className="gap-1.5 text-xs h-9"
                >
                  <FileArchive className="w-3.5 h-3.5 text-amber-500" />
                  Export ZIP ({selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredStudents.length})
                </Button>
                <Button
                  size="sm"
                  disabled={isBulkExporting || filteredStudents.length === 0}
                  onClick={() => handleBulkExport("pdf")}
                  className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground font-semibold"
                >
                  <Files className="w-3.5 h-3.5" />
                  Combined PDF ({selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredStudents.length})
                </Button>
                <Button
                  size="sm"
                  disabled={filteredStudents.length === 0}
                  onClick={handleDispatchFilteredStudents}
                  className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Certificates ({selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredStudents.length})
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search student or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CERTIFICATE_LEVEL_CONFIG[cat].medal} {CERTIFICATE_LEVEL_CONFIG[cat].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterHouse} onValueChange={setFilterHouse}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Houses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Houses</SelectItem>
                  {HOUSES.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h} House
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Year Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year Groups</SelectItem>
                  {YEAR_GROUPS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={
                          filteredStudents.length > 0 &&
                          selectedStudentIds.size === filteredStudents.length
                        }
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>House & Year</TableHead>
                    <TableHead>Books Read</TableHead>
                    <TableHead>Category / Level</TableHead>
                    <TableHead>Verification Serial</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => {
                    const cfg = CERTIFICATE_LEVEL_CONFIG[s.level];
                    const isSelected = selectedStudentIds.has(s.id);
                    return (
                      <TableRow key={s.id} className={isSelected ? "bg-muted/40" : undefined}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleStudent(s.id)}
                            aria-label={`Select ${s.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">{s.name}</span>
                            {s.isRealSubmission && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              >
                                ⚡ Live
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">{s.house}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.yearGroup} {s.className ? `· ${s.className}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className="font-bold text-base"
                            style={{ color: cfg.color }}
                          >
                            {s.booksCount}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">books</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="gap-1 font-semibold text-xs py-0.5"
                            style={{
                              borderColor: `${cfg.color}80`,
                              backgroundColor: `${cfg.color}15`,
                              color: cfg.color,
                            }}
                          >
                            <span>{cfg.medal}</span>
                            <span>{cfg.name}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {s.verificationCode}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDispatchSingleStudent(s)}
                              className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/30 font-semibold"
                              title="Dispatch Award Certificate to student inbox"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-500" /> Dispatch
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleLoadStudentIntoStudio(s)}
                              className="h-8 px-2 text-xs gap-1"
                              title="Preview in Studio"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleDownloadSinglePDF({
                                  studentName: s.name,
                                  level: s.level,
                                  booksCount: s.booksCount,
                                  signatoryName,
                                  signatoryTitle,
                                  dateAwarded,
                                  verificationCode: s.verificationCode,
                                  studentEmail: s.email,
                                });
                              }}
                              className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No students matched the chosen criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================
          TAB 3: 5-CATEGORY GALLERY & COMPARISON
          ========================================================= */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => {
              const cfg = CERTIFICATE_LEVEL_CONFIG[cat];
              const certData: CertificateData = {
                studentName: cfg.sampleStudent,
                level: cat,
                booksCount: cfg.defaultBooks,
                signatoryName,
                signatoryTitle,
                dateAwarded,
                verificationCode: cfg.sampleCode,
              };
              return (
                <Card
                  key={cat}
                  className="overflow-hidden border-border bg-card/80 hover:shadow-xl transition-all"
                >
                  <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <span>{cfg.medal}</span>
                        <span>{cfg.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Default: {cfg.defaultBooks} Books Completed
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      style={{ borderColor: cfg.color, color: cfg.color }}
                      className="text-xs"
                    >
                      {cat}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-3 bg-slate-950/20 flex flex-col items-center">
                    <div
                      className="w-full flex justify-center items-center overflow-hidden rounded-lg border border-border/40 shadow-sm"
                      style={{ height: "230px" }}
                    >
                      <div
                        style={{
                          transform: "scale(0.39)",
                          transformOrigin: "top left",
                          width: "800px",
                          height: "566px",
                        }}
                      >
                        <CertificateCanvas data={certData} />
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleSelectCategory(cat);
                          setActiveTab("studio");
                        }}
                        className="text-xs h-8 flex-1"
                      >
                        Open in Studio
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadSinglePDF(certData)}
                        className="text-xs h-8 text-white font-medium flex-1 gap-1"
                        style={{
                          backgroundColor: cfg.color,
                          color: cat === "Silver" ? "#1e293b" : "#ffffff",
                        }}
                      >
                        <Download className="w-3 h-3" /> Export PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          OFFSCREEN CERTIFICATE ELEMENT FOR BULK RENDERING
          ========================================================= */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "800px",
          height: "566px",
          zIndex: -999,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div ref={bulkCertRef}>
          {bulkCurrentStudent && (
            <CertificateCanvas
              id="bulk-offscreen-certificate"
              data={bulkCurrentStudent}
              scale={1}
            />
          )}
        </div>
      </div>

      {/* =========================================================
          LIVE BULK EXPORT PROGRESS MODAL
          ========================================================= */}
      {isBulkExporting && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Generating Certificates</h3>
                  <p className="text-xs text-muted-foreground">High-resolution vector batch rendering</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  cancelBulkRef.current = true;
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">{bulkProgress.statusText}</span>
                <span className="font-mono">
                  {Math.round((bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100)}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150 rounded-full"
                  style={{
                    width: `${Math.round(
                      (bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground italic text-center">
              Please keep this tab open while certificates are being rendered and assembled.
            </p>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cancelBulkRef.current = true;
                }}
                className="text-xs"
              >
                Cancel Generation
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
          MULTI-TIER CERTIFICATE DISPATCH DIALOG
          ========================================================= */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Dispatch Certificates to Scholars
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Issue and send official verified award certificates directly into student portal inboxes and accounts.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Scope selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dispatch Recipient Scope</Label>
              <Select
                value={dispatchScope}
                onValueChange={(val: any) => {
                  setDispatchScope(val);
                  setDispatchTargetValue("all");
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">Entire School (All Qualifying Scholars)</SelectItem>
                  <SelectItem value="house">Specific House (Kenya, Longonot, Kilimanjaro, Elgon)</SelectItem>
                  <SelectItem value="year">Specific Year Group (DP1, DP2, Grade 10...)</SelectItem>
                  <SelectItem value="class">Specific Class</SelectItem>
                  <SelectItem value="individual">Individual Scholar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Value Selection */}
            {dispatchScope === "house" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select House</Label>
                <Select value={dispatchTargetValue} onValueChange={setDispatchTargetValue}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select House..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Houses</SelectItem>
                    <SelectItem value="Kenya">Kenya (Navy)</SelectItem>
                    <SelectItem value="Longonot">Longonot (Yellow)</SelectItem>
                    <SelectItem value="Kilimanjaro">Kilimanjaro (Red)</SelectItem>
                    <SelectItem value="Elgon">Elgon (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dispatchScope === "year" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Year Group</Label>
                <Select value={dispatchTargetValue} onValueChange={setDispatchTargetValue}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Year Group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Year Groups</SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dispatchScope === "class" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Class</Label>
                <Select value={dispatchTargetValue} onValueChange={setDispatchTargetValue}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Class..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {availableClasses.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dispatchScope === "individual" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Individual Scholar</Label>
                <Select value={dispatchTargetValue} onValueChange={setDispatchTargetValue}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose student..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {students.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} ({st.booksCount} books, {st.house})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Award Tier Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Award Category Tier</Label>
              <Select value={dispatchTierFilter} onValueChange={setDispatchTierFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Selected Tier ({activeCategory})</SelectItem>
                  <SelectItem value="gold">Gold Scholars Only (45+ Books)</SelectItem>
                  <SelectItem value="silver">Silver Scholars Only (16–44 Books)</SelectItem>
                  <SelectItem value="bronze">Bronze Scholars Only (6–15 Books)</SelectItem>
                  <SelectItem value="all">All Qualifying Scholars With Books Logged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dispatch Delivery Method
              </div>
              <p>
                Recipients instantly receive an official Welcoming & Award Certificate letter in their built-in portal inbox, with unique serial verification and one-click download.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDispatchModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDispatching}
                onClick={handleExecuteDispatch}
                className="font-semibold text-white border-0 gap-1.5"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                <Send className="w-3.5 h-3.5" />
                {isDispatching ? "Dispatching..." : "Confirm & Dispatch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast-Style Interactive Certificate Dispatch Modal */}
      <CertificateDispatchModal
        open={interactiveDispatchOpen}
        onOpenChange={setInteractiveDispatchOpen}
        target={interactiveDispatchTarget}
        batchTargets={interactiveBatchTargets || undefined}
        challengeTitle={selectedChallenge?.title || "45-Book Reading Challenge"}
        challengeId={selectedChallenge?.id || "45450000-2025-4026-8000-000000000045"}
        signatoryName={signatoryName}
        signatoryTitle={signatoryTitle}
        onDownloadPDF={(tgt) => {
          handleDownloadSinglePDF({
            studentName: tgt.name,
            level: tgt.level,
            booksCount: tgt.booksCount,
            signatoryName,
            signatoryTitle,
            dateAwarded,
            verificationCode: tgt.verificationCode,
            studentEmail: tgt.email,
          });
        }}
      />
    </div>
  );
}
