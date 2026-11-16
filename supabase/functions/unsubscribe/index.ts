// @ts-nocheck
// UBI — Funzione "unsubscribe": link "non voglio più ricevere avvisi" presente in ogni email.
// IMPORTANTE: va pubblicata con "Verify JWT" DISATTIVATO (chi clicca dall'email non è collegato a Ubi).
// Il link è firmato (UNSUB_SECRET): nessuno può disiscrivere un indirizzo altrui.
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sign(text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('UNSUB_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
const page = (title, text) => new Response(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
  <body style="font-family:Arial,sans-serif;background:#f6f3ee;color:#1b2430;padding:40px 20px;text-align:center">
  <div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e4ded4;border-radius:14px;padding:28px">
  <div style="font-size:40px">📍</div><h1 style="font-size:22px">${title}</h1><p>${text}</p></div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const email = (u.searchParams.get('e') || '').trim().toLowerCase();
  const t = u.searchParams.get('t') || '';
  if (!email || !t || t !== await sign(email)) return page('Link non valido', 'Il link di disiscrizione non è valido o è incompleto.');
  const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const { error } = await admin.from('email_optout').upsert({ email });
  if (error) return page('Qualcosa è andato storto', 'Riprova tra qualche minuto.');
  return page('Fatto', `L'indirizzo <b>${email.replace(/[<>&"]/g, '')}</b> non riceverà più avvisi email da Ubi.<br>Potrai comunque aprire i contenuti che ti vengono condivisi.`);
});
