import { Lightbulb, Settings, UserCircle, Sparkles, Users2, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const defaultIb = [
  {
    category: "ATL Skills",
    items: ["Communication", "Research", "Reflection"],
    icon: Settings,
    tone: "var(--v-electric-blue)",
  },
  {
    category: "IB Learner Profile",
    items: ["Thinkers", "Caring", "Communicators", "Open-minded"],
    icon: UserCircle,
    tone: "var(--v-violet)",
  },
  {
    category: "TOK Inquiry",
    items: ["How do stories shape what we know about identity, justice and truth?"],
    icon: Lightbulb,
    tone: "var(--v-yellow)",
  },
];

const defaultCbc = [
  { label: "Critical Thinking & Problem Solving", icon: Lightbulb, tone: "var(--v-orange)" },
  { label: "Communication & Collaboration", icon: Users2, tone: "var(--v-green)" },
  { label: "Creativity & Imagination", icon: Sparkles, tone: "var(--v-magenta)" },
  { label: "Digital Literacy", icon: MonitorSmartphone, tone: "var(--v-cyan)" },
  { label: "Self-Efficacy & Self-Management", icon: ShieldCheck, tone: "var(--v-mint)" },
  { label: "Citizenship", icon: Users2, tone: "var(--v-hot-pink)" },
];

const IBConnectionsSection = () => {
  const { get } = useSiteContent();
  const block = get("ib_connections");

  // Parse sections
  const content = block.content || "";
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const subtitle = lines[0] && !lines[0].startsWith("[") && !lines[0].startsWith("•")
    ? lines[0]
    : "Every realm you explore builds the skills and competencies at the heart of both frameworks.";

  // Extract sections if tagged: [IB_ATL], [IB_PROFILE], [TOK], [CBC]
  let atlItems: string[] = [];
  let profileItems: string[] = [];
  let tokQuestion: string = "";
  let cbcItems: string[] = [];

  let currentSection = "";
  lines.forEach((l) => {
    if (l === "[IB_ATL]") { currentSection = "atl"; return; }
    if (l === "[IB_PROFILE]") { currentSection = "profile"; return; }
    if (l === "[TOK]") { currentSection = "tok"; return; }
    if (l === "[CBC]") { currentSection = "cbc"; return; }

    const item = l.replace(/^[•\-*–]\s*/, "").trim();
    if (!item) return;

    if (currentSection === "atl") atlItems.push(item);
    else if (currentSection === "profile") profileItems.push(item);
    else if (currentSection === "tok") tokQuestion = item;
    else if (currentSection === "cbc") cbcItems.push(item);
  });

  const ibData = [
    {
      category: "ATL Skills",
      items: atlItems.length > 0 ? atlItems : defaultIb[0].items,
      icon: Settings,
      tone: "var(--v-electric-blue)",
    },
    {
      category: "IB Learner Profile",
      items: profileItems.length > 0 ? profileItems : defaultIb[1].items,
      icon: UserCircle,
      tone: "var(--v-violet)",
    },
    {
      category: "TOK Inquiry",
      items: tokQuestion ? [tokQuestion] : defaultIb[2].items,
      icon: Lightbulb,
      tone: "var(--v-yellow)",
    },
  ];

  const cbcList = cbcItems.length > 0
    ? cbcItems.map((label, idx) => {
        const fallback = defaultCbc[idx % defaultCbc.length];
        return {
          label,
          icon: fallback.icon,
          tone: fallback.tone,
        };
      })
    : defaultCbc;

  if (!block.visible) return null;

  return (
    <section id="ib-connections" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {block.title || "IB & CBC Connections"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* IB side */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-foreground">IB Connections</h3>
            {ibData.map((c) => (
              <div
                key={c.category}
                className="p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background: `linear-gradient(135deg, hsl(${c.tone} / 0.16), hsl(${c.tone} / 0.04))`,
                  borderColor: `hsl(${c.tone} / 0.35)`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `hsl(${c.tone} / 0.22)` }}>
                    <c.icon className="w-5 h-5" style={{ color: `hsl(${c.tone})` }} />
                  </div>
                  <h4 className="font-display text-lg font-semibold text-foreground">{c.category}</h4>
                </div>
                <ul className="space-y-2">
                  {c.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-foreground/80 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${c.tone})` }} />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CBC side */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold text-foreground">CBC Core Competencies</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {cbcList.map((c) => (
                <div
                  key={c.label}
                  className="p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[120px]"
                  style={{
                    background: `linear-gradient(135deg, hsl(${c.tone} / 0.16), hsl(${c.tone} / 0.04))`,
                    borderColor: `hsl(${c.tone} / 0.35)`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `hsl(${c.tone} / 0.22)` }}>
                    <c.icon className="w-5 h-5" style={{ color: `hsl(${c.tone})` }} />
                  </div>
                  <span className="font-medium text-foreground text-sm leading-snug">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IBConnectionsSection;
