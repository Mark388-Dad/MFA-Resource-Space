import { forwardRef, useEffect } from "react";
import schoolLogo from "@/assets/school-logo.png";
import {
  CertificateData,
  CertificateLevel,
  CERTIFICATE_LEVEL_CONFIG,
  CERTIFICATE_FONT_OPTIONS,
  getVerificationCode,
} from "@/lib/certificateTypes";
import { verifyAndLogCertificatePayload } from "@/lib/certificateStudioSync";
import { renderCertificateToDataUrl } from "@/lib/certificateImageCacheService";

interface CertificateCanvasProps {
  data: CertificateData;
  scale?: number;
  id?: string;
  className?: string;
}

export const CertificateCanvas = forwardRef<HTMLDivElement, CertificateCanvasProps>(
  ({ data, scale = 1, id, className = "" }, ref) => {
    // Run diagnostic verification step and pre-warm high-performance image cache
    useEffect(() => {
      verifyAndLogCertificatePayload(data, "CertificateCanvas (Canvas Renderer)");
      // Asynchronously pre-warm the image cache in idle time (< 20ms)
      if (typeof window !== "undefined") {
        setTimeout(() => {
          renderCertificateToDataUrl(data, { scale: 2, useCache: true }).catch(() => {});
        }, 50);
      }
    }, [data]);

    const levelKey: CertificateLevel = data.level in CERTIFICATE_LEVEL_CONFIG ? data.level : "Gold";
    const cfg = CERTIFICATE_LEVEL_CONFIG[levelKey];

    const rawStudentName = data.studentName || cfg.sampleStudent;
    const books = data.booksCount ?? cfg.defaultBooks;
    const signatory = data.signatoryName || "Head Librarian";
    const signatoryTitle = data.signatoryTitle || "Media Specialist";
    const dateAwarded = data.dateAwarded || "1 July 2026";
    const serialCode =
      data.verificationCode ||
      (data.studentEmail ? getVerificationCode(data.studentEmail) : cfg.sampleCode);

    // Typography customization
    const fontType = data.nameFontType || "California";
    const matchedFont = CERTIFICATE_FONT_OPTIONS.find((f) => f.id === fontType);
    const nameFontFamily = matchedFont ? matchedFont.family : "'California', 'Alex Brush', 'Pinyon Script', cursive";
    const nameFontColor = data.nameFontColor || "#0B1D3A";
    const nameCase = data.nameCase || "as-is";

    const formattedStudentName = (() => {
      if (nameCase === "uppercase") return rawStudentName.toUpperCase();
      if (nameCase === "capitalize") {
        return rawStudentName
          .toLowerCase()
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      // "as-is" maintains exact registered name without mutilating case or characters
      return rawStudentName;
    })();

    // Auto-scale font size so names appear in full without clipping or overflow
    const baseFontSizeNum = data.nameFontSize ? data.nameFontSize : 34;
    const nameLen = formattedStudentName.length;
    const scaledSizeNum =
      nameLen > 36
        ? Math.max(18, Math.round(baseFontSizeNum * 0.68))
        : nameLen > 28
        ? Math.max(22, Math.round(baseFontSizeNum * 0.78))
        : nameLen > 20
        ? Math.max(26, Math.round(baseFontSizeNum * 0.88))
        : baseFontSizeNum;
    const nameFontSize = `${scaledSizeNum}px`;

    return (
      <div
        ref={ref}
        id={id}
        className={`certificate-root origin-top shadow-2xl overflow-hidden print:shadow-none print:transform-none select-none ${className}`}
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top center",
          width: "800px",
          height: "566px",
          position: "relative",
          backgroundColor: "#ffffff",
          fontFamily: "Georgia, 'Times New Roman', Times, serif",
          boxSizing: "border-box",
        }}
      >
        {/* SVG Decorative Background */}
        <svg
          width="800"
          height="566"
          viewBox="0 0 800 566"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "800px",
            height: "566px",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          {/* Base white surface */}
          <rect width="800" height="566" fill="#ffffff" />

          {/* Radiating sunburst rays in category accent color */}
          <g opacity="0.9">
            <polygon points="0,180 0,0 22,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 40,0 62,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 82,0 104,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 128,0 150,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 180,0 205,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 242,0 272,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 315,0 350,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 398,0 438,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 492,0 537,0" fill={cfg.color} opacity="0.75" />
            <polygon points="0,180 600,0 650,0" fill={cfg.color} opacity="0.65" />
            <polygon points="0,180 710,0 765,0" fill={cfg.color} opacity="0.40" />
          </g>

          {/* Soft tint horizontal strip behind title */}
          <polygon points="0,92 512,92 499,182 0,182" fill={cfg.color} opacity="0.22" />

          {/* Bottom left corner dark triangle */}
          <polygon points="0,506 0,566 60,566" fill="#0B1D3A" />

          {/* Diagonal stripes and right navy field */}
          <polygon points="524,0 540,0 460,566 444,566" fill={cfg.color} />
          <polygon points="540,0 556,0 476,566 460,566" fill="#0B1D3A" />
          <polygon points="556,0 562,0 482,566 476,566" fill={cfg.color} />
          <polygon points="562,0 800,0 800,566 482,566" fill="#0B1D3A" />

          {/* Top-right decorative curves / waves */}
          <path d="M 640,0 C 710,30 730,120 800,120 L 800,0 Z" fill={cfg.color} opacity="0.35" />
          <path d="M 700,0 C 750,40 765,95 800,95 L 800,0 Z" fill={cfg.color} />
        </svg>

        {/* Certificate Content Container */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "800px",
            height: "566px",
            zIndex: 10,
            boxSizing: "border-box",
          }}
        >
          {/* Left Main Content Block */}
          <div
            style={{
              width: "450px",
              height: "100%",
              padding: "26px 34px 20px 34px",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              position: "relative",
            }}
          >
            {/* Header: CERTIFICATE */}
            <h1
              style={{
                fontSize: "44px",
                fontWeight: "bold",
                textTransform: "uppercase",
                color: "#0B1D3A",
                letterSpacing: "0.10em",
                lineHeight: "1.0",
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "0 0 34px 0",
                textAlign: "center",
              }}
            >
              CERTIFICATE
            </h1>

            {/* OF ACHIEVEMENT */}
            <p
              style={{
                fontSize: "23px",
                textTransform: "uppercase",
                color: "#0B1D3A",
                letterSpacing: "0.22em",
                fontWeight: "bold",
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "0 0 14px 0",
                lineHeight: "1.0",
                textAlign: "center",
              }}
            >
              OF ACHIEVEMENT
            </p>

            {/* PRESENTED TO */}
            <p
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                textTransform: "uppercase",
                color: "#555555",
                letterSpacing: "0.14em",
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "0 0 10px 0",
                textAlign: "center",
              }}
            >
              PRESENTED TO
            </p>

            {/* Student Name + Accent Underline */}
            <div
              style={{
                width: "95%",
                maxWidth: "620px",
                margin: "4px auto 14px auto",
                textAlign: "center",
                padding: "0 8px 4px 8px",
                overflow: "visible",
                boxSizing: "border-box",
              }}
            >
              <p
                style={{
                  fontSize: nameFontSize,
                  fontStyle: fontType === "California" || fontType === "Great Vibes" || fontType === "Pinyon Script" || fontType === "Alex Brush" || fontType === "Dancing Script" ? "normal" : "italic",
                  fontWeight: fontType === "California" || fontType === "Great Vibes" || fontType === "Pinyon Script" ? "normal" : "bold",
                  fontFamily: nameFontFamily,
                  color: nameFontColor,
                  margin: "0 0 6px 0",
                  paddingBottom: "2px",
                  lineHeight: "1.25",
                  letterSpacing: fontType === "California" ? "0.01em" : "0.03em",
                  wordSpacing: "0.08em",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflow: "visible",
                }}
                title={formattedStudentName}
              >
                {formattedStudentName}
              </p>
              <div
                style={{
                  height: "2.5px",
                  backgroundColor: cfg.color,
                  width: "100%",
                  maxWidth: "460px",
                  margin: "0 auto",
                }}
              />
            </div>

            {/* Recognition Paragraph with explicit spacing to avoid overlap */}
            <p
              style={{
                fontSize: "12px",
                color: "#374151",
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "4px 0 10px 0",
                lineHeight: "1.55",
                wordSpacing: "0.12em",
              }}
            >
              In recognition of successfully attaining the{" "}
              <strong style={{ color: "#0B1D3A", padding: "0 2px" }}>
                {cfg.displayLevelName} level
              </strong>{" "}
              in the {data.challengeName || "45-Book Reading Challenge 2025/2026"}. We commend your dedication, consistency,
              and passion for reading.
            </p>

            {/* Medal + Level Details Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "0 0 8px 0",
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  lineHeight: "1.0",
                  marginRight: "12px",
                  flexShrink: 0,
                }}
              >
                {cfg.medal}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#0B1D3A",
                    lineHeight: "1.3",
                  }}
                >
                  {cfg.badgeName}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#555555",
                    lineHeight: "1.3",
                  }}
                >
                  {books} Books Completed
                </div>
              </div>
            </div>

            {/* Big Stat Count */}
            <div
              style={{
                margin: "0 0 10px 0",
                lineHeight: "1.2",
              }}
            >
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: cfg.color,
                  fontFamily: "Georgia, serif",
                  marginRight: "10px",
                }}
              >
                {books}
              </span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#555555",
                  fontFamily: "Georgia, serif",
                }}
              >
                Books Read
              </span>
            </div>

            {/* Quote Block */}
            <div
              style={{
                borderLeft: `2.5px solid ${cfg.color}`,
                paddingLeft: "10px",
                margin: "0 0 16px 0",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "#4b5563",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  margin: 0,
                  lineHeight: "1.4",
                }}
              >
                &ldquo;Reading is a passport to countless adventures.&rdquo;
              </p>
            </div>

            {/* Signatures pinned cleanly to the bottom */}
            <div
              style={{
                position: "absolute",
                bottom: "22px",
                left: "34px",
                width: "385px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              {/* Signatory (David O. Oloo) */}
              <div style={{ width: "190px", textAlign: "center" }}>
                <div
                  style={{
                    width: "100%",
                    height: "1.5px",
                    backgroundColor: "#0B1D3A",
                    marginBottom: "6px",
                  }}
                />
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#0B1D3A",
                    margin: "0 0 2px 0",
                    fontFamily: "Georgia, serif",
                    lineHeight: "1.2",
                  }}
                >
                  {signatory}
                </p>
                <p
                  style={{
                    fontSize: "8.5px",
                    color: "#555555",
                    margin: 0,
                    fontFamily: "Georgia, serif",
                    lineHeight: "1.2",
                  }}
                >
                  {signatoryTitle}
                </p>
              </div>

              {/* Date Awarded */}
              <div style={{ width: "160px", textAlign: "center" }}>
                <div
                  style={{
                    width: "100%",
                    height: "1.5px",
                    backgroundColor: "#0B1D3A",
                    marginBottom: "6px",
                  }}
                />
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#0B1D3A",
                    margin: "0 0 2px 0",
                    fontFamily: "Georgia, serif",
                    lineHeight: "1.2",
                  }}
                >
                  {dateAwarded}
                </p>
                <p
                  style={{
                    fontSize: "9px",
                    color: "#555555",
                    margin: 0,
                    fontFamily: "Georgia, serif",
                    lineHeight: "1.2",
                  }}
                >
                  Date Awarded
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Official School Crest Logo */}
          <div
            style={{
              position: "absolute",
              top: "156px",
              right: "54px",
              width: "116px",
              height: "116px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
          >
            <img
              src={schoolLogo}
              alt="M-PESA Foundation Academy Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Right Panel: Academy Branding & Verification */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              right: "24px",
              width: "160px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 5,
            }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: "0.12em",
                margin: 0,
                fontFamily: "Georgia, serif",
                lineHeight: "1.2",
              }}
            >
              MPESA
            </p>
            <p
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: "0.12em",
                margin: 0,
                fontFamily: "Georgia, serif",
                lineHeight: "1.2",
              }}
            >
              FOUNDATION
            </p>
            <p
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: "0.12em",
                margin: 0,
                fontFamily: "Georgia, serif",
                lineHeight: "1.2",
              }}
            >
              ACADEMY
            </p>
            <p
              style={{
                fontSize: "10px",
                color: cfg.color,
                margin: "5px 0 0 0",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                lineHeight: "1.2",
              }}
            >
              VERIFIED ACHIEVEMENT
            </p>
            <p
              style={{
                fontSize: "10px",
                color: "#64748b",
                margin: "2px 0 0 0",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                lineHeight: "1.2",
              }}
            >
              {serialCode}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

CertificateCanvas.displayName = "CertificateCanvas";
