import React from "react";
import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: "website" | "article" | "profile";
  ogImage?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE = "45-Book Reading Challenge — M-PESA Foundation Academy";
const DEFAULT_DESCRIPTION =
  "Official M-PESA Foundation Academy reading challenge: 45 books, reflections, whole-school reader leaderboards, and verified achievement certificates.";
const DEFAULT_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/70a449f5-a638-49a6-8f5c-16aca3d2c856/id-preview-204e92e2--75e890a5-2146-47cc-97ea-c5cbaccfcc08.lovable.app-1777615926751.png";
const DEFAULT_KEYWORDS =
  "M-Pesa Foundation Academy, 45-Book Reading Challenge, Student Reading Leaderboard, IB World School, School Certificate Studio, Kenya House, Kilimanjaro House, Longonot House, Elgon House, Literacy Portal, Tonny Odundo";

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = "website",
  ogImage = DEFAULT_IMAGE,
  noindex = false,
  structuredData,
}) => {
  const currentOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://mfareadingchallenge.lovable.app";

  const currentPath =
    typeof window !== "undefined" && window.location.pathname
      ? window.location.pathname
      : "/";

  const resolvedCanonical = canonical || `${currentOrigin}${currentPath}`;
  const fullTitle = title
    ? title.includes("M-PESA") || title.includes("MFA")
      ? title
      : `${title} — MFA 45-Book Reading Challenge`
    : DEFAULT_TITLE;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="M-PESA Foundation Academy" />
      <link rel="canonical" href={resolvedCanonical} />

      {/* Robots Directive */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
      )}

      {/* OpenGraph / Facebook / LinkedIn */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:site_name" content="MFA 45-Book Reading Challenge" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="M-PESA Foundation Academy 45-Book Reading Challenge Platform" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter / X Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="M-PESA Foundation Academy 45-Book Reading Challenge Platform" />

      {/* Custom or Domain Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
