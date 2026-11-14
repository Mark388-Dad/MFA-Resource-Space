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
import { getUnreadEmailCount } from "@/lib/emailRepliesManager";
import { useMainSidebar } from "@/lib/sidebarHelper";
import { useState, useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

/**
 * Dedicated Admin Command Center Sidebar Groups.
 * Rendered for administrators and librarians, or when navigating admin routes.
 */
const ADMIN_COMMAND_GROUPS = [
  {
    label: "Submissions & Reviews",
    items: [
      { key: "submissions", label: "All Submissions", icon: ListChecks, tone: "var(--v-electric-blue)" },
      { key: "flagged", label: "Flagged", icon: Flag, tone: "var(--v-red)" },
      { key: "import", label: "Bulk Import", icon: FolderUp, tone: "var(--v-cyan)" },
    ],
  },
  {
    label: "Programme & Controls",
    items: [
      { key: "controls", label: "Session & Theme Controls", icon: Sliders, tone: "var(--v-emerald)" },
      { key: "challenges", label: "Active Challenges", icon: Trophy, tone: "var(--v-yellow)" },
      { key: "registrations", label: "Enrolment & Participants", icon: Users, tone: "var(--v-emerald)" },
      { key: "create", label: "Create Challenge", icon: Plus, tone: "var(--v-green)" },
      { key: "categories", label: "Reading Categories", icon: Layers, tone: "var(--v-fuchsia)" },
      { key: "certificates", label: "Certificate Studio", icon: Award, tone: "var(--v-gold)" },
    ],
  },
  {
    label: "Publishing & Broadcasts",
    items: [
      { key: "broadcast", label: "Mass Broadcaster", icon: Megaphone, tone: "var(--v-hot-pink)" },
      { key: "certificate-dispatch", label: "Certificate Dispatch", icon: Award, tone: "var(--v-gold)" },
      { key: "system-links", label: "System Links & Redirects", icon: Link2, tone: "var(--v-cyan)" },
      { key: "homepage", label: "Homepage Studio", icon: Home, tone: "var(--v-mint)" },
    ],
  },
  {
    label: "People & Governance",
    items: [
      { key: "students", label: "Student Profiles", icon: IdCard, tone: "var(--v-emerald)" },
      { key: "members", label: "Staff Members", icon: UserCog, tone: "var(--v-cobalt)" },
      { key: "codes", label: "Access Codes", icon: KeyRound, tone: "var(--v-yellow)" },
    ],
  },
  {
    label: "Data & Leaderboard Audit",
    items: [
      { key: "leaderboard", label: "Full Leaderboard Audit", icon: Trophy, tone: "var(--v-gold)" },
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
    window.addEventListener("mfa_email_replies_updated", handleUpdate);
    return () => window.removeEventListener("mfa_email_replies_updated", handleUpdate);
  }, [userAccountKey]);

  // Clean, professional role subtitle
  const roleTitle = profile?.role === "admin"
    ? "Academy Administrator"
    : profile?.role === "librarian"
    ? "Head Librarian"
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

  // Student portal navigation items (Submit Book & My Progress strictly for student readers & creator)
  const studentNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/challenges", label: "Challenges", icon: Trophy },
    ...(!isStaff || isCreator
      ? [
          { path: "/submit", label: "Submit Book", icon: PlusCircle },
          { path: "/progress", label: "My Progress", icon: BarChart3 },
        ]
      : []),
    { path: isStaff && !isCreator ? "/admin?s=leaderboard" : "/leaderboard", label: "Full Leaderboard", icon: Trophy },
    { path: "/settings", label: "Settings", icon: Settings },
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
            to={showAdminSidebar ? "/admin?s=submissions" : "/dashboard"}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-sidebar-accent/50 transition-colors flex-1 min-w-0 group"
          >
            {/* School Logo Floating Naturally with No Square Background */}
            <img
              src="/school-badge.png"
              alt="M-PESA Foundation Academy"
              className="w-10 h-10 object-contain drop-shadow-md bg-transparent select-none shrink-0 transition-transform group-hover:scale-105"
            />
            <span className="leading-tight min-w-0">
              <span className="block font-display text-sm font-bold tracking-tight truncate text-sidebar-foreground">
                {showAdminSidebar
                  ? "Admin Command"
                  : selectedChallenge?.title
                  ? selectedChallenge.title.split(":")[0]
                  : brand.title}
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-[0.14em] text-primary truncate">
                {showAdminSidebar
                  ? "Academy Workspace"
                  : selectedChallengeId === "all"
                  ? "Combined Portal"
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
        {/* CASE 1: ADMIN COMMAND CENTER SIDEBAR (Active for Administrators/Librarians) */}
        {/* Strictly Admin workspace: No student submit book, challenge inbox, etc.   */}
        {/* ========================================================================= */}
        {showAdminSidebar ? (
          <nav className="flex-1 space-y-4">
            {/* Quick Switch Button between Admin Command & Student Portal */}
            <div className="px-1">
              {isAdminRoute ? (
                <Link
                  to="/dashboard"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/70 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="w-3.5 h-3.5 text-primary transition-transform group-hover:-translate-x-0.5" />
                    <span>Preview Student Portal</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 font-mono">ESC</span>
                </Link>
              ) : (
                <Link
                  to="/admin?s=submissions"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:text-primary-foreground bg-primary/10 hover:bg-primary border border-primary/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Return to Admin Command</span>
                  </div>
                  <span className="text-[10px] font-mono">ADMIN</span>
                </Link>
              )}
            </div>

            {/* Serious Admin Navigation Groups */}
            {ADMIN_COMMAND_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === "/admin" && activeAdminSection === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigate(`/admin?s=${item.key}`)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                          active
                            ? "text-foreground border shadow-xs font-semibold"
                            : "text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent"
                        )}
                        style={
                          active
                            ? {
                                background: `linear-gradient(135deg, hsl(${item.tone} / 0.22), hsl(${item.tone} / 0.05))`,
                                borderColor: `hsl(${item.tone} / 0.45)`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `hsl(${item.tone} / 0.15)` }}
                        >
                          <item.icon className="w-3.5 h-3.5" style={{ color: `hsl(${item.tone})` }} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Dedicated System Verification Link */}
            <div className="pt-2 border-t border-sidebar-border space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                System Verification
              </div>
              <Link
                to="/admin/migration-check"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left",
                  location.pathname === "/admin/migration-check"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-primary/15">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                </span>
                <span className="truncate">Migration Check</span>
              </Link>
            </div>
          </nav>
        ) : (
          /* ========================================================================= */
          /* CASE 2: STUDENT PORTAL SIDEBAR (Standard Student Reader Experience)       */
          /* Submit Book and My Progress strictly for student readers.                 */
          /* ========================================================================= */
          <nav className="flex-1 space-y-1">
            {studentNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--ring))]"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Reading Challenge Inbox Link */}
            <Link
              to="/inbox"
              title="Reading Challenge Inbox & Correspondence"
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                location.pathname === "/inbox" || location.pathname === "/email-inbox"
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--ring))]"
                  : "text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-amber-500" />
                <span>Challenge Inbox</span>
              </div>
              {unreadRepliesCount > 0 ? (
                <span className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  {unreadRepliesCount}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-mono">0</span>
              )}
            </Link>

            {/* Explore Section for Student Readers */}
            {!isStaff && (
              <div className="pt-4 mt-3 border-t border-sidebar-border space-y-1.5">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                  Explore
                </div>
                {studentExtras.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent transition-all"
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
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-sidebar-foreground/75 hover:text-foreground hover:bg-sidebar-accent transition-all"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `hsl(var(--v-mint) / 0.15)` }}
                  >
                    <Library className="w-3.5 h-3.5" style={{ color: `hsl(var(--v-mint))` }} />
                  </span>
                  <span>Book Catalog</span>
                </a>
              </div>
            )}
          </nav>
        )}

        {/* Promo card: Follett catalog (strictly on student portal) */}
        {!showAdminSidebar && (
          <div className="mt-4 rounded-2xl bg-sidebar-accent p-3.5 space-y-2">
            <div className="text-xs font-semibold">Follett Library Catalog</div>
            <p className="text-[11px] text-sidebar-foreground/60 leading-relaxed">
              Explore thousands of books across all 15 reading realms.
            </p>
            <Button asChild size="sm" className="w-full bg-background text-foreground hover:bg-muted text-xs h-7">
              <a href="https://mfa.follettdestiny.com" target="_blank" rel="noreferrer">
                Open Catalog
              </a>
            </Button>
            <AppDownloadButton
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 justify-center h-7 text-xs"
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
            title="Reading Challenge Inbox & Dispatches"
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
                onClick={() => navigate("/admin?s=students")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                  activeAdminSection === "students" && isAdminRoute ? "text-primary font-bold" : "text-sidebar-foreground/60"
                )}
              >
                <IdCard className="w-5 h-5" />
                <span>Students</span>
              </button>
              <Link
                to={isAdminRoute ? "/dashboard" : "/admin?s=submissions"}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                {isAdminRoute ? <ArrowLeft className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
                <span>{isAdminRoute ? "Portal" : "Admin"}</span>
              </Link>
            </>
          ) : (
            <>
              {studentNavItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs",
                      active ? "text-primary font-semibold" : "text-sidebar-foreground/60"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label.split(" ")[0]}</span>
                  </Link>
                );
              })}

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
