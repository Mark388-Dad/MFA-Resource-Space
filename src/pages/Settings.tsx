import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AvatarUpload from '@/components/AvatarUpload';
import ThemeToggle from '@/components/ThemeToggle';
import ThemeModeSelector from '@/components/ThemeModeSelector';
import { toast } from 'sonner';
import { Loader2, KeyRound, UserCog, Palette, Trophy, Lock } from 'lucide-react';
import { HOUSES, YEAR_GROUPS, CLASSES } from '@/lib/constants';
import { useChallenges } from '@/contexts/ChallengeContext';

const Settings = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { selectedChallenge } = useChallenges();
  const [fullName, setFullName] = useState('');
  const [yearGroup, setYearGroup] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [house, setHouse] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setYearGroup((profile.year_group as string) ?? '');
    setClassName(profile.class_name ?? '');
    setHouse((profile.house as string) ?? '');
  }, [profile]);

  const isStudent = profile?.role === 'student';

  const saveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error('Enter your full name');
    setSavingProfile(true);
    // Students cannot edit their class name, year group, or house after registration; only staff can do that
    const payload = {
      full_name: fullName.trim(),
    };
    const { error } = await supabase.from('profiles').update(payload).eq('user_id', user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success('Profile updated');
  };

  const changePassword = async () => {
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (!currentPassword) return toast.error('Enter your current password');
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password changed successfully');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-none">
      <Helmet>
        <title>Settings — MFA Reading Challenge</title>
        <meta name="description" content="Update your profile, picture, theme and password for the MFA Reading Challenge." />
      </Helmet>

      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile, picture, appearance and password.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="w-5 h-5" style={{ color: 'hsl(var(--v-cyan))' }} /> Profile
          </CardTitle>
          <CardDescription>Your name, picture and class details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <AvatarUpload size={64} />
            <div className="text-sm">
              <div className="font-semibold">{profile?.full_name}</div>
              <div className="text-muted-foreground">{profile?.email}</div>
              <div className="text-xs text-muted-foreground capitalize mt-1">
                {profile?.role?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            {isStudent && (
              <div className="col-span-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Lock className="w-4 h-4" /> Academic Cohort &amp; House Details (Locked)
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your Year Group, Class, and House were permanently established during registration and are locked to maintain competition integrity. Only academy staff or librarians can make official amendments.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">Year Group</div>
                    <div className="font-bold text-sm text-foreground mt-0.5">{profile?.year_group || "Not set"}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">Class</div>
                    <div className="font-bold text-sm text-foreground mt-0.5">{profile?.class_name || "Not set"}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-border">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">House</div>
                    <div className="font-bold text-sm text-foreground mt-0.5">{profile?.house || "Not set"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5" style={{ color: 'hsl(var(--v-orange))' }} /> Password
          </CardTitle>
          <CardDescription>Change your password. Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button onClick={changePassword} disabled={savingPassword}>
            {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Change password
          </Button>
        </CardContent>
      </Card>

      {/* Active Challenge Workspace Settings (staff only) */}
      {!isStudent && (
      <Card className="rounded-2xl border border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-amber-500" /> Active Reading Challenge Workspace
          </CardTitle>
          <CardDescription>
            Your current active workspace across the platform is controlled from the challenge toggle beside your profile icon in the topbar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
            <span className="text-2xl">{selectedChallenge?.badge_icon || "🏆"}</span>
            <div>
              <div className="text-sm font-bold text-foreground">{selectedChallenge?.title}</div>
              <div className="text-xs text-muted-foreground">
                Target: {selectedChallenge?.target_books} entries · +{selectedChallenge?.points_reward} reward points
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            💡 To switch to another challenge workspace, simply click the Challenge button beside your profile avatar in the header.
          </p>
        </CardContent>
      </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="w-5 h-5" style={{ color: 'hsl(var(--v-magenta))' }} /> Appearance & Accessibility
          </CardTitle>
          <CardDescription>
            Choose your accessibility mode (High Contrast, Soft Mode, Dark Mode, or Light Mode) and custom accent colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Accessibility Theme Mode
            </Label>
            <ThemeModeSelector variant="cards" />
          </div>

          <div className="pt-2 border-t border-border">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Color Palette Accent
            </Label>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
