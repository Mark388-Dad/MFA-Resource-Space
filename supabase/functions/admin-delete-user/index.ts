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

    const { target_user_id } = await req.json();
    if (!target_user_id) return json({ error: 'target_user_id required' }, 400);
    if (target_user_id === ud.user.id) return json({ error: 'You cannot delete your own account' }, 400);

    const { data: target } = await admin.from('profiles').select('email, full_name').eq('user_id', target_user_id).maybeSingle();

    // Always clean up the profile row, even if the auth user is already gone
    await admin.from('profiles').delete().eq('user_id', target_user_id);

    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (delErr && !/not.?found/i.test(delErr.message)) {
      return json({ error: delErr.message }, 400);
    }

    await admin.from('auth_audit_log').insert({
      event_type: 'admin_delete_user',
      actor_user_id: ud.user.id,
      target_user_id,
      target_email: target?.email ?? null,
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      metadata: { actor_email: me.email, deleted_name: target?.full_name },
    });

    return json({ success: true });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Server error' }, 500);
  }
});
