import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PASSWORD = 'Mpesa@123';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') return json({ error: 'Email is required' }, 400);
    const target = email.trim().toLowerCase();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await admin
      .from('profiles')
      .select('user_id, full_name, email')
      .ilike('email', target)
      .maybeSingle();

    if (!profile) {
      // Do not reveal which accounts exist
      return json({ success: true, sent: false });
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(profile.user_id, {
      password: DEFAULT_PASSWORD,
    });
    if (updateErr) return json({ error: updateErr.message }, 400);

    let emailSent = false;
    let emailError: string | null = null;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: (Deno.env.get('EMAIL_FROM') || 'MFA Reading Challenge <onboarding@resend.dev>'),
            to: [profile.email],
            subject: 'Your password has been reset',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
                <h2 style="color:#0f766e">Password reset</h2>
                <p>Hello ${profile.full_name ?? ''},</p>
                <p>Your password for the MFA Reading Challenge has been reset. Use the temporary password below to sign in:</p>
                <div style="font-size:20px;font-weight:700;padding:14px 18px;background:#f1f5f9;border-radius:8px;letter-spacing:1px;display:inline-block">${DEFAULT_PASSWORD}</div>
                <p style="margin-top:16px">After signing in, open <strong>Settings</strong> and change it to something only you know.</p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">If you did not request this, contact your librarian immediately.</p>
              </div>`,
          }),
        });
        emailSent = r.ok;
        if (!r.ok) emailError = await r.text();
      } catch (e) {
        emailError = (e as Error)?.message ?? 'Failed to send email';
      }
    }

    await admin.from('auth_audit_log').insert({
      event_type: 'self_service_password_reset',
      target_user_id: profile.user_id,
      target_email: profile.email,
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      metadata: { email_sent: emailSent, email_error: emailError },
    });

    return json({ success: true, sent: true, email_sent: emailSent });
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Server error' }, 500);
  }
});
