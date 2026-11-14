import { Heart, Compass, Brain, MessageSquare, Users } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const ICONS = [Heart, Compass, Brain, MessageSquare, Users];
const TONES = [
  "var(--v-hot-pink)",
  "var(--v-orange)",
  "var(--v-electric-blue)",
  "var(--v-green)",
  "var(--v-violet)",
];

const GoalsSection = () => {
  const { get } = useSiteContent();
  const block = get("goals");

  // Extract lines
  const rawLines = (block.content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // If first line doesn't start with bullet, treat it as subtitle
  let subtitle = "Beyond the Pages turns every category into a Literary Realm waiting to be explored.";
  let items: string[] = [];

  rawLines.forEach((line) => {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      items.push(line.replace(/^[•\-*–]\s*/, ""));
    } else if (!items.length && line.length > 5) {
      subtitle = line;
    } else {
      items.push(line);
    }
  });

  if (!block.visible || items.length === 0) return null;

  return (
    <section id="goals" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {block.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((text, index) => {
            const Icon = ICONS[index % ICONS.length];
            const tone = TONES[index % TONES.length];
            return (
              <div
                key={index}
                className="group p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, hsl(${tone} / 0.16), hsl(${tone} / 0.04))`,
                  borderColor: `hsl(${tone} / 0.35)`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: `hsl(${tone} / 0.22)` }}
                >
                  <Icon className="w-7 h-7" style={{ color: `hsl(${tone})` }} />
                </div>
                <p className="text-foreground text-lg leading-relaxed">{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GoalsSection;
