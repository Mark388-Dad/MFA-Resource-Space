import { BookOpen, Sparkles, ArrowUpRight, Star, Quote, TrendingUp, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import QuickLinks from "@/components/QuickLinks";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useAuth } from "@/contexts/AuthContext";
import { useChallenges } from "@/contexts/ChallengeContext";
import { LockedChallengeNotice } from "@/components/LockedChallengeNotice";

const HeroSection = () => {
  const { user } = useAuth();
  const { selectedChallenge } = useChallenges();
  const { get } = useSiteContent();

  const kicker = get("hero_kicker");
  const theme = get("hero_theme");
  const welcome = get("hero_welcome");
  const schoolBadge = get("school_badge_label");
  const ctaDashboard = get("hero_cta_dashboard");
  const ctaChallenges = get("hero_cta_challenges");
  const ctaRealms = get("hero_cta_realms");
  const houses = get("hero_houses");
  const dailyQuote = get("hero_daily_quote");
  const dailyQuoteAuthor = get("hero_daily_quote_author");
  const statsBooks = get("hero_stats_books");
  const statsRealms = get("hero_stats_realms");
  const statsLevels = get("hero_stats_levels");
  const statsIb = get("hero_stats_ib");

  const isLocked = selectedChallenge?.status === "locked";

  // Parse level chips if formatted as "Bronze: 15 books | Silver: 30 books | Gold: 45 books"
  const parsedLevels = (statsLevels.content || "Bronze: 15 | Silver: 30 | Gold: 45")
    .split("|")
    .map((s) => {
      const parts = s.split(":");
      return {
        label: (parts[0] || "Level").trim(),
        n: (parts[1] || "books").trim().replace("books", "").trim(),
      };
    });

  return (
    <section className="relative min-h-screen overflow-hidden" style={{ background: "var(--gradient-soft)" }}>

      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-25"
             style={{ background: "radial-gradient(circle, hsl(var(--v-electric-blue)) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
             style={{ background: "radial-gradient(circle, hsl(var(--v-green)) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl opacity-15"
             style={{ background: "radial-gradient(circle, hsl(var(--v-orange)) 0%, transparent 70%)" }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
               backgroundSize: "60px 60px"
             }} />
      </div>

      {/* Top marquee ticker */}
      <div className="relative z-10 border-b border-foreground/5 bg-foreground/[0.02] backdrop-blur-sm overflow-hidden">
        <div className="flex whitespace-nowrap animate-[marquee_35s_linear_infinite] py-3 text-xs uppercase tracking-[0.3em] text-foreground/40">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-8 flex items-center gap-3">
              <Sparkles className="w-3 h-3" style={{ color: "hsl(var(--v-yellow))" }} />
              {kicker.title}
              <span style={{ color: "hsl(var(--v-green))" }}>•</span>
              {theme.title}
              <span style={{ color: "hsl(var(--v-orange))" }}>•</span>
              {theme.content}
            </span>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* LEFT — Editorial headline */}
          <div className="lg:col-span-7 space-y-8">
            {/* School Crest Badge */}
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src="/school-badge.png"
                alt={schoolBadge.title || "M-Pesa Foundation Academy Badge"}
                className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
              />
              <div className="inline-flex items-center gap-3 pl-2 pr-4 py-2 rounded-full border border-foreground/15 bg-foreground/[0.05] backdrop-blur-md shadow-[0_0_35px_-10px_hsl(var(--v-green))]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ background: "hsl(var(--v-green))", boxShadow: "0 0 18px hsl(var(--v-green) / 0.8)" }}>
                  <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                </span>
                <span className="text-xs font-semibold text-foreground/90 tracking-wide">{kicker.title}</span>
              </div>
            </div>

            <h1 className="font-display font-bold text-foreground leading-[0.95] tracking-tight text-5xl md:text-6xl lg:text-[6.5rem]">
              <span className="block text-gradient-luminous"
                    style={{ filter: "drop-shadow(0 0 30px hsl(var(--v-electric-blue) / 0.45))" }}>
                {theme.title}
              </span>
              <span className="block mt-3 italic font-light text-3xl md:text-4xl lg:text-5xl text-foreground/80"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {theme.content}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-foreground/60 max-w-xl leading-relaxed">
              {welcome.content}
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={user ? "/dashboard" : "/auth"}
                className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full font-semibold text-base transition-transform hover:scale-[1.02] shadow-md"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                {user ? ctaDashboard.title : "Begin your journey"}
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="w-5 h-5" />
                </span>
              </Link>
              <Link
                to={ctaChallenges.content || "/challenges"}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-foreground/20 text-foreground/90 hover:bg-foreground/5 transition-colors text-sm font-medium"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                {ctaChallenges.title}
              </Link>
              <a
                href={ctaRealms.content || "#categories"}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-foreground/15 text-foreground/80 hover:bg-foreground/5 transition-colors text-sm font-medium"
              >
                {ctaRealms.title}
              </a>
            </div>

            {/* High-Contrast Notice if Reading Challenge is locked */}
            {isLocked && (
              <div className="pt-2">
                <LockedChallengeNotice challenge={selectedChallenge} />
              </div>
            )}

            <QuickLinks />

            {/* Social proof strip */}
            <div className="flex items-center gap-4 pt-6">
              <div className="flex -space-x-3">
                {["hsl(var(--v-green))", "hsl(var(--v-orange))", "hsl(var(--v-electric-blue))", "hsl(var(--v-magenta))"].map((c, i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                       style={{ background: c }}>
                    {["K", "L", "M", "S"][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-foreground">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: "hsl(var(--gold))" }} />
                  ))}
                  <span className="ml-2 font-semibold">{houses.title}</span>
                </div>
                <div className="text-foreground/50 text-xs">{houses.content}</div>
              </div>
            </div>
          </div>

          {/* RIGHT — Bento visual */}
          <div className="lg:col-span-5 relative">
            <div className="grid grid-cols-6 grid-rows-6 gap-3 h-[600px]">
              {/* Big card — featured quote */}
              <div className="col-span-6 row-span-3 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden"
                   style={{ background: "linear-gradient(135deg, hsl(var(--v-electric-blue)) 0%, hsl(var(--v-violet)) 100%)" }}>
                <Quote className="w-10 h-10 text-primary-foreground/70" />
                <p className="font-display text-2xl leading-tight text-primary-foreground">
                  {dailyQuote.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-primary-foreground/70">{dailyQuoteAuthor.content}</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground">{dailyQuote.title}</span>
                </div>
                <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-primary-foreground/10 blur-2xl" />
              </div>

              {/* Stat — books */}
              <div className="col-span-3 row-span-2 rounded-3xl p-5 flex flex-col justify-between"
                   style={{ background: "hsl(var(--accent))" }}>
                <BookOpen className="w-6 h-6 text-accent-foreground" />
                <div>
                  <div className="font-display text-5xl font-bold text-accent-foreground leading-none">{statsBooks.title}</div>
                  <div className="text-xs mt-1 text-accent-foreground/70 uppercase tracking-wider">{statsBooks.content}</div>
                </div>
              </div>

              {/* Stat — categories */}
              <div className="col-span-3 row-span-2 rounded-3xl p-5 flex flex-col justify-between border border-foreground/10 bg-foreground/[0.03] backdrop-blur">
                <TrendingUp className="w-6 h-6" style={{ color: "hsl(var(--v-green))" }} />
                <div>
                  <div className="font-display text-5xl font-bold text-foreground leading-none">{statsRealms.title}</div>
                  <div className="text-xs mt-1 text-foreground/50 uppercase tracking-wider">{statsRealms.content}</div>
                </div>
              </div>

              {/* Achievement chips */}
              <div className="col-span-6 row-span-1 rounded-3xl p-4 flex items-center justify-between gap-2"
                   style={{ background: "linear-gradient(90deg, hsl(var(--v-green)) 0%, hsl(var(--v-orange)) 100%)" }}>
                {parsedLevels.map((t, idx) => (
                  <div key={idx} className="flex-1 rounded-xl bg-primary-foreground/95 px-3 py-2 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-semibold">{t.label}</div>
                    <div className="font-display text-lg font-bold text-foreground">{t.n} books</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-6 -left-6 rotate-[-8deg] rounded-2xl px-4 py-3 shadow-2xl"
                 style={{ background: "hsl(var(--v-magenta))" }}>
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/80">{statsIb.title}</div>
              <div className="font-display text-sm font-bold text-primary-foreground">{statsIb.content}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
