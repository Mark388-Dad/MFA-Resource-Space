import { Crown, Medal, Award } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const AchievementLevels = () => {
  const { get } = useSiteContent();
  const header = get("levels_header");
  const bronze = get("levels_bronze");
  const silver = get("levels_silver");
  const gold = get("levels_gold");

  const parseLevel = (block: { title: string; content: string }, fallback: {
    name: string;
    books: number;
    semester: string;
    description: string;
    focus: string;
  }) => {
    const lines = (block.content || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const firstLineParts = (lines[0] || "").split("|");
    const semester = firstLineParts[0]?.trim() || fallback.semester;
    const books = parseInt(firstLineParts[1]?.replace(/[^0-9]/g, "") || String(fallback.books), 10);
    const description = lines[1] || fallback.description;
    const focus = (lines[2] || fallback.focus).replace(/^["']|["']$/g, "");

    return {
      name: block.title || fallback.name,
      books: isNaN(books) ? fallback.books : books,
      semester,
      description,
      focus,
    };
  };

  const bronzeData = parseLevel(bronze, {
    name: "Bronze Reader",
    books: 15,
    semester: "First Semester",
    description: "Complete reflections inspired by 'Titles That Speak' and 'Moments That Change Everything'.",
    focus: "How titles and turning points shape meaning.",
  });

  const silverData = parseLevel(silver, {
    name: "Silver Reader",
    books: 30,
    semester: "Second Semester",
    description: "Explore 'Characters That Stay With Us' through deeper reflection.",
    focus: "How characters reveal identity, resilience, and moral growth.",
  });

  const goldData = parseLevel(gold, {
    name: "Gold Reader",
    books: 45,
    semester: "Full Year",
    description: "Create a final reflection under 'Stories That Matter'.",
    focus: "Connecting your reading journey to personal and global themes.",
  });

  const levels = [
    {
      ...bronzeData,
      icon: Medal,
      bgClass: "bg-gradient-to-br from-amber-700/20 to-amber-900/10 border-amber-700/30",
      iconBg: "bg-amber-700/20",
      iconColor: "text-amber-700 dark:text-amber-400",
    },
    {
      ...silverData,
      icon: Award,
      bgClass: "bg-gradient-to-br from-slate-400/20 to-slate-600/10 border-slate-400/30",
      iconBg: "bg-slate-400/20",
      iconColor: "text-slate-500 dark:text-slate-300",
    },
    {
      ...goldData,
      icon: Crown,
      bgClass: "bg-gradient-to-br from-gold/20 to-gold-dark/10 border-gold/30",
      iconBg: "bg-gold/20",
      iconColor: "text-gold-dark dark:text-amber-300",
    },
  ];

  if (!header.visible) return null;

  return (
    <section id="achievement-levels" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {header.title || "Achievement Levels"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {header.content || "Select one book under each achievement level and reflect based on the provided instructions."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {levels.map((level, index) => (
            <div 
              key={index}
              className={`relative rounded-3xl p-8 border-2 ${level.bgClass} hover:scale-105 transition-all duration-300 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {level.semester}
                  </span>
                  <div className={`w-12 h-12 rounded-2xl ${level.iconBg} flex items-center justify-center`}>
                    <level.icon className={`w-6 h-6 ${level.iconColor}`} />
                  </div>
                </div>

                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  {level.name}
                </h3>
                <div className="text-3xl font-display font-extrabold text-foreground mb-4">
                  {level.books} <span className="text-sm font-normal text-muted-foreground">books</span>
                </div>

                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                  {level.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border/50">
                <blockquote className="text-xs italic text-muted-foreground">
                  "{level.focus}"
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AchievementLevels;
