import { Target, Trophy, Medal, LayoutGrid, BookHeart, Globe, Flag } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const linkIcons = [Target, Trophy, Medal, LayoutGrid, BookHeart, Globe, Flag];
const defaultHrefs = [
  "#goals",
  "#points",
  "#achievement-levels",
  "#categories",
  "#reflections",
  "#ib-connections",
  "#outcomes",
];

const QuickLinks = () => {
  const { get } = useSiteContent();
  const ql = get("quicklinks");

  const rawItems = (ql.content || "Goals | Points | Levels | Categories | Reflections | IB Connections | Outcomes")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <nav className="flex flex-wrap items-center gap-3 pt-6">
      <span className="text-xs uppercase tracking-wider text-foreground/50 font-medium">
        {ql.title || "Jump to"}
      </span>
      {rawItems.map((label, idx) => {
        const Icon = linkIcons[idx % linkIcons.length];
        const href = defaultHrefs[idx % defaultHrefs.length];
        return (
          <a
            key={label}
            href={href}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-foreground/10 bg-foreground/[0.03] text-foreground/70 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
            {label}
          </a>
        );
      })}
    </nav>
  );
};

export default QuickLinks;
