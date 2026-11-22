// @ts-nocheck
// UBI — Funzione "art-preview": anteprima privata di una mostra di Ubi Arte.
// Riceve { token } (il link di anteprima creato dal proprietario o dall'artista) e restituisce la mostra
// con le foto firmate per un'ora. Senza un token valido non restituisce nulla. Nessun segreto da impostare.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== 'string' || !/^[a-f0-9]{20,64}$/.test(token)) return json({ error: 'not_found' }, 404);
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data, error } = await admin.rpc('exhibition_by_token', { p_token: token });
    if (error || !data) return json({ error: 'not_found' }, 404);
    const paths = data.stops.map((s) => s.media_path).filter(Boolean);
    const urls = {};
    if (paths.length) {
      const { data: signed } = await admin.storage.from('media').createSignedUrls(paths, 3600);
      (signed || []).forEach((x) => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
    }
    data.stops = data.stops.map(({ media_path, ...s }) => ({ ...s, url: media_path ? urls[media_path] || null : null }));
    return json(data);
  } catch (e) {
    return json({ error: 'server' }, 500);
  }
});
