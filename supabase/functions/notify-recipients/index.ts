// @ts-nocheck
// UBI — Funzione "notify-recipients": avvisa via email (Brevo) i destinatari di un pin privato.
// Chiamata dall'app dopo il salvataggio (riceve slug e lang: 'it' o 'en', la lingua di chi ha creato il pin).
// L'email è in due lingue: prima quella di chi ha creato il pin, poi l'altra. Controlla che chi chiama sia il proprietario del pin,
// non riscrive a chi è già stato avvisato o a chi si è disiscritto, max 100 avvisi al giorno per utente.
//
// Segreti da impostare in Supabase (Edge Functions > Secrets):
//   BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (es. "Ubi"), UBI_APP_URL (es. https://benleva.github.io/Ubi/), UNSUB_SECRET (una frase lunga a caso)
//   UNSUB_URL (facoltativo): indirizzo completo della funzione unsubscribe, se diverso da .../functions/v1/unsubscribe
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAILY_LIMIT = 100;

async function sign(text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('UNSUB_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Testi in italiano e in inglese: l'email li contiene entrambi, prima la lingua di chi ha creato il pin.
const T = {
  it: {
    friend: 'Un amico',
    lead: (a) => `<b>${esc(a)}</b> ha lasciato qualcosa per te in un luogo speciale:`,
    hint: 'Indizio',
    open: 'Si apre solo quando arrivi sul posto con il telefono. Tocca il pulsante per vedere dov\'è.',
    btn: 'Apri il pin',
    login: 'Per aprirlo accedi a Ubi con questo indirizzo email (la prima volta: "Registrati").',
    why: (a) => `Ricevi questa email perché ${esc(a)} ti ha scelto come destinatario su Ubi.`,
    unsub: 'Non voglio più ricevere avvisi da Ubi',
    subject: (a) => `📍 ${a} ha lasciato qualcosa per te su Ubi`,
    text: (a, t, h, link) => `${a} ha lasciato per te un contenuto su Ubi: «${t}».\n${h ? `Indizio: ${h}\n` : ''}Si apre solo sul posto. Apri il pin: ${link}`,
    noMore: 'Non vuoi più avvisi?',
  },
  en: {
    friend: 'A friend',
    lead: (a) => `<b>${esc(a)}</b> left something for you in a special place:`,
    hint: 'Hint',
    open: 'It only opens when you get there with your phone. Tap the button to see where it is.',
    btn: 'Open the pin',
    login: 'To open it, log in to Ubi with this email address (the first time: "Sign up").',
    why: (a) => `You're receiving this email because ${esc(a)} chose you as a recipient on Ubi.`,
    unsub: 'I no longer want notifications from Ubi',
    subject: (a) => `📍 ${a} left something for you on Ubi`,
    text: (a, t, h, link) => `${a} left something for you on Ubi: «${t}».\n${h ? `Hint: ${h}\n` : ''}It only opens on the spot. Open the pin: ${link}`,
    noMore: 'No more notifications?',
  },
};

function block(L, { name, title, hint, link }) {
  const a = name || L.friend;
  return `<p style="font-size:17px;margin:0 0 12px">${L.lead(a)}</p>
      <p style="font-size:21px;font-weight:bold;margin:0 0 12px">«${esc(title)}»</p>
      ${hint ? `<p style="background:#eef3f9;color:#1f3a5f;padding:10px 12px;border-radius:10px;margin:0 0 14px">${L.hint}: ${esc(hint)}</p>` : ''}
      <p style="margin:0 0 18px">${L.open}</p>
      <a href="${esc(link)}" style="display:block;text-align:center;background:#e8743b;color:#fff;text-decoration:none;font-weight:bold;font-size:17px;padding:14px;border-radius:12px">${L.btn}</a>
      <p style="font-size:13px;color:#687385;margin:16px 0 0">${L.login}</p>`;
}

function emailHtml({ name, title, hint, link, unsub, langs }) {
  const [A, B] = langs.map((l) => T[l]);
  return `<!DOCTYPE html><html lang="${langs[0]}"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#1b2430">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#1f3a5f;color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold">📍 Ubi</div>
    <div style="background:#fff;padding:22px 20px;border-radius:0 0 14px 14px;border:1px solid #e4ded4;border-top:0">
      ${block(A, { name, title, hint, link })}
      <hr style="border:0;border-top:1px solid #e4ded4;margin:22px 0" lang="${langs[1]}">
      <div lang="${langs[1]}">${block(B, { name, title, hint, link })}</div>
    </div>
    <p style="font-size:12px;color:#687385;text-align:center;margin:14px 0 0">${A.why(name || A.friend)}<br>${B.why(name || B.friend)}<br>
      <a href="${esc(unsub)}" style="color:#687385">${A.unsub} · ${B.unsub}</a></p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non permesso' }, 405);
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // 1) chi sta chiamando?
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !user) return json({ error: 'Accesso richiesto' }, 401);

    // 2) il pin è suo ed è riservato?
    const { slug, lang } = await req.json().catch(() => ({}));
    const langs = lang === 'en' ? ['en', 'it'] : ['it', 'en'];
    if (!slug) return json({ error: 'slug mancante' }, 400);
    const { data: c } = await admin.from('contents').select('id, owner_id, title, hint, share_slug, visibility').eq('share_slug', slug).maybeSingle();
    if (!c || c.owner_id !== user.id) return json({ error: 'Non autorizzato' }, 403);
    if (c.visibility !== 'restricted') return json({ sent: 0, skipped: 0 });

    // 3) destinatari da avvisare: esclusi già avvisati e disiscritti
    const { data: rec } = await admin.from('content_recipients').select('email').eq('content_id', c.id);
    const emails = [...new Set((rec || []).map((r) => r.email).filter(Boolean))];
    if (!emails.length) return json({ sent: 0, skipped: 0 });
    const { data: done } = await admin.from('content_notifications').select('email').eq('content_id', c.id);
    const { data: out } = await admin.from('email_optout').select('email').in('email', emails);
    const skip = new Set([...(done || []).map((x) => x.email), ...(out || []).map((x) => x.email)]);
    let todo = emails.filter((e) => !skip.has(e));

    // 4) limite giornaliero per utente (anti-spam)
    const { data: mine } = await admin.from('contents').select('id').eq('owner_id', user.id);
    const ids = (mine || []).map((x) => x.id);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = ids.length
      ? await admin.from('content_notifications').select('email', { count: 'exact', head: true }).in('content_id', ids).gte('sent_at', since)
      : { count: 0 };
    const room = Math.max(0, DAILY_LIMIT - (count || 0));
    const limited = todo.length > room;
    todo = todo.slice(0, room);

    // 5) invio con Brevo, una email per persona (nessuno vede gli indirizzi degli altri)
    const { data: prof } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    const name = prof?.display_name || '';
    const A = T[langs[0]], B = T[langs[1]];
    const appUrl = Deno.env.get('UBI_APP_URL') || 'https://benleva.github.io/Ubi/';
    const link = `${appUrl.replace(/#.*$/, '')}#/c/${c.share_slug}`;
    let sent = 0; const failed = [];
    for (const email of todo) {
      const unsubBase = Deno.env.get('UNSUB_URL') || `${SUPABASE_URL}/functions/v1/unsubscribe`;   // indirizzo della funzione unsubscribe
      const unsub = `${unsubBase}?e=${encodeURIComponent(email)}&t=${await sign(email)}`;
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': Deno.env.get('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: Deno.env.get('BREVO_SENDER_EMAIL'), name: Deno.env.get('BREVO_SENDER_NAME') || 'Ubi' },
          to: [{ email }],
          subject: A.subject(name || A.friend),
          htmlContent: emailHtml({ name, title: c.title, hint: c.hint, link, unsub, langs }),
          textContent: `${A.text(name || A.friend, c.title, c.hint, link)}\n\n———\n\n${B.text(name || B.friend, c.title, c.hint, link)}\n\n${A.noMore} / ${B.noMore} ${unsub}`,
          headers: { 'List-Unsubscribe': `<${unsub}>` },
        }),
      });
      if (res.ok) { await admin.from('content_notifications').insert({ content_id: c.id, email }); sent++; }
      else failed.push({ email, status: res.status, detail: (await res.text()).slice(0, 200) });
    }
    return json({ sent, skipped: emails.length - sent - failed.length, failed: failed.length, limited, errors: failed.slice(0, 3) });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
