import {
  Compass, Wand2, Landmark, Ghost, Heart, FlaskConical,
  BookOpen, Drama, Globe2, Languages, BookHeart, Search,
  Users, User, Image as ImageIcon, ArrowRight, Lock, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { MAX_BOOKS_PER_CATEGORY } from "@/lib/constants";
import { useCategories } from "@/hooks/useCategories";
import { useChallenges } from "@/contexts/ChallengeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteContent } from "@/hooks/useSiteContent";

const icons = [
  Compass, Wand2, Search, Landmark, Ghost, Heart, FlaskConical,
  BookOpen, Drama, Globe2, Languages, BookHeart,
  Users, User, ImageIcon,
];

const tones = [
  "var(--v-red)", "var(--v-orange)", "var(--v-yellow)", "var(--v-lime)",
  "var(--v-green)", "var(--v-mint)", "var(--v-cyan)", "var(--v-electric-blue)",
  "var(--v-electric-indigo)", "var(--v-violet)", "var(--v-magenta)", "var(--v-hot-pink)",
];

const CategoriesSection = () => {
  const { categories } = useCategories();
  const { selectedChallenge } = useChallenges();
  const { user } = useAuth();
  const { get } = useSiteContent();

  const realmsHeader = get("realms_header");
  const realmsList = get("realms_list");
  const isLocked = selectedChallenge?.status === "locked";

  // Parse header lines
  const headerLines = (realmsHeader.content || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const badgeLabel = headerLines[0] || `${categories.length} Literary Realms · 45 Books Journey`;
  const subDesc = headerLines.slice(1).join(" ") || `Read one book from each realm, then complete the rest from any realms you love. A maximum of ${MAX_BOOKS_PER_CATEGORY} books may be counted from the same realm.`;

  // Parse custom realms list if defined
  const parsedCustomRealms = (realmsList.content || "")
    .split("\n")
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) return null;
      return {
        num: parts[0],
        realm: parts[1],
        genre: parts[2],
        prompt: parts[3] || "",
        max: parts[4] || `Max ${MAX_BOOKS_PER_CATEGORY} books`,
      };
    })
    .filter(Boolean);

  const displayList = parsedCustomRealms.length >= 10
    ? parsedCustomRealms.map((r: any, idx: number) => ({
        id: `realm-${r.num || idx + 1}`,
        realm: r.realm,
        name: r.genre,
        prompt: r.prompt,
        maxNote: r.max,
      }))
    : categories.map((c) => ({
        id: c.id,
        realm: c.realm || c.name,
        name: c.name,
        prompt: c.prompt,
        maxNote: `Max ${MAX_BOOKS_PER_CATEGORY} books`,
      }));

  if (!realmsHeader.visible) return null;

  return (
    <section id="categories" className="py-24 relative overflow-hidden bg-secondary/30">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
           style={{ background: "radial-gradient(circle, hsl(var(--v-electric-blue)) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
           style={{ background: "radial-gradient(circle, hsl(var(--v-magenta)) 0%, transparent 70%)" }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 border border-primary/20 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {badgeLabel}
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            {realmsHeader.title || "The 15 Literary Realms"}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {subDesc}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayList.map((category, i) => {
            const Icon = icons[i % icons.length];
            const tone = tones[i % tones.length];
            return (
              <div
                key={category.id}
                className="group relative p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.025] hover:-translate-y-1 flex flex-col justify-between overflow-hidden shadow-md"
                style={{
                  background: `linear-gradient(145deg, hsl(${tone} / 0.18) 0%, hsl(var(--card)) 55%, hsl(${tone} / 0.08) 100%)`,
                  borderColor: `hsl(${tone} / 0.45)`,
                  boxShadow: `0 10px 30px -10px hsl(${tone} / 0.25)`,
                }}
              >
                {/* Subtle top glow bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, transparent, hsl(${tone}), transparent)` }}
                />

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, hsl(${tone} / 0.35), hsl(${tone} / 0.15))`,
                        border: `1.5px solid hsl(${tone} / 0.5)`,
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: `hsl(${tone})` }} />
                    </div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-background/70 border border-border text-muted-foreground">
                      Realm #{i + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {category.realm || category.name}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {category.name}
                    </p>
                  </div>

                  {category.prompt && (
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 bg-background/40 p-3 rounded-2xl border border-border/50">
                      {category.prompt}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {category.maxNote || `Max ${MAX_BOOKS_PER_CATEGORY} books`}
                  </span>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
                      <Lock className="w-3 3" /> Submissions Locked
                    </span>
                  ) : user ? (
                    <Link
                      to={`/submit?category=${category.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground hover:text-primary group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Submit Book</span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    </Link>
                  ) : (
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      <span>Sign In to Log</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
