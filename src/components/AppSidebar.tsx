import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Home,
  PlusCircle,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  Search,
  Bell,
  Mail,
  Target,
  Sparkles,
  Award,
  Library,
  Lightbulb,
  Flame,
  Layers,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ArrowLeft,
  ListChecks,
  Flag,
  FolderUp,
  Sliders,
  Users,
  Plus,
  Megaphone,
  Link2,
  IdCard,
  UserCog,
  KeyRound,
  CheckCircle2,
  Inbox,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppDownloadButton } from "@/components/AppDownloadBanner";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import AvatarUpload from "@/components/AvatarUpload";
import { TopbarChallengeToggle } from "@/components/TopbarChallengeToggle";
import { ActiveChallengeHeaderBanner } from "@/components/ActiveChallengeHeaderBanner";
import { useChallenges } from "@/contexts/ChallengeContext";
import { BroadcastCenterDialog } from "@/components/BroadcastCenterDialog";
import {
  getUnreadEmailCount,
  subscribeToInboxRealtime,
  syncSupabaseNotificationsToInbox,
} from "@/lib/emailRepliesManager";
import { useMainSidebar } from "@/lib/sidebarHelper";
import { useState, useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

interface AdminNavItem {
  key: string;
  label: string;
  desc?: string;
  to: string;
  icon: LucideIcon;
  tone: string;
  badgeType?: "inbox";
  external?: boolean;
}

interface AdminNavGroup {
  step: string;
  label: string;
  subtitle?: string;
  statusText?: string;
  accent: string;
  items: AdminNavItem[];
}

/**
 * Unified Librarian & Admin Sidebar Groups.
 * Arranged in clear operational flow with floating rounded linear-gradient sections.
 */
const LIBRARIAN_SIDEBAR_GROUPS: AdminNavGroup[] = [
  {
    step: "01",
    label: "Reading Portal",
    subtitle: "Overview, rankings, inbox & studio",
    accent: "var(--v-emerald)",
    items: [
      { key: "route:/dashboard", label: "Dashboard", desc: "Academy KPIs & cohorts", to: "/dashboard", icon: Home, tone: "var(--v-emerald)" },
      { key: "route:/challenges", label: "Challenges", desc: "Active reading quests", to: "/challenges", icon: Trophy, tone: "var(--v-yellow)" },
      { key: "route:/leaderboard", label: "Full Leaderboard", desc: "School-wide standings", to: "/leaderboard", icon: BarChart3, tone: "var(--v-gold)" },
      { key: "route:/inbox", label: "Inbox", desc: "Reading mail & replies", to: "/inbox", icon: Inbox, tone: "var(--v-orange)", badgeType: "inbox" },
      { key: "certificates-portal", label: "Certificates", desc: "Certificate Studio", to: "/admin?s=certificates", icon: BadgeCheck, tone: "var(--v-cyan)" },
      { key: "route:/settings", label: "Settings", desc: "Account & theme", to: "/settings", icon: Settings, tone: "var(--v-mint)" },
    ],
  },
  {
    step: "02",
    label: "Challenge Operations",
    subtitle: "Submissions, flagged reviews, quests & bulk imports",
    accent: "var(--v-electric-blue)",
    items: [
      { key: "submissions", label: "All Submissions", desc: "Approve, review & export", to: "/admin?s=submissions", icon: ListChecks, tone: "var(--v-emerald)" },
      { key: "flagged", label: "Flagged Queue", desc: "Plagiarism & policy review", to: "/admin?s=flagged", icon: Flag, tone: "var(--v-red)" },
      { key: "challenges", label: "Active Challenges", desc: "Manage live reading quests", to: "/admin?s=challenges", icon: Trophy, tone: "var(--v-yellow)" },
      { key: "create", label: "Create Challenge", desc: "Launch new challenge", to: "/admin?s=create", icon: Plus, tone: "var(--v-green)" },
      { key: "categories", label: "Reading Categories", desc: "Realms & prompt rules", to: "/admin?s=categories", icon: Layers, tone: "var(--v-cyan)" },
      { key: "import", label: "Bulk Import", desc: "CSV & spreadsheet loader", to: "/admin?s=import", icon: FolderUp, tone: "var(--v-mint)" },
    ],
  },
  {
    step: "03",
    label: "Participant Management",
    subtitle: "Enrolment, student profiles, staff roles & certificates",
    accent: "var(--v-cobalt)",
    items: [
      { key: "registrations", label: "Enrolment Roster", desc: "Students & staff joined", to: "/admin?s=registrations", icon: Users, tone: "var(--v-electric-blue)" },
      { key: "students", label: "Student Profiles", desc: "Edit cohorts & houses", to: "/admin?s=students", icon: IdCard, tone: "var(--v-emerald)" },
      { key: "members", label: "Staff Members", desc: "Tutors, patrons & roles", to: "/admin?s=members", icon: UserCog, tone: "var(--v-cobalt)" },
      { key: "codes", label: "Access Codes", desc: "Generate cohort codes", to: "/admin?s=codes", icon: KeyRound, tone: "var(--v-yellow)" },
      { key: "leaderboard", label: "Leaderboard Audit", desc: "Full school rankings", to: "/admin?s=leaderboard", icon: BarChart3, tone: "var(--v-gold)" },
      { key: "certificate-dispatch", label: "Certificate Dispatch", desc: "Email verified awards", to: "/admin?s=certificate-dispatch", icon: Award, tone: "var(--v-violet)" },
    ],
  },
  {
    step: "04",
    label: "System Controls",
    subtitle: "Session state, broadcasts, catalog links & verification",
    statusText: "Portal Live",
    accent: "var(--v-orange)",
    items: [
      { key: "controls", label: "Session & Theme", desc: "Open/lock dates & mode", to: "/admin?s=controls", icon: Sliders, tone: "var(--v-yellow)" },
      { key: "broadcast", label: "Mass Broadcaster", desc: "Email students & staff", to: "/admin?s=broadcast", icon: Megaphone, tone: "var(--v-hot-pink)" },
      { key: "certificates", label: "Certificate Studio", desc: "Templates & PDF export", to: "/admin?s=certificates", icon: Award, tone: "var(--v-gold)" },
      { key: "homepage", label: "Homepage Studio", desc: "Edit public landing page", to: "/admin?s=homepage", icon: Home, tone: "var(--v-orange)" },
      { key: "system-links", label: "System Links", desc: "URLs & redirect engine", to: "/admin?s=system-links", icon: Link2, tone: "var(--v-cyan)" },
      { key: "route:/admin/migration-check", label: "Migration Check", desc: "Verify schema & rules", to: "/admin/migration-check", icon: CheckCircle2, tone: "var(--v-violet)" },
      { key: "external:follet", label: "MFA Follet Destiny", desc: "Open school book catalog", to: "https://mfa.follettdestiny.com", icon: Library, tone: "var(--v-mint)", external: true },
    ],
  },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, signOut } = useAuth();
  const { selectedChallenge, selectedChallengeId } = useChallenges();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { get } = useSiteContent();
  const brand = get("brand");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isCreator = Boolean(
    profile?.email?.toLowerCase().includes("tonny") ||
    user?.email?.toLowerCase().includes("tonny")
  );
  // Tonny is strictly a student role. Staff is non-student roles.
  const isStaff = Boolean(profile?.role && profile.role !== "student");
  const isAdminUser = Boolean(
    (profile?.role === "admin" ||
     profile?.role === "librarian" ||
     user?.email?.toLowerCase().includes("admin") ||
     user?.email?.toLowerCase().includes("librarian")) &&
    !isCreator
  );
  const isLibrarian = Boolean(
    profile?.role === "librarian" ||
    profile?.role === "admin" ||
    profile?.email?.toLowerCase().includes("librarian") ||
    profile?.email?.toLowerCase().includes("admin") ||
    isCreator
  );

  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin");
  // Administrators always have the serious Admin Command Center sidebar
  const showAdminSidebar = isAdminRoute || isAdminUser;

  const activeAdminSection = params.get("s") ?? "submissions";
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const userAccountKey = profile?.email || user?.email || profile?.user_id || user?.id;
  const [unreadRepliesCount, setUnreadRepliesCount] = useState<number>(() => getUnreadEmailCount(userAccountKey));
  const { isCollapsed: sidebarCollapsed, toggle: toggleSidebar } = useMainSidebar();

  useEffect(() => {
    const handleUpdate = () => setUnreadRepliesCount(getUnreadEmailCount(userAccountKey));
    handleUpdate();
    const unsub = subscribeToInboxRealtime(userAccountKey, user?.id, async (detail) => {
      if (detail?.fromRemote && user?.id) {
        await syncSupabaseNotificationsToInbox(
          user.id,
          profile?.email || user?.email || "",
          profile?.full_name || "Academy Reader"
        );
      }
      handleUpdate();
    });
    return () => unsub();
  }, [userAccountKey, user?.id, profile?.email, user?.email, profile?.full_name]);

  // Admin is the Librarian: unified Head Librarian & Admin role title
  const roleTitle = profile?.role === "admin" || profile?.role === "librarian"
    ? "Head Librarian & Admin"
    : profile?.role === "head_of_year"
    ? `Head of Year (${profile.year_group || "Cohort"})`
    : profile?.role === "homeroom_tutor"
    ? `Homeroom Tutor (${profile.class_name || "Cohort"})`
    : profile?.role === "house_patron"
    ? `House Patron (${profile.house || "House"})`
    : profile?.role === "staff"
    ? "Staff Member"
    : isCreator
    ? `Student • Creator (${profile?.house || "Scholar"})`
    : `Student (${profile?.house || "Scholar"})`;

  // Primary portal navigation items: clean focused set for Students & non-admin Staff
  const studentNavItems: { path: string; label: string; icon: LucideIcon; tone: string }[] = !isStaff || isCreator
    ? [
        { path: "/dashboard", label: "Dashboard", icon: Home, tone: "var(--v-emerald)" },
        { path: "/submit", label: "Submit Book", icon: PlusCircle, tone: "var(--v-electric-blue)" },
        { path: "/progress", label: "My Progress", icon: BarChart3, tone: "var(--v-cyan)" },
        { path: "/leaderboard", label: "Leaderboard", icon: Trophy, tone: "var(--v-gold)" },
        { path: "/settings", label: "Settings", icon: Settings, tone: "var(--v-mint)" },
      ]
    : [
        { path: "/dashboard", label: "Dashboard", icon: Home, tone: "var(--v-emerald)" },
        { path: "/challenges", label: "Challenges", icon: Trophy, tone: "var(--v-yellow)" },
        { path: "/leaderboard", label: "Leaderboard", icon: BarChart3, tone: "var(--v-gold)" },
        { path: "/settings", label: "Settings", icon: Settings, tone: "var(--v-mint)" },
      ];

  const studentExtras = [
    { path: "/#goals", label: "Reading Goals", icon: Target, tone: "var(--v-green)" },
    { path: "/#points", label: "Points Guide", icon: Sparkles, tone: "var(--v-yellow)" },
    { path: "/#levels", label: "Levels & Badges", icon: Award, tone: "var(--v-magenta)" },
    { path: "/#categories", label: "Categories", icon: Layers, tone: "var(--v-cyan)" },
    { path: "/#reflections", label: "Reflection Prompts", icon: Lightbulb, tone: "var(--v-orange)" },
    { path: "/#outcomes", label: "Reading Outcomes", icon: Flame, tone: "var(--v-red)" },
    { path: "/#ib", label: "IB Connections", icon: Compass, tone: "var(--v-electric-blue)" },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar border-r border-sidebar-border p-4 overflow-y-auto transition-transform duration-300 ease-in-out shadow-lg md:shadow-none",
          sidebarCollapsed ? "-translate-x-full pointer-events-none" : "translate-x-0"
        )}
      >
        {/* Sidebar Header with School Logo Floating Naturally */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to={showAdminSidebar ? "/dashboard" : "/dashboard"}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-sidebar-accent/50 transition-colors flex-1 min-w-0 group"
          >
            {/* School Logo Floating Naturally with No Square Background */}
            <img
              src="/school-badge.png"
              alt="M-PESA Foundation Academy"
              className="w-10 h-10 object-contain drop-shadow-md bg-transparent select-none shrink-0 transition-transform group-hover:scale-105"
            />
            <span className="leading-tight min-w-0">
              <span className="block font-display text-[13px] font-bold tracking-tight leading-snug line-clamp-2 text-sidebar-foreground">
                {showAdminSidebar
                  ? (selectedChallenge?.id === "all" || !selectedChallenge?.title || selectedChallenge.title.startsWith("45-Book Reading Challenge")
                      ? "45-Book Reading Challenge 2025/2026"
                      : selectedChallenge.title)
                  : selectedChallenge?.title
                  ? selectedChallenge.title.split(":")[0]
                  : brand.title}
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-[0.14em] text-primary truncate mt-0.5">
                {selectedChallengeId === "all"
                  ? "45 Books Quest • Combined"
                  : `${selectedChallenge?.target_books || 45} Books Quest`}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide main sidebar (expand reading workspace)"
            className="p-1.5 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: UNIFIED LIBRARIAN & ADMIN SIDEBAR (Full Portal + Command Center)  */}
        {/* Color-coded section containers arranged in clear operational flow order.  */}
        {/* ========================================================================= */}
        {showAdminSidebar ? (
          <nav className="flex-1 space-y-3 pr-0.5">
            {LIBRARIAN_SIDEBAR_GROUPS.map((group) => (
              <div
                key={group.label}
                className="rounded-3xl border p-2.5 space-y-1.5 shadow-sm transition-colors"
                style={{
                  borderColor: `hsl(${group.accent} / 0.30)`,
                  background: `linear-gradient(155deg, hsl(${group.accent} / 0.12), hsl(${group.accent} / 0.03), hsl(var(--sidebar)))`,
                }}
              >
                <div className="px-2 pt-0.5 pb-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[11px] font-extrabold tracking-wide uppercase truncate"
                      style={{ color: `hsl(${group.accent})` }}
                    >
                      {group.label}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-lg shrink-0"
                      style={{
                        background: `hsl(${group.accent} / 0.16)`,
                        color: `hsl(${group.accent})`,
                      }}
                    >
                      {group.statusText || group.step}
                    </span>
                  </div>
                  {group.subtitle && (
                    <p className="text-[10px] text-sidebar-foreground/65 leading-snug line-clamp-2">
                      {group.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isRouteItem = item.key.startsWith("route:");
                    const routePath = isRouteItem ? item.key.replace("route:", "") : "";
                    const effectiveKey = item.key === "certificates-portal" ? "certificates" : item.key;
                    const active = item.external
                      ? false
                      : isRouteItem
                      ? location.pathname === routePath ||
                        (routePath === "/inbox" && location.pathname === "/email-inbox")
                      : location.pathname === "/admin" && activeAdminSection === effectiveKey;

                    const inner = (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                            style={{ background: `hsl(${item.tone} / 0.18)` }}
                          >
                            <item.icon className="w-3.5 h-3.5" style={{ color: `hsl(${item.tone})` }} />
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate leading-tight">
                              {item.label}
                            </div>
                            {item.desc && (
                              <div className="text-[10px] text-sidebar-foreground/60 truncate leading-tight mt-0.5">
                                {item.desc}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.badgeType === "inbox" && (
                          <span
                            className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0",
                              unreadRepliesCount > 0
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {unreadRepliesCount}
                          </span>
                        )}
                      </>
                    );

                    if (item.external) {
                      return (
                        <a
                          key={item.key}
                          href={item.to}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-2xl border transition-all text-left hover:-translate-y-0.5 shadow-2xs"
                          style={{
                            borderColor: `hsl(${item.tone} / 0.30)`,
                            background: `linear-gradient(135deg, hsl(${item.tone} / 0.14), hsl(${item.tone} / 0.04))`,
                          }}
                        >
                          {inner}
                        </a>
                      );
                    }

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigate(item.to)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-2xl text-left transition-all",
                          active
                            ? "border shadow-sm"
                            : "hover:bg-sidebar-accent/70 border border-transparent"
                        )}
                        style={
                          active
                            ? {
                                background: `linear-gradient(135deg, hsl(${item.tone} / 0.24), hsl(${item.tone} / 0.06))`,
                                borderColor: `hsl(${item.tone} / 0.55)`,
                              }
                            : undefined
                        }
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        ) : (
          /* ========================================================================= */
          /* CASE 2: STUDENT & FACULTY SIDEBAR (Focused Portal + Easy Access Links)    */
          /* Students see zero admin controls; primary actions stay crisp & accessible.*/
          /* ========================================================================= */
          <nav className="flex-1 space-y-3 pr-0.5">
            <div
              className="rounded-2xl border p-2 space-y-1"
              style={{
                borderColor: "hsl(var(--v-emerald) / 0.25)",
                background: "linear-gradient(160deg, hsl(var(--v-emerald) / 0.06), hsl(var(--v-cyan) / 0.02))",
              }}
            >
              <div className="px-2 py-1 text-[10px] font-extrabold tracking-widest uppercase text-emerald-500">
                {!isStaff || isCreator ? "My Reading Menu" : "Staff Menu"}
              </div>

              {studentNavItems.slice(0, !isStaff || isCreator ? 4 : 3).map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--ring))]"
                        : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent/80"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                        active ? "bg-white/20" : ""
                      )}
                      style={!active ? { background: `hsl(${item.tone} / 0.16)` } : undefined}
                    >
                      <item.icon className="w-3.5 h-3.5" style={!active ? { color: `hsl(${item.tone})` } : undefined} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}

              {/* Reading Challenge Inbox Link */}
              <Link
                to="/inbox"
                title="Reading Challenge Inbox & Correspondence"
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all",
                  location.pathname === "/inbox" || location.pathname === "/email-inbox"
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--ring))]"
                    : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent/80"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={
                      location.pathname === "/inbox" || location.pathname === "/email-inbox"
                        ? { background: "rgba(255,255,255,0.2)" }
                        : { background: "hsl(var(--v-orange) / 0.16)" }
                    }
                  >
                    <Inbox
                      className="w-3.5 h-3.5"
                      style={
                        location.pathname === "/inbox" || location.pathname === "/email-inbox"
                          ? undefined
                          : { color: "hsl(var(--v-orange))" }
                      }
                    />
                  </span>
                  <span className="truncate">Inbox</span>
                </div>
                {unreadRepliesCount > 0 ? (
                  <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {unreadRepliesCount}
                  </span>
                ) : (
                  <span className="text-[10px] opacity-70 font-mono">0</span>
                )}
              </Link>

              {studentNavItems.slice(!isStaff || isCreator ? 4 : 3).map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--ring))]"
                        : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent/80"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                        active ? "bg-white/20" : ""
                      )}
                      style={!active ? { background: `hsl(${item.tone} / 0.16)` } : undefined}
                    >
                      <item.icon className="w-3.5 h-3.5" style={!active ? { color: `hsl(${item.tone})` } : undefined} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* More Access & Explore Section for Student Readers */}
            {!isStaff && (
              <div
                className="rounded-2xl border p-2 space-y-1"
                style={{
                  borderColor: "hsl(var(--v-electric-blue) / 0.22)",
                  background: "linear-gradient(160deg, hsl(var(--v-electric-blue) / 0.05), hsl(var(--v-magenta) / 0.02))",
                }}
              >
                <div className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/80">
                  Challenges &amp; Explore
                </div>
                <Link
                  to="/challenges"
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                    location.pathname === "/challenges"
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--v-yellow) / 0.15)" }}
                  >
                    <Trophy className="w-3.5 h-3.5" style={{ color: "hsl(var(--v-yellow))" }} />
                  </span>
                  <span className="truncate">Challenges</span>
                </Link>
                <Link
                  to="/certificates"
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                    location.pathname === "/certificates"
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--v-gold) / 0.15)" }}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" style={{ color: "hsl(var(--v-gold))" }} />
                  </span>
                  <span className="truncate">Certificates</span>
                </Link>
                {studentExtras.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent transition-all"
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${item.tone} / 0.15)` }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: `hsl(${item.tone})` }} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
                <a
                  href="https://mfa.follettdestiny.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent transition-all"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `hsl(var(--v-mint) / 0.15)` }}
                  >
                    <Library className="w-3.5 h-3.5" style={{ color: `hsl(var(--v-mint))` }} />
                  </span>
                  <span className="truncate">MFA Follet Destiny</span>
                </a>
              </div>
            )}
          </nav>
        )}

        {/* Promo card: MFA Follet Destiny catalog (strictly on student portal) */}
        {!showAdminSidebar && (
          <div
            className="mt-4 rounded-3xl border border-emerald-500/25 p-3.5 space-y-2.5 shadow-md"
            style={{
              background:
                "linear-gradient(155deg, hsl(var(--v-mint) / 0.14), hsl(var(--v-electric-blue) / 0.08), hsl(var(--sidebar-accent)))",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--v-mint) / 0.2)" }}
              >
                <Library className="w-3.5 h-3.5" style={{ color: "hsl(var(--v-mint))" }} />
              </span>
              <div className="text-xs font-bold text-foreground truncate">MFA Follet Destiny</div>
            </div>
            <p className="text-[11px] text-sidebar-foreground/70 leading-relaxed">
              Explore thousands of books across all reading realms in MFA Follet Destiny.
            </p>
            <Button asChild size="sm" className="w-full rounded-xl bg-background text-foreground hover:bg-muted text-xs h-8 font-semibold">
              <a href="https://mfa.follettdestiny.com" target="_blank" rel="noreferrer">
                Open MFA Follet Destiny
              </a>
            </Button>
            <AppDownloadButton
              className="w-full rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 justify-center h-8 text-xs"
              label="Download App"
            />
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </aside>

      {/* Main column */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "md:pl-0" : "md:pl-64"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 md:px-8 bg-background/80 backdrop-blur border-b border-border">
          {/* Main Sidebar Toggle button on Desktop */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand Main Sidebar (Ctrl+B)" : "Hide Main Sidebar (Expand Workspace)"}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground/80 hover:text-foreground transition-all shadow-2xs shrink-0"
          >
            {sidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4 text-primary" />
                <span className="hidden xl:inline text-[11px]">Show Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
                <span className="hidden xl:inline text-[11px]">Hide Sidebar</span>
              </>
            )}
          </button>

          {/* Mobile floating logo */}
          <Link to={showAdminSidebar ? "/admin?s=submissions" : "/dashboard"} className="md:hidden flex items-center gap-2">
            <img
              src="/school-badge.png"
              alt="M-PESA Foundation Academy"
              className="w-8 h-8 object-contain drop-shadow-xs bg-transparent select-none shrink-0"
            />
          </Link>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={showAdminSidebar ? "Search submissions, students, access codes..." : "Search books, authors, challenges..."}
                className="pl-9 bg-muted border-0 rounded-full h-10 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 sm:flex-none" />
          <ThemeToggle compact />
          <button
            onClick={() => navigate("/inbox")}
            title="Inbox — Reading Challenge Mail"
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
          >
            <Mail className="w-4 h-4 text-amber-500" />
            {unreadRepliesCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setBroadcastOpen(true)}
            title="Academy Notifications & Announcements"
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
          </button>
          {/* Challenge Toggle beside Profile Avatar */}
          <div className="flex items-center pl-2 border-l border-border">
            <TopbarChallengeToggle isStaff={Boolean(isStaff)} />
          </div>

          <div className="flex items-center gap-3 pl-2 border-l border-border">
            <AvatarUpload size={36} />

            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <span>{profile?.full_name || user?.email?.split('@')[0] || "User"}</span>
                {(profile?.role === "admin" || profile?.role === "librarian") && (
                  <span className="text-[9px] bg-primary/15 text-primary border border-primary/30 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {roleTitle}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border flex items-center justify-around py-2">
          {showAdminSidebar ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  location.pathname === "/dashboard" ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin?s=submissions")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  activeAdminSection === "submissions" && isAdminRoute ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <ListChecks className="w-5 h-5" />
                <span>Submissions</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin?s=controls")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  activeAdminSection === "controls" && isAdminRoute ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <Sliders className="w-5 h-5" />
                <span>Controls</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin?s=broadcast")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  activeAdminSection === "broadcast" && isAdminRoute ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <Megaphone className="w-5 h-5" />
                <span>Broadcast</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/inbox")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  location.pathname === "/inbox" ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <Inbox className="w-5 h-5" />
                <span>Inbox</span>
              </button>
            </>
          ) : (
            <>
              {studentNavItems.slice(0, 4).map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs",
                      active ? "text-primary font-semibold" : "text-sidebar-foreground/60"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label.replace("My ", "").split(" ")[0]}</span>
                  </Link>
                );
              })}
              <Link
                to="/inbox"
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs relative",
                  location.pathname === "/inbox" ? "text-primary font-semibold" : "text-sidebar-foreground/60"
                )}
              >
                <Inbox className="w-5 h-5" />
                <span>Inbox</span>
                {unreadRepliesCount > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Link>
            </>
          )}
        </div>

        <div className="flex-1 pb-20 md:pb-0 w-full min-w-0">
          <div className="w-full px-2 sm:px-4 md:px-5 pt-2">
            <ActiveChallengeHeaderBanner />
          </div>
          {children}

          {/* Below the website: Creator Recognition & Academy Footer */}
          <footer className="w-full mt-16 py-6 px-4 sm:px-6 md:px-8 border-t border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold text-foreground/80">M-PESA Foundation Academy</span>
                <span>• 45-Book Reading Challenge</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border border-border/80 shadow-2xs text-foreground/90 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Created By <strong className="text-primary font-bold">Tonny Odundo</strong>
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                Thinkers. Doers. Leaders.
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Academy Communications & Welcome Letters Modal */}
      <BroadcastCenterDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        userId={user?.id}
        isStaff={Boolean(isStaff)}
        staffRole={profile?.role}
        yearGroup={profile?.year_group}
        className={profile?.class_name}
        house={profile?.house}
      />
    </div>
  );
};

export default AppShell;
