import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const u = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await u.auth.getUser();
    if (!ud?.user) return json({ error: 'Invalid session' }, 401);
    const admin = createClient(url, svc);
    const { data: me } = await admin.from('profiles').select('role, full_name, email').eq('user_id', ud.user.id).single();
    const staff = ['librarian', 'staff', 'homeroom_tutor', 'head_of_year', 'house_patron'];
    if (!me || !staff.includes(me.role)) return json({ error: 'Forbidden: staff only' }, 403);

    const body = await req.json();
    const { target_user_id, full_name, email, role, year_group, class_name, house, admission_number } = body ?? {};
    if (!target_user_id) return json({ error: 'target_user_id required' }, 400);

    if (email) {
      const normEmail = String(email).toLowerCase().trim();
      if (!/^[^\s@]+@mpesafoundationacademy\.ac\.ke$/i.test(normEmail)) {
        return json({ error: `Invalid email: ${normEmail}. Must be @mpesafoundationacademy.ac.ke` }, 400);
      }
      const { data: dup } = await admin
        .from('profiles').select('user_id').ilike('email', normEmail).neq('user_id', target_user_id).maybeSingle();
      if (dup) return json({ error: `Email ${normEmail} is already used by another user.` }, 409);

      const { error: uErr } = await admin.auth.admin.updateUserById(target_user_id, { email: normEmail });
      if (uErr) return json({ error: uErr.message }, 400);
    }

    if (admission_number) {
      const adm = String(admission_number).trim();
      const { data: dup } = await admin
        .from('profiles').select('user_id').eq('admission_number', adm).neq('user_id', target_user_id).maybeSingle();
      if (dup) return json({ error: `Admission ${adm} is already used by another user.` }, 409);
    }

    const updates: any = {};
    if (full_name != null) updates.full_name = full_name;
    if (email) updates.email = String(email).toLowerCase().trim();
    if (role) updates.role = role;
    if (year_group !== undefined) updates.year_group = year_group || null;
    if (class_name !== undefined) updates.class_name = class_name || null;
    if (house !== undefined) updates.house = house || null;
    if (admission_number !== undefined) updates.admission_number = admission_number || null;

    if (Object.keys(updates).length) {
      const { error: pErr } = await admin.from('profiles').update(updates).eq('user_id', target_user_id);
      if (pErr) return json({ error: pErr.message }, 400);
    }

    await admin.from('auth_audit_log').insert({
      event_type: 'admin_update_user',
      actor_user_id: ud.user.id,
      target_user_id,
      target_email: updates.email ?? null,
      metadata: { actor_email: me.email, updates },
    });

    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Server error' }, 500);
  }
});
