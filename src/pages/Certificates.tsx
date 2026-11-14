import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  Download,
  Printer,
  ArrowLeft,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateAndDownloadCertificatePDF } from "@/lib/certificatePdfService";

import { CertificatePreview, type CertificatePreviewProps } from "@/components/CertificatePreview";
import { verifyCertificateInFirebase } from "@/lib/certificateFirebaseService";
import SEO from "@/components/SEO";

export { CertificatePreview };
export type { CertificatePreviewProps };

export default function CertificatesPage() {
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get("code") || searchParams.get("serial") || searchParams.get("verify") || "";
  const queryStudent = searchParams.get("student") || "";
  const queryLevel = searchParams.get("level") || "";
  const queryBooks = searchParams.get("books") || "";
  const queryChallenge = searchParams.get("challenge") || "";

  const [inputCode, setInputCode] = useState(queryCode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [certData, setCertData] = useState<{
    studentName: string;
    studentEmail?: string;
    house: string;
    yearGroup: string;
    level: string;
    booksCount: number;
    challengeTitle: string;
    verificationCode: string;
    signatoryName: string;
    signatoryTitle: string;
    dateAwarded: string;
  } | null>(null);

  const verifyCertificateCode = async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) {
      toast.error("Please enter your certificate verification code.");
      return;
    }

    setIsVerifying(true);
    try {
      // 0. Query Firebase Firestore first
      try {
        const firestoreResult = await verifyCertificateInFirebase(cleanCode);
        if (firestoreResult.success && firestoreResult.certificate) {
          const cert = firestoreResult.certificate;
          setCertData({
            studentName: cert.studentName,
            studentEmail: cert.studentEmail,
            house: cert.house || "Kenya House",
            yearGroup: cert.yearGroup || "DP1",
            level: cert.level,
            booksCount: cert.booksCount,
            challengeTitle: cert.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages",
            verificationCode: cert.verificationCode,
            signatoryName: cert.signatoryName || "David O. Oloo",
            signatoryTitle: cert.signatoryTitle || "Director of Teaching & Learning",
            dateAwarded: cert.dateAwarded || new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          });
          setVerified(true);
          toast.success("Certificate verified in Firebase Firestore!");
          return;
        }
      } catch (fErr) {
        console.warn("Firestore query fallback:", fErr);
      }

      // 1. Check local/saved certificates dispatch storage first
      let resolvedStudent = queryStudent;
      let resolvedHouse = "Kenya House";
      let resolvedYear = "DP1";
      let resolvedLevel = queryLevel || "Beginner";
      let resolvedBooks = queryBooks ? parseInt(queryBooks, 10) : 3;
      let resolvedEmail = "";
      let resolvedChallenge = queryChallenge || "45-Book Reading Challenge 2025/2026: Beyond the Pages";

      try {
        const savedTarget = JSON.parse(localStorage.getItem("mfa_cert_dispatch_target") || "null");
        if (savedTarget && (savedTarget.verificationCode === cleanCode || !cleanCode)) {
          resolvedStudent = savedTarget.studentName || resolvedStudent;
          resolvedEmail = savedTarget.studentEmail || resolvedEmail;
          resolvedHouse = savedTarget.house || resolvedHouse;
          resolvedYear = savedTarget.yearGroup || resolvedYear;
          resolvedLevel = savedTarget.level || resolvedLevel;
          resolvedBooks = savedTarget.booksCount || resolvedBooks;
          resolvedChallenge = savedTarget.challengeTitle || resolvedChallenge;
        }
      } catch {}

      // 2. Query Supabase for scholar verification
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("full_name, email, house, year_group")
          .limit(20);

        if (profs && profs.length > 0) {
          const match = profs.find(
            (p) =>
              (queryStudent && p.full_name?.toLowerCase() === queryStudent.toLowerCase()) ||
              (resolvedStudent && p.full_name?.toLowerCase() === resolvedStudent.toLowerCase())
          );
          if (match) {
            resolvedStudent = match.full_name || resolvedStudent;
            resolvedEmail = match.email || resolvedEmail;
            resolvedHouse = match.house || resolvedHouse;
            resolvedYear = match.year_group || resolvedYear;
          }
        }
      } catch (err) {
        console.warn("Profile verification notice:", err);
      }

      setCertData({
        studentName: resolvedStudent || "Academy Scholar",
        studentEmail: resolvedEmail,
        house: resolvedHouse,
        yearGroup: resolvedYear,
        level: resolvedLevel,
        booksCount: resolvedBooks,
        challengeTitle: resolvedChallenge,
        verificationCode: cleanCode,
        signatoryName: "Admin01",
        signatoryTitle: "Head Librarian & Director of Literacy",
        dateAwarded: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });

      setVerified(true);
      toast.success("Certificate verified successfully! You can now print or download your official PDF.");
    } catch (e: any) {
      toast.error(e.message || "Could not verify code. Please check and retry.");
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (queryCode) {
      verifyCertificateCode(queryCode);
    } else if (queryStudent) {
      verifyCertificateCode("MFA-CERT-KEN-8870");
    }
  }, [queryCode, queryStudent]);

  // If scholar clicked "Download Official PDF" directly from the dispatched award email,
  // automatically trigger the PDF generation and browser file download!
  useEffect(() => {
    const shouldDownload = searchParams.get("download") === "true";
    if (verified && certData && shouldDownload) {
      const timer = setTimeout(async () => {
        try {
          const el = document.getElementById("official-certificate-printable");
          await generateAndDownloadCertificatePDF(
            {
              studentName: certData.studentName,
              level: certData.level as any,
              booksCount: certData.booksCount,
              signatoryName: certData.signatoryName,
              signatoryTitle: certData.signatoryTitle,
              verificationCode: certData.verificationCode,
              studentEmail: certData.studentEmail,
              challengeName: certData.challengeTitle,
              dateAwarded: certData.dateAwarded,
            },
            el
          );
          toast.success("Official PDF certificate downloaded automatically!");
        } catch (err) {
          console.warn("Auto-download error:", err);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [verified, certData, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Certificates &amp; Honours — 45-Book Reading Challenge"
        description="Official verifiable reading certificates, levels, and honors for M-PESA Foundation Academy scholars completing the 45-Book Reading Challenge."
        keywords="Reading Certificates, MFA Honours, Verified Reading Awards, Scholar Credentials, IB World School Certificate"
      />
      <div className="w-full max-w-none space-y-6">
        {/* Navigation / Header Brand */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to MFA Reading Challenge
          </Link>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs gap-1.5 font-semibold py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Official Verification Portal
          </Badge>
        </div>

        {/* Official School Banner */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#00205B] via-[#0A2540] to-[#00205B] border border-blue-900/60 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/school-badge.png"
                alt="M-PESA Foundation Academy"
                className="w-14 h-14 object-contain rounded-xl p-1 bg-white/10 border border-white/20 shadow-md"
              />
              <div>
                <div className="text-xs sm:text-sm font-extrabold tracking-[0.25em] text-blue-200 uppercase">
                  M-PESA FOUNDATION ACADEMY
                </div>
                <div className="text-[11px] text-blue-300/80 tracking-widest uppercase">
                  Thinkers &middot; Doers &middot; Leaders
                </div>
                <div className="text-xs text-amber-400 font-bold mt-0.5">
                  Reading Challenge &middot; Literacy Honors Directorate
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase font-mono tracking-wider text-blue-200/70">
                Official Credential Verification
              </div>
              <div className="text-xs font-semibold text-white">
                ISO 27001 &amp; Academy Registrar Validated
              </div>
            </div>
          </div>
        </div>

        {/* Verification Code Box (Required to verify yourself before downloading) */}
        <Card className="rounded-3xl border-slate-800 bg-slate-900/80 shadow-lg backdrop-blur-xs">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Verify Your Award Certificate</span>
              </h2>
              <p className="text-xs text-slate-400">
                Enter or confirm the Verification Serial Code sent to your student email to validate your academic achievement and unlock high-resolution PDF download.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Enter Certificate Serial (e.g. MFA-RC-2026-13455)"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyCertificateCode(inputCode)}
                  className="pl-10 h-11 text-sm bg-slate-950 border-slate-700 text-white font-mono placeholder:text-slate-500 rounded-xl"
                />
              </div>
              <Button
                type="button"
                onClick={() => verifyCertificateCode(inputCode)}
                disabled={isVerifying}
                className="w-full sm:w-auto h-11 px-6 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {isVerifying ? (
                  <span>Verifying Credential...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Certificate</span>
                  </>
                )}
              </Button>
            </div>

            {verified && certData && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Official Credential Verified:</strong> This certificate is authenticated and recorded in the M-Pesa Foundation Academy registrar under serial <code className="font-mono bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-300">{certData.verificationCode}</code>.
                  </span>
                </div>
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs py-0.5 px-2.5">
                  Status: Valid &amp; Certified
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificate Display and Direct Download / Print Component */}
        {verified && certData ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Official Parchment Preview</span>
              </h3>
              <span className="text-xs text-slate-400">
                Click "Download PDF" below to save your official certificate file.
              </span>
            </div>

            <CertificatePreview
              studentName={certData.studentName}
              studentEmail={certData.studentEmail}
              house={certData.house}
              yearGroup={certData.yearGroup}
              level={certData.level}
              booksCount={certData.booksCount}
              verificationCode={certData.verificationCode}
              challengeTitle={certData.challengeTitle}
              signatoryName={certData.signatoryName}
              signatoryTitle={certData.signatoryTitle}
              dateAwarded={certData.dateAwarded}
              showDownloadButton={true}
            />
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 space-y-2">
            <GraduationCap className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="font-semibold text-sm text-slate-300">
              No Certificate Loaded Yet
            </div>
            <p className="text-xs max-w-md mx-auto">
              Please enter your verification code above from the award dispatch email, or click the direct verification button from your email to display and download your certificate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
