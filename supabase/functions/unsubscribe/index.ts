// @ts-nocheck
// UBI — Funzione "unsubscribe": link "non voglio più ricevere avvisi" presente in ogni email.
// IMPORTANTE: va pubblicata con "Verify JWT" DISATTIVATO (chi clicca dall'email non è collegato a Ubi).
// Il link è firmato (UNSUB_SECRET): nessuno può disiscrivere un indirizzo altrui.
// Supabase non mostra pagine HTML dal proprio dominio: dopo l'operazione rimandiamo alla pagina di Ubi.
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sign(text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('UNSUB_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text.toLowerCase()));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
const go = (esito) => {
  const app = (Deno.env.get('UBI_APP_URL') || 'https://benleva.github.io/Ubi/').replace(/#.*$/, '');
  return new Response(null, { status: 302, headers: { Location: `${app}#/avvisi/${esito}` } });
};

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const email = (u.searchParams.get('e') || '').trim().toLowerCase();
  const t = u.searchParams.get('t') || '';
  if (!email || !t || t !== await sign(email)) return go('non-valido');
  const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const { error } = await admin.from('email_optout').upsert({ email });
  return go(error ? 'errore' : 'ok');
});
