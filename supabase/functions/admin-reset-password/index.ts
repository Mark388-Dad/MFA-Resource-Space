import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is staff
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, email')
      .eq('user_id', userData.user.id)
      .single();

    const staffRoles = ['librarian', 'staff', 'homeroom_tutor', 'head_of_year', 'house_patron'];
    if (!profile || !staffRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: staff only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { target_user_id, new_password } = body;

    if (!target_user_id || !new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'target_user_id and new_password (min 6 chars) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target user info
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', target_user_id)
      .single();

    const { error: updateErr } = await admin.auth.admin.updateUserById(target_user_id, {
      password: new_password,
    });

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send confirmation email with the new password via Resend
    let emailSent = false;
    let emailError: string | null = null;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && targetProfile?.email) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: (Deno.env.get('EMAIL_FROM') || 'MFA Reading Challenge <onboarding@resend.dev>'),
            to: [targetProfile.email],
            subject: 'Your password has been reset',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
                <h2 style="color:#0f766e">Password reset confirmation</h2>
                <p>Hello ${targetProfile.full_name ?? ''},</p>
                <p>An administrator (${profile.full_name}) has reset your password for the MFA Reading Challenge platform.</p>
                <p><strong>Your new password is:</strong></p>
                <div style="font-size:20px;font-weight:700;padding:14px 18px;background:#f1f5f9;border-radius:8px;letter-spacing:1px;display:inline-block">${new_password}</div>
                <p style="margin-top:16px">Please sign in and change your password immediately if you wish.</p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">If you did not request this change, contact your librarian.</p>
              </div>`,
          }),
        });
        emailSent = r.ok;
        if (!r.ok) emailError = await r.text();
      } catch (e: any) {
        emailError = e?.message ?? 'Failed to send email';
      }
    }

    // Audit log
    await admin.from('auth_audit_log').insert({
      event_type: 'admin_password_reset',
      actor_user_id: userData.user.id,
      target_user_id,
      target_email: targetProfile?.email ?? null,
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      metadata: { actor_email: profile.email, actor_name: profile.full_name, email_sent: emailSent, email_error: emailError },
    });

    return new Response(JSON.stringify({ success: true, email_sent: emailSent, email_error: emailError }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
