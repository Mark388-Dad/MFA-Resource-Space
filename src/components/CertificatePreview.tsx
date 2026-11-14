import React, { useRef, useState } from "react";
import {
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Award,
  Loader2,
  QrCode,
  Sparkles,
  LayoutTemplate,
  Scroll,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateAndDownloadCertificatePDF } from "@/lib/certificatePdfService";
import { exportCertificatePDF } from "@/lib/pdfExporter";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { CertificateLevel, CERTIFICATE_LEVEL_CONFIG } from "@/lib/certificateTypes";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export interface CertificatePreviewProps {
  studentName?: string;
  studentEmail?: string;
  house?: string;
  yearGroup?: string;
  level?: string;
  booksCount?: number;
  challengeTitle?: string;
  verificationCode?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  dateAwarded?: string;
  className?: string;
  showDownloadButton?: boolean;
  onDownloadPdf?: () => void;
  defaultViewMode?: "centre" | "parchment";
}

/**
 * Premium CertificatePreview component:
 * 1. Multi-stop metallic gold-gradient border.
 * 2. Refined signature area (calligraphic signatures, gold-foil embossed wax seal, academic titles, verification QR thumbnail & serial hash).
 * 3. Decorative watermark emblem (centered M-PESA Foundation Academy crest/shield watermark at subtle opacity).
 * 4. Displays the authentic real certificate from the Certificate Centre with a fluid layout switch.
 */
export const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  studentName = "Tonny Odundo",
  studentEmail = "tonny.odundo@mpesafoundationacademy.ac.ke",
  house = "Kenya House",
  yearGroup = "DP1",
  level = "Beginner",
  booksCount = 3,
  challengeTitle = "45-Book Reading Challenge 2025/2026: Beyond the Pages",
  verificationCode = "MFA-CERT-KEN-8870",
  signatoryName = "David O. Oloo",
  signatoryTitle = "Director of Teaching & Learning",
  dateAwarded = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  className = "",
  showDownloadButton = true,
  onDownloadPdf,
  defaultViewMode = "centre",
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"centre" | "parchment">(defaultViewMode);
  const [isDownloading, setIsDownloading] = useState(false);

  // Normalize level
  const cleanLevel = (level || "Beginner").trim();
  const normalizedLevelKey: CertificateLevel =
    cleanLevel.toLowerCase() === "gold"
      ? "Gold"
      : cleanLevel.toLowerCase() === "silver"
      ? "Silver"
      : cleanLevel.toLowerCase() === "bronze"
      ? "Bronze"
      : "Beginner";

  const medalEmoji =
    normalizedLevelKey === "Gold"
      ? "🥇"
      : normalizedLevelKey === "Silver"
      ? "🥈"
      : normalizedLevelKey === "Bronze"
      ? "🥉"
      : "🏅";

  const houseLabel = house.toLowerCase().endsWith("house") ? house : `${house} House`;

  // Verification URL for deep linking
  const verificationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify-certificate/${verificationCode}`
      : `https://mfareadingchallenge.netlify.app/verify-certificate/${verificationCode}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&color=0b132b&data=${encodeURIComponent(
    verificationUrl
  )}`;

  /**
   * Print-to-PDF functionality specifically isolating this certificate.
   */
  const handlePrintToPDF = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }

    if (typeof window !== "undefined") {
      const certEl = certificateRef.current;
      if (certEl) {
        certEl.classList.add("print-target-active");
      }

      window.print();

      if (certEl) {
        setTimeout(() => {
          certEl.classList.remove("print-target-active");
        }, 1000);
      }
    }
  };

  /**
   * Direct high-resolution clean A4 landscape PDF download using exportCertificatePDF.
   */
  const handleDirectDownloadPDF = async () => {
    setIsDownloading(true);
    toast.info("Generating and downloading clean A4 PDF certificate...");
    try {
      const targetElement =
        (document.querySelector(".certificate-root") as HTMLElement) ||
        document.getElementById("official-certificate-printable") ||
        certificateRef.current;

      const success = await exportCertificatePDF(targetElement, {
        studentName,
        level: normalizedLevelKey,
        onSuccess: () => {
          toast.success("Official high-resolution PDF certificate downloaded successfully!");
        },
        onError: () => {
          toast.error("Opening print dialog for official certificate.");
          handlePrintToPDF();
        },
      });

      if (!success) {
        handlePrintToPDF();
      }
    } catch (err: unknown) {
      console.warn("Direct PDF generation fallback to print:", err);
      toast.error("Opening print dialog for official certificate.");
      handlePrintToPDF();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-4 select-none", className)}>
      {/* Print isolation styles: Ensures window.print() prints the isolated certificate */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-certificate-printable,
          #official-certificate-printable * {
            visibility: visible !important;
          }
          #official-certificate-printable {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 1000px !important;
            max-width: 100vw !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            z-index: 999999 !important;
            box-shadow: none !important;
          }
          .certificate-action-bar,
          .certificate-mode-selector,
          .recipient-meta-ribbon {
            display: none !important;
          }
        }
      `}</style>

      {/* Recipient Meta Ribbon with Serial & Mode Selector */}
      <div className="recipient-meta-ribbon p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base tracking-wide uppercase text-white font-sans">
              {studentName}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-amber-500/40 text-amber-300 bg-amber-500/10 flex items-center gap-1"
            >
              <span>{medalEmoji}</span>
              <span>{normalizedLevelKey} Tier</span>
            </Badge>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Verified Official
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap font-sans">
            {studentEmail && <span className="font-mono text-slate-300">{studentEmail}</span>}
            {studentEmail && (house || yearGroup) && <span>&bull;</span>}
            {house && <span className="text-amber-200/80">{houseLabel}</span>}
            {house && yearGroup && <span>&bull;</span>}
            {yearGroup && <span className="font-semibold text-slate-300">{yearGroup}</span>}
            <span>&bull;</span>
            <span>{booksCount} Books Read</span>
          </p>
        </div>

        {/* View Switcher & Serial Hash */}
        <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {/* Official Studio Certificate Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Studio Authentic Certificate</span>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              Serial Hash
            </div>
            <Link
              to={`/verify-certificate/${verificationCode}`}
              className="text-xs sm:text-sm font-mono font-bold text-amber-400 hover:text-amber-300 tracking-wider flex items-center gap-1 justify-end underline decoration-amber-500/40 hover:decoration-amber-300"
              title="Click to verify this certificate credential"
            >
              <span>{verificationCode}</span>
              <ExternalLink className="w-3 h-3 text-amber-400/70" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Certificate Container (Clean official certificate display, outer gold border reserved for email preview) */}
      <div className="print-certificate-container w-full">
        <div
          id="official-certificate-printable"
          ref={certificateRef}
          className="relative rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800"
        >
          {/* Inner Content Wrapper */}
          <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-950 overflow-hidden">
            {/* Authentic Real Certificate from Certificate Centre */}
            <div className="relative w-full bg-white text-slate-900 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
              {/* Decorative Subtle Watermark Emblem behind canvas */}
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                aria-hidden="true"
              >
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 opacity-[0.05] rounded-full flex items-center justify-center">
                  <img
                    src="/school-badge.png"
                    alt=""
                    className="w-full h-full object-contain filter grayscale"
                  />
                </div>
              </div>

              {/* Scaled Responsive Container for the 800x566 CertificateCanvas */}
              <div className="w-full overflow-x-auto flex justify-center py-1">
                <div className="transform scale-[0.42] xs:scale-[0.52] sm:scale-[0.72] md:scale-[0.88] lg:scale-[1.0] origin-top transition-transform duration-300">
                  <CertificateCanvas
                    data={{
                      studentName,
                      level: normalizedLevelKey,
                      booksCount,
                      signatoryName,
                      signatoryTitle,
                      dateAwarded,
                      verificationCode,
                      studentEmail,
                      challengeName: challengeTitle,
                    }}
                    scale={1}
                    className="shadow-lg border border-slate-200/60 print:shadow-none print:border-none"
                  />
                </div>
              </div>

              {/* Floating Bottom Verification & Accent Ribbon */}
              <div className="w-full mt-2 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 px-2 z-10 bg-slate-50/90 rounded-xl">
                <div className="flex items-center gap-2">
                  <img
                    src="/school-badge.png"
                    alt="Academy Shield"
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-semibold text-slate-800">
                    M-Pesa Foundation Academy &middot; Academic Literacy Directorate
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-500">Official Authenticity Hash:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {verificationCode}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar with Download PDF Button Triggering window.print() or direct PDF */}
      {showDownloadButton && (
        <div className="certificate-action-bar flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-sans">
              High-resolution vector parchment ready for export, PDF archival &amp; frameable print.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Link to={`/verify-certificate/${verificationCode}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-500" />
                <span>Verify Credential</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintToPDF}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isDownloading}
              onClick={handleDirectDownloadPDF}
              className="h-9 px-4 text-xs font-bold gap-2 text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:to-amber-500 shadow-sm border border-amber-500/50 transition-all active:scale-[0.98]"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                  <span>Downloading PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Download Official PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatePreview;
