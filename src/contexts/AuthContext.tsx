import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { safeStorage } from '@/lib/safeStorage';

export type DemoRoleKey =
  | 'librarian'
  | 'admin'
  | 'student'
  | 'head_of_year'
  | 'house_patron'
  | 'homeroom_tutor'
  | 'staff';

export interface DemoAccountSpec {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: DemoRoleKey;
  label: string;
  description: string;
  year_group: string | null;
  class_name: string | null;
  house: 'Kenya' | 'Longonot' | 'Kilimanjaro' | 'Elgon' | null;
}

export const DEMO_ACCOUNTS: Record<DemoRoleKey, DemoAccountSpec> = {
  librarian: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'librarian.demo@mpesafoundationacademy.ac.ke',
    password: 'LibrarianDemo@2026',
    full_name: 'Academy Head Librarian (Demo)',
    role: 'librarian',
    label: 'Head Librarian',
    description: 'Full Librarian & Admin Command Center, submissions, certificates & broadcasts',
    year_group: null,
    class_name: null,
    house: null,
  },
  admin: {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'admin.demo@mpesafoundationacademy.ac.ke',
    password: 'AdminDemo@2026',
    full_name: 'Academy Administrator (Demo)',
    role: 'admin',
    label: 'Academy Admin',
    description: 'Unified Head Librarian & Admin workspace with full school governance',
    year_group: null,
    class_name: null,
    house: null,
  },
  student: {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'student.demo@mpesafoundationacademy.ac.ke',
    password: 'StudentDemo@2026',
    full_name: 'Amani Wanjiku (Demo Student)',
    role: 'student',
    label: 'Student Scholar',
    description: 'Student reading portal: log books, track progress, leaderboard & inbox',
    year_group: 'DP1',
    class_name: 'Swara',
    house: 'Kenya',
  },
  head_of_year: {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'hoy.demo@mpesafoundationacademy.ac.ke',
    password: 'HoyDemo@2026',
    full_name: 'Dr. Grace Muthoni (Demo HOY)',
    role: 'head_of_year',
    label: 'Head of Year (DP1)',
    description: 'DP1 academic cohort oversight, year-group leaderboard & student roster',
    year_group: 'DP1',
    class_name: null,
    house: null,
  },
  house_patron: {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'patron.demo@mpesafoundationacademy.ac.ke',
    password: 'PatronDemo@2026',
    full_name: 'Samuel Kiprop (Demo Patron)',
    role: 'house_patron',
    label: 'House Patron (Kenya)',
    description: 'Kenya House reading standings, points & house member progress',
    year_group: null,
    class_name: null,
    house: 'Kenya',
  },
  homeroom_tutor: {
    id: '00000000-0000-4000-8000-000000000006',
    email: 'tutor.demo@mpesafoundationacademy.ac.ke',
    password: 'TutorDemo@2026',
    full_name: 'Faith Njeri (Demo Tutor)',
    role: 'homeroom_tutor',
    label: 'Homeroom Tutor (DP1 Swara)',
    description: 'DP1 Swara class reading logs, student tracking & cohort broadcasts',
    year_group: 'DP1',
    class_name: 'Swara',
    house: null,
  },
  staff: {
    id: '00000000-0000-4000-8000-000000000007',
    email: 'staff.demo@mpesafoundationacademy.ac.ke',
    password: 'StaffDemo@2026',
    full_name: 'David Ochieng (Demo Staff)',
    role: 'staff',
    label: 'Faculty / Other Staff',
    description: 'Whole-school faculty reading overview, house standings & leaderboard',
    year_group: null,
    class_name: null,
    house: null,
  },
};

// Backward-compatible alias
export const DEMO_ADMIN_LIBRARIAN_ACCOUNTS = DEMO_ACCOUNTS;

const DEMO_SESSION_KEY = 'mfa_demo_session';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'student' | 'admin' | 'homeroom_tutor' | 'head_of_year' | 'house_patron' | 'librarian' | 'staff';
  year_group: 'DP2' | 'DP1' | 'Grade 12' | 'Grade 11' | 'G12' | 'G11' | 'G10' | string | null;
  class_name: string | null;
  house: 'Kenya' | 'Longonot' | 'Kilimanjaro' | 'Elgon' | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isDemoSession: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInAsDemo: (role: DemoRoleKey) => Profile;
  tryDemoCredentials: (email: string, password: string) => Profile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildDemoUserAndProfile = (spec: DemoAccountSpec): { user: User; profile: Profile } => {
  const now = new Date().toISOString();
  const demoUser = {
    id: spec.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: spec.email,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'demo', providers: ['demo'] },
    user_metadata: {
      full_name: spec.full_name,
      role: spec.role,
      year_group: spec.year_group,
      class_name: spec.class_name,
      house: spec.house,
      is_demo: true,
    },
    identities: [],
    created_at: now,
    updated_at: now,
  } as unknown as User;

  const demoProfile: Profile = {
    id: spec.id,
    user_id: spec.id,
    full_name: spec.full_name,
    email: spec.email,
    role: spec.role,
    year_group: spec.year_group,
    class_name: spec.class_name,
    house: spec.house,
  };

  return { user: demoUser, profile: demoProfile };
};

const getStoredDemoRole = (): DemoRoleKey | null => {
  const stored = safeStorage.getJSON<{ role?: string } | null>(DEMO_SESSION_KEY, null);
  if (stored?.role && stored.role in DEMO_ACCOUNTS) {
    return stored.role as DemoRoleKey;
  }
  return null;
};

// Helper to read cached profile safely
const getCachedProfile = (): Profile | null => {
  const p = safeStorage.getJSON<Profile | null>('mfa_cached_profile', null);
  if (p && p.email?.toLowerCase().includes('tonny')) {
    p.role = 'student';
  }
  return p;
};

// Helper to synthesize a valid profile from user object / metadata
const synthesizeFallbackProfile = (usr: User): Profile => {
  const email = usr.email || '';
  const meta = usr.user_metadata || {};
  const isTonny = email.toLowerCase().includes('tonny');
  const isAdminEmail = email.toLowerCase().includes('admin');
  const isLibrarianEmail = email.toLowerCase().includes('librarian');
  const isStaffEmail = email.toLowerCase().endsWith('@mpesafoundationacademy.ac.ke') && !email.toLowerCase().includes('student') && !isTonny;
  // Tonny is strictly a student, no other role
  let role: Profile['role'] = 'student';
  if (isTonny) {
    role = 'student';
  } else if (meta.role) {
    role = meta.role;
  } else if (isAdminEmail) {
    role = 'admin';
  } else if (isLibrarianEmail) {
    role = 'librarian';
  } else if (isStaffEmail) {
    role = 'staff';
  }
  
  return {
    id: usr.id,
    user_id: usr.id,
    full_name: meta.full_name || (isTonny ? 'Tonny Odundo' : isAdminEmail ? 'Academy Administrator' : isLibrarianEmail ? 'Academy Librarian' : email.split('@')[0] || 'Academy Scholar'),
    email: email,
    role: role,
    year_group: meta.year_group || (role === 'student' ? 'Grade 11' : null),
    class_name: meta.class_name || null,
    house: meta.house || null,
  };
};

// Helper to check if a session likely exists in storage safely
const hasPotentialSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const ls = window.localStorage;
    if (!ls) return false;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
        const val = ls.getItem(key);
        if (val && val.includes('access_token')) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialDemoRole = getStoredDemoRole();
  const initialDemo = initialDemoRole ? buildDemoUserAndProfile(DEMO_ACCOUNTS[initialDemoRole]) : null;

  const [user, setUser] = useState<User | null>(() => initialDemo?.user ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => initialDemo?.profile ?? getCachedProfile());
  const [loading, setLoading] = useState<boolean>(false);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(Boolean(initialDemo));

  const signInAsDemo = (role: DemoRoleKey): Profile => {
    const spec = DEMO_ACCOUNTS[role];
    const { user: demoUser, profile: demoProfile } = buildDemoUserAndProfile(spec);
    safeStorage.setJSON(DEMO_SESSION_KEY, { role, email: spec.email });
    safeStorage.setJSON('mfa_cached_profile', demoProfile);
    setSession(null);
    setUser(demoUser);
    setProfile(demoProfile);
    setIsDemoSession(true);
    setLoading(false);
    return demoProfile;
  };

  const tryDemoCredentials = (email: string, password: string): Profile | null => {
    const normalizedEmail = email.trim().toLowerCase();
    const match = Object.values(DEMO_ACCOUNTS).find(
      (acc) => acc.email.toLowerCase() === normalizedEmail && acc.password === password
    );
    if (!match) return null;
    return signInAsDemo(match.role);
  };

  const fetchProfile = async (targetUser: User): Promise<Profile | null> => {
    const activeDemoRole = getStoredDemoRole();
    if (activeDemoRole && targetUser.id === DEMO_ACCOUNTS[activeDemoRole].id) {
      return buildDemoUserAndProfile(DEMO_ACCOUNTS[activeDemoRole]).profile;
    }

    try {
      // Race Supabase fetch with a 1.5-second timeout so network delay never hangs the UI
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: unknown; error: unknown }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 1500)
      );

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      const data = res?.data;

      if (data && data.user_id) {
        const p = { ...data } as Profile;
        if (p.email?.toLowerCase().includes('tonny') || targetUser.email?.toLowerCase().includes('tonny')) {
          p.role = 'student';
        }
        safeStorage.setJSON('mfa_cached_profile', p);
        return p;
      }
    } catch (err) {
      console.warn('Network error fetching profile:', err);
    }

    // Try cached profile for this specific user
    const cached = getCachedProfile();
    if (cached && (cached.user_id === targetUser.id || cached.email === targetUser.email)) {
      return cached;
    }

    // Synthesize profile from user metadata and email
    const fallback = synthesizeFallbackProfile(targetUser);
    safeStorage.setJSON('mfa_cached_profile', fallback);
    return fallback;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user);
      if (profileData) setProfile(profileData);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout: ensure loading becomes false within 500ms under ANY circumstances
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 500);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        const currUser = session?.user ?? null;

        if (currUser) {
          safeStorage.removeItem(DEMO_SESSION_KEY);
          setIsDemoSession(false);
          setSession(session);
          setUser(currUser);
          // Immediately set synthetic or cached profile to avoid null state
          const initial = getCachedProfile() || synthesizeFallbackProfile(currUser);
          setProfile(initial);
          setLoading(false); // Unblock immediately

          // Fetch full DB profile in background
          fetchProfile(currUser)
            .then((p) => {
              if (mounted && p) setProfile(p);
            })
            .catch((e) => console.warn('Failed to load profile for user:', e));
        } else {
          const demoRole = getStoredDemoRole();
          if (demoRole && event !== 'SIGNED_OUT') {
            const demo = buildDemoUserAndProfile(DEMO_ACCOUNTS[demoRole]);
            setSession(null);
            setUser(demo.user);
            setProfile(demo.profile);
            setIsDemoSession(true);
            setLoading(false);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsDemoSession(false);
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        const currUser = session?.user ?? null;
        if (currUser) {
          safeStorage.removeItem(DEMO_SESSION_KEY);
          setIsDemoSession(false);
          setSession(session);
          setUser(currUser);
          const initial = getCachedProfile() || synthesizeFallbackProfile(currUser);
          setProfile(initial);
          setLoading(false); // Unblock immediately

          fetchProfile(currUser)
            .then((p) => {
              if (mounted && p) setProfile(p);
            })
            .catch((e) => console.warn('Failed to load profile for existing session:', e));
        } else {
          const demoRole = getStoredDemoRole();
          if (demoRole) {
            const demo = buildDemoUserAndProfile(DEMO_ACCOUNTS[demoRole]);
            setSession(null);
            setUser(demo.user);
            setProfile(demo.profile);
            setIsDemoSession(true);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to get session from storage:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    safeStorage.removeItem(DEMO_SESSION_KEY);
    safeStorage.removeItem('mfa_cached_profile');
    setIsDemoSession(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore if only demo session was active
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemoSession,
        signOut,
        refreshProfile,
        signInAsDemo,
        tryDemoCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
