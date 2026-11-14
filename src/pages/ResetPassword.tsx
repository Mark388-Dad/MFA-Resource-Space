import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

type Status = 'verifying' | 'ready' | 'invalid';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1) Hash-based errors (e.g. otp_expired)
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : '';
      const hashParams = new URLSearchParams(hash);
      const errorCode = hashParams.get('error_code') || hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      if (errorCode) {
        setErrorMsg(
          errorDescription?.replace(/\+/g, ' ') ||
            'This password reset link is invalid or has expired.'
        );
        setStatus('invalid');
        return;
      }

      // 2) PKCE flow: ?code=... in query string
      const search = new URLSearchParams(window.location.search);
      const code = search.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message || 'This password reset link is invalid or has expired.');
          setStatus('invalid');
        } else {
          setStatus('ready');
        }
        return;
      }

      // 3) Implicit flow: tokens in hash — give Supabase a moment to process
      if (hashParams.get('access_token')) {
        await new Promise((r) => setTimeout(r, 600));
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setStatus('ready');
      } else {
        setErrorMsg('This password reset link is invalid or has expired. Please request a new one.');
        setStatus('invalid');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus('ready');
      }
    });

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logEvent = async (event_type: string, target_email?: string, metadata: Record<string, any> = {}) => {
    try {
      await supabase.from('auth_audit_log').insert({
        event_type,
        target_email: target_email ?? null,
        user_agent: navigator.userAgent,
        metadata,
      });
    } catch {
      /* non-critical */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user.email;
    const userId = sessionData.session?.user.id;

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      await logEvent('password_reset_failed', userEmail, { reason: error.message });
    } else {
      await logEvent('password_reset_completed', userEmail, { user_id: userId });
      toast.success('Password updated! Please sign in.');
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error('Enter your email');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    await logEvent('password_reset_requested', resendEmail, { source: 'reset_page_resend' });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('A new reset link has been sent. Check your email.');
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-6">
      <Helmet>
        <title>Reset Password — 45-Book Reading Challenge</title>
        <meta name="description" content="Reset your password for the Mpesa Foundation Academy 45-Book Reading Challenge." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="sr-only">Reset your password</h1>
      <Card className="w-full max-w-md bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gold" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {status === 'ready' ? 'Enter your new password below' : 'Verify your reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'verifying' && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
              Verifying reset link...
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-start p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-1">Link expired or invalid</p>
                  <p className="text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Request a new link</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="your.email@mpesafoundationacademy.ac.ke"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-light" disabled={resending}>
                  {resending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send new reset link
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/auth')}>
                  Back to sign in
                </Button>
              </form>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gold text-navy hover:bg-gold-light" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
