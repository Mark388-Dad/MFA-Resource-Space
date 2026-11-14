import { BookOpen, MessageCircle, Users, Star, Globe2 } from "lucide-react";
import { useSiteContent, contentLines } from "@/hooks/useSiteContent";

const ICONS = [BookOpen, Star, Globe2, MessageCircle, Users];
const TONES = [
  "var(--v-electric-blue)",
  "var(--v-yellow)",
  "var(--v-green)",
  "var(--v-magenta)",
  "var(--v-cyan)",
];

const OutcomesSection = () => {
  const { get } = useSiteContent();
  const block = get("outcomes");
  const lines = (block.content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let intro = "By completing this journey, you will:";
  let items: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      items.push(line.replace(/^[•\-*–]\s*/, ""));
    } else if (!items.length && (line.endsWith(":") || line.length > 5)) {
      intro = line;
    } else {
      items.push(line);
    }
  });

  if (!block.visible || items.length === 0) return null;

  return (
    <section id="outcomes" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              {block.title || "What Will You Gain?"}
            </h2>
            <p className="text-muted-foreground text-lg">{intro}</p>
          </div>

          <div className="space-y-4">
            {items.map((text, index) => {
              const Icon = ICONS[index % ICONS.length];
              const tone = TONES[index % TONES.length];
              return (
                <div
                  key={index}
                  className="flex items-center gap-6 p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    background: `linear-gradient(120deg, hsl(${tone} / 0.16), hsl(${tone} / 0.04))`,
                    borderColor: `hsl(${tone} / 0.35)`,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
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
      </div>
    </section>
  );
};

export default OutcomesSection;
