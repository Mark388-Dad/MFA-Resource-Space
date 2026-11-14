import { Trophy, Star, Award, Medal, Zap } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { POINTS_PER_BOOK, POINTS_FOR_JOINING, MILESTONES, computeTotalPoints, TOTAL_BOOK_GOAL } from "@/lib/constants";

const defaultPointsData = [
  { action: "Join the Challenge", points: POINTS_FOR_JOINING, icon: Zap, tone: "var(--v-yellow)" },
  { action: "Each book completed", points: POINTS_PER_BOOK, icon: Star, tone: "var(--v-green)" },
  { action: "Reach Bronze Level (15 books)", points: MILESTONES[0].bonus, icon: Medal, tone: "var(--v-orange)" },
  { action: "Reach Silver Level (30 books)", points: MILESTONES[1].bonus, icon: Award, tone: "var(--v-cyan)" },
  { action: "Reach Gold Level (45 books)", points: MILESTONES[2].bonus, icon: Trophy, tone: "var(--v-magenta)" },
];

const PointsSection = () => {
  const { get } = useSiteContent();
  const block = get("points");

  // Extract description lines
  const lines = (block.content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const description = lines[0] || "Bonus points stack on top of your book points and count towards the leaderboard. One book already earns you 6 points.";

  // Optional custom items if user specified bullet items
  const customItems = lines.slice(1).filter((l) => l.startsWith("•") || l.startsWith("-")).map((l) => l.replace(/^[•\-*–]\s*/, ""));

  const displayItems = customItems.length > 0 ? customItems.map((c, i) => {
    const parts = c.split(":");
    const action = parts[0]?.trim() || c;
    const pts = parseInt(parts[1]?.replace(/[^0-9]/g, "") || "3", 10);
    const template = defaultPointsData[i % defaultPointsData.length];
    return {
      action,
      points: pts || template.points,
      icon: template.icon,
      tone: template.tone,
    };
  }) : defaultPointsData;

  if (!block.visible) return null;

  return (
    <section id="points" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6">
              <Trophy className="w-4 h-4 text-gold" />
              <span className="text-gold-dark text-sm font-medium">Earn Points</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              {block.title || "Point Awards"}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          <div className="bg-card rounded-3xl p-6 md:p-10 shadow-lg">
            <div className="space-y-4">
              {displayItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-5 rounded-2xl border transition-transform hover:scale-[1.01]"
                  style={{
                    background: `linear-gradient(120deg, hsl(${item.tone} / 0.16), hsl(${item.tone} / 0.04))`,
                    borderColor: `hsl(${item.tone} / 0.35)`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `hsl(${item.tone} / 0.22)` }}>
                      <item.icon className="w-6 h-6" style={{ color: `hsl(${item.tone})` }} />
                    </div>
                    <span className="text-foreground font-medium text-base sm:text-lg">{item.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-display font-bold" style={{ color: `hsl(${item.tone})` }}>{item.points}</span>
                    <span className="text-muted-foreground text-sm">pts</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              {[1, 15, TOTAL_BOOK_GOAL].map((b) => (
                <div key={b} className="rounded-2xl border border-border p-4 text-center bg-background/50">
                  <div className="text-2xl font-display font-bold text-gradient-luminous">{computeTotalPoints(b)} pts</div>
                  <div className="text-xs text-muted-foreground">after {b} book{b > 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PointsSection;
