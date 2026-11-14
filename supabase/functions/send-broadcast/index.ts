import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: u } = await admin.auth.getUser(auth.replace('Bearer ', ''))
    if (!u?.user) return json({ error: 'Unauthorized' }, 401)
    const { data: me } = await admin.from('profiles').select('role').eq('user_id', u.user.id).maybeSingle()
    if (!me || me.role === 'student') return json({ error: 'Staff only' }, 403)

    const body = await req.json().catch(() => null)
    const subject = String(body?.subject ?? '').trim().slice(0, 200)
    const message = String(body?.message ?? '').trim().slice(0, 10000)
    const emails: string[] = Array.isArray(body?.emails) ? body.emails : []
    const valid = [...new Set(emails.filter((e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))].slice(0, 2000)
    if (!subject || !message || valid.length === 0) return json({ error: 'subject, message and emails required' }, 400)

    // Respect people who turned off broadcast emails in Settings
    const { data: optedOut } = await admin.from('user_preferences').select('user_id').eq('email_broadcasts', false)
    if (optedOut?.length) {
      const { data: outProfiles } = await admin.from('profiles').select('email').in('user_id', optedOut.map((o: any) => o.user_id))
      const blocked = new Set((outProfiles ?? []).map((p: any) => String(p.email).toLowerCase()))
      for (let i = valid.length - 1; i >= 0; i--) if (blocked.has(valid[i].toLowerCase())) valid.splice(i, 1)
      if (valid.length === 0) return json({ success: true, sent: 0, failed: 0, skipped: blocked.size })
    }
    let lastError = ''
    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) return json({ error: 'Email service not configured' }, 500)

    const providedHtml = typeof body?.html === 'string' && body.html.trim().length > 0 ? body.html.trim() : null
    const html = providedHtml || `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#00205B">${esc(subject)}</h2>
      <div style="white-space:pre-wrap;color:#333;line-height:1.6">${esc(message)}</div>
      <p style="color:#888;font-size:12px;margin-top:24px">MFA 45-Book Reading Challenge</p></div>`

    let sent = 0
    const failed: string[] = []
    // Resend batch endpoint: up to 100 emails per call
    for (let i = 0; i < valid.length; i += 100) {
      const chunk = valid.slice(i, i + 100)
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(chunk.map((to) => ({
          from: (Deno.env.get('EMAIL_FROM') || 'MFA Reading Challenge <onboarding@resend.dev>'), to: [to], subject, html,
        }))),
      })
      if (r.ok) sent += chunk.length
      else { failed.push(...chunk); lastError = await r.text(); console.error('resend', r.status, lastError) }
    }
    return json({ success: sent > 0 || failed.length === 0, sent, failed: failed.length, error: failed.length ? lastError : undefined })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
