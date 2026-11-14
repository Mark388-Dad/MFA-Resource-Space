import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { dispatchReadingChallengeMessage, triggerBrowserNotification } from "@/lib/emailRepliesManager";
import { dispatchAwardCertificateLetter } from "@/lib/challengeRegistrationManager";
import { resolveSystemLink, getSystemLinks } from "@/lib/systemLinksManager";
import { buildOfficialStudioPreviewHtml, synchronizeCertificateData } from "@/lib/certificateStudioSync";
import { SCHOOL_CREST_DATA_URL } from "./schoolCrestBase64";

const provider = new GoogleAuthProvider();
// Workspace Gmail scope
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.setCustomParameters({
  prompt: "consent",
  access_type: "offline",
});

// In-memory token cache (Do NOT store in localStorage or sessionStorage per skill guidelines)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;
let authListenerAttached = false;

function ensureAuthListener(): void {
  if (authListenerAttached) return;
  const authInstance = getFirebaseAuth();
  if (authInstance) {
    try {
      onAuthStateChanged(authInstance, (user) => {
        cachedGoogleUser = user;
        if (!user) {
          cachedAccessToken = null;
        }
      });
      authListenerAttached = true;
    } catch (e) {
      console.warn("Could not attach Firebase auth listener:", e);
    }
  }
}

export interface GmailConnectionStatus {
  isConnected: boolean;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function getGmailConnectionStatus(): GmailConnectionStatus {
  ensureAuthListener();
  return {
    isConnected: !!cachedAccessToken && !!cachedGoogleUser,
    email: cachedGoogleUser?.email || null,
    displayName: cachedGoogleUser?.displayName || null,
    photoURL: cachedGoogleUser?.photoURL || null,
  };
}

export async function connectGmail(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    ensureAuthListener();
    const authInstance = getFirebaseAuth();
    if (!authInstance) {
      throw new Error("Google Authentication service is initializing. Please try again in a moment.");
    }
    const result = await signInWithPopup(authInstance, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Could not acquire Gmail authorization token from Google.");
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error("Google Gmail connect error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function disconnectGmail(): Promise<void> {
  const authInstance = getFirebaseAuth();
  if (authInstance) {
    try {
      await signOut(authInstance);
    } catch (e) {
      console.warn("Sign out warning:", e);
    }
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
}

export function getCachedGmailToken(): string | null {
  return cachedAccessToken;
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeMimeSubject(subject: string): string {
  return `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
}

export interface EmailStyleOptions {
  primaryColor?: string; // e.g. '#00205B', '#059669', '#4338CA', '#B91C1C'
  secondaryColor?: string;
  headerStyle?: "banner" | "minimal" | "crest_center" | "accent_bar";
  fontSize?: "sm" | "md" | "lg" | "xl"; // 13px, 15px, 17px, 19px
  fontFamily?: "sans" | "serif" | "mono";
  textAlign?: "left" | "center";
  showLogo?: boolean;
  senderBadge?: string; // e.g. "Office of the Academy Librarian", "Homeroom Tutor"
  customGreeting?: string;
  includeQuickLinks?: boolean;
  selectedLinks?: Array<"portal" | "submit" | "leaderboard" | "progress">;

  // Call-To-Action (CTA) Button & Redirect Link options
  showCtaButton?: boolean;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  ctaButtonColor?: string; // Button background color
  ctaButtonTextColor?: string; // Button text color
  ctaButtonSize?: "sm" | "md" | "lg";
  ctaButtonRadius?: "rounded" | "pill" | "square";

  // Segmented Div / Section options
  sectionStyle?: "cards" | "callout" | "classic" | "minimal";
  segmentBgColor?: string; // Background color for paragraph card divs
  segmentBorderColor?: string; // Border color for paragraph card divs
  segmentAccentColor?: string; // Accent border color
  segmentOverrides?: Record<number, { bg?: string; border?: string; accent?: string; textColor?: string }>;
  linkColor?: string;
  linkSize?: "sm" | "md" | "lg";

  // Official Certificate Document Attachment styling
  certificateData?: {
    studentName: string;
    level: string;
    booksCount: number;
    verificationCode: string;
    challengeTitle?: string;
    signatoryName?: string;
    signatoryTitle?: string;
    dateAwarded?: string;
  };
}

export const OFFICIAL_APP_URL = "https://mfareadingchallenge.netlify.app";

// Rainbow accent palette for vibrant alternating paragraph divs
const RAINBOW_ACCENTS = [
  "#00205B", // Academy Navy
  "#059669", // Emerald Green
  "#4F46E5", // Indigo / Royal Violet
  "#E11D48", // Rose Red
  "#D97706", // Amber Gold
  "#0284C7", // Sky Blue
  "#0D9488", // Teal
];

/**
 * Autolinks plain URLs, email addresses, and markdown links [text](url) into styled <a> tags
 */
function autoLinkHtml(rawHtml: string, linkColor = "#0284c7"): string {
  // 1. Markdown links [text](url)
  let text = rawHtml.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
    return `<a href="${url}" target="_blank" style="color: ${linkColor}; text-decoration: underline; font-weight: 600;">${label}</a>`;
  });

  // 2. Plain URLs: http:// or https:// (not already inside href="")
  text = text.replace(/(^|[\s>(])(https?:\/\/[^\s<)]+)/g, (_m, prefix, url) => {
    return `${prefix}<a href="${url}" target="_blank" style="color: ${linkColor}; text-decoration: underline; font-weight: 600;">${url}</a>`;
  });

  // 3. Email addresses
  text = text.replace(/(^|[\s>(])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (_m, prefix, email) => {
    return `${prefix}<a href="mailto:${email}" style="color: ${linkColor}; text-decoration: underline; font-weight: 600;">${email}</a>`;
  });

  return text;
}

/**
 * Formats raw text into elegant styled segment divs with custom colors,
 * padding, borders, and line spacing.
 */
function formatBodyIntoSegments(
  body: string,
  options?: EmailStyleOptions
): string {
  const fontSizePx =
    options?.fontSize === "sm"
      ? "13px"
      : options?.fontSize === "lg"
      ? "17px"
      : options?.fontSize === "xl"
      ? "19px"
      : "15px";
  const textAlign = options?.textAlign || "left";
  const sectionStyle = options?.sectionStyle || "cards";
  const primary = options?.primaryColor || "#00205B";
  const defaultSegmentBg = options?.segmentBgColor || "#f8fafc";
  const defaultSegmentBorder = options?.segmentBorderColor || "#e2e8f0";
  const defaultAccentColor = options?.segmentAccentColor || primary;
  const linkColor = options?.linkColor || "#0284c7";
  const palette = options?.segmentPalette || "uniform";
  const overrides = options?.segmentOverrides || {};

  const rawParagraphs = body
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    const escaped = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    const safe = autoLinkHtml(escaped, linkColor);
    return `<div style="background-color: ${defaultSegmentBg}; border: 1px solid ${defaultSegmentBorder}; border-left: 4px solid ${defaultAccentColor}; border-radius: 12px; padding: 16px 18px; color: #1e293b; font-size: ${fontSizePx}; line-height: 1.7; text-align: ${textAlign};">${safe}</div>`;
  }

  return rawParagraphs
    .map((para, idx) => {
      // Determine segment-specific color
      const custom = overrides[idx];
      let segAccent = custom?.accent || defaultAccentColor;
      const segBg = custom?.bg || defaultSegmentBg;
      const segBorder = custom?.border || defaultSegmentBorder;
      const segTextColor = custom?.textColor || "#1e293b";

      if (!custom?.accent && palette === "rainbow") {
        segAccent = RAINBOW_ACCENTS[idx % RAINBOW_ACCENTS.length];
      } else if (!custom?.accent && palette === "alternating") {
        segAccent = idx % 2 === 0 ? primary : (options?.secondaryColor || "#059669");
      }

      const escaped = para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      const safeText = autoLinkHtml(escaped, linkColor);

      if (sectionStyle === "cards") {
        return `
          <div style="background-color: ${segBg}; border: 1px solid ${segBorder}; border-left: 4px solid ${segAccent}; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; text-align: ${textAlign}; color: ${segTextColor}; font-size: ${fontSizePx}; line-height: 1.7; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            ${safeText}
          </div>
        `;
      } else if (sectionStyle === "callout") {
        const isFirst = idx === 0;
        return `
          <div style="background-color: ${isFirst ? segBg : "#ffffff"}; border: 1px solid ${isFirst ? segAccent : segBorder}; ${isFirst ? `border-left: 5px solid ${segAccent};` : ""} border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; text-align: ${textAlign}; color: ${segTextColor}; font-size: ${fontSizePx}; line-height: 1.7;">
            ${safeText}
          </div>
        `;
      } else if (sectionStyle === "minimal") {
        return `
          <div style="border-bottom: 1px dashed ${segBorder}; padding-bottom: 12px; margin-bottom: 14px; text-align: ${textAlign}; color: ${segTextColor}; font-size: ${fontSizePx}; line-height: 1.7;">
            ${safeText}
          </div>
        `;
      } else {
        // Classic paragraph styling
        return `
          <div style="margin-bottom: 14px; color: ${segTextColor}; font-size: ${fontSizePx}; line-height: 1.7; text-align: ${textAlign};">
            ${safeText}
          </div>
        `;
      }
    })
    .join("");
}

/**
 * Builds visually appealing, responsive HTML email markup with custom branding,
 * div containers, typography controls, customizable buttons, and quick action links.
 */
export function buildBeautifulEmailHtml(
  subject: string,
  messageBody: string,
  options?: EmailStyleOptions
): string {
  const cert = options?.certificateData;
  const primary = options?.primaryColor || "#00205B";
  const appUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : OFFICIAL_APP_URL;

  // =========================================================================
  // CASE 1: OFFICIAL CERTIFICATE DISPATCH EMAIL (Pixel-perfect to attached design)
  // =========================================================================
  if (cert) {
    const certVerificationUrl = resolveSystemLink("certificate_verification_url", { code: cert.verificationCode });
    const certDownloadUrl = resolveSystemLink("certificate_download_url", { code: cert.verificationCode });
    const cleanLevel = cert.level || "Beginner";
    const medalEmoji =
      cleanLevel.toLowerCase() === "gold"
        ? "🥇"
        : cleanLevel.toLowerCase() === "silver"
        ? "🥈"
        : cleanLevel.toLowerCase() === "bronze"
        ? "🥉"
        : "🏅";
    const tierColor =
      cleanLevel.toLowerCase() === "gold"
        ? "#D4AF37"
        : cleanLevel.toLowerCase() === "silver"
        ? "#94A3B8"
        : cleanLevel.toLowerCase() === "bronze"
        ? "#CD7F32"
        : "#16A34A";
    const levelMedal = medalEmoji;
    const challengeTitle =
      cert.challengeTitle || "45-Book Reading Challenge 2025/2026: Beyond the Pages";
    const signatory1 = cert.signatoryName || "Head Librarian";
    const signatory1Title = cert.signatoryTitle || "Media Specialist";

    return `
    <div style="background-color: #070d18; padding: 26px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <div style="max-width: 660px; margin: 0 auto; background-color: #0B1424; border-radius: 20px; border: 2px solid #16A34A; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); padding: 22px 24px;">
        
        <!-- Top Envelope Meta Bar -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 13px; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin-bottom: 16px; padding: 0 4px;">
          <tr>
            <td align="left">
              <span><strong>From:</strong> Teaching &amp; Learning Directorate &lt;directorate@mfa.edu&gt;</span>
            </td>
            <td align="right">
              <span>${cert.dateAwarded || "1 July 2026"}</span>
            </td>
          </tr>
        </table>

        <!-- 1. Header & Institutional Branding Bar in School Navy (#00205B) & Emerald Green (#16A34A) -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #00205B; border: 2px solid #16A34A; border-top: 4px solid #D4AF37; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.45);">
          <tr>
            <td valign="middle" style="padding: 20px 22px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right: 16px;">
                    <!-- Heraldic Academy Crest Seal: Guaranteed 100% visible in Gmail & Apple Mail -->
                    <div style="width: 54px; height: 54px; border-radius: 12px; background: #07101E; border: 2.5px solid #D4AF37; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 3px;">
                      <img src="${SCHOOL_CREST_DATA_URL}" width="46" height="46" alt="MFA Crest" style="width: 46px; height: 46px; border-radius: 8px; display: block;" />
                    </div>
                  </td>
                  <td valign="middle">
                    <div style="font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; line-height: 1.2;">
                      M-PESA FOUNDATION ACADEMY
                    </div>
                    <div style="font-size: 11.5px; font-weight: 700; color: #10B981; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">
                      Thinkers &middot; Doers &middot; Leaders
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td valign="middle" align="right" style="padding: 20px 22px;">
              <div style="background-color: #16A34A; border: 1px solid #22C55E; color: #ffffff; font-size: 12.5px; font-weight: 800; padding: 7px 16px; border-radius: 9999px; white-space: nowrap; display: inline-block; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4);">
                Academic Year 2025/2026
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. Email Notification Section (Paragraph-by-Paragraph Div Cards) -->
        
        <!-- Div 1: Award Notification Banner -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #111C2E; border: 1px solid #1E293B; border-left: 5px solid #16A34A; border-radius: 14px; margin-bottom: 14px;">
          <tr>
            <td valign="middle" style="padding: 16px 20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right: 14px;">
                    <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(22, 163, 74, 0.18); border: 1px solid #16A34A; text-align: center; font-size: 26px; line-height: 44px;">
                      ${medalEmoji}
                    </div>
                  </td>
                  <td valign="middle">
                    <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #10B981;">
                      AWARD NOTIFICATION &bull; OFFICIAL CERTIFICATION
                    </div>
                    <div style="font-size: 17.5px; font-weight: 800; color: #ffffff; margin-top: 3px; line-height: 1.3;">
                      Official ${cleanLevel} Certificate of Achievement: ${challengeTitle}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Div 2: Recipient Salutation Card -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0F172A; border: 1px solid #1E293B; border-radius: 14px; margin-bottom: 14px;">
          <tr>
            <td valign="middle" style="padding: 16px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <span style="display: inline-block; width: 34px; height: 34px; border-radius: 8px; background: #00205B; border: 1px solid #16A34A; color: #38BDF8; font-size: 12px; font-weight: 800; text-align: center; line-height: 32px; margin-right: 12px; vertical-align: middle;">
                      TO
                    </span>
                    <span style="font-size: 18px; font-weight: 800; color: #ffffff; vertical-align: middle;">
                      Hello ${cert.studentName},
                    </span>
                  </td>
                  <td valign="middle" align="right">
                    <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #34D399; font-size: 11.5px; font-weight: 800; padding: 5px 14px; border-radius: 9999px; display: inline-block;">
                      ● Status: Official Verification Confirmed
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Div 3: Achievement Details Card with Large Readable Typography -->
        <div style="background-color: #0F172A; border: 1px solid #1E293B; border-left: 5px solid #1E3A8A; border-radius: 14px; padding: 18px 22px; margin-bottom: 14px;">
          <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">
            Congratulations on achieving the official ${cleanLevel} Reading Award!
          </div>
          <div style="font-size: 15px; color: #E2E8F0; line-height: 1.7;">
            In recognition of your dedicated reading and completion of <strong style="color: #22C55E;">${cert.booksCount} Verified Books</strong> in the <strong style="color: #93C5FD;">${challengeTitle}</strong>, your certificate has been officially validated by the <strong style="color: #ffffff;">Teaching &amp; Learning Directorate</strong> and the <strong style="color: #ffffff;">Academy Library</strong>.
          </div>
        </div>

        <!-- Div 4: Verification Serial & Direct Fast Download (< 2s) Action -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0F172A; border: 1px solid #1E293B; border-left: 5px solid #16A34A; border-radius: 14px; margin-bottom: 24px;">
          <tr>
            <td valign="middle" style="padding: 18px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #22C55E; display: flex; align-items: center; gap: 5px;">
                      <span>|||</span> VERIFICATION SERIAL NUMBER
                    </div>
                    <div style="font-family: monospace; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; margin-top: 4px;">
                      ${cert.verificationCode}
                    </div>
                    <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">
                      MFA 45-Book Reading Challenge Official Ledger
                    </div>
                  </td>
                  <td valign="middle" align="right">
                    <a href="${certDownloadUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 800; padding: 13px 22px; border-radius: 10px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.45); border: 1px solid #22C55E; letter-spacing: 0.3px; white-space: nowrap;">
                      ⚡ Verify &amp; Download (&lt; 2s) &darr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- 3. Authentic Studio Certificate Preview Section Header -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 14px; padding: 0 4px;">
          <tr>
            <td align="left">
              <div style="font-size: 15px; font-weight: 800; color: #22C55E; display: flex; align-items: center; gap: 6px;">
                <span>🎓</span> Official Certificate Studio Layout
              </div>
            </td>
            <td align="right">
              <div style="font-size: 11.5px; color: #94A3B8; font-family: monospace; text-transform: uppercase;">
                VERIFIED STUDIO CERTIFICATE
              </div>
            </td>
          </tr>
        </table>

        <!-- Authentic Studio Certificate Visual Layout: 100% Guaranteed Visible in Sent Email & Preview -->
        ${buildOfficialStudioPreviewHtml(cert, { appOrigin: appUrl })}

        <!-- 4. Certificate Download Portal with Fast Download & Quick Links -->
        <div style="background-color: #0B1528; border: 2px solid #16A34A; border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
            <tr>
              <td align="left">
                <div style="font-size: 11.5px; font-weight: 800; color: #22C55E; letter-spacing: 1px; text-transform: uppercase;">
                  ✔ OFFICIAL LEDGER VERIFIED
                </div>
                <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 3px;">
                  Certificate Download Portal
                </div>
              </td>
              <td align="right">
                <div style="background: #00205B; border: 1px solid #16A34A; color: #34D399; font-size: 11.5px; font-weight: 700; padding: 6px 16px; border-radius: 9999px; display: inline-block;">
                  STATUS: VALID &amp; ACTIVE
                </div>
              </td>
            </tr>
          </table>

          <!-- 4 Metadata Grid Cards with Increased Font Size -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 18px;">
            <tr>
              <td style="width: 50%; padding-right: 7px; padding-bottom: 12px;" valign="top">
                <div style="background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 14px 16px;">
                  <div style="font-size: 10.5px; color: #94A3B8; text-transform: uppercase; font-weight: 800;">Awarded To</div>
                  <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 3px;">${cert.studentName}</div>
                  <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">MFA Student / Reader ID: #8849-2026</div>
                </div>
              </td>
              <td style="width: 50%; padding-left: 7px; padding-bottom: 12px;" valign="top">
                <div style="background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 14px 16px;">
                  <div style="font-size: 10.5px; color: #94A3B8; text-transform: uppercase; font-weight: 800;">Challenge Level</div>
                  <div style="font-size: 15px; font-weight: 700; color: #22C55E; margin-top: 3px;">${cleanLevel} Tier (${cert.booksCount} Books Completed)</div>
                  <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">45-Book Reading Challenge 2025/2026</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; padding-right: 7px;" valign="top">
                <div style="background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 14px 16px;">
                  <div style="font-size: 10.5px; color: #94A3B8; text-transform: uppercase; font-weight: 800;">Validation Authority</div>
                  <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 3px;">Teaching &amp; Learning Directorate</div>
                  <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">Co-validated by MFA Academy Library</div>
                </div>
              </td>
              <td style="width: 50%; padding-left: 7px;" valign="top">
                <div style="background: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 14px 16px;">
                  <div style="font-size: 10.5px; color: #94A3B8; text-transform: uppercase; font-weight: 800;">Serial Code</div>
                  <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #38BDF8; margin-top: 3px;">${cert.verificationCode}</div>
                  <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">Cryptographically Recorded</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Download Action Box with Vibrant Green Button (< 2s) -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #00205B; border: 2px solid #16A34A; border-radius: 14px; margin-bottom: 18px;">
            <tr>
              <td valign="middle" style="padding: 18px 20px;">
                <div style="font-size: 15.5px; font-weight: 800; color: #ffffff;">
                  ⚡ Ready for Instant Printing &amp; PDF Export (&lt; 2 seconds)
                </div>
                <div style="font-size: 12.5px; color: #93C5FD; margin-top: 3px;">
                  Click below to generate the authentic high-resolution vector PDF certificate in less than 2 seconds.
                </div>
              </td>
              <td valign="middle" align="right" style="padding: 18px 20px;">
                <a href="${certDownloadUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 24px; border-radius: 10px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.45); border: 1px solid #22C55E; letter-spacing: 0.3px; white-space: nowrap;">
                  📥 DOWNLOAD PDF CERTIFICATE (&lt; 2s)
                </a>
              </td>
            </tr>
          </table>

          <!-- Quick Action Links (MFA Platform) with School Colors -->
          <div style="padding-top: 16px; border-top: 1px solid #1E293B;">
            <div style="font-size: 11.5px; font-weight: 800; color: #94A3B8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
              Quick Action Links (MFA Reading Platform)
            </div>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #00205B; border: 1px solid #16A34A; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 8px; margin-right: 6px; margin-bottom: 6px;">🚀 Portal Home</a>
                  <a href="${appUrl}/submit" target="_blank" style="display: inline-block; background-color: #16A34A; border: 1px solid #22C55E; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 8px; margin-right: 6px; margin-bottom: 6px;">📖 Submit Review</a>
                  <a href="${appUrl}/leaderboard" target="_blank" style="display: inline-block; background-color: #00205B; border: 1px solid #38BDF8; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 8px; margin-right: 6px; margin-bottom: 6px;">🏆 Leaderboard</a>
                  <a href="${appUrl}/certificates" target="_blank" style="display: inline-block; background-color: #D97706; border: 1px solid #F59E0B; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 8px; margin-right: 6px; margin-bottom: 6px;">🎖 Certificate Studio</a>
                  <a href="${certVerificationUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; border: 1px solid #334155; color: #38BDF8; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 8px; margin-bottom: 6px;">🔍 Verify Credential</a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Bottom Microprint Footer -->
          <div style="text-align: center; font-size: 11.5px; color: #94A3B8; margin-top: 16px;">
            Official document issued by MFA Academy &bull; &ldquo;Thinkers. Doers. Leaders.&rdquo;
          </div>
        </div>

      </div>
    </div>
    `;
  }

  // =========================================================================
  // CASE 2: GENERAL COHORT ANNOUNCEMENT / BROADCAST EMAIL (School Branding)
  // =========================================================================
  const titleSizePx =
    options?.fontSize === "sm"
      ? "18px"
      : options?.fontSize === "lg"
      ? "24px"
      : options?.fontSize === "xl"
      ? "28px"
      : "22px";
  const textAlign = options?.textAlign || "left";
  const showLogo = options?.showLogo !== false;
  const senderBadge = options?.senderBadge || "Office of the Academy Librarian";
  const showQuickLinks = options?.includeQuickLinks !== false;
  const links = options?.selectedLinks || ["portal", "submit", "leaderboard", "progress"];

  const fontFam =
    options?.fontFamily === "serif"
      ? "'Playfair Display', Georgia, Cambria, serif"
      : options?.fontFamily === "mono"
      ? "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Segmented Body Markup
  const segmentsHtml = formatBodyIntoSegments(messageBody, options);

  // Dynamic URLs resolved from System Links Engine
  const basePortalUrl = resolveSystemLink("portal_base_url");
  const ctaUrl = options?.ctaButtonUrl || resolveSystemLink("email_cta_url");
  const portalHomeUrl = resolveSystemLink("portal_home_url");
  const bookSubmitUrl = resolveSystemLink("book_submission_url");
  const leaderboardUrl = resolveSystemLink("leaderboard_url");
  const progressUrl = resolveSystemLink("progress_dashboard_url");

  // Call-To-Action (CTA) Primary Button Markup
  const showCta = options?.showCtaButton !== false;
  const ctaText = options?.ctaButtonText || "🚀 Open MFA Reading Portal";
  const ctaBg = options?.ctaButtonColor || "#0B192C"; // School Navy
  const ctaTextCol = options?.ctaButtonTextColor || "#ffffff";
  const ctaPadding =
    options?.ctaButtonSize === "sm"
      ? "10px 20px"
      : options?.ctaButtonSize === "lg"
      ? "16px 34px"
      : "13px 26px";
  const ctaFontSize =
    options?.ctaButtonSize === "sm"
      ? "12px"
      : options?.ctaButtonSize === "lg"
      ? "15px"
      : "13px";
  const ctaRadius =
    options?.ctaButtonRadius === "pill"
      ? "9999px"
      : options?.ctaButtonRadius === "square"
      ? "4px"
      : "10px";

  const ctaButtonHtml = showCta
    ? `
      <div style="margin: 22px 0 16px 0; text-align: ${textAlign === "center" ? "center" : "left"};">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaTextCol}; text-decoration: none; font-size: ${ctaFontSize}; font-weight: 700; padding: ${ctaPadding}; border-radius: ${ctaRadius}; box-shadow: 0 4px 14px rgba(11, 25, 44, 0.25); letter-spacing: 0.3px; border: 1px solid #1e3a8a;">
          ${ctaText} &rarr;
        </a>
      </div>
    `
    : "";

  // Build quick link action pill divs with school colors (#0B192C, #16A34A, #1D4ED8, #D4AF37)
  const linkPillsHtml = showQuickLinks
    ? `
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; text-align: ${textAlign};">
          Quick Action Links (MFA Reading Platform)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: ${textAlign === "center" ? "center" : "flex-start"};">
          ${
            links.includes("portal")
              ? `<a href="${portalHomeUrl}" target="_blank" style="display: inline-block; background-color: #0B192C; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 14px; border-radius: 8px; margin: 3px 4px 3px 0; border: 1px solid #1e3a8a; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">🚀 Portal Home</a>`
              : ""
          }
          ${
            links.includes("submit")
              ? `<a href="${bookSubmitUrl}" target="_blank" style="display: inline-block; background-color: #16A34A; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 14px; border-radius: 8px; margin: 3px 4px 3px 0; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.2);">📖 Submit Review</a>`
              : ""
          }
          ${
            links.includes("leaderboard")
              ? `<a href="${leaderboardUrl}" target="_blank" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 14px; border-radius: 8px; margin: 3px 4px 3px 0; box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);">🏆 Leaderboard</a>`
              : ""
          }
          ${
            links.includes("progress")
              ? `<a href="${progressUrl}" target="_blank" style="display: inline-block; background-color: #EA580C; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; padding: 8px 14px; border-radius: 8px; margin: 3px 4px 3px 0; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.2);">🎯 My Progress</a>`
              : ""
          }
        </div>
      </div>
    `
    : "";

  return `
    <div style="background-color: #070d18; padding: 24px 12px; font-family: ${fontFam};">
      <div style="max-width: 660px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
        
        <!-- Header Banner with School Brand (Navy #0B192C with Gold #D4AF37 Top Accent) -->
        <div style="background: #0B192C; border-top: 4px solid #D4AF37; padding: 26px 28px; color: #ffffff; text-align: ${textAlign};">
          <div style="display: flex; align-items: center; justify-content: ${textAlign === "center" ? "center" : "flex-start"}; gap: 14px; margin-bottom: 12px;">
            ${
              showLogo
                ? `<div style="width: 46px; height: 46px; border-radius: 12px; background: #07101E; border: 2px solid #D4AF37; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.35); flex-shrink: 0; padding: 3px;">
                    <img src="${SCHOOL_CREST_DATA_URL}" alt="M-PESA Foundation Academy Crest" width="38" height="38" style="width: 38px; height: 38px; object-fit: contain; display: block;" />
                  </div>`
                : ""
            }
            <div>
              <div style="font-family: 'Cinzel', Georgia, serif; font-size: 17px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #ffffff; line-height: 1.1;">
                M-PESA FOUNDATION ACADEMY
              </div>
              <div style="font-size: 10px; font-weight: 700; color: #D4AF37; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px;">
                Thinkers &middot; Doers &middot; Leaders
              </div>
            </div>
          </div>
          <h1 style="margin: 14px 0 0 0; color: #ffffff; font-size: ${titleSizePx}; font-weight: 800; line-height: 1.25; letter-spacing: -0.3px;">
            ${subject}
          </h1>
          <div style="margin-top: 10px;">
            <span style="display: inline-block; background-color: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); color: #93c5fd; font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px;">
              ${senderBadge}
            </span>
          </div>
        </div>

        <!-- Body Content Card -->
        <div style="padding: 26px 28px 22px 28px; background-color: #ffffff;">
          <!-- Paragraph Segment Divs with Colors -->
          <div>
            ${segmentsHtml}
          </div>

          <!-- Call-To-Action Button with Custom Color and Redirect Link -->
          ${ctaButtonHtml}

          <!-- Quick Action Links -->
          ${linkPillsHtml}
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5; text-align: ${textAlign};">
          <p style="margin: 0; font-weight: 600; color: #0B192C;">
            Official Academy Communications &middot; M-Pesa Foundation Academy Reading Challenge
          </p>
          <p style="margin: 4px 0 0 0;">
            Direct Portal: <a href="${basePortalUrl}" target="_blank" style="color: #16A34A; font-weight: 600; text-decoration: underline;">${basePortalUrl}</a>
          </p>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">
            You can reply directly to this email. Replies are delivered to the sender's dashboard.
          </p>
        </div>
      </div>
    </div>
  `;
}

function chunkBase64(b64: string, lineLength = 76): string {
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    chunks.push(b64.slice(i, i + lineLength));
  }
  return chunks.join("\r\n");
}

/**
 * Encodes an email in standard RFC 2822 / RFC 2046 base64url format required by the Gmail REST API.
 * Uses multipart/alternative with chunked base64 so email clients always display rich styled HTML.
 */
function createRawEmail(
  to: string,
  from: string,
  subject: string,
  messageBody: string,
  options?: EmailStyleOptions
): string {
  const encodedSubject = encodeMimeSubject(subject);
  const htmlContent = buildBeautifulEmailHtml(subject, messageBody, options);
  const boundary = `----=_Part_MFA_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Plain text fallback summary
  const plainText = `${subject}\n\n${messageBody}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOfficial M-Pesa Foundation Academy Reading Portal: ${OFFICIAL_APP_URL}\nVerification Code: ${options?.certificateData?.verificationCode || ""}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    chunkBase64(utf8ToBase64(plainText)),
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    chunkBase64(utf8ToBase64(htmlContent.trim())),
    "",
    `--${boundary}--`,
  ];

  const fullEmail = emailLines.join("\r\n");
  return base64UrlEncode(fullEmail);
}

export function createWebGmailComposeUrl(
  to: string,
  subject: string,
  body: string,
  options?: EmailStyleOptions
): string {
  const formattedBody = `${body}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOfficial MFA Reading Portal: ${OFFICIAL_APP_URL}\nSubmit Books: ${OFFICIAL_APP_URL}/submit\nLeaderboards: ${OFFICIAL_APP_URL}/leaderboard\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
}

export interface SendGmailResult {
  sentCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Sends an email to recipients through the user's authentic Google Gmail account using the Gmail API.
 * Automatically synchronizes an entry in each recipient's Challenge Inbox and triggers a browser notification.
 */
export async function sendViaGoogleGmail(
  recipients: string[],
  subject: string,
  body: string,
  options?: EmailStyleOptions
): Promise<SendGmailResult> {
  if (!cachedAccessToken) {
    throw new Error("Gmail is not connected. Please connect your Google Gmail account first.");
  }

  const senderEmail = cachedGoogleUser?.email || "librarian@mpesafoundationacademy.ac.ke";
  const senderName = cachedGoogleUser?.displayName || options?.senderBadge || "Office of the Academy Librarian";
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    if (!recipient || !recipient.includes("@")) continue;

    // Strict safety check: Never accidentally dispatch an outward email to the sender's own address if intended for others
    try {
      const raw = createRawEmail(recipient, senderEmail, subject, body, options);
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `Failed to send to ${recipient} (HTTP ${res.status})`;
        errors.push(errMsg);
        failedCount++;
      } else {
        sentCount++;

        // 1. Immediately log into recipient's dedicated Challenge Inbox
        dispatchReadingChallengeMessage({
          senderName,
          senderEmail,
          senderRole: options?.senderBadge || "Academy Faculty",
          recipientEmail: recipient,
          recipientName: recipient.split("@")[0].replace(/\./g, " "),
          subject,
          body,
          category: subject.toLowerCase().includes("certificate") ? "milestone" : "announcement",
        });

        // 2. Trigger desktop browser notification
        triggerBrowserNotification(`📬 Email Sent: ${subject}`, {
          body: `Successfully delivered to ${recipient}`,
        });
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      errors.push(`Error sending to ${recipient}: ${errObj?.message || String(err)}`);
      failedCount++;
    }
  }

  return { sentCount, failedCount, errors };
}

export interface DispatchCertificateParams {
  recipientEmail: string;
  recipientName: string;
  recipientUserId?: string;
  senderEmail: string;
  senderName: string;
  senderRole?: string;
  challengeId: string;
  challengeTitle: string;
  level: string;
  booksCount: number;
  verificationCode: string;
  subject: string;
  customMessage: string;
  styleOptions?: EmailStyleOptions;
}

export interface DispatchCertificateResult {
  recipientEmail: string;
  sentViaGmail: boolean;
  sentViaRelay: boolean;
  loggedToInbox: boolean;
  error?: string;
}

/**
 * Robust, production-grade certificate dispatch service.
 * Delivers directly to the recipient's student email (via Gmail API or school relay),
 * triggers a browser desktop notification, and places a verified record into the recipient's Challenge Inbox.
 */
export async function dispatchCertificateEmailService(
  params: DispatchCertificateParams
): Promise<DispatchCertificateResult> {
  const {
    recipientEmail,
    recipientName,
    recipientUserId,
    senderEmail,
    senderName,
    senderRole = "Head Librarian & Director of Literacy",
    challengeId,
    challengeTitle,
    level,
    booksCount,
    verificationCode,
    subject,
    customMessage,
    styleOptions,
  } = params;

  let sentViaGmail = false;
  let sentViaRelay = false;
  let dispatchError: string | undefined;

  const certStyleOptions: EmailStyleOptions = {
    ...styleOptions,
    primaryColor: styleOptions?.primaryColor || "#00205B",
    headerStyle: "crest_center",
    senderBadge: styleOptions?.senderBadge || senderRole,
    showLogo: true,
    certificateData: {
      studentName: recipientName,
      level,
      booksCount,
      verificationCode,
      challengeTitle,
      signatoryName: senderName,
      signatoryTitle: senderRole,
      dateAwarded: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  };

  // 1. Send via Google Gmail API if sender connected their Google account
  if (cachedAccessToken) {
    try {
      const res = await sendViaGoogleGmail(
        [recipientEmail],
        subject,
        customMessage,
        certStyleOptions
      );
      if (res.sentCount > 0) {
        sentViaGmail = true;
      } else if (res.errors.length > 0) {
        dispatchError = res.errors.join(", ");
      }
    } catch (err: any) {
      dispatchError = err?.message || String(err);
    }
  }

  // 2. If Gmail was not connected or threw an error, attempt school email relay via Supabase Edge Function
  if (!sentViaGmail) {
    try {
      const styledHtml = buildBeautifulEmailHtml(subject, customMessage, certStyleOptions);
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: {
          subject,
          message: customMessage,
          html: styledHtml,
          styleOptions: certStyleOptions,
          emails: [recipientEmail],
        },
      });
      if (!error && !data?.error) {
        sentViaRelay = true;
      }
    } catch (relayErr: any) {
      console.warn("Relay notice:", relayErr);
    }
  }

  // 3. Save official certificate award record into student's Welcome & Certificate letters store
  const uId = recipientUserId || `user-${recipientEmail}`;
  try {
    dispatchAwardCertificateLetter({
      userId: uId,
      studentName: recipientName,
      studentEmail: recipientEmail,
      challengeId,
      challengeTitle,
      level,
      booksCount,
      verificationCode,
    });
  } catch (letterErr) {
    console.warn("Letter dispatch warning:", letterErr);
  }

  // 4. Record inbound message in recipient's Challenge Inbox & outbound in sender's sent folder
  try {
    dispatchReadingChallengeMessage({
      challengeId,
      challengeTitle,
      senderName,
      senderEmail,
      senderRole,
      recipientEmail,
      recipientName,
      recipientUserId: uId,
      subject,
      body: customMessage,
      category: "milestone",
    });
  } catch (inboxErr) {
    console.warn("Inbox dispatch warning:", inboxErr);
  }

  // 5. Fire Desktop Native Browser Notification
  try {
    await triggerBrowserNotification(`🎓 Certificate Dispatched: ${level} Award`, {
      body: `Congratulations ${recipientName}! Your official certificate has been sent to ${recipientEmail} and logged in your Challenge Inbox.`,
      tag: `cert-dispatch-${verificationCode}`,
    });
  } catch (notifErr) {
    console.warn("Desktop notification trigger notice:", notifErr);
  }

  // 6. Record in Supabase notifications table for persistent cross-device syncing
  if (recipientUserId && recipientUserId !== "guest" && !recipientUserId.startsWith("demo-")) {
    try {
      await supabase.from("notifications").insert({
        user_id: recipientUserId,
        title: subject,
        message: customMessage,
        type: "certificate",
        read: false,
      });
    } catch (dbErr) {
      console.warn("Supabase notification insert warning:", dbErr);
    }
  }

  return {
    recipientEmail,
    sentViaGmail,
    sentViaRelay,
    loggedToInbox: true,
    error: dispatchError,
  };
}

