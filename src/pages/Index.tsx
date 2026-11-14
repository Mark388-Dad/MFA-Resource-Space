import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HeroSection from "@/components/HeroSection";
import GoalsSection from "@/components/GoalsSection";
import PointsSection from "@/components/PointsSection";
import AchievementLevels from "@/components/AchievementLevels";
import CategoriesSection from "@/components/CategoriesSection";
import ReflectionPrompts from "@/components/ReflectionPrompts";
import IBConnectionsSection from "@/components/IBConnectionsSection";
import OutcomesSection from "@/components/OutcomesSection";
import Footer from "@/components/Footer";
import { Button } from '@/components/ui/button';
import { LogIn, LayoutDashboard, Trophy, BookOpen, Layers, PlusCircle, Sparkles, Edit3 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { HomepageCustomBlocks } from '@/components/HomepageCustomBlocks';
import { HomepageSidebarEditor } from '@/components/HomepageSidebarEditor';
import { useHomepageTheme } from '@/hooks/useSiteContent';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';

const Index = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { theme } = useHomepageTheme();

  const isCreator = Boolean(
    profile?.email?.toLowerCase().includes('tonny') ||
    user?.email?.toLowerCase().includes('tonny')
  );
  const isAdmin = Boolean(
    profile?.role === 'admin' ||
    profile?.role === 'librarian' ||
    isCreator
  );

  const fontClass =
    theme.fontFamily === 'serif' || theme.fontFamily === 'playfair'
      ? 'font-serif'
      : theme.fontFamily === 'cinzel'
      ? 'font-serif tracking-wider'
      : theme.fontFamily === 'california'
      ? 'font-serif tracking-normal'
      : theme.fontFamily === 'mono'
      ? 'font-mono'
      : theme.fontFamily === 'display'
      ? 'font-display'
      : 'font-sans';

  const scaleClass =
    theme.fontSizeScale === 'compact'
      ? 'text-sm'
      : theme.fontSizeScale === 'large'
      ? 'text-lg'
      : theme.fontSizeScale === 'xl'
      ? 'text-xl'
      : theme.fontSizeScale === 'expressive'
      ? 'text-2xl'
      : '';

  const effectClass = cn(
    theme.cardGlowEffect === 'radiant' && 'selection:bg-emerald-500/30',
    theme.cardGlowEffect === 'luxury' && 'selection:bg-amber-500/30',
    theme.borderRadiusStyle === 'sharp' && '[&_.rounded-2xl]:rounded-sm [&_.rounded-3xl]:rounded-md',
    theme.borderRadiusStyle === 'extra-rounded' && '[&_.rounded-2xl]:rounded-3xl [&_.rounded-3xl]:rounded-[2rem]',
    theme.borderRadiusStyle === 'pill' && '[&_.rounded-2xl]:rounded-full'
  );

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash || location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        const elem = document.getElementById(id);
        if (elem && typeof elem.scrollIntoView === 'function') {
          try {
            elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {
            // fallback for browsers that don't support smooth scroll options
            elem.scrollIntoView();
          }
        }
      }
    };

    // Run immediately and also with small delay to ensure DOM is mounted
    scrollToHash();
    const t = setTimeout(scrollToHash, 150);
    window.addEventListener('hashchange', scrollToHash);

    return () => {
      clearTimeout(t);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [location]);

  return (
    <main className={cn("min-h-screen relative theme-soft transition-all duration-200", fontClass, scaleClass, effectClass)}>
      <SEO
        title="45-Book Reading Challenge — M-PESA Foundation Academy"
        description="Official M-PESA Foundation Academy reading challenge: 45 books, reflections across 15 IB realms, whole-school reader leaderboards, and verified achievement certificates."
        keywords="M-Pesa Foundation Academy, 45-Book Reading Challenge, Student Reading Leaderboard, IB World School, School Certificate Studio, Kenya House, Kilimanjaro House, Longonot House, Elgon House, Literacy Portal, Tonny Odundo"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            "name": "MFA 45-Book Reading Challenge",
            "description": "A comprehensive whole-school literacy initiative empowering MYP and DP students to read 45 books across diverse genres and IB learner traits.",
            "provider": {
              "@type": "EducationalOrganization",
              "name": "M-PESA Foundation Academy",
              "url": "https://mpesafoundationacademy.ac.ke"
            },
            "educationalProgramMode": "Blended",
            "timeToComplete": "P1Y"
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is the MFA 45-Book Reading Challenge?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The 45-Book Reading Challenge is M-PESA Foundation Academy's whole-school literacy challenge where scholars read and reflect upon 45 books across 15 themed categories to foster lifelong inquiry and critical thinking."
                }
              },
              {
                "@type": "Question",
                "name": "How are points and achievement levels calculated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Scholars earn 10 points for each approved book reflection plus bonus milestone points. Achievements range from Level 1 (Bronze Reader) through Level 5 (Grand Master of the Quill)."
                }
              },
              {
                "@type": "Question",
                "name": "How can achievement certificates be verified?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Every certificate features a cryptographic serial number and QR verification link queryable 24/7 on the official MFA Certificate Verification Portal."
                }
              }
            ]
          }
        ]}
      />
      {/* Top Navigation Bar on Main Home Page */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/40 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/school-badge.png"
              alt="M-Pesa Foundation Academy Badge"
              className="h-9 w-9 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <span className="block font-display text-sm sm:text-base font-bold text-foreground">
                45-Book Reading Challenge
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                M-Pesa Foundation Academy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-foreground/80">
            <Link
              to="/challenges"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Challenges</span>
            </Link>
            <Link
              to="/leaderboard"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span>Leaderboard</span>
            </Link>
            <a
              href="#categories"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>15 Realms</span>
            </a>
            <a
              href="#goals"
              className="px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              Goals
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Live Customizer trigger in header - Exclusively for Admin & Librarian */}
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditorOpen(true)}
                className="text-xs h-9 gap-1.5 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 font-bold shadow-xs"
                title="Open Homepage Live Customizer & Blocks Studio"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Customize Homepage</span>
              </Button>
            )}

            <ThemeToggle compact />
            {user ? (
              <div className="flex items-center gap-2">
                {!isAdmin && (
                  <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex text-xs h-9 gap-1.5">
                    <Link to="/submit">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Submit Book
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 shadow-md gap-1.5">
                  <Link to={(profile?.role === 'librarian' || profile?.role === 'admin') ? "/admin?s=submissions" : "/dashboard"}>
                    <LayoutDashboard className="w-4 h-4" />
                    {(profile?.role === 'librarian' || profile?.role === 'admin') ? "Admin Command" : "Dashboard"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex text-xs h-9 gap-1.5">
                  <Link to="/challenges">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Challenges
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 shadow-md gap-1.5">
                  <Link to="/auth">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {theme.sectionSwitches.hero && <HeroSection />}

      {/* DYNAMIC HOMEPAGE CUSTOM BLOCKS CANVAS (Well-Rounded Colorful Divs) */}
      {theme.sectionSwitches.customBlocks && (
        <HomepageCustomBlocks onOpenEditor={() => setIsEditorOpen(true)} canEdit={isAdmin} />
      )}

      {theme.sectionSwitches.goals && <GoalsSection />}
      {theme.sectionSwitches.points && <PointsSection />}
      {theme.sectionSwitches.levels && <AchievementLevels />}
      {theme.sectionSwitches.realms && <CategoriesSection />}
      {theme.sectionSwitches.reflections && <ReflectionPrompts />}
      {theme.sectionSwitches.ib && <IBConnectionsSection />}
      {theme.sectionSwitches.outcomes && <OutcomesSection />}
      {theme.sectionSwitches.footer && <Footer />}

      {/* FLOATING ACTION PILL TO OPEN HOMEPAGE SIDEBAR STUDIO (Exclusively for Admin) */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsEditorOpen((prev) => !prev)}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full text-slate-950 font-black text-xs shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-black"
            style={{
              background: 'linear-gradient(135deg, #d9f99d 0%, #a3e635 100%)',
              boxShadow: '0 10px 30px rgba(217, 249, 157, 0.4), 0 0 15px rgba(0, 0, 0, 0.3)',
            }}
            title="Open Homepage Live Customizer Sidebar"
          >
            <span className="flex h-2.5 w-2.5 rounded-full bg-black animate-pulse" />
            <Edit3 className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
            <span>Edit Homepage &amp; Blocks</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black text-[#d9f99d] text-[10px] font-mono">
              ADMIN
            </span>
          </button>
        </div>
      )}

      {/* HOMEPAGE SIDEBAR STUDIO (Slide-in editor with well rounded colored divs) */}
      {isAdmin && (
        <HomepageSidebarEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </main>
  );
};

export default Index;
