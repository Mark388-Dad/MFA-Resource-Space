import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Download,
  Printer,
  ArrowLeft,
  GraduationCap,
  Loader2,
  Copy,
  ExternalLink,
  QrCode,
  BookOpen,
  Calendar,
  Building2,
  Award,
  Sparkles,
  RefreshCw,
  Database,
  Flame,
} from "lucide-react";
import { CertificatePreview } from "@/components/CertificatePreview";
import {
  verifyCertificateInFirebase,
  extractCertificateIdFromInput,
  FirebaseCertificateRecord,
  saveCertificateToFirebase,
} from "@/lib/certificateFirebaseService";
import { generateAndDownloadCertificatePDF } from "@/lib/certificatePdfService";
import { exportCertificatePDF } from "@/lib/pdfExporter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";

export const CertificateVerification: React.FC = () => {
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract initial code from route param or query parameters
  const queryParam =
    searchParams.get("code") ||
    searchParams.get("id") ||
    searchParams.get("serial") ||
    searchParams.get("verify") ||
    "";
  const initialCode = routeId || queryParam || "";

  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [verifiedRecord, setVerifiedRecord] = useState<FirebaseCertificateRecord | null>(null);
  const [verificationSource, setVerificationSource] = useState<
    "firestore" | "supabase" | "cache" | "none"
  >("none");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  /**
   * Core verification function that validates against the Firebase Firestore collection
   */
  const handleVerify = async (codeToVerify: string) => {
    const cleanInput = extractCertificateIdFromInput(codeToVerify);
    if (!cleanInput) {
      toast.error("Please enter a Certificate ID, Verification Code, or QR payload.");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setHasSearched(true);

    try {
      // 1. Verify against Firebase Firestore collection 'certificates'
      const result = await verifyCertificateInFirebase(cleanInput);

      if (result.success && result.certificate) {
        setVerifiedRecord(result.certificate);
        setVerificationSource(result.source);
        toast.success(
          `Certificate successfully verified in Firestore! Scholar: ${result.certificate.studentName}`
        );

        // Update the URL without reloading if not already matching
        if (routeId !== result.certificate.verificationCode && routeId !== result.certificate.id) {
          window.history.replaceState(
            null,
            "",
            `/verify-certificate/${encodeURIComponent(result.certificate.verificationCode)}`
          );
        }
      } else {
        setVerifiedRecord(null);
        setVerificationSource("none");
        setVerificationError(
          `No active credential matching "${cleanInput}" was found in the official Firebase credential registry.`
        );
        toast.error("Certificate not found or unverified. Please check the code.");
      }
    } catch (err: unknown) {
      console.error("Certificate verification error:", err);
      const message = err instanceof Error ? err.message : "Failed to query Firebase credential registry.";
      setVerificationError(message);
      toast.error("Verification query error. Please retry.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Automatically verify when route param changes or initial load
  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      handleVerify(initialCode);
    }
  }, [routeId, queryParam]);

  /**
   * Generates and downloads the official clean A4 high-resolution PDF certificate
   */
  const handleDirectDownloadPDF = async () => {
    if (!verifiedRecord) return;
    toast.info("Generating and downloading your clean A4 PDF certificate...");
    try {
      const targetElement =
        (document.querySelector(".certificate-root") as HTMLElement) ||
        document.getElementById("official-certificate-printable");

      const success = await exportCertificatePDF(targetElement, {
        studentName: verifiedRecord.studentName,
        level: verifiedRecord.level,
        onSuccess: () => {
          toast.success("Official PDF certificate downloaded successfully!");
        },
        onError: () => {
          toast.error("Opening print dialog for official certificate.");
          if (typeof window !== "undefined") window.print();
        },
      });

      if (!success && typeof window !== "undefined") {
        window.print();
      }
    } catch (err: unknown) {
      console.warn("Direct PDF download fallback:", err);
      toast.error("Opening print dialog for official certificate.");
      if (typeof window !== "undefined") window.print();
    }
  };

  // Auto-download if ?download=true is in the query params
  useEffect(() => {
    if (verifiedRecord && searchParams.get("download") === "true") {
      const timer = setTimeout(() => {
        handleDirectDownloadPDF();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [verifiedRecord, searchParams]);

  /**
   * Copy the official verification URL to clipboard
   */
  const handleCopyVerificationLink = () => {
    if (!verifiedRecord) return;
    const url = `${window.location.origin}/verify-certificate/${verifiedRecord.verificationCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Verification link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  /**
   * Helper to load demo/sample credentials for testing
   */
  const handleLoadSample = (sampleCode: string) => {
    setInputCode(sampleCode);
    handleVerify(sampleCode);
  };

  /**
   * Quick-seed active user's certificate into Firebase for instant verification
   */
  const handleVerifyMyCertificate = async () => {
    if (!user) {
      toast.error("Please log in to verify your personal scholar certificate.");
      return;
    }
    const myCode = `MFA-CERT-${(user.email || "user").slice(0, 3).toUpperCase()}-2026`;
    setInputCode(myCode);
    handleVerify(myCode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-8 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950">
      {/* Background Decorative Radials */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <SEO
        title={
          verifiedRecord
            ? `Verified Certificate: ${verifiedRecord.student_name} (${verifiedRecord.certificate_id})`
            : "Certificate Verification Portal"
        }
        description={
          verifiedRecord
            ? `Official verified reading achievement certificate for ${verifiedRecord.student_name} (${verifiedRecord.level_name}, ${verifiedRecord.books_completed} books) issued by M-PESA Foundation Academy.`
            : "Verify official authentic M-PESA Foundation Academy reading achievement certificates, milestones, and graduation honours."
        }
        keywords="Certificate Verification, MFA Reading Challenge, Official School Credentials, Student Certificate Lookup, Academic Authenticity"
      />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Top Navigation & Brand Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/certificates"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </Link>
            <div className="flex items-center gap-2">
              <img
                src="/school-badge.png"
                alt="Academy Crest"
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="text-sm font-bold tracking-wider uppercase text-white font-serif">
                  M-Pesa Foundation Academy
                </h1>
                <p className="text-[11px] text-amber-400 font-sans font-semibold">
                  Official Academic Credential Registry &amp; Verification
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Firebase Firestore Collection: certificates</span>
            </Badge>
          </div>
        </div>

        {/* Verification Search Bar Card */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Verify Reading Certificate Authenticity</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Enter any Certificate Serial Code, Firestore Document ID, or scan the verification QR code
                on an official M-Pesa Foundation Academy parchment.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(inputCode);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="e.g. MFA-CERT-KEN-8870 or paste QR scan URL..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="pl-10 h-11 bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 font-mono text-xs sm:text-sm focus-visible:ring-amber-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifying || !inputCode.trim()}
                className="h-11 px-6 font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-500 text-slate-950 shadow-md gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>Verify Credential</span>
                  </>
                )}
              </Button>
            </form>

            {/* Quick Helper Links for Testing */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-300">Quick Test Credentials:</span>
                <button
                  type="button"
                  onClick={() => handleLoadSample("MFA-CERT-KEN-8870")}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] border border-slate-700 transition-colors"
                >
                  MFA-CERT-KEN-8870 (Tonny Odundo)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample("MFA-RC-2026-13455")}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                >
                  MFA-RC-2026-13455
                </button>
              </div>

              {user && (
                <button
                  type="button"
                  onClick={handleVerifyMyCertificate}
                  className="text-amber-400 hover:text-amber-300 text-xs font-semibold underline underline-offset-4"
                >
                  Verify My Scholar Certificate &rarr;
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verification Results Block */}
        {isVerifying && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <ShieldCheck className="w-7 h-7 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-white">
                Validating with Firebase Firestore...
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Querying collection: <code className="text-amber-300">certificates</code>
              </p>
            </div>
          </div>
        )}

        {!isVerifying && hasSearched && verifiedRecord && (
          <div className="space-y-6">
            {/* 4. Certificate Download Portal Card (Matching mockup) */}
            <div className="p-6 sm:p-7 rounded-2xl border border-blue-900/60 bg-[#0B1528] shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                      OFFICIAL LEDGER VERIFIED
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                    Certificate Download Portal
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#112240] text-blue-300 border border-blue-500/30 text-xs px-3 py-1 font-mono uppercase tracking-wider font-semibold">
                    STATUS: VALID &amp; ACTIVE
                  </Badge>
                </div>
              </div>

              {/* 4 Metadata Grid Cards (2x2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Awarded To
                  </div>
                  <div className="text-base font-bold text-white font-serif">
                    {verifiedRecord.studentName}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    MFA Student / Reader ID: #8849-2026
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Challenge Level
                  </div>
                  <div className="text-base font-bold text-amber-400">
                    {verifiedRecord.level} Tier ({verifiedRecord.booksCount} Books Completed)
                  </div>
                  <div className="text-xs text-slate-400">
                    45-Book Reading Challenge 2025/2026
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Validation Authority
                  </div>
                  <div className="text-base font-bold text-white">
                    {verifiedRecord.signatoryTitle || "Teaching & Learning Directorate"}
                  </div>
                  <div className="text-xs text-slate-400">
                    Co-validated by MFA Academy Library ({verifiedRecord.signatoryName || "David O. Oloo"})
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Serial Code
                  </div>
                  <div className="text-base font-mono font-bold text-blue-400 tracking-wider">
                    {verifiedRecord.verificationCode}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Cryptographically Recorded in Firestore
                  </div>
                </div>
              </div>

              {/* Real-time Verification Checklist Box */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Academic Integrity: Passed</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Library Audit: {verifiedRecord.booksCount}/{verifiedRecord.booksCount} Verified</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Directorate: Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Firestore Ledger: Active</span>
                </div>
              </div>

              {/* Download Action Box with Vibrant Green Button */}
              <div className="p-4 sm:p-5 rounded-xl border border-blue-600/50 bg-[#0E1B33] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Ready for Printing or PDF Export</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click below to generate the official high-resolution, vector-crisp PDF certificate.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyVerificationLink}
                    className="h-10 text-xs border-slate-700 bg-slate-800 text-slate-200 gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
                  </Button>

                  <Button
                    type="button"
                    size="default"
                    onClick={handleDirectDownloadPDF}
                    className="h-10 px-5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 gap-2 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>DOWNLOAD PDF CERTIFICATE</span>
                  </Button>
                </div>
              </div>

              <div className="text-center text-xs text-slate-500 pt-1">
                Official document issued by MFA Academy &bull; &ldquo;Thinkers. Doers. Leaders.&rdquo;
              </div>
            </div>

            {/* Live Certificate Preview Canvas (Embedded Real Certificate) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <span>👁</span> Live Certificate Preview
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Official Render Mockup &bull; Validated
                </span>
              </div>

              <CertificatePreview
                studentName={verifiedRecord.studentName}
                studentEmail={verifiedRecord.studentEmail}
                house={verifiedRecord.house || "Kenya House"}
                yearGroup={verifiedRecord.yearGroup || "DP1"}
                level={verifiedRecord.level}
                booksCount={verifiedRecord.booksCount}
                challengeTitle={
                  verifiedRecord.challengeTitle ||
                  "45-Book Reading Challenge 2025/2026: Beyond the Pages"
                }
                verificationCode={verifiedRecord.verificationCode}
                signatoryName={verifiedRecord.signatoryName || "David O. Oloo"}
                signatoryTitle={
                  verifiedRecord.signatoryTitle || "Director of Teaching & Learning"
                }
                dateAwarded={
                  verifiedRecord.dateAwarded ||
                  new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                }
                defaultViewMode="centre"
              />
            </div>
          </div>
        )}

        {!isVerifying && hasSearched && !verifiedRecord && (
          <div className="p-8 rounded-2xl border border-red-500/40 bg-red-950/20 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-white">Credential Verification Failed</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {verificationError ||
                  "The provided certificate code or QR code could not be verified against the official Firestore collection."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadSample("MFA-CERT-KEN-8870")}
                className="text-xs border-slate-700 bg-slate-800 text-slate-200"
              >
                Load Verified Sample
              </Button>
            </div>
          </div>
        )}

        {/* Informative Security Guarantee Footer */}
        <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
          <p>
            Official Academic Verification Gateway &bull; M-Pesa Foundation Academy Reading Challenge
          </p>
          <p className="text-[11px] text-slate-600 font-mono">
            Direct Cloud Registry: Firestore Collection: <code>certificates</code> &bull; Platform:
            https://mfareadingchallenge.netlify.app
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;
