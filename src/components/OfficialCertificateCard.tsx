import React, { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Download, Printer } from "lucide-react";
import { CertificateCanvas } from "@/components/CertificateCanvas";
import { CertificateLevel, CERTIFICATE_LEVEL_CONFIG } from "@/lib/certificateTypes";
import { exportCertificatePDF } from "@/lib/pdfExporter";
import { cn } from "@/lib/utils";

export interface OfficialCertificateProps {
  studentName: string;
  studentEmail?: string;
  house?: string;
  yearGroup?: string;
  level?: string;
  booksCount?: number;
  challengeTitle?: string;
  verificationCode?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  showActionBar?: boolean;
  showHeaderMeta?: boolean;
  className?: string;
  onDownload?: () => void;
}

export const OfficialCertificateCard: React.FC<OfficialCertificateProps> = ({
  studentName,
  studentEmail,
  house = "Kenya House",
  yearGroup = "DP1",
  level = "Beginner",
  booksCount = 3,
  challengeTitle = "45-Book Reading Challenge 2025/2026: Beyond the Pages",
  verificationCode = "MFA-CERT-KEN-8870",
  signatoryName = "Head Librarian",
  signatoryTitle = "Media Specialist",
  showActionBar = true,
  showHeaderMeta = true,
  className = "",
  onDownload,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const cleanLevel = level || "Beginner";
  const normalizedLevelKey: CertificateLevel =
    cleanLevel.toLowerCase() === "gold"
      ? "Gold"
      : cleanLevel.toLowerCase() === "silver"
      ? "Silver"
      : cleanLevel.toLowerCase() === "bronze"
      ? "Bronze"
      : "Beginner";

  const tierMedal =
    normalizedLevelKey === "Gold"
      ? "🥇"
      : normalizedLevelKey === "Silver"
      ? "🥈"
      : normalizedLevelKey === "Bronze"
      ? "🥉"
      : "🏅";

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    const toastId = toast.loading(`Generating official clean A4 PDF certificate for ${studentName}...`);
    try {
      const targetEl = (cardRef.current?.querySelector(".certificate-root") as HTMLElement) || cardRef.current;
      await exportCertificatePDF(targetEl, {
        studentName,
        level: normalizedLevelKey,
        booksCount,
        signatoryName,
        signatoryTitle,
        verificationCode,
        challengeName: challengeTitle,
        onSuccess: () => {
          toast.success("Official PDF certificate downloaded successfully!", { id: toastId });
        },
        onError: (err) => {
          toast.error("Failed to generate PDF: " + (err?.message || "Error"), { id: toastId });
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate certificate PDF", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const houseLabel = house.toLowerCase().endsWith("house") ? house : `${house} House`;

  return (
    <div className={cn("space-y-4 w-full max-w-4xl mx-auto select-none", className)}>
      {/* 1. Scholar Top Meta Header */}
      {showHeaderMeta && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-foreground font-sans">
                {studentName}
              </span>
              <Badge
                variant="outline"
                className="text-xs font-semibold px-2 py-0.5 rounded-full border-primary/30 text-primary bg-primary/5"
              >
                <span>{tierMedal}</span>
                <span className="ml-1">{normalizedLevelKey} Tier</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-sans">
              {studentEmail && <span className="font-mono">{studentEmail}</span>}
              {studentEmail && (house || yearGroup) && <span>&bull;</span>}
              {house && <span>{houseLabel}</span>}
              {house && yearGroup && <span>&bull;</span>}
              {yearGroup && <span className="font-semibold">{yearGroup}</span>}
              <span>&bull;</span>
              <span>{booksCount} Books Read</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase font-semibold">
              Official Hash
            </div>
            <div className="text-xs sm:text-sm font-mono font-bold text-primary">
              {verificationCode}
            </div>
          </div>
        </div>
      )}

      {/* 2. Authentic Studio Certificate Canvas */}
      <div
        ref={cardRef}
        id="active-certificate-canvas"
        className="w-full overflow-x-auto flex justify-center py-2 bg-slate-950/10 dark:bg-slate-950/40 rounded-2xl border border-border"
      >
        <div className="transform scale-[0.52] xs:scale-[0.62] sm:scale-[0.78] md:scale-[0.92] lg:scale-[1.0] origin-top transition-transform">
          <CertificateCanvas
            data={{
              studentName,
              studentEmail,
              level: normalizedLevelKey,
              booksCount,
              signatoryName,
              signatoryTitle,
              verificationCode,
              challengeName: challengeTitle,
              dateAwarded: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            }}
            scale={1}
            className="shadow-xl border border-slate-200/80 dark:border-slate-800"
          />
        </div>
      </div>

      {/* 3. Action Bar: Download Official PDF & Print */}
      {showActionBar && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-sans">Authentic Academy Certificate ready for high-resolution A4 export &amp; print.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={downloading}
              onClick={handleDownload}
              className="h-9 px-4 text-xs font-bold gap-1.5 text-white shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Exporting..." : "Download Clean A4 PDF"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialCertificateCard;
