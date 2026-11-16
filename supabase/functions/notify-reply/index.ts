// @ts-nocheck
// UBI — Funzione "notify-reply": avvisa via email (Brevo) il creatore di un pin che qualcuno
// l'ha sbloccato e gli ha lasciato una risposta. Chiamata dall'app subito dopo l'invio della risposta.
// Controlla che chi chiama sia l'autore della risposta, invia una sola email per risposta,
// rispetta chi si è disiscritto. Nei pin dating NON rivela chi ha risposto.
//
// Usa gli stessi segreti di notify-recipients: BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, UBI_APP_URL, UNSUB_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { text: 'un messaggio', photo: 'una foto', video: 'un videomessaggio', audio: 'un messaggio vocale' };

async function sign(text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('UNSUB_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function emailHtml({ who, kind, title, link, unsub, dating }) {
  const head = dating ? '#b03a8c' : '#1f3a5f';
  const btn = dating ? '#7b3fa0' : '#e8743b';
  return `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1b2430">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:${head};color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold">${dating ? '💗 Ubi Dating' : '📍 Ubi'}</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 14px 14px;border:1px solid #e4ded4;border-top:0">
      <p style="font-size:17px;margin:0 0 12px"><b>${esc(who)}</b> ha sbloccato il tuo pin sul posto e ti ha lasciato ${kind}:</p>
      <p style="font-size:21px;font-weight:bold;margin:0 0 16px">«${esc(title)}»</p>
      ${dating ? '<p style="margin:0 0 16px">Resta anonimo finché non scegliete entrambi <b>«Voglio conoscerti»</b>.</p>' : ''}
      <a href="${esc(link)}" style="display:block;text-align:center;background:${btn};color:#fff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px;border-radius:12px">Guarda la risposta</a>
    </div>
    <p style="font-size:12px;color:#687385;text-align:center;margin:14px 0 0">Ricevi questa email perché hai creato questo pin su Ubi.<br>
      <a href="${esc(unsub)}" style="color:#687385">Non voglio più ricevere avvisi da Ubi</a></p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non permesso' }, 405);
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !user) return json({ error: 'Accesso richiesto' }, 401);

    const { reply_id } = await req.json().catch(() => ({}));
    if (!reply_id) return json({ error: 'reply_id mancante' }, 400);
    const { data: r } = await admin.from('pin_replies').select('id, content_id, author_id, media_type, notified_at').eq('id', reply_id).maybeSingle();
    if (!r || r.author_id !== user.id) return json({ error: 'Non autorizzato' }, 403);
    if (r.notified_at) return json({ sent: 0, already: true });

    const { data: c } = await admin.from('contents').select('owner_id, title, share_slug, is_dating').eq('id', r.content_id).maybeSingle();
    if (!c) return json({ sent: 0 });
    const { data: owner } = await admin.auth.admin.getUserById(c.owner_id);
    const email = owner?.user?.email?.toLowerCase();
    if (!email) return json({ sent: 0 });
    const { data: out } = await admin.from('email_optout').select('email').eq('email', email).maybeSingle();
    if (out) return json({ sent: 0, optout: true });

    let who = 'Qualcuno';
    if (!c.is_dating) {
      const { data: p } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      who = p?.display_name || 'Qualcuno';
    }
    const appUrl = (Deno.env.get('UBI_APP_URL') || 'https://ubipin.it/').replace(/#.*$/, '');
    const link = `${appUrl}#/c/${c.share_slug}`;
    const unsubBase = Deno.env.get('UNSUB_URL') || `${SUPABASE_URL}/functions/v1/unsubscribe`;
    const unsub = `${unsubBase}?e=${encodeURIComponent(email)}&t=${await sign(email)}`;
    const kind = KIND[r.media_type] || 'una risposta';

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': Deno.env.get('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: Deno.env.get('BREVO_SENDER_EMAIL'), name: Deno.env.get('BREVO_SENDER_NAME') || 'Ubi' },
        to: [{ email }],
        subject: `${c.is_dating ? '💗' : '📍'} ${who} ha sbloccato il tuo pin e ti ha risposto`,
        htmlContent: emailHtml({ who, kind, title: c.title, link, unsub, dating: c.is_dating }),
        textContent: `${who} ha sbloccato il tuo pin «${c.title}» e ti ha lasciato ${kind}.\nGuarda la risposta: ${link}\n\nNon vuoi più avvisi? ${unsub}`,
        headers: { 'List-Unsubscribe': `<${unsub}>` },
      }),
    });
    if (!res.ok) return json({ sent: 0, error: (await res.text()).slice(0, 200) }, 502);
    await admin.from('pin_replies').update({ notified_at: new Date().toISOString() }).eq('id', r.id);
    return json({ sent: 1 });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
