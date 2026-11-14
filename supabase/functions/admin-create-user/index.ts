import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function slugName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Invalid session' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, email')
      .eq('user_id', userData.user.id)
      .single();

    const staffRoles = ['librarian', 'staff', 'homeroom_tutor', 'head_of_year', 'house_patron'];
    if (!profile || !staffRoles.includes(profile.role)) {
      return json({ error: 'Forbidden: staff only' }, 403);
    }

    const body = await req.json();
    const {
      full_name,
      admission_number,
      year_group,
      class_name,
      house,
      email: providedEmail,
      role = 'student',
    } = body ?? {};

    if (!full_name || !admission_number) {
      return json({ error: 'Full name and admission number are required' }, 400);
    }
    if (role === 'student' && (!year_group || !class_name || !house)) {
      return json({ error: 'Year group, class and house are required for students' }, 400);
    }

    const adm = String(admission_number).trim();
    const email = (
      (providedEmail && String(providedEmail).trim()) ||
      `${slugName(full_name)}@mpesafoundationacademy.ac.ke`
    ).toLowerCase();

    if (!/^[^\s@]+@mpesafoundationacademy\.ac\.ke$/i.test(email)) {
      return json({ error: `Invalid email format: ${email}. Must be @mpesafoundationacademy.ac.ke` }, 400);
    }

    // Pre-check duplicates in our system
    const { data: dupAdm } = await admin
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('admission_number', adm)
      .maybeSingle();
    if (dupAdm) {
      return json({
        error: `Admission number ${adm} already belongs to ${dupAdm.full_name} (${dupAdm.email}).`,
      }, 409);
    }

    const { data: dupEmail } = await admin
      .from('profiles')
      .select('user_id, full_name')
      .ilike('email', email)
      .maybeSingle();
    if (dupEmail) {
      return json({
        error: `Email ${email} is already registered to ${dupEmail.full_name}. Provide a different email.`,
      }, 409);
    }

    const password = `mas${adm}`;

    const codeType = role === 'student' ? 'student' : role === 'librarian' ? 'librarian' : 'tutor';
    const { data: codes } = await admin
      .from('access_codes')
      .select('code, max_uses, current_uses')
      .eq('is_active', true)
      .eq('code_type', codeType);
    const usable = (codes ?? []).find(
      (c: any) => c.max_uses == null || c.current_uses < c.max_uses,
    );
    if (!usable) return json({ error: `No active ${codeType} access code available` }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        access_code: usable.code,
        admission_number: adm,
        ...(role === 'student' ? { year_group, class_name, house } : {}),
      },
    });
    if (createErr) {
      const msg = createErr.message || '';
      if (/already been registered|already exists/i.test(msg)) {
        return json({ error: `Email ${email} is already registered in the authentication system.` }, 409);
      }
      return json({ error: msg }, 400);
    }

    await admin.from('auth_audit_log').insert({
      event_type: 'admin_create_user',
      actor_user_id: userData.user.id,
      target_user_id: created.user?.id ?? null,
      target_email: email,
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      metadata: {
        actor_email: profile.email,
        actor_name: profile.full_name,
        role,
        admission_number: adm,
      },
    });

    return json({ success: true, email, password, user_id: created.user?.id });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Server error' }, 500);
  }
});
