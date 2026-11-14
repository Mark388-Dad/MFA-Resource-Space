import React from "react";
import { OfficialCertificateCard } from "@/components/OfficialCertificateCard";
import { Link } from "react-router-dom";
import { OFFICIAL_APP_URL } from "@/lib/gmailService";
import { cn } from "@/lib/utils";

export interface CertificateMetaDetails {
  studentName: string;
  studentEmail?: string;
  house?: string;
  yearGroup?: string;
  level: string;
  booksCount: number;
  challengeTitle: string;
  verificationCode: string;
  signatoryName: string;
  signatoryTitle: string;
}

export interface OfficialEmailMessageCardProps {
  subject: string;
  senderBadge?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  body: string;
  dispatchedAt?: string;
  certificateDetails?: CertificateMetaDetails | null;
  className?: string;
}

export const OfficialEmailMessageCard: React.FC<OfficialEmailMessageCardProps> = ({
  subject,
  senderBadge = "Office of the Academy Librarian",
  body,
  certificateDetails,
  className = "",
}) => {
  // Break message body into paragraphs
  const paragraphs = body
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const displayParagraphs = paragraphs.length > 0 ? paragraphs : [body];

  return (
    <div
      className={cn(
        "w-full max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden select-none font-sans",
        className
      )}
    >
      {/* 1. Authentic Header Banner (matching Image 2) */}
      <div className="bg-[#00205B] text-white p-6 sm:p-7 space-y-3">
        {/* Logo and Academy Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
            <img
              src="/school-badge.png"
              alt="M-PESA Foundation Academy Crest"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to crest text if image not loaded
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs sm:text-sm font-extrabold tracking-[0.2em] text-[#93c5fd] uppercase">
              M-PESA FOUNDATION ACADEMY
            </div>
            <div className="text-[11px] text-white/80 font-medium">
              Thinkers &middot; Doers &middot; Leaders
            </div>
          </div>
        </div>

        {/* Large Bold Subject Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug break-words">
          {subject || "Official Reading Challenge Communication"}
        </h1>

        {/* Sender Pill Badge */}
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/25 text-white shadow-2xs">
            {senderBadge}
          </span>
        </div>
      </div>

      {/* 2. White Content Container with Left-Bordered Card Divs */}
      <div className="p-5 sm:p-7 space-y-4 bg-white dark:bg-slate-950">
        {/* Paragraphs in clean left-bordered cards */}
        <div className="space-y-3">
          {displayParagraphs.map((para, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900/60 border-l-4 border-l-[#00205B] p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs whitespace-pre-wrap font-sans"
            >
              {para}
            </div>
          ))}
        </div>

        {/* 3. Real Certificate Document Card (matching Image 1) */}
        {certificateDetails && (
          <div className="pt-2">
            <OfficialCertificateCard
              studentName={certificateDetails.studentName}
              studentEmail={certificateDetails.studentEmail}
              house={certificateDetails.house}
              yearGroup={certificateDetails.yearGroup}
              level={certificateDetails.level}
              booksCount={certificateDetails.booksCount}
              challengeTitle={certificateDetails.challengeTitle}
              verificationCode={certificateDetails.verificationCode}
              signatoryName={certificateDetails.signatoryName}
              signatoryTitle={certificateDetails.signatoryTitle}
              showActionBar={true}
              showHeaderMeta={true}
            />
          </div>
        )}

        {/* 4. Primary CTA Button */}
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00205B] hover:bg-[#001740] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <span>🚀 Open MFA Reading Portal</span>
            <span className="text-base">&rarr;</span>
          </Link>
        </div>

        {/* 5. Quick Action Links Section */}
        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            QUICK ACTION LINKS (MFA READING PLATFORM)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#00205B] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-opacity"
            >
              🚀 Portal Home
            </Link>
            <Link
              to="/submit"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-opacity"
            >
              📖 Submit Review
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#4f46e5] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-opacity"
            >
              🏆 Leaderboard
            </Link>
            <Link
              to="/progress"
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#ea580c] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-opacity"
            >
              🎯 My Progress
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Authentic Footer Disclaimer */}
      <div className="p-5 sm:p-6 bg-[#f8fafc] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 leading-relaxed space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Official Academy Communications &middot; M-Pesa Foundation Academy Reading Challenge
        </p>
        <p>
          Direct Portal:{" "}
          <a
            href={OFFICIAL_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00205B] dark:text-blue-400 font-semibold underline"
          >
            {OFFICIAL_APP_URL}
          </a>
        </p>
        <p className="text-[11px] text-slate-400 pt-0.5">
          You can reply directly to this email. Replies are delivered to the sender's dashboard.
        </p>
      </div>
    </div>
  );
};

export default OfficialEmailMessageCard;
