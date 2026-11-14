import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Loader2, Eye, EyeOff, Sparkles, Trophy, Target, ShieldCheck, Megaphone, Copy, Check, Library, GraduationCap, Users, Award, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { HOUSES, YEAR_GROUPS, CLASSES, USER_ROLES } from '@/lib/constants';
import { validateAccessCode, STANDARD_ACCESS_CODES } from '@/lib/accessCodes';
import { getAuthPageConfig, fetchRemoteAuthPageConfig, AuthPageConfig } from '@/lib/authPageConfig';
import { useAuth, DEMO_ACCOUNTS, type DemoRoleKey } from '@/contexts/AuthContext';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'admin', 'homeroom_tutor', 'head_of_year', 'house_patron', 'librarian', 'staff']),
  yearGroup: z.string().optional(),
  className: z.string().optional(),
  house: z.string().optional(),
  accessCode: z.string().trim().max(64).optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Auth = () => {
  const navigate = useNavigate();
  const { signInAsDemo, tryDemoCredentials } = useAuth();
  const [authConfig, setAuthConfig] = useState<AuthPageConfig>(getAuthPageConfig());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'admin' | 'homeroom_tutor' | 'head_of_year' | 'house_patron' | 'librarian' | 'staff',
    yearGroup: '',
    className: '',
    house: '',
    accessCode: '',
  });

  useEffect(() => {
    fetchRemoteAuthPageConfig().then((cfg) => setAuthConfig(cfg));
    const handleUpdate = (e: any) => {
      if (e.detail) setAuthConfig(e.detail);
    };
    window.addEventListener('mfa-auth-config-updated', handleUpdate);
    return () => window.removeEventListener('mfa-auth-config-updated', handleUpdate);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = signUpSchema.parse({
        ...formData,
        yearGroup: formData.yearGroup || undefined,
        className: formData.className || undefined,
        house: formData.house || undefined,
      });

      if (formData.role === 'student') {
        if (!formData.yearGroup || !formData.className || !formData.house) {
          toast.error('Students must select year group, class, and house');
          return;
        }
      }

      setLoading(true);

      // Verify Access Code (Administrators & Librarians have direct verified access)
      if (validatedData.role === 'librarian' || validatedData.role === 'admin') {
        validatedData.accessCode = validatedData.accessCode || (validatedData.role === 'admin' ? 'ADMIN-DIRECT' : 'LIB-DIRECT');
      } else {
        if (!validatedData.accessCode) {
          toast.error('Please enter your school access code');
          setLoading(false);
          return;
        }
        const codeCheck = await validateAccessCode(validatedData.accessCode, validatedData.role);
        if (!codeCheck.valid) {
          toast.error(codeCheck.message || 'Invalid access code. Please check with your librarian.');
          setLoading(false);
          return;
        }
      }

      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.fullName,
            role: validatedData.role,
            access_code: validatedData.accessCode,
            year_group: formData.role === 'student' ? formData.yearGroup : null,
            class_name: formData.role === 'student' ? formData.className : null,
            house: formData.role === 'student' ? formData.house : null,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: pendingData } = await supabase
          .from('pending_submissions')
          .select('*')
          .eq('email', validatedData.email);

        if (pendingData && pendingData.length > 0) {
          const submissionsToInsert = pendingData.map(pending => ({
            user_id: authData.user!.id,
            category_number: pending.category_number,
            category_name: pending.category_name,
            title: pending.title,
            author: pending.author,
            date_started: pending.date_started,
            date_finished: pending.date_finished,
            reflection: pending.reflection,
            points_earned: 3,
          }));

          await supabase.from('book_submissions').insert(submissionsToInsert);
          await supabase
            .from('pending_submissions')
            .update({ imported_at: new Date().toISOString(), imported_to_user_id: authData.user!.id })
            .eq('email', validatedData.email);
        }

        toast.success(
          pendingData && pendingData.length > 0
            ? `Account created! ${pendingData.length} previous submissions imported.`
            : 'Account created successfully!'
        );
        if (validatedData.role === 'admin' || validatedData.role === 'librarian') {
          navigate('/admin?s=submissions');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else if (error.message?.includes('already registered')) toast.error('This email is already registered. Please sign in.');
      else toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logAuthEvent = async (event_type: string, target_email: string, metadata: Record<string, any> = {}) => {
    try {
      await supabase.from('auth_audit_log').insert({
        event_type, target_email, user_agent: navigator.userAgent, metadata,
      });
    } catch { /* non-critical */ }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      signInSchema.parse({ email: formData.email, password: formData.password });
      setLoading(true);

      // Support official Demo Admin & Demo Librarian credentials directly
      const demoMatched = tryDemoCredentials(formData.email, formData.password);
      if (demoMatched) {
        toast.success(`Signed in as ${demoMatched.full_name}!`);
        navigate('/dashboard');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email, password: formData.password,
      });
      if (error) throw error;
      toast.success('Signed in successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error instanceof z.ZodError) toast.error(error.errors[0].message);
      else toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSignIn = (role: DemoRoleKey) => {
    const demoProfile = signInAsDemo(role);
    toast.success(`Signed in as ${demoProfile.full_name}!`);
    navigate('/dashboard');
  };

  const copyDemoValue = (key: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 auth-animated-bg">
      <style>{`
        @keyframes mfaAuthGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .auth-animated-bg {
          background: linear-gradient(135deg, #070e1b 0%, #0b172b 45%, #050a14 100%);
          background-size: 200% 200%;
          animation: mfaAuthGradient 20s ease infinite;
        }
        @keyframes mfaShowcaseGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .auth-showcase-bg {
          background: linear-gradient(135deg, #0b172b 0%, #0d2342 35%, #102a4f 55%, #061122 100%);
          background-size: 250% 250%;
          animation: mfaShowcaseGradient 14s ease infinite;
        }
        .auth-tabs-bg {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
        }
      `}</style>

      <Helmet>
        <title>Sign in — 45-Book Reading Challenge</title>
        <meta name="description" content="Sign in or create an account for the Mpesa Foundation Academy 45-Book Reading Challenge using your school access code." />
        <link rel="canonical" href="https://mfareadingchallenge.netlify.app/auth" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Sign in to the 45-Book Reading Challenge</h1>

      {/* LEFT: Form */}
      <div className="flex flex-col px-6 sm:px-12 lg:px-16 xl:px-24 py-10 lg:py-14 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <img
            src="/school-badge.png"
            alt="M-Pesa Foundation Academy Badge"
            className="w-12 h-12 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
          />
          <div>
            <span className="font-display font-bold text-xl text-white tracking-tight block">M-Pesa Foundation Academy</span>
            <span className="text-xs text-emerald-400 font-medium tracking-wide">45-Book Reading Challenge</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
              {authConfig.welcomeHeading || "Get Started Now"}
            </h2>
            <p className="mt-3 text-slate-400">
              {authConfig.welcomeDescription || "Enter your credentials to access your reading account"}
            </p>
            {authConfig.loginNotice && (
              <div className="mt-4 p-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{authConfig.loginNotice}</span>
              </div>
            )}
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 rounded-xl auth-tabs-bg border border-slate-700/60 shadow-inner">
              <TabsTrigger value="signin" className="rounded-lg font-semibold text-slate-400 transition-all data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-semibold text-slate-400 transition-all data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md">Sign Up</TabsTrigger>
            </TabsList>


            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-200">Email address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your.email@mpesafoundationacademy.ac.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))] focus-visible:border-[hsl(var(--v-green))]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-slate-200">Password</Label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.email) { toast.error('Enter your email above first'); return; }
                        try { signInSchema.shape.email.parse(formData.email); } catch { toast.error('Enter a valid email'); return; }
                        setLoading(true);
                        const { data, error } = await supabase.functions.invoke('student-forgot-password', {
                          body: { email: formData.email },
                        });
                        await logAuthEvent('password_reset_requested', formData.email, { source: 'auth_page' });
                        setLoading(false);
                        if (error || (data as any)?.error) {
                          toast.error((data as any)?.error || error?.message || 'Could not reset password');
                        } else {
                          toast.success('Your password was reset to Mpesa@123 and emailed to you. Sign in, then change it in Settings.');
                        }
                      }}
                      className="text-sm font-medium text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="min 8 chars"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 pr-11 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))] focus-visible:border-[hsl(var(--v-green))]"
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  style={{ background: authConfig.gradientPreset || 'linear-gradient(135deg, hsl(var(--v-green)), hsl(var(--v-orange)))' }}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign In
                </Button>
              </form>

              {/* Demo Accounts Quick Access for Every Role */}
              <div className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      Demo Accounts (Every Role)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    7 Roles Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Test every portal role instantly with 1-click sign-in, or copy any email &amp; password into the sign-in form above.
                </p>

                <div className="grid gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {(
                    [
                      { key: 'student' as const, badge: 'Student', accent: 'border-emerald-500/35 bg-emerald-500/10', pill: 'bg-emerald-500/20 text-emerald-300', icon: GraduationCap, iconColor: 'text-emerald-400' },
                      { key: 'librarian' as const, badge: 'Librarian', accent: 'border-amber-500/35 bg-amber-500/10', pill: 'bg-amber-500/20 text-amber-300', icon: Library, iconColor: 'text-amber-400' },
                      { key: 'admin' as const, badge: 'Admin', accent: 'border-sky-500/35 bg-sky-500/10', pill: 'bg-sky-500/20 text-sky-300', icon: ShieldCheck, iconColor: 'text-sky-400' },
                      { key: 'head_of_year' as const, badge: 'Head of Year', accent: 'border-violet-500/35 bg-violet-500/10', pill: 'bg-violet-500/20 text-violet-300', icon: Users, iconColor: 'text-violet-400' },
                      { key: 'house_patron' as const, badge: 'House Patron', accent: 'border-rose-500/35 bg-rose-500/10', pill: 'bg-rose-500/20 text-rose-300', icon: Award, iconColor: 'text-rose-400' },
                      { key: 'homeroom_tutor' as const, badge: 'Homeroom Tutor', accent: 'border-cyan-500/35 bg-cyan-500/10', pill: 'bg-cyan-500/20 text-cyan-300', icon: BookOpen, iconColor: 'text-cyan-400' },
                      { key: 'staff' as const, badge: 'Staff', accent: 'border-slate-500/35 bg-slate-800/70', pill: 'bg-slate-600/30 text-slate-200', icon: UserCog, iconColor: 'text-slate-300' },
                    ]
                  ).map((item) => {
                    const acc = DEMO_ACCOUNTS[item.key];
                    const RoleIcon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className={`rounded-xl border p-3 space-y-2 ${item.accent}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <RoleIcon className={`w-4 h-4 shrink-0 ${item.iconColor}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">{acc.label}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.pill}`}>
                                  {item.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.description}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleQuickDemoSignIn(item.key)}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                          >
                            Sign In
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-1 text-[11px] font-mono text-slate-300">
                          <div className="flex items-center justify-between gap-2 bg-slate-950/70 rounded-md px-2 py-1">
                            <span className="truncate">
                              <span className="text-slate-500">Email: </span>
                              {acc.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyDemoValue(`${item.key}-email`, acc.email)}
                              className="text-slate-400 hover:text-white shrink-0"
                              title="Copy email"
                            >
                              {copiedKey === `${item.key}-email` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 bg-slate-950/70 rounded-md px-2 py-1">
                            <span className="truncate">
                              <span className="text-slate-500">Pass: </span>
                              {acc.password}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyDemoValue(`${item.key}-pass`, acc.password)}
                              className="text-slate-400 hover:text-white shrink-0"
                              title="Copy password"
                            >
                              {copiedKey === `${item.key}-pass` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-200">Name</Label>
                  <Input id="fullName" placeholder="Enter your full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-200">Email address</Label>
                  <Input id="signup-email" type="email" placeholder="your.email@mpesafoundationacademy.ac.ke" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-200">Password</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 pr-11 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))]" />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Role</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">{USER_ROLES.map((role) => (<SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                {formData.role === 'student' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-200 flex items-center justify-between">
                        <span>Year Group / Cohort</span>
                        <span className="text-[10px] text-amber-400 font-bold">*Mandatory</span>
                      </Label>
                      <Select value={formData.yearGroup} onValueChange={(value) => setFormData({ ...formData, yearGroup: value, className: '' })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500">
                          <SelectValue placeholder="Select Year (Grade 11, Grade 12...)" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white">
                          {Array.from(new Set(["Grade 12", "Grade 11", "Grade 10", "DP2", "DP1", "G10", ...authConfig.yearGroupsList])).map((yg) => (
                            <SelectItem key={yg} value={yg}>
                              {yg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Class</Label>
                      <Select value={formData.className} onValueChange={(value) => setFormData({ ...formData, className: value })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500"><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white">{authConfig.classesList.map((cls) => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-slate-200">House</Label>
                      <Select value={formData.house} onValueChange={(value: any) => setFormData({ ...formData, house: value })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500"><SelectValue placeholder="Select your house" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white">{authConfig.housesList.map((house) => (<SelectItem key={house} value={house}>{house}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Custom Fields configured by Librarian */}
                {authConfig.customFields
                  .filter((f) => f.enabled && (f.roleScope === 'all' || f.roleScope === formData.role))
                  .map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-slate-200 flex items-center justify-between">
                        <span>{field.label}</span>
                        {field.required && <span className="text-[10px] text-destructive font-semibold">*Required</span>}
                      </Label>
                      {field.type === 'select' && field.options?.length ? (
                        <Select
                          value={customFieldValues[field.id] || ''}
                          onValueChange={(val) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: val }))}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white"><SelectValue placeholder={field.placeholder} /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700 text-white">
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          placeholder={field.placeholder}
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                          required={field.required}
                          className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))]"
                        />
                      )}
                    </div>
                  ))}

                {formData.role === 'librarian' || formData.role === 'admin' ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-white">Administrator &amp; Librarian Direct Access</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Administrators and librarians have direct authorized administrative privileges without an access code requirement.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="access-code" className="text-slate-200">Access Code</Label>
                      <span className="text-[11px] font-semibold text-emerald-400">Active</span>
                    </div>
                    <Input
                      id="access-code"
                      placeholder="e.g. STU-DP1, DP1-2026, or TUT-DP1-2026"
                      value={formData.accessCode}
                      onChange={(e) => setFormData({ ...formData, accessCode: e.target.value.toUpperCase() })}
                      required
                      className="h-12 rounded-xl border-slate-700 bg-slate-900/90 text-white placeholder:text-slate-500 font-mono tracking-wide focus-visible:ring-2 focus-visible:ring-[hsl(var(--v-green))]"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-400">Official codes:</span>
                      {['STU-DP1', 'STU-DP2', 'STU-G10', 'DP1-2026', 'TUT-DP1-2026', 'HOUSE-SIMBA'].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setFormData({ ...formData, accessCode: quick })}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 transition-colors"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">Provided by the librarian for official reading challenge enrollment.</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  style={{ background: authConfig.gradientPreset || 'linear-gradient(135deg, hsl(var(--v-green)), hsl(var(--v-orange)))' }}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-slate-500 mt-8">
            © 2025/2026 Mpesa Foundation Academy. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT: Showcase */}
      <div className="hidden lg:flex relative overflow-hidden items-center justify-center p-12 auth-showcase-bg">
        {/* Decorative orbs */}
        <div aria-hidden className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, hsl(var(--v-yellow)), transparent 60%)' }} />
        <div aria-hidden className="absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #ffffff, transparent 60%)' }} />

        <div className="relative max-w-lg w-full text-white">
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1]">
            The simplest way to track your reading journey
          </h2>
          <p className="mt-4 text-white/80 text-lg">
            Read 45 books, earn points, climb the leaderboard, and represent your house.
          </p>

          {/* Floating dashboard mock */}
          <div className="mt-10 relative">
            <div className="bg-white rounded-2xl shadow-2xl p-5 text-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Dashboard</div>
                  <div className="font-display font-bold text-lg">Reading Progress</div>
                </div>
                <div className="flex -space-x-2">
                  {['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white" style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3" style={{ background: 'hsl(var(--v-green) / 0.1)' }}>
                  <div className="text-xs text-slate-500">Books Read</div>
                  <div className="font-display font-bold text-2xl text-slate-900">28 <span className="text-sm text-[hsl(var(--v-green))]">/45</span></div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'hsl(var(--v-orange) / 0.1)' }}>
                  <div className="text-xs text-slate-500">Points</div>
                  <div className="font-display font-bold text-2xl text-slate-900">94</div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { h: 'Kenya', v: 78, c: '#00205B', b: 'High' },
                  { h: 'Kilimanjaro', v: 64, c: '#D32F2F', b: 'High' },
                  { h: 'Longonot', v: 45, c: '#EAB308', b: 'Med' },
                  { h: 'Elgon', v: 32, c: '#2E7D32', b: 'Low' },
                ].map((r) => (
                  <div key={r.h} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-slate-700">{r.h}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.v}%`, background: r.c }} />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${r.c}1a`, color: r.c }}>{r.b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating achievement card */}
            <div className="absolute -right-6 -bottom-6 bg-white rounded-2xl shadow-2xl p-4 w-56 text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--v-yellow)), hsl(var(--v-orange)))' }}>
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Milestone</div>
                  <div className="font-bold text-sm">+5 pts unlocked!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stats row */}
          <div className="mt-16 flex items-center justify-between text-white/70 text-sm">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> 45 Books</div>
            <div className="flex items-center gap-2"><Target className="w-4 h-4" /> 4 Houses</div>
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> 1 Year</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
