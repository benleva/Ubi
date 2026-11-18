// @ts-nocheck
// UBI — Funzione "notify-reply": avvisa via email (Brevo) il creatore di un pin che qualcuno
// l'ha sbloccato e gli ha lasciato una risposta. Chiamata dall'app subito dopo l'invio della risposta
// (riceve reply_id e lang). L'email è in due lingue: prima quella di chi ha risposto, poi l'altra.
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

async function sign(text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('UNSUB_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Testi in italiano e in inglese: l'email li contiene entrambi, prima la lingua di chi ha risposto.
const T = {
  it: {
    someone: 'Qualcuno',
    kind: { text: 'un messaggio', photo: 'una foto', video: 'un videomessaggio', audio: 'un messaggio vocale' }, reply: 'una risposta',
    lead: (w, k) => `<b>${esc(w)}</b> ha sbloccato il tuo pin sul posto e ti ha lasciato ${k}:`,
    anon: 'Resta anonimo finché non scegliete entrambi <b>«Voglio conoscerti»</b>.',
    btn: 'Guarda la risposta',
    why: 'Ricevi questa email perché hai creato questo pin su Ubi.',
    unsub: 'Non voglio più ricevere avvisi da Ubi',
    subject: (w) => `${w} ha sbloccato il tuo pin e ti ha risposto`,
    text: (w, t, k, link) => `${w} ha sbloccato il tuo pin «${t}» e ti ha lasciato ${k}.\nGuarda la risposta: ${link}`,
    noMore: 'Non vuoi più avvisi?',
  },
  en: {
    someone: 'Someone',
    kind: { text: 'a message', photo: 'a photo', video: 'a video message', audio: 'a voice message' }, reply: 'a reply',
    lead: (w, k) => `<b>${esc(w)}</b> unlocked your pin on the spot and left you ${k}:`,
    anon: 'They stay anonymous until you both choose <b>«I want to meet you»</b>.',
    btn: 'See the reply',
    why: 'You\'re receiving this email because you created this pin on Ubi.',
    unsub: 'I no longer want notifications from Ubi',
    subject: (w) => `${w} unlocked your pin and replied`,
    text: (w, t, k, link) => `${w} unlocked your pin «${t}» and left you ${k}.\nSee the reply: ${link}`,
    noMore: 'No more notifications?',
  },
};

function block(L, { name, media, title, link, dating, btn }) {
  return `<p style="font-size:17px;margin:0 0 12px">${L.lead(name || L.someone, L.kind[media] || L.reply)}</p>
      <p style="font-size:21px;font-weight:bold;margin:0 0 16px">«${esc(title)}»</p>
      ${dating ? `<p style="margin:0 0 16px">${L.anon}</p>` : ''}
      <a href="${esc(link)}" style="display:block;text-align:center;background:${btn};color:#fff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px;border-radius:12px">${L.btn}</a>`;
}

function emailHtml({ name, media, title, link, unsub, dating, langs }) {
  const head = dating ? '#b03a8c' : '#1f3a5f';
  const btn = dating ? '#7b3fa0' : '#e8743b';
  const [A, B] = langs.map((l) => T[l]);
  return `<!DOCTYPE html><html lang="${langs[0]}"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1b2430">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:${head};color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold">${dating ? '💗 Ubi Dating' : '📍 Ubi'}</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 14px 14px;border:1px solid #e4ded4;border-top:0">
      ${block(A, { name, media, title, link, dating, btn })}
      <hr style="border:0;border-top:1px solid #e4ded4;margin:22px 0">
      <div lang="${langs[1]}">${block(B, { name, media, title, link, dating, btn })}</div>
    </div>
    <p style="font-size:12px;color:#687385;text-align:center;margin:14px 0 0">${A.why}<br>${B.why}<br>
      <a href="${esc(unsub)}" style="color:#687385">${A.unsub} · ${B.unsub}</a></p>
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

    const { reply_id, lang } = await req.json().catch(() => ({}));
    const langs = lang === 'en' ? ['en', 'it'] : ['it', 'en'];
    const A = T[langs[0]], B = T[langs[1]];
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

    let name = '';   // nei pin dating chi risponde resta anonimo
    if (!c.is_dating) {
      const { data: p } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      name = p?.display_name || '';
    }
    const appUrl = (Deno.env.get('UBI_APP_URL') || 'https://ubipin.it/').replace(/#.*$/, '');
    const link = `${appUrl}#/c/${c.share_slug}`;
    const unsubBase = Deno.env.get('UNSUB_URL') || `${SUPABASE_URL}/functions/v1/unsubscribe`;
    const unsub = `${unsubBase}?e=${encodeURIComponent(email)}&t=${await sign(email)}`;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': Deno.env.get('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: Deno.env.get('BREVO_SENDER_EMAIL'), name: Deno.env.get('BREVO_SENDER_NAME') || 'Ubi' },
        to: [{ email }],
        subject: `${c.is_dating ? '💗' : '📍'} ${A.subject(name || A.someone)}`,
        htmlContent: emailHtml({ name, media: r.media_type, title: c.title, link, unsub, dating: c.is_dating, langs }),
        textContent: `${A.text(name || A.someone, c.title, A.kind[r.media_type] || A.reply, link)}\n\n———\n\n${B.text(name || B.someone, c.title, B.kind[r.media_type] || B.reply, link)}\n\n${A.noMore} / ${B.noMore} ${unsub}`,
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
