// @ts-nocheck
// UBI — Funzione "notify-signup": avvisa l'amministratore via email (Brevo) quando si iscrive un nuovo utente.
// La chiama il database (trigger su public.profiles, vedi migrazione 20261117090000_avviso_nuovi_iscritti.sql)
// quando un utente conferma l'email ed entra per la prima volta.
//
// Sicurezza: non serve un segreto condiviso. La funzione riceve solo l'id del profilo e poi controlla tutto
// da sola sul database: il profilo deve esistere, essere nato da meno di 15 minuti e non essere già stato
// segnalato. Chi la chiamasse a vuoto non ottiene nulla.
//
// Destinatari: il segreto ADMIN_NOTIFY_EMAIL (anche più indirizzi separati da virgola);
// se manca, gli utenti presenti in public.app_admins.
// Usa gli stessi segreti di notify-recipients: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, UBI_APP_URL
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non permesso' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { id } = await req.json().catch(() => ({}));
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'id mancante' }, 400);

    const { data: p } = await admin.from('profiles').select('id, display_name, created_at, signup_notified_at').eq('id', id).maybeSingle();
    if (!p || p.signup_notified_at) return json({ sent: 0 });
    if (Date.now() - new Date(p.created_at).getTime() > 15 * 60 * 1000) return json({ sent: 0, old: true });

    // segna subito come avvisato: così non parte mai due volte
    const { data: upd } = await admin.from('profiles').update({ signup_notified_at: new Date().toISOString() })
      .eq('id', id).is('signup_notified_at', null).select('id');
    if (!upd || !upd.length) return json({ sent: 0 });

    const { data: u } = await admin.auth.admin.getUserById(id);
    const email = u?.user?.email || '—';
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true });

    let to = (Deno.env.get('ADMIN_NOTIFY_EMAIL') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!to.length) {
      const { data: admins } = await admin.from('app_admins').select('user_id');
      for (const a of admins || []) {
        const { data: au } = await admin.auth.admin.getUserById(a.user_id);
        if (au?.user?.email) to.push(au.user.email);
      }
    }
    if (!to.length) return json({ sent: 0, error: 'nessun destinatario: imposta ADMIN_NOTIFY_EMAIL' }, 500);

    const name = p.display_name || 'Senza nome';
    const when = new Date(p.created_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'long', timeStyle: 'short' });
    const appUrl = (Deno.env.get('UBI_APP_URL') || 'https://ubipin.it/').replace(/#.*$/, '');
    const link = `${appUrl}#/admin/iscritti`;
    const html = `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1b2430">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#1f3a5f;color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold">🎉 Nuovo iscritto su Ubi</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 14px 14px;border:1px solid #e4ded4;border-top:0">
      <p style="font-size:21px;font-weight:bold;margin:0 0 6px">${esc(name)}</p>
      <p style="margin:0 0 4px;color:#3a4656">${esc(email)}</p>
      <p style="margin:0 0 16px;color:#687385">${esc(when)}</p>
      <p style="font-size:17px;margin:0 0 18px">Iscritti totali: <b>${count ?? '—'}</b></p>
      <a href="${esc(link)}" style="display:block;text-align:center;background:#e8743b;color:#fff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px;border-radius:12px">Vedi tutti gli iscritti</a>
    </div>
  </div></body></html>`;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': Deno.env.get('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: Deno.env.get('BREVO_SENDER_EMAIL'), name: Deno.env.get('BREVO_SENDER_NAME') || 'Ubi' },
        to: to.map((email) => ({ email })),
        subject: `🎉 Nuovo iscritto su Ubi: ${name} (totale ${count ?? '?'})`,
        htmlContent: html,
        textContent: `Nuovo iscritto su Ubi: ${name} <${email}>, ${when}. Iscritti totali: ${count ?? '?'}.\n${link}`,
      }),
    });
    if (!res.ok) return json({ sent: 0, error: (await res.text()).slice(0, 200) }, 502);
    return json({ sent: to.length });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
