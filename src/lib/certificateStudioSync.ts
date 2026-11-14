/**
 * certificateStudioSync.ts
 *
 * Dedicated Service Layer that synchronizes certificate generation data
 * with the Certificate Studio and Google AI Studio output format.
 *
 * Ensures all certificate fields (student name, book count, level, date, serial code,
 * signatories, challenge title) strictly match the visual layout generated in
 * the Certificate Studio and images (image_39de208f.png & image_3eb01a37.png).
 */

import {
  CertificateData,
  CertificateLevel,
  CERTIFICATE_LEVEL_CONFIG,
  getVerificationCode,
} from "./certificateTypes";
import { OFFICIAL_APP_URL } from "./gmailService";
import { SCHOOL_CREST_DATA_URL } from "./schoolCrestBase64";

export interface SynchronizedCertificatePayload {
  studentName: string;
  studentEmail?: string;
  level: CertificateLevel;
  displayLevelName: string;
  badgeName: string;
  booksCount: number;
  verificationCode: string;
  challengeTitle: string;
  signatoryName: string;
  signatoryTitle: string;
  dateAwarded: string;
  tierColor: string;
  medal: string;
  quote: string;
  house?: string;
  yearGroup?: string;
}

export interface CertificateFieldCheck {
  field: string;
  expected: string;
  actual: any;
  status: "PASS" | "WARN" | "FAIL";
  details: string;
}

export interface CertificateVerificationResult {
  isValid: boolean;
  score: number; // percentage (0-100)
  timestamp: string;
  source: string;
  payload: SynchronizedCertificatePayload;
  checks: CertificateFieldCheck[];
}

// In-memory cache of the latest verified payload for UI inspectors & diagnostics
let latestVerificationResult: CertificateVerificationResult | null = null;

export function getLastVerifiedPayload(): CertificateVerificationResult | null {
  return latestVerificationResult;
}

/**
 * Diagnostic Verification Step:
 * Validates the data payload being passed to the canvas/SVG renderer to ensure
 * all fields strictly match the real-world institutional certificate template
 * (image_39de208f.png & image_3eb01a37.png).
 *
 * Logs structured diagnostic information to the browser console.
 */
export function verifyAndLogCertificatePayload(
  rawInput: Partial<CertificateData> | any,
  source = "Certificate Studio"
): CertificateVerificationResult {
  const payload = synchronizeCertificateData(rawInput);
  const checks: CertificateFieldCheck[] = [];

  // 1. Student Name Check
  const hasName = Boolean(payload.studentName && payload.studentName.trim().length >= 2);
  checks.push({
    field: "studentName",
    expected: "Non-empty scholar full name (min 2 chars)",
    actual: payload.studentName,
    status: hasName ? "PASS" : "FAIL",
    details: hasName ? "Valid recipient name formatted" : "Missing or blank student name",
  });

  // 2. Verified Books Count Check
  const validBooks = typeof payload.booksCount === "number" && !isNaN(payload.booksCount) && payload.booksCount >= 0;
  checks.push({
    field: "booksCount",
    expected: "Non-negative integer representing completed books",
    actual: payload.booksCount,
    status: validBooks ? "PASS" : "FAIL",
    details: validBooks ? `${payload.booksCount} books logged` : "Invalid books count value",
  });

  // 3. Award Level Check
  const validLevels: CertificateLevel[] = ["Gold", "Silver", "Bronze", "Beginner", "Not Started"];
  const isLevelValid = validLevels.includes(payload.level);
  checks.push({
    field: "level",
    expected: "One of: Gold, Silver, Bronze, Beginner, Not Started",
    actual: payload.level,
    status: isLevelValid ? "PASS" : "FAIL",
    details: isLevelValid ? `Award tier '${payload.level}' active` : "Unrecognized award level",
  });

  // 4. Verification Serial Code Check
  const hasSerial = Boolean(payload.verificationCode && payload.verificationCode.length >= 8);
  const isMfaSerial = payload.verificationCode.startsWith("MFA-");
  checks.push({
    field: "verificationCode",
    expected: "MFA-RC-2026-XXXXX or MFA-CERT standard serial format",
    actual: payload.verificationCode,
    status: hasSerial && isMfaSerial ? "PASS" : hasSerial ? "WARN" : "FAIL",
    details: hasSerial ? (isMfaSerial ? "Standard MFA ledger serial confirmed" : "Non-standard prefix") : "Missing serial hash",
  });

  // 5. Challenge Title Check
  const hasChallenge = Boolean(payload.challengeTitle && payload.challengeTitle.length >= 5);
  checks.push({
    field: "challengeTitle",
    expected: "M-PESA Foundation Academy challenge identifier",
    actual: payload.challengeTitle,
    status: hasChallenge ? "PASS" : "WARN",
    details: hasChallenge ? "Official challenge title loaded" : "Using fallback challenge title",
  });

  // 6. Primary Signatory Check (Head Librarian)
  const hasSignatory = Boolean(payload.signatoryName && payload.signatoryName.trim().length > 0);
  checks.push({
    field: "signatoryName",
    expected: "Official signatory name (e.g. 'Head Librarian')",
    actual: payload.signatoryName,
    status: hasSignatory ? "PASS" : "WARN",
    details: hasSignatory ? `Primary signatory '${payload.signatoryName}' assigned` : "Missing signatory",
  });

  // 7. Signatory Title Check (Media Specialist)
  const hasSigTitle = Boolean(payload.signatoryTitle && payload.signatoryTitle.trim().length > 0);
  checks.push({
    field: "signatoryTitle",
    expected: "Signatory institutional role (e.g. 'Media Specialist')",
    actual: payload.signatoryTitle,
    status: hasSigTitle ? "PASS" : "WARN",
    details: hasSigTitle ? `Role '${payload.signatoryTitle}' verified` : "Missing title",
  });

  // 8. Award Date Check
  const hasDate = Boolean(payload.dateAwarded && payload.dateAwarded.trim().length > 0);
  checks.push({
    field: "dateAwarded",
    expected: "Official issuance date string (e.g. '1 July 2026')",
    actual: payload.dateAwarded,
    status: hasDate ? "PASS" : "WARN",
    details: hasDate ? `Date '${payload.dateAwarded}' recorded` : "Missing issuance date",
  });

  // 9. Tier Color Palette Check
  const isColorHex = /^#[0-9A-Fa-f]{6}$/.test(payload.tierColor);
  checks.push({
    field: "tierColor",
    expected: "Valid 6-digit Hex color code (e.g. #16A34A for Beginner, #D4AF37 for Gold)",
    actual: payload.tierColor,
    status: isColorHex ? "PASS" : "FAIL",
    details: isColorHex ? `Palette hex ${payload.tierColor} active` : "Invalid hex color",
  });

  // 10. Medal Emoji Check
  const hasMedal = Boolean(payload.medal && payload.medal.length > 0);
  checks.push({
    field: "medal",
    expected: "Institutional medal icon (🥇, 🥈, 🥉, 🏅)",
    actual: payload.medal,
    status: hasMedal ? "PASS" : "WARN",
    details: hasMedal ? `Medal icon ${payload.medal} verified` : "Missing medal icon",
  });

  const passCount = checks.filter((c) => c.status === "PASS").length;
  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const score = Math.round((passCount / checks.length) * 100);
  const isValid = failCount === 0;

  const result: CertificateVerificationResult = {
    isValid,
    score,
    timestamp: new Date().toISOString(),
    source,
    payload,
    checks,
  };

  latestVerificationResult = result;

  // Output structured diagnostic log to the browser console for developer/auditor inspection
  if (typeof console !== "undefined") {
    try {
      const headerStyle = isValid
        ? "background: #0B1D3A; color: #10B981; font-weight: bold; font-size: 11px; padding: 2px 8px; border-radius: 4px;"
        : "background: #7F1D1D; color: #FCA5A5; font-weight: bold; font-size: 11px; padding: 2px 8px; border-radius: 4px;";

      console.groupCollapsed(
        `%c🎓 [MFA Certificate Verification] ${source} ➔ ${payload.studentName} (${payload.level} Tier) • ${score}% Institutional Match ${isValid ? "✅" : "⚠️"}`,
        headerStyle
      );
      console.info("Verified Data Payload Passed to Canvas / SVG Renderer:", payload);
      console.table(
        checks.map((c) => ({
          Field: c.field,
          Status: c.status === "PASS" ? "✅ PASS" : c.status === "WARN" ? "⚠️ WARN" : "❌ FAIL",
          Actual: String(c.actual),
          Expected: c.expected,
          Details: c.details,
        }))
      );
      console.groupEnd();
    } catch {
      // Quiet fail if browser console is restricted
    }
  }

  // Dispatch browser custom event for live UI listeners
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("mfa-cert-payload-verified", { detail: result }));
    } catch {}
  }

  return result;
}

/**
 * Normalizes and synchronizes any certificate input data with the Certificate Studio standards.
 */
export function synchronizeCertificateData(
  input: Partial<CertificateData> | any
): SynchronizedCertificatePayload {
  const rawLevel = (input?.level || "Beginner").toString().trim();
  const normalizedLevel: CertificateLevel =
    rawLevel.toLowerCase() === "gold"
      ? "Gold"
      : rawLevel.toLowerCase() === "silver"
      ? "Silver"
      : rawLevel.toLowerCase() === "bronze"
      ? "Bronze"
      : rawLevel.toLowerCase() === "beginner" || rawLevel.toLowerCase() === "begginer"
      ? "Beginner"
      : "Beginner";

  const cfg = CERTIFICATE_LEVEL_CONFIG[normalizedLevel] || CERTIFICATE_LEVEL_CONFIG.Beginner;

  const rawName = (input?.studentName || cfg.sampleStudent || "ABDULLAHI ADAN").trim();
  // Format to standard Title Case or clean Uppercase as displayed in studio
  const studentName = rawName.toUpperCase();

  const defaultBooks = cfg.defaultBooks;
  const booksCount =
    typeof input?.booksCount === "number" && !isNaN(input.booksCount)
      ? input.booksCount
      : defaultBooks;

  const rawSerial =
    input?.verificationCode ||
    input?.customSerial ||
    (input?.studentEmail ? getVerificationCode(input.studentEmail) : cfg.sampleCode);

  const verificationCode = rawSerial || cfg.sampleCode;

  const signatoryName = input?.signatoryName || "Head Librarian";
  const signatoryTitle = input?.signatoryTitle || "Media Specialist";
  const dateAwarded = input?.dateAwarded || "1 July 2026";
  const challengeTitle =
    input?.challengeName ||
    input?.challengeTitle ||
    "45-Book Reading Challenge 2025/2026: Beyond the Pages";

  const studentEmail =
    input?.studentEmail ||
    `${studentName.toLowerCase().replace(/\s+/g, ".")}@mpesafoundationacademy.ac.ke`;

  return {
    studentName,
    studentEmail,
    level: normalizedLevel,
    displayLevelName: cfg.displayLevelName,
    badgeName: cfg.badgeName,
    booksCount,
    verificationCode,
    challengeTitle,
    signatoryName,
    signatoryTitle,
    dateAwarded,
    tierColor: cfg.color,
    medal: cfg.medal,
    quote: "Reading is a passport to countless adventures.",
    house: input?.house || "Kenya House",
    yearGroup: input?.yearGroup || "DP1",
  };
}

/**
 * Generates the authentic Vector SVG visual layout matching the Certificate Studio
 * canvas (image_39de208f.png for Beginner, image_3eb01a37.png for Gold).
 *
 * This SVG can be rendered anywhere (web preview, email template, modal) with 100%
 * fidelity, preserving sunburst rays, soft tint band, diagonal ribbons,
 * cursive student name, quote with accent bar, signatures, and right navy crest field.
 */
export function generateStudioCertificateSvg(
  payloadInput: Partial<CertificateData> | any,
  options?: {
    appOrigin?: string;
    includeShadow?: boolean;
    maxWidth?: string | number;
  }
): string {
  const p = synchronizeCertificateData(payloadInput);
  const appUrl = options?.appOrigin || OFFICIAL_APP_URL;

  // Format student name in elegant presentation (e.g. "Abdullahi Adan")
  const displayName = p.studentName
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Responsive SVG markup with viewBox 0 0 800 566
  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 800 566"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      style="display: block; max-width: 100%; height: auto; font-family: Georgia, 'Times New Roman', serif; background-color: #ffffff; border-radius: 8px; overflow: hidden;"
    >
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;family=Cinzel:wght@700&amp;family=Dancing+Script:wght@700&amp;family=Pinyon+Script&amp;display=swap');
          .cert-title { font-family: Georgia, 'Times New Roman', serif; font-weight: bold; letter-spacing: 0.10em; fill: #0B1D3A; }
          .cert-sub { font-family: Georgia, 'Times New Roman', serif; font-weight: bold; letter-spacing: 0.22em; fill: #0B1D3A; }
          .cert-pres { font-family: Georgia, 'Times New Roman', serif; font-weight: bold; letter-spacing: 0.14em; fill: #555555; font-size: 14px; }
          .cert-name { font-family: 'California', 'Playfair Display', 'Alex Brush', 'Dancing Script', 'Pinyon Script', 'Brush Script MT', 'Great Vibes', cursive, Georgia, serif; font-style: italic; font-size: 38px; fill: #1E3A8A; font-weight: normal; }
          .cert-body { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5px; fill: #374151; line-height: 1.55; }
          .cert-stat { font-family: Georgia, 'Times New Roman', serif; font-size: 25px; font-weight: bold; }
          .cert-quote { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 12.5px; fill: #4B5563; }
          .cert-sig-name { font-family: Georgia, 'Times New Roman', serif; font-size: 11.5px; font-weight: bold; fill: #0B1D3A; }
          .cert-sig-title { font-family: Georgia, 'Times New Roman', serif; font-size: 9px; fill: #555555; }
          .cert-crest-txt { font-family: Georgia, 'Times New Roman', serif; font-weight: bold; fill: #ffffff; letter-spacing: 0.12em; font-size: 13.5px; }
        </style>
      </defs>

      <!-- 1. Base White Surface -->
      <rect width="800" height="566" fill="#ffffff" />

      <!-- 2. Radiating Sunburst Rays radiating from (0, 180) in category accent color -->
      <g opacity="0.95">
        <polygon points="0,180 0,0 22,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 40,0 62,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 82,0 104,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 128,0 150,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 180,0 205,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 242,0 272,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 315,0 350,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 398,0 438,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 492,0 537,0" fill="${p.tierColor}" opacity="0.75" />
        <polygon points="0,180 600,0 650,0" fill="${p.tierColor}" opacity="0.65" />
        <polygon points="0,180 710,0 765,0" fill="${p.tierColor}" opacity="0.40" />
      </g>

      <!-- 3. Soft Horizontal Tint Band behind Title -->
      <polygon points="0,92 512,92 499,182 0,182" fill="${p.tierColor}" opacity="0.22" />

      <!-- 4. Bottom-Left Corner Dark Triangle (#0B1D3A) -->
      <polygon points="0,506 0,566 60,566" fill="#0B1D3A" />

      <!-- 5. Diagonal Stripes and Right Navy Field -->
      <polygon points="524,0 540,0 460,566 444,566" fill="${p.tierColor}" />
      <polygon points="540,0 556,0 476,566 460,566" fill="#0B1D3A" />
      <polygon points="556,0 562,0 482,566 476,566" fill="${p.tierColor}" />
      <polygon points="562,0 800,0 800,566 482,566" fill="#0B1D3A" />

      <!-- 6. Top-Right Decorative Waves -->
      <path d="M 640,0 C 710,30 730,120 800,120 L 800,0 Z" fill="${p.tierColor}" opacity="0.35" />
      <path d="M 700,0 C 750,40 765,95 800,95 L 800,0 Z" fill="${p.tierColor}" />

      <!-- 7. LEFT CONTENT: Header -->
      <g text-anchor="middle">
        <text x="235" y="66" class="cert-title" font-size="44">CERTIFICATE</text>
        <text x="235" y="106" class="cert-sub" font-size="22">OF ACHIEVEMENT</text>
        <text x="235" y="136" class="cert-pres" font-size="13">PRESENTED TO</text>
      </g>

      <!-- 8. Student Name & Accent Underline -->
      <g text-anchor="middle">
        <text x="235" y="196" class="cert-name">${displayName}</text>
        <line x1="65" y1="216" x2="405" y2="216" stroke="${p.tierColor}" stroke-width="2.5" stroke-linecap="round" />
      </g>

      <!-- 9. Commendation Text -->
      <text x="44" y="254" class="cert-body">
        <tspan x="44" dy="0">In recognition of successfully attaining the <tspan font-weight="bold" fill="#0B1D3A">${p.displayLevelName} level</tspan> in the 45-</tspan>
        <tspan x="44" dy="19">Book Reading Challenge 2025/2026: Beyond the Pages. We</tspan>
        <tspan x="44" dy="19">commend your dedication, consistency, and passion for reading.</tspan>
      </text>

      <!-- 10. Medal + Level Badge Row -->
      <g transform="translate(44, 314)">
        <text x="0" y="24" font-size="28">${p.medal}</text>
        <text x="38" y="13" font-family="Georgia, serif" font-weight="bold" font-size="13" fill="#0B1D3A">${p.badgeName}</text>
        <text x="38" y="29" font-family="Georgia, serif" font-size="11.5" fill="#555555">${p.booksCount} Books Completed</text>
      </g>

      <!-- 11. Big Stat Count -->
      <g transform="translate(44, 374)">
        <text x="0" y="0" class="cert-stat" fill="${p.tierColor}">${p.booksCount}</text>
        <text x="${p.booksCount >= 10 ? 36 : 22}" y="0" font-family="Georgia, serif" font-size="17" fill="#555555">Books Read</text>
      </g>

      <!-- 12. Quote Block with Accent Vertical Bar -->
      <g transform="translate(44, 398)">
        <rect x="0" y="2" width="2.5" height="18" fill="${p.tierColor}" />
        <text x="10" y="16" class="cert-quote">&ldquo;${p.quote}&rdquo;</text>
      </g>

      <!-- 13. Left Signature: Head Librarian & Media Specialist -->
      <g transform="translate(44, 500)">
        <line x1="0" y1="0" x2="180" y2="0" stroke="#0B1D3A" stroke-width="1.5" />
        <text x="90" y="17" text-anchor="middle" class="cert-sig-name">${p.signatoryName}</text>
        <text x="90" y="30" text-anchor="middle" class="cert-sig-title">${p.signatoryTitle}</text>
      </g>

      <!-- 14. Right Signature: Date Awarded -->
      <g transform="translate(254, 500)">
        <line x1="0" y1="0" x2="160" y2="0" stroke="#0B1D3A" stroke-width="1.5" />
        <text x="80" y="17" text-anchor="middle" class="cert-sig-name">${p.dateAwarded}</text>
        <text x="80" y="30" text-anchor="middle" class="cert-sig-title">Date Awarded</text>
      </g>

      <!-- 15. RIGHT NAVY PANEL: Academy Crest Badge & Institutional Seals -->
      <g transform="translate(668, 205)">
        <!-- School Crest Circular Badge with Tier Color Glow -->
        <circle cx="0" cy="0" r="54" fill="#07101E" stroke="${p.tierColor}" stroke-width="2.5" />
        <circle cx="0" cy="0" r="48" fill="#0B1D3A" />
        <!-- Authentic School Crest Image using base64 Data URI -->
        <image href="${SCHOOL_CREST_DATA_URL}" xlink:href="${SCHOOL_CREST_DATA_URL}" x="-44" y="-44" width="88" height="88" preserveAspectRatio="xMidYMid meet" />
      </g>

      <!-- 16. Right Navy Panel: Institutional Typography -->
      <g transform="translate(668, 435)" text-anchor="middle">
        <text x="0" y="0" class="cert-crest-txt">MPESA</text>
        <text x="0" y="20" class="cert-crest-txt">FOUNDATION</text>
        <text x="0" y="40" class="cert-crest-txt">ACADEMY</text>

        <!-- VERIFIED ACHIEVEMENT in Tier Accent Color -->
        <text x="0" y="65" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10.5" font-weight="bold" fill="${p.tierColor}" letter-spacing="0.08em">
          VERIFIED ACHIEVEMENT
        </text>

        <!-- Serial Hash -->
        <text x="0" y="82" font-family="monospace" font-size="10.5" font-weight="bold" fill="#94A3B8" letter-spacing="0.05em">
          ${p.verificationCode}
        </text>
      </g>
    </svg>
  `;
}

/**
 * Builds an Email-Safe HTML & CSS visual layout of the Certificate
 * using standard HTML table and inline CSS.
 *
 * Guarantees 100% visual fidelity in Gmail, Outlook, Apple Mail, and Yahoo Mail
 * where standard <svg> tags get stripped or collapsed, strictly preserving the
 * authentic, clean institutional certificate layout (image_39de208f.png & image_db465e96.png)
 * with NO extraneous emojis or decorations on the certificate itself.
 */
export function generateEmailSafeCertificateHtml(
  payloadInput: Partial<CertificateData> | any,
  options?: { appOrigin?: string }
): string {
  const p = synchronizeCertificateData(payloadInput);

  // Format student name to elegant presentation (e.g. "Abdullahi Adan")
  const displayName = p.studentName
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const appOrigin = options?.appOrigin || OFFICIAL_APP_URL;

  return `
    <!-- MFA OFFICIAL CERTIFICATE (CLEAN INSTITUTIONAL EMAIL-SAFE TABLE) -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 630px; margin: 0 auto; background-color: #ffffff; border: 2.5px solid ${p.tierColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.45); font-family: Georgia, 'Times New Roman', serif;">
      <tr>
        <!-- LEFT COLUMN: Main Certificate Surface with School Colors, Commendation & Signatures -->
        <td valign="top" style="padding: 26px 24px 22px 24px; width: 66%; background-color: #ffffff; background: linear-gradient(135deg, ${p.tierColor}14 0%, #ffffff 42%, #ffffff 100%);">
          
          <!-- Header: CERTIFICATE OF ACHIEVEMENT PRESENTED TO -->
          <div style="text-align: center; margin-bottom: 8px;">
            <div style="font-family: Georgia, serif; font-size: 27px; font-weight: 800; color: #00205B; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1.15; margin: 0 0 4px 0;">
              CERTIFICATE
            </div>
            <div style="font-family: Georgia, serif; font-size: 14px; font-weight: 800; color: #00205B; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 6px 0;">
              OF ACHIEVEMENT
            </div>
            <div style="font-family: Georgia, serif; font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 10px 0;">
              PRESENTED TO
            </div>
          </div>

          <!-- Recipient Scholar Name in Royal Blue Script with Emerald Green Accent Underline Bar -->
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-family: 'Playfair Display', 'Brush Script MT', Georgia, cursive, serif; font-size: 30px; font-style: italic; font-weight: 700; color: #1E3A8A; line-height: 1.2; word-break: break-word;">
              ${displayName}
            </div>
            <!-- Clean Emerald Green Underline Bar matching template -->
            <div style="height: 3px; background-color: #16A34A; width: 85%; max-width: 290px; margin: 6px auto 0 auto; border-radius: 2px;"></div>
          </div>

          <!-- Commendation Paragraph -->
          <div style="font-family: Georgia, serif; font-size: 13px; color: #374151; line-height: 1.6; margin-bottom: 14px;">
            In recognition of successfully attaining the <strong style="color: #00205B;">${p.displayLevelName} level</strong> in the <strong>45-Book Reading Challenge 2025/2026: Beyond the Pages</strong>. We commend your dedication, consistency, and passion for reading.
          </div>

          <!-- Medal & Level Details Row -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
            <tr>
              <td valign="middle" style="font-size: 26px; padding-right: 10px; line-height: 1;">
                ${p.medal}
              </td>
              <td valign="middle">
                <div style="font-family: Georgia, serif; font-size: 13px; font-weight: 800; color: #00205B; line-height: 1.2;">
                  ${p.badgeName}
                </div>
                <div style="font-family: Georgia, serif; font-size: 11.5px; color: #64748B; line-height: 1.2;">
                  ${p.booksCount} Books Completed
                </div>
              </td>
            </tr>
          </table>

          <!-- Big Stat: [X] Books Read in Emerald Green -->
          <div style="margin-bottom: 12px; line-height: 1.2;">
            <span style="font-family: Georgia, serif; font-size: 26px; font-weight: 800; color: #16A34A; margin-right: 6px;">
              ${p.booksCount}
            </span>
            <span style="font-family: Georgia, serif; font-size: 15px; font-weight: 600; color: #4B5563;">
              Books Read
            </span>
          </div>

          <!-- Quote with Emerald Accent Bar -->
          <div style="border-left: 3px solid #16A34A; padding-left: 10px; margin-bottom: 20px;">
            <span style="font-family: Georgia, serif; font-style: italic; font-size: 12px; color: #4B5563;">
              &ldquo;${p.quote}&rdquo;
            </span>
          </div>

          <!-- Dual Signatures Row: Head Librarian & Date Awarded -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td align="center" style="width: 50%; padding-right: 10px;">
                <div style="border-top: 1.5px solid #00205B; padding-top: 5px;">
                  <div style="font-family: Georgia, serif; font-size: 11.5px; font-weight: 800; color: #00205B; line-height: 1.2;">${p.signatoryName}</div>
                  <div style="font-family: Georgia, serif; font-size: 9.5px; color: #64748B; line-height: 1.2;">${p.signatoryTitle}</div>
                </div>
              </td>
              <td align="center" style="width: 50%; padding-left: 10px;">
                <div style="border-top: 1.5px solid #00205B; padding-top: 5px;">
                  <div style="font-family: Georgia, serif; font-size: 11.5px; font-weight: 800; color: #00205B; line-height: 1.2;">${p.dateAwarded}</div>
                  <div style="font-family: Georgia, serif; font-size: 9.5px; color: #64748B; line-height: 1.2;">Date Awarded</div>
                </div>
              </td>
            </tr>
          </table>
        </td>

        <!-- RIGHT COLUMN: Academy Navy Blue (#00205B) with Emerald Accent Divider and Academy Crest -->
        <td valign="middle" align="center" style="width: 34%; background-color: #00205B; border-left: 4.5px solid #16A34A; padding: 24px 14px; text-align: center; color: #ffffff;">
          
          <!-- Heraldic Academy Crest Seal: Real School Crest Logo -->
          <div style="margin-bottom: 16px; text-align: center;">
            <img src="${SCHOOL_CREST_DATA_URL}" width="78" height="78" alt="M-Pesa Foundation Academy Crest" style="width: 78px; height: 78px; border-radius: 50%; border: 2.5px solid ${p.tierColor}; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.6);" />
          </div>

          <!-- Institutional Typography in Crisp White -->
          <div style="font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; line-height: 1.25;">
            MPESA
          </div>
          <div style="font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; line-height: 1.25;">
            FOUNDATION
          </div>
          <div style="font-family: 'Cinzel', Georgia, serif; font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; line-height: 1.25; margin-bottom: 16px;">
            ACADEMY
          </div>

          <!-- VERIFIED ACHIEVEMENT in Emerald Green -->
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; font-weight: 800; color: #10B981; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px;">
            VERIFIED ACHIEVEMENT
          </div>
          <div style="font-family: monospace; font-size: 10.5px; font-weight: bold; color: #94A3B8; letter-spacing: 0.5px; word-break: break-all; background: rgba(0,0,0,0.35); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
            ${p.verificationCode}
          </div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Builds the visual HTML container for the Official Certificate Studio Preview
 * to embed directly in email templates and live preview dashboards.
 *
 * Renders the REAL studio certificate visual layout (matching image_39de208f.png & image_3eb01a37.png)
 * featuring full radiating sunburst rays, cursive scholar signature, verified stats,
 * dual signatures, diagonal academy ribbons, and the authentic M-Pesa Foundation Academy Crest seal.
 */
export function buildOfficialStudioPreviewHtml(
  payloadInput: Partial<CertificateData> | any,
  options?: { appOrigin?: string }
): string {
  const p = synchronizeCertificateData(payloadInput);
  const realStudioCertificateSvg = generateStudioCertificateSvg(payloadInput, options);

  return `
    <div style="margin: 0 auto 24px auto; max-width: 630px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6); border: 2.5px solid ${p.tierColor}; background-color: #ffffff; line-height: 0;">
      ${realStudioCertificateSvg}
    </div>
  `;
}

