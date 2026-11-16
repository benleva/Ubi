// Ubi — web app (Fase 1). Nessun build: file statici, librerie da CDN.
import { CONFIG } from './config.js';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const TYPES = {
  photo: { l: 'I', c: '#2f6fd6', n: 'Immagine' },
  video: { l: 'V', c: '#d64545', n: 'Video' },
  text:  { l: 'T', c: '#7b4fc9', n: 'Testo' },
  link:  { l: 'L', c: '#2e9b6b', n: 'Link' },
  audio: { l: 'A', c: '#e0901f', n: 'Audio' },
};
const badge = (t, extra = '') => { const x = TYPES[t] || TYPES.photo; return `<span class="tico ${extra}" style="background:${x.c}" title="${x.n}">${x.l}</span>`; };
const TAGS_SUGGESTED = ['famiglia', 'amore', 'anniversario', 'amici', 'ricordo', 'sport', 'panorama', 'tramonto',
  'monumento', 'storia', 'arte', 'natura', 'mare', 'montagna', 'città', 'cibo', 'fotografia', 'musica', 'guida', 'caccia al tesoro'];
const MAX_TAGS = 8;
const normTag = (t) => String(t).toLowerCase().replace(/[,;#<>"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
const tagChips = (tags, cls = 'static') => (tags && tags.length) ? `<div class="chips">${tags.map((t) => `<span class="chip ${cls}">#${esc(t)}</span>`).join('')}</div>` : '';
const VIS = { public: 'Pubblico', hidden: 'Solo io', restricted: 'Destinatari scelti' };

function distanceM(lat1, lng1, lat2, lng2) {
  const r = (x) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.round(m)} m`);
const shareUrl = (slug) => `${location.origin}${location.pathname}#/c/${slug}`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
};
const setPending = (h) => store.set('ubi_after_login', h);
const popPending = () => { const h = store.get('ubi_after_login'); store.set('ubi_after_login', null); return h; };

function getPos() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Questo browser non supporta la geolocalizzazione.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? 'Permesso posizione negato: abilitalo nelle impostazioni del browser.' : 'Posizione non disponibile, riprova all\'aperto.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}
function makeMap(el, lat, lng, zoom = 16) {
  if (!window.L) { el.innerHTML = '<p class="muted small">Mappa non disponibile (connessione assente).</p>'; return null; }
  const m = L.map(el, { zoomControl: true }).setView([lat, lng], zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
  return m;
}
const waitLeaflet = () => new Promise((res) => {
  if (window.L) return res();
  let n = 0; const t = setInterval(() => { if (window.L || ++n > 40) { clearInterval(t); res(); } }, 100);
});
// Rende cliccabili gli indirizzi web dentro un testo (il resto viene "ripulito" da HTML).
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
function linkify(raw) {
  const str = String(raw ?? ''); let out = ''; let last = 0;
  for (const m of str.matchAll(URL_RE)) {
    let url = m[0]; let trail = '';
    while (/[.,;:!?)\]]$/.test(url)) { trail = url.slice(-1) + trail; url = url.slice(0, -1); }
    out += esc(str.slice(last, m.index)) + `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>` + esc(trail);
    last = m.index + m[0].length;
  }
  return (out + esc(str.slice(last))).replace(/\n/g, '<br>');
}
// Dal testo incollato (anche un messaggio di condivisione) ricava un link valido, sempre https.
function extractUrl(input) {
  const txt = String(input || '').trim();
  let u = (txt.match(URL_RE) || [])[0];
  if (!u && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(txt)) u = 'https://' + txt;   // es. "loc.wiki/t/123"
  if (!u) return null;
  u = u.replace(/[.,;:!?)\]]+$/, '').replace(/^http:\/\//i, 'https://');
  try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch { return null; }
}
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const vimeoId = (u) => { const m = String(u).match(/vimeo\.com\/(?:video\/)?(\d{6,})/); return m ? m[1] : null; };
function youTubeId(url) { const m = String(url).match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : null; }

// ======================= BACKEND: SUPABASE =======================
async function supabaseBackend() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  let B = null;
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  // Arrivo dal link "password dimenticata": mostriamo la schermata per sceglierne una nuova
  sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY' && B) { B.recovery = true; if (appReady) route(); } });
  const must = ({ data, error }) => { if (error) throw error; return data; };
  const base = location.origin + location.pathname;
  B = {
    demo: false,
    recovery: false,
    async init() {
      await sb.auth.getSession();
      if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
    },
    async user() { const { data } = await sb.auth.getSession(); const u = data.session?.user; return u ? { id: u.id, email: u.email } : null; },
    async signUp(email, password) {
      const data = must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: base } }));
      // Email già registrata: Supabase risponde con un utente senza identità (per non rivelare chi è iscritto)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('already_registered');
      return { needsConfirm: !data.session };
    },
    async signInPassword(email, password) { must(await sb.auth.signInWithPassword({ email, password })); },
    async signInLink(email) { must(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: base, shouldCreateUser: false } })); },
    async resetPassword(email) { must(await sb.auth.resetPasswordForEmail(email, { redirectTo: base })); },
    async updatePassword(password) { must(await sb.auth.updateUser({ password })); B.recovery = false; },
    async signOut() { await sb.auth.signOut(); },
    async profile() { const u = await B.user(); return must(await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()); },
    async saveProfile(name) {
      const u = await B.user();
      must(await sb.from('profiles').upsert({ id: u.id, display_name: name, privacy_version: CONFIG.PRIVACY_VERSION, privacy_accepted_at: new Date().toISOString() }));
    },
    async listMine() {
      const u = await B.user();
      return must(await sb.from('contents').select('id,share_slug,title,media_type,media_path,visibility,created_at,password_hash,tags')
        .eq('owner_id', u.id).order('created_at', { ascending: false }));
    },
    async create(d) {
      const u = await B.user();
      const id = crypto.randomUUID();
      let media_path = null;
      if (d.file) {
        const ext = (d.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
        media_path = `${u.id}/${id}/media.${ext}`;
        must(await sb.storage.from('media').upload(media_path, d.file, { contentType: d.file.type, upsert: false }));
      }
      const row = {
        id, owner_id: u.id, title: d.title, hint: d.hint || null, media_type: d.media_type, media_path,
        external_url: d.external_url || null, duration_seconds: d.duration ?? null, lat: d.lat, lng: d.lng,
        unlock_radius_m: d.radius, location_source: d.source, visibility: d.visibility, password_hash: d.password || null,
        text_body: d.text_body || null, tags: d.tags || [],
      };
      const res = await sb.from('contents').insert(row).select('share_slug').single();
      if (res.error) { if (media_path) await sb.storage.from('media').remove([media_path]); throw res.error; }
      if (d.recipients.length) must(await sb.from('content_recipients').insert(d.recipients.map((email) => ({ content_id: id, email }))));
      return res.data.share_slug;
    },
    async getForEdit(slug) {
      const u = await B.user();
      const c = must(await sb.from('contents').select('*, content_recipients(email)').eq('share_slug', slug).eq('owner_id', u.id).maybeSingle());
      if (!c) return null;
      c.recipients = (c.content_recipients || []).map((r) => r.email).filter(Boolean);
      c.has_password = !!c.password_hash; delete c.password_hash; delete c.content_recipients;
      return c;
    },
    async update(old, d) {
      const u = await B.user();
      let media_path = old.media_path;
      const kindIsFile = ['photo', 'video', 'audio'].includes(d.media_type);
      if (d.file) {   // nuovo file: lo carico e poi cancello il vecchio
        const ext = (d.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
        media_path = `${u.id}/${old.id}/media-${Date.now()}.${ext}`;
        must(await sb.storage.from('media').upload(media_path, d.file, { contentType: d.file.type, upsert: false }));
      } else if (!kindIsFile) media_path = null;
      const patch = {
        title: d.title, hint: d.hint || null, media_type: d.media_type, media_path,
        external_url: d.media_type === 'link' ? d.external_url : null,
        text_body: d.media_type === 'text' ? d.text_body : null,
        duration_seconds: kindIsFile ? (d.file ? d.duration : old.duration_seconds) : null,
        lat: d.lat, lng: d.lng, unlock_radius_m: d.radius, location_source: d.source,
        visibility: d.visibility, tags: d.tags || [],
      };
      if (d.passwordAction === 'set') patch.password_hash = d.password;
      if (d.passwordAction === 'remove') patch.password_hash = null;
      const res = await sb.from('contents').update(patch).eq('id', old.id).select('share_slug').single();
      if (res.error) { if (d.file) await sb.storage.from('media').remove([media_path]); throw res.error; }
      if (old.media_path && old.media_path !== media_path) await sb.storage.from('media').remove([old.media_path]);
      // destinatari: sostituisco l'elenco
      must(await sb.from('content_recipients').delete().eq('content_id', old.id));
      if (d.visibility === 'restricted' && d.recipients.length) {
        must(await sb.from('content_recipients').insert(d.recipients.map((email) => ({ content_id: old.id, email }))));
      }
      return res.data.share_slug;
    },
    async remove(c) {
      if (c.media_path) await sb.storage.from('media').remove([c.media_path]);
      must(await sb.from('contents').delete().eq('id', c.id));
    },
    async teaser(slug) { return (must(await sb.rpc('get_teaser', { p_slug: slug })) || [])[0] || null; },
    async mapContents(b) {
      return must(await sb.rpc('map_contents', { p_min_lat: b.s, p_min_lng: b.w, p_max_lat: b.n, p_max_lng: b.e })) || [];
    },
    async unlock(slug, pos, password) {
      const r = (must(await sb.rpc('unlock', {
        p_slug: slug, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null, p_accuracy_m: pos?.acc ?? null, p_password: password || null,
      })) || [])[0] || { status: 'not_found' };
      if (r.status === 'ok' && r.media_path) {
        const s = must(await sb.storage.from('media').createSignedUrl(r.media_path, 3600));
        r.url = s.signedUrl;
      }
      return r;
    },
  };
  return B;
}

// ======================= BACKEND: DEMO (solo su questo dispositivo) =======================
// Replica le stesse regole del server per provare il flusso senza database.
function demoBackend() {
  const K = 'ubi_demo';
  const empty = () => ({ user: null, profiles: {}, contents: [], unlocks: [] });
  let db; try { db = JSON.parse(store.get(K)) || empty(); } catch { db = empty(); }
  const save = () => store.set(K, JSON.stringify(db));
  const mem = new Map();
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('ubi_demo_files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('f');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  async function putBlob(id, blob) {
    mem.set(id, blob);
    try { const d = await idb(); await new Promise((res, rej) => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').put(blob, id); t.oncomplete = res; t.onerror = rej; }); } catch { /* resta in memoria */ }
  }
  async function getBlob(id) {
    if (mem.has(id)) return mem.get(id);
    try { const d = await idb(); return await new Promise((res) => { const q = d.transaction('f').objectStore('f').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; }
  }
  const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const canAccess = (c, u) => (u && c.owner_id === u.id) || c.visibility === 'public' || (c.visibility === 'restricted' && !!u && c.recipients.includes(u.email));
  const B = {
    demo: true,
    async init() {},
    async user() { return db.user; },
    async signUp(email, password) {
      db.accounts = db.accounts || {};
      if (db.accounts[email]) throw new Error('already_registered');
      db.accounts[email] = await sha('ubi:' + password);
      db.user = { id: 'u_' + (await sha(email)).slice(0, 16), email }; save();
      return { needsConfirm: false };
    },
    async signInPassword(email, password) {
      if (!db.accounts?.[email] || db.accounts[email] !== await sha('ubi:' + password)) throw new Error('Invalid login credentials');
      db.user = { id: 'u_' + (await sha(email)).slice(0, 16), email }; save();
    },
    async signInLink() { throw new Error('Nella demo usa email e password.'); },
    async resetPassword() { throw new Error('Nella demo il recupero password non è disponibile.'); },
    async updatePassword() {},
    async signOut() { db.user = null; save(); },
    async profile() { return db.profiles[db.user.id] || null; },
    async saveProfile(name) { db.profiles[db.user.id] = { display_name: name, privacy_version: CONFIG.PRIVACY_VERSION }; save(); },
    async listMine() { return db.contents.filter((c) => c.owner_id === db.user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async create(d) {
      const id = crypto.randomUUID(); const slug = hex(6);
      if (d.file) await putBlob(id, d.file);
      db.contents.push({
        id, share_slug: slug, owner_id: db.user.id, title: d.title, hint: d.hint || null, media_type: d.media_type,
        media_path: d.file ? id : null, external_url: d.external_url || null, lat: d.lat, lng: d.lng, unlock_radius_m: d.radius,
        visibility: d.visibility, recipients: d.recipients, password_hash: d.password ? await sha(d.password) : null,
        text_body: d.text_body || null, tags: d.tags || [], created_at: new Date().toISOString(),
      });
      save(); return slug;
    },
    async remove(c) { db.contents = db.contents.filter((x) => x.id !== c.id); save(); },
    async getForEdit(slug) {
      const c = db.contents.find((x) => x.share_slug === slug && x.owner_id === db.user.id);
      return c ? { ...c, has_password: !!c.password_hash, duration_seconds: c.duration_seconds ?? null } : null;
    },
    async update(old, d) {
      const c = db.contents.find((x) => x.id === old.id); if (!c) throw new Error('Contenuto non trovato');
      const kindIsFile = ['photo', 'video', 'audio'].includes(d.media_type);
      if (d.file) { await putBlob(c.id + ':' + Date.now(), d.file); c.media_path = [...mem.keys()].pop(); }
      else if (!kindIsFile) c.media_path = null;
      Object.assign(c, {
        title: d.title, hint: d.hint || null, media_type: d.media_type,
        external_url: d.media_type === 'link' ? d.external_url : null, text_body: d.media_type === 'text' ? d.text_body : null,
        lat: d.lat, lng: d.lng, unlock_radius_m: d.radius, visibility: d.visibility, tags: d.tags || [],
        recipients: d.visibility === 'restricted' ? d.recipients : [],
      });
      if (d.passwordAction === 'set') c.password_hash = await sha(d.password);
      if (d.passwordAction === 'remove') c.password_hash = null;
      save(); return c.share_slug;
    },
    async mapContents(b) {
      const u = db.user;
      return db.contents.filter((c) => canAccess(c, u) && c.lat >= b.s && c.lat <= b.n && c.lng >= b.w && c.lng <= b.e)
        .map((c) => ({ share_slug: c.share_slug, title: c.title, media_type: c.media_type, lat: c.lat, lng: c.lng,
          is_owner: c.owner_id === u.id, unlocked: db.unlocks.some((x) => x.c === c.id && x.u === u.id), tags: c.tags || [] }));
    },
    async teaser(slug) {
      const u = db.user; const c = db.contents.find((x) => x.share_slug === slug);
      if (!c || !canAccess(c, u)) return null;
      return {
        id: c.id, title: c.title, hint: c.hint, media_type: c.media_type, lat: c.lat, lng: c.lng, unlock_radius_m: c.unlock_radius_m,
        requires_password: !!c.password_hash, is_owner: !!u && c.owner_id === u.id,
        already_unlocked: !!u && db.unlocks.some((x) => x.c === c.id && x.u === u.id),
        author: db.profiles[c.owner_id]?.display_name || null, tags: c.tags || [],
      };
    },
    async unlock(slug, pos, password) {
      const u = db.user; if (!u) return { status: 'login_required' };
      const c = db.contents.find((x) => x.share_slug === slug);
      if (!c || !canAccess(c, u)) return { status: 'not_found' };
      const ok = async (d) => ({ status: 'ok', distance_m: d, external_url: c.external_url, text_body: c.text_body, url: c.media_path ? URL.createObjectURL(await getBlob(c.media_path) || new Blob()) : null });
      if (c.owner_id === u.id || db.unlocks.some((x) => x.c === c.id && x.u === u.id)) return ok(null);
      if (!pos || pos.acc > 100) return { status: 'gps_inaccurate' };
      const d = Math.round(distanceM(c.lat, c.lng, pos.lat, pos.lng));
      if (d > c.unlock_radius_m + Math.min(pos.acc, 30)) return { status: 'too_far', distance_m: d };
      if (c.password_hash) {
        if (!password) return { status: 'password_required', distance_m: d };
        if ((await sha(password)) !== c.password_hash) return { status: 'wrong_password', distance_m: d };
      }
      db.unlocks.push({ c: c.id, u: u.id }); save();
      return ok(d);
    },
  };
  return B;
}

// ======================= VISTE =======================
let B;
let appReady = false;
let watchId = null;
const stopWatch = () => { if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; } };
const msg = (el, text, kind = 'err') => { el.innerHTML = text ? `<div class="msg ${kind}">${text}</div>` : ''; };
const errText = (e) => esc(e?.message || String(e));

async function route() {
  try { await routeInner(); } catch (err) {
    console.error(err);
    app.insertAdjacentHTML('afterbegin', `<div class="msg err">Errore: ${authErr(err)}</div>`);
    document.querySelectorAll('button[disabled]').forEach((b) => { b.disabled = false; });
  }
}
async function routeInner() {
  stopWatch();
  if (B.recovery) return viewNewPassword();
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'faq') return viewFaq(arg);
  const user = await B.user();
  if (page === 'c' && arg) {
    if (user) {
      const p = await ensureProfile();
      if (!p) { setPending(location.hash); return viewConsent(); }
      if (store.get('ubi_after_login') === location.hash) popPending();
    }
    return viewContent(arg, user);
  }
  if (!user) return viewLogin();
  const prof = await ensureProfile();
  if (!prof) return viewConsent();
  const pending = popPending();
  if (pending && pending !== location.hash) { location.hash = pending; return; }
  if (page === 'new') return viewNew();
  if (page === 'edit' && arg) {
    const c = await B.getForEdit(arg);
    if (!c) { app.innerHTML = '<div class="card center"><h2>Non puoi modificare questo contenuto</h2><p class="muted">Solo chi l\'ha creato può modificarlo.</p><a class="btn" href="#/">Torna alla mappa</a></div>'; return; }
    return viewNew(c);
  }
  return viewHome(user, prof);
}

// Profilo valido? Se l'utente ha accettato i consensi in registrazione, lo salviamo ora.
async function ensureProfile() {
  const p = await B.profile();
  if (p && p.privacy_version === CONFIG.PRIVACY_VERSION) return p;
  let c = null; try { c = JSON.parse(store.get('ubi_consent')); } catch { /* niente */ }
  if (c && c.v === CONFIG.PRIVACY_VERSION && c.name) {
    await B.saveProfile(c.name); store.set('ubi_consent', null);
    return B.profile();
  }
  return null;
}

const AUTH_ERR = [
  [/invalid login credentials/i, 'Email o password errate.'],
  [/already_registered|already registered/i, 'Questa email è già registrata: usa "Accedi".'],
  [/email not confirmed/i, 'Devi ancora confermare l\'email: apri il messaggio che ti abbiamo mandato (controlla anche lo spam).'],
  [/signups not allowed|user not found/i, 'Non c\'è un account con questa email: registrati.'],
  [/password should be|weak password/i, 'Password troppo debole: usa almeno 8 caratteri.'],
  [/rate limit|too many|security purposes/i, 'Troppi tentativi ravvicinati: riprova tra qualche minuto.'],
];
const withTimeout = (p, ms = 20000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Il server non risponde: controlla la connessione e riprova.')), ms))]);
const authErr = (e) => { const m = e?.message || String(e); const f = AUTH_ERR.find(([re]) => re.test(m)); return f ? f[1] : esc(m); };

const pwdField = (id, auto, label = 'Password') => `
  <label for="${id}">${label}</label>
  <div class="row" style="flex-wrap:nowrap"><input id="${id}" type="password" autocomplete="${auto}" required minlength="8" maxlength="72">
  <button type="button" class="ghost" data-show="${id}" style="flex:0 0 auto" aria-label="Mostra password">👁</button></div>`;
const bindShow = () => document.querySelectorAll('[data-show]').forEach((b) => {
  b.onclick = () => { const i = $('#' + b.dataset.show); i.type = i.type === 'password' ? 'text' : 'password'; };
});

function viewLogin(note = '', tab = 'login') {
  app.innerHTML = `
    <div class="hero"><span class="pin"></span><h1>Lascia un ricordo dove è nato</h1>
      <p class="muted">Foto, video e audio fissati in un luogo. Si aprono solo quando ci arrivi.</p></div>
    ${note ? `<div class="msg info">${note}</div>` : ''}
    <div class="seg" id="tabs"><button data-t="login" class="${tab === 'login' ? 'on' : ''}">Accedi</button><button data-t="signup" class="${tab === 'signup' ? 'on' : ''}">Registrati</button></div>
    <div class="card" id="box"></div>
    <p class="muted small center">Resti collegato su questo telefono: non dovrai rifare l'accesso.${B.demo ? '<br>Modalità demo: i dati restano su questo telefono.' : ''}</p>`;
  $('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) viewLogin(note, b.dataset.t); };
  return tab === 'signup' ? signupForm() : loginForm();
}

function loginForm() {
  $('#box').innerHTML = `<form id="f">
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="username" required placeholder="nome@esempio.it">
      ${pwdField('pwd', 'current-password')}
      <div id="m"></div>
      <button class="full" type="submit">Accedi</button>
    </form>
    <div class="actions"><button class="ghost" id="forgot" type="button">Password dimenticata?</button>
      ${B.demo ? '' : '<button class="ghost" id="magic" type="button">Entra con un link via email</button>'}</div>`;
  bindShow();
  const email = () => $('#email').value.trim().toLowerCase();
  $('#f').onsubmit = async (e) => {
    e.preventDefault(); const btn = $('#f button[type=submit]'); btn.disabled = true;
    try { await withTimeout(B.signInPassword(email(), $('#pwd').value)); await route(); } catch (err) { msg($('#m'), authErr(err)); btn.disabled = false; }
  };
  const viaEmail = async (fn, okText) => {
    if (!EMAIL_RE.test(email())) return msg($('#m'), 'Scrivi prima la tua email qui sopra.');
    try { await fn(email()); msg($('#m'), okText, 'ok'); } catch (err) { msg($('#m'), authErr(err)); }
  };
  $('#forgot').onclick = () => viaEmail(B.resetPassword, `Ti abbiamo mandato un link per scegliere una nuova password a <b>${esc(email())}</b>.`);
  if ($('#magic')) $('#magic').onclick = () => viaEmail(B.signInLink, `Link di accesso inviato a <b>${esc(email())}</b>: aprilo da questo telefono.`);
}

function signupForm() {
  $('#box').innerHTML = `<form id="f">
      <label for="name">Come vuoi farti chiamare?</label>
      <input id="name" required maxlength="60" autocomplete="nickname" placeholder="Es. Andrea">
      <p class="muted small">Il nome è visibile a chi apre i tuoi contenuti.</p>
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="username" required placeholder="nome@esempio.it">
      ${pwdField('pwd', 'new-password', 'Scegli una password (almeno 8 caratteri)')}
      ${consentBoxes()}
      <div id="m"></div>
      <button class="full accent" type="submit">Crea il mio account</button>
    </form>`;
  bindShow();
  $('#f').onsubmit = async (e) => {
    e.preventDefault(); const btn = $('#f button[type=submit]'); btn.disabled = true;
    const email = $('#email').value.trim().toLowerCase();
    store.set('ubi_consent', JSON.stringify({ name: $('#name').value.trim(), v: CONFIG.PRIVACY_VERSION }));
    try {
      const r = await withTimeout(B.signUp(email, $('#pwd').value));
      if (!r.needsConfirm) { await route(); return; }
      $('#box').innerHTML = `<div class="msg ok">Quasi fatto! Abbiamo mandato un'email di conferma a <b>${esc(email)}</b>.
        Aprila da questo telefono: serve solo la prima volta, poi entrerai con email e password.</div>`;
    } catch (err) { store.set('ubi_consent', null); msg($('#m'), authErr(err)); btn.disabled = false; }
  };
}

const consentBoxes = () => `
  <label class="inline"><input type="checkbox" id="c1" required>
    <span>Ho letto l'<a href="privacy.html" target="_blank" rel="noopener">informativa privacy</a> e accetto il trattamento dei miei dati per usare il servizio.</span></label>
  <label class="inline"><input type="checkbox" id="c2" required>
    <span>Acconsento all'uso della posizione del telefono <b>solo</b> mentre uso l'app, per fissare e sbloccare i contenuti. La posizione non viene salvata nel mio profilo.</span></label>`;

// Mostrata solo se manca il consenso (es. informativa aggiornata).
async function viewConsent() {
  let name = ''; try { name = (await B.profile())?.display_name || ''; } catch { /* nuovo utente */ }
  app.innerHTML = `
    <h1>Benvenuto in Ubi</h1>
    <div class="card"><form id="f">
      <label for="name">Come vuoi farti chiamare?</label>
      <input id="name" required maxlength="60" placeholder="Es. Andrea" value="${esc(name)}">
      <p class="muted small">Il nome è visibile a chi apre i tuoi contenuti.</p>
      ${consentBoxes()}
      <div id="m"></div>
      <button class="full" type="submit">Continua</button>
    </form></div>`;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { await B.saveProfile($('#name').value.trim()); route(); } catch (err) { msg($('#m'), errText(err)); }
  };
}

function viewNewPassword() {
  app.innerHTML = `
    <h1>Nuova password</h1>
    <div class="card"><form id="f">
      ${pwdField('pwd', 'new-password', 'Scegli la nuova password (almeno 8 caratteri)')}
      <div id="m"></div>
      <button class="full" type="submit">Salva e continua</button>
    </form></div>`;
  bindShow();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { await B.updatePassword($('#pwd').value); B.recovery = false; route(); } catch (err) { msg($('#m'), authErr(err)); }
  };
}

// Mappa iniziale: segnaposto dei contenuti che l'utente può vedere nell'area inquadrata.
let lastView = null;   // ricorda centro e zoom tra una visita e l'altra
const tagFilter = new Set();   // tag selezionati nella nuvola della mappa
const typeFilter = new Set();  // tipi selezionati (photo, video, …) e/o 'mine'
async function homeMap() {
  const el = $('#hmap');
  await waitLeaflet();
  if (!document.body.contains(el)) return;
  const map = makeMap(el, 42.5, 12.5, 6);
  if (!map) return;
  const layer = L.layerGroup().addTo(map);
  let me = null, timer = null, first = true;
  const icon = (c) => L.divIcon({
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
    html: badge(c.media_type, `pin${c.is_owner ? ' mine' : ''}${c.is_owner || c.unlocked ? '' : ' locked'}`),
  });
  let rows = [];
  const draw = () => {
    layer.clearLayers();
    // filtri: tipo (uno qualsiasi dei selezionati) E tag (uno qualsiasi dei selezionati) E, se scelto, solo i miei
    const types = [...typeFilter].filter((k) => k !== 'mine');
    const shown = rows.filter((c) =>
      (!types.length || types.includes(c.media_type)) &&
      (!typeFilter.has('mine') || c.is_owner) &&
      (!tagFilter.size || (c.tags || []).some((t) => tagFilter.has(t))));
    document.querySelectorAll('#typebar .chip').forEach((b) => b.classList.toggle('on', typeFilter.has(b.dataset.k)));
    shown.forEach((c) => {
      L.marker([c.lat, c.lng], { icon: icon(c), title: c.title, keyboard: true })
        .on('click', () => { location.hash = `#/c/${c.share_slug}`; })
        .addTo(layer);
    });
    // nuvola: tag presenti nella zona, i più usati prima; i selezionati restano sempre visibili
    const count = new Map();
    rows.forEach((c) => (c.tags || []).forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
    tagFilter.forEach((t) => { if (!count.has(t)) count.set(t, 0); });
    const list = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 30);
    $('#tagcloud').innerHTML = list.length ? `<button class="chip ${tagFilter.size ? '' : 'on'}" data-t="">Tutti i tag</button>` +
      list.map(([t, n]) => `<button class="chip ${tagFilter.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}<span class="n">${n}</span></button>`).join('') : '';
    return shown.length;
  };
  $('#tagcloud').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (!t) tagFilter.clear(); else if (tagFilter.has(t)) tagFilter.delete(t); else tagFilter.add(t);
    const n = draw();
    msg($('#mm'), rows.length && !n ? 'Nessun contenuto con questi filtri in questa zona.' : '', 'info');
  };
  $('#typebar').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    if (typeFilter.has(k)) typeFilter.delete(k); else typeFilter.add(k);
    const n = draw();
    msg($('#mm'), rows.length && !n ? 'Nessun contenuto con questi filtri in questa zona.' : '', 'info');
  };
  const load = async () => {
    const b = map.getBounds().pad(0.3);
    try {
      rows = await B.mapContents({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() });
      if (!document.body.contains(el)) return;
      const shownCount = draw();
      if (first && rows.length && !lastView && !me) {
        map.fitBounds(rows.map((c) => [c.lat, c.lng]), { padding: [40, 40], maxZoom: 16 });
      }
      first = false;
      msg($('#mm'), !rows.length ? 'Nessun contenuto in questa zona: sposta la mappa o lasciane uno tu.' : (!shownCount ? 'Nessun contenuto con questi filtri in questa zona.' : ''), 'info');
    } catch (err) { msg($('#mm'), errText(err)); }
  };
  map.on('moveend', () => {
    lastView = { c: map.getCenter(), z: map.getZoom() };
    clearTimeout(timer); timer = setTimeout(load, 300);
  });
  const centerOnMe = async (zoom) => {
    try {
      const p = await getPos(); me = p;
      L.circleMarker([p.lat, p.lng], { radius: 7, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map);
      map.setView([p.lat, p.lng], zoom);
    } catch (err) { msg($('#mm'), errText(err)); }
  };
  $('#nearme').onclick = () => centerOnMe(16);
  if (lastView) map.setView(lastView.c, lastView.z); else load();
  if (!lastView) getPos().then((p) => { if (document.body.contains(el) && first !== null) { me = p; L.circleMarker([p.lat, p.lng], { radius: 7, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map); map.setView([p.lat, p.lng], 15); } }).catch(() => {});
}

async function viewHome(user, prof) {
  app.innerHTML = `
    <div class="homebar"><h1>Ciao ${esc(prof.display_name || '')}</h1>
      <button class="ghost" id="nearme" type="button" aria-label="Centra sulla mia posizione">📍</button></div>
    <div id="hmap" class="map home"></div>
    <div class="chips types" id="typebar">${Object.entries(TYPES).map(([k, x]) => `<button class="chip" data-k="${k}"><span class="tico sm" style="background:${x.c}">${x.l}</span>${x.n}</button>`).join('')}
      <button class="chip" data-k="mine"><span class="tico sm mine" style="background:#888">·</span>Miei</button></div>
    <div id="tagcloud" class="chips cloud"></div>
    <div id="mm"></div>
    <a href="#/new" class="btn accent full" style="background:var(--accent)">＋ Lascia un contenuto in un luogo</a>
    <h2 style="margin-top:22px">I miei contenuti</h2>
    <div id="list"><p class="muted center">Carico i tuoi contenuti…</p></div>
    <p class="center small"><a href="#" id="out">Esci (${esc(user.email)})</a></p>`;
  $('#out').onclick = async (e) => { e.preventDefault(); await B.signOut(); location.hash = '#/'; route(); };
  homeMap();
  let items;
  try { items = await B.listMine(); } catch (err) { msg($('#list'), errText(err)); return; }
  if (!items.length) { $('#list').innerHTML = '<div class="card center muted">Non hai ancora lasciato nulla.<br>Inizia da un luogo che conta per te.</div>'; return; }
  $('#list').innerHTML = items.map((c, i) => `
    <div class="card" data-i="${i}">
      <div class="item"><div class="ico">${badge(c.media_type)}</div>
        <div><div class="t">${esc(c.title)}</div>
        <div class="meta">${VIS[c.visibility]}${c.password_hash ? ' · 🔒 password' : ''} · ${new Date(c.created_at).toLocaleDateString('it-IT')}</div></div></div>
      ${tagChips(c.tags)}
      <div class="actions">
        <button class="ghost" data-a="share">Condividi</button>
        <a class="btn ghost" href="#/c/${esc(c.share_slug)}">Apri</a>
        <a class="btn ghost" href="#/edit/${esc(c.share_slug)}">Modifica</a>
        <button class="danger" data-a="del">Elimina</button>
      </div></div>`).join('');
  $('#list').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = items[+b.closest('.card').dataset.i];
    if (b.dataset.a === 'share') return shareSheet(c.title, c.share_slug, b.closest('.card'));
    if (b.dataset.a === 'del') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma eliminazione'; return; }
      b.disabled = true;
      try { await B.remove(c); route(); } catch (err) { alertIn(b.closest('.card'), errText(err)); }
    }
  };
}
const alertIn = (el, text) => el.insertAdjacentHTML('beforeend', `<div class="msg err">${text}</div>`);

function shareSheet(title, slug, container) {
  const url = shareUrl(slug);
  const old = container.querySelector('.share'); if (old) { old.remove(); return; }
  container.insertAdjacentHTML('beforeend', `
    <div class="share"><p class="linkbox">${esc(url)}</p>
      <div class="actions">
        <button data-s="copy">Copia link</button>
        <a class="btn" style="background:#25d366" target="_blank" rel="noopener"
           href="https://wa.me/?text=${encodeURIComponent(`${title} — aprilo quando arrivi sul posto: ${url}`)}">WhatsApp</a>
        ${navigator.share ? '<button data-s="native" class="ghost">Altro…</button>' : ''}
      </div></div>`);
  const box = container.querySelector('.share');
  box.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.s === 'copy') { try { await navigator.clipboard.writeText(url); b.textContent = 'Copiato ✓'; } catch { b.textContent = 'Copia a mano il link'; } }
    if (b.dataset.s === 'native') { try { await navigator.share({ title: `Ubi — ${title}`, text: 'Aprilo quando arrivi sul posto', url }); } catch { /* annullato */ } }
  };
}

async function viewNew(ed = null) {
  const s = { tags: new Set(), kind: 'file', file: null, media_type: null, duration: null, lat: null, lng: null, source: null, radius: CONFIG.DEFAULT_RADIUS_M, vis: 'restricted' };
  if (ed) {
    Object.assign(s, {
      tags: new Set(ed.tags || []), kind: ['photo', 'video', 'audio'].includes(ed.media_type) ? 'file' : ed.media_type,
      media_type: ed.media_type, radius: ed.unlock_radius_m, vis: ed.visibility,
    });
  }
  app.innerHTML = `
    <h1>${ed ? 'Modifica contenuto' : 'Nuovo contenuto'}</h1>
    ${ed ? '<div class="msg info">Il link già condiviso resta lo stesso: chi lo apre vedrà la versione aggiornata.</div>' : ''}
    <div class="card"><h2>1 · Cosa vuoi lasciare</h2>
      <div class="seg" id="kind"><button class="on" data-k="file">Galleria</button><button data-k="text">Testo</button><button data-k="link">Link</button></div>
      <div id="k-file"><label for="file">Foto, video (max ${CONFIG.MAX_VIDEO_SECONDS} s) o audio</label>
        <input id="file" type="file" accept="image/*,video/*,audio/*"></div>
      <div id="k-text" hidden><label for="txt">Il tuo testo</label>
        <textarea id="txt" maxlength="2000" rows="6" placeholder="Es. una dedica, le istruzioni per lo scatto, l'indizio per la caccia al tesoro…"></textarea>
        <p class="muted small"><span id="txtn">0</span>/2000 caratteri</p></div>
      <div id="k-link" hidden><label for="url">Link</label>
        <textarea id="url" rows="2" inputmode="url" placeholder="https://…  oppure incolla il messaggio di condivisione"></textarea>
        <p class="muted small">Qualsiasi link: un video (YouTube, Vimeo, Drive…), un percorso da seguire (Wikiloc, Komoot…), un sito, una mappa, un documento.
        Puoi incollare anche tutto il messaggio di condivisione: il link lo troviamo noi. Per i video più lunghi di ${CONFIG.MAX_VIDEO_SECONDS} secondi caricali su YouTube (anche "non in elenco") e incolla qui il link.</p>
        <div id="urlok" class="small"></div></div>
      <div id="pm"></div><div class="preview" id="preview"></div>
    </div>
    <div class="card"><h2>2 · Dove</h2>
      <button class="full" id="gps" type="button">📍 Usa la mia posizione attuale</button>
      <label for="coords">…oppure scrivi le coordinate</label>
      <div class="row"><input id="coords" inputmode="decimal" placeholder="41.8902, 12.4922"><button id="setc" type="button" class="ghost" style="flex:0 0 auto">Imposta</button></div>
      <p class="muted small">…oppure tocca un punto sulla mappa (puoi anche trascinare lo spillo).</p>
      <div id="map" class="map"></div>
      <div id="lm"></div>
      <label for="radius">Si sblocca entro <span class="range-out" id="rout">${s.radius} m</span></label>
      <input id="radius" type="range" min="10" max="500" step="5" value="${s.radius}">
    </div>
    <div class="card"><h2>3 · Descrizione</h2>
      <label for="title">Titolo</label><input id="title" maxlength="120" required placeholder="Es. Buon anniversario">
      <label for="hint">Indizio (visibile prima dello sblocco)</label>
      <textarea id="hint" maxlength="500" placeholder="Es. Dove ci siamo detti sì, vicino alla fontana"></textarea>
      <label>Tag <span class="muted small" id="tagn">(0/${MAX_TAGS})</span></label>
      <div class="chips" id="tags"></div>
      <div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="newtag" maxlength="24" placeholder="Aggiungi un tag tuo…" enterkeyhint="done">
        <button id="addtag" type="button" class="ghost" style="flex:0 0 auto">＋</button></div>
    </div>
    <div class="card"><h2>4 · Chi può aprirlo</h2>
      <div class="seg" id="vis"><button data-v="restricted" class="on">Persone scelte</button><button data-v="public">Tutti</button><button data-v="hidden">Solo io</button></div>
      <div id="v-restricted"><label for="emails">Email dei destinatari</label>
        <textarea id="emails" placeholder="maria@esempio.it, luca@esempio.it"></textarea>
        <p class="muted small">Solo chi accede con queste email potrà vederlo. Il link lo mandi tu (WhatsApp, SMS…).</p></div>
      <label for="pwd">${ed && ed.has_password ? 'Nuova password (lascia vuoto per mantenere quella attuale)' : 'Password (facoltativa)'}</label>
      <input id="pwd" type="text" autocomplete="off" maxlength="64" placeholder="${ed && ed.has_password ? '🔒 password attuale mantenuta' : 'Lascia vuoto per nessuna password'}">
      ${ed && ed.has_password ? '<label class="inline"><input type="checkbox" id="nopwd"><span>Togli la password</span></label>' : ''}
    </div>
    <div id="sm"></div>
    <button class="full accent" id="save">${ed ? 'Salva le modifiche' : 'Fissa nel luogo'}</button>
    <p class="center"><a href="${ed ? `#/c/${esc(ed.share_slug)}` : '#/'}">Annulla</a></p>`;

  // --- tag
  const allTags = [...TAGS_SUGGESTED];
  const drawTags = () => {
    $('#tags').innerHTML = allTags.map((t) => `<button type="button" class="chip ${s.tags.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}</button>`).join('');
    $('#tagn').textContent = `(${s.tags.size}/${MAX_TAGS})`;
  };
  const toggleTag = (t, forceOn = false) => {
    if (s.tags.has(t) && !forceOn) s.tags.delete(t);
    else if (s.tags.size >= MAX_TAGS && !s.tags.has(t)) { msg($('#sm'), `Massimo ${MAX_TAGS} tag per contenuto.`); return; }
    else s.tags.add(t);
    msg($('#sm'), ''); drawTags();
  };
  $('#tags').onclick = (e) => { const b = e.target.closest('button'); if (b) toggleTag(b.dataset.t); };
  const addCustom = () => {
    const t = normTag($('#newtag').value); if (!t) return;
    if (!allTags.includes(t)) allTags.unshift(t);
    toggleTag(t, true); $('#newtag').value = '';
  };
  $('#addtag').onclick = addCustom;
  $('#newtag').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } };
  drawTags();

  // --- tipo contenuto
  $('#kind').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    s.kind = b.dataset.k;
    [...$('#kind').children].forEach((x) => x.classList.toggle('on', x === b));
    $('#k-file').hidden = s.kind !== 'file'; $('#k-link').hidden = s.kind !== 'link'; $('#k-text').hidden = s.kind !== 'text';
    $('#preview').innerHTML = ''; msg($('#pm'), '');
  };
  $('#txt').oninput = () => { $('#txtn').textContent = $('#txt').value.length; };
  $('#url').oninput = () => {
    const u = extractUrl($('#url').value);
    $('#urlok').innerHTML = !$('#url').value.trim() ? '' : u ? `<span style="color:var(--ok)">✓ Link trovato: <b>${esc(hostOf(u))}</b></span>` : '<span style="color:var(--err)">Non trovo un link valido (deve iniziare con https://)</span>';
  };
  $('#file').onchange = async () => {
    const f = $('#file').files[0]; s.file = null; s.duration = null; $('#preview').innerHTML = ''; msg($('#pm'), '');
    if (!f) return;
    const type = f.type.split('/')[0];
    if (!['image', 'video', 'audio'].includes(type)) return msg($('#pm'), 'Formato non supportato.');
    if (f.size > CONFIG.MAX_FILE_MB * 1048576) return msg($('#pm'), `File troppo grande (max ${CONFIG.MAX_FILE_MB} MB).`);
    const url = URL.createObjectURL(f);
    if (type === 'image') { $('#preview').innerHTML = `<img src="${url}" alt="anteprima">`; s.media_type = 'photo'; s.file = f; return; }
    const el = document.createElement(type); el.controls = true; el.preload = 'metadata'; el.src = url; if (type === 'video') el.playsInline = true;
    const dur = await new Promise((res) => { el.onloadedmetadata = () => res(el.duration); el.onerror = () => res(NaN); setTimeout(() => res(el.duration), 8000); });
    if (!Number.isFinite(dur)) return msg($('#pm'), 'Non riesco a leggere la durata del file. Prova con un altro formato (MP4, M4A, MP3).');
    if (type === 'video' && dur > CONFIG.MAX_VIDEO_SECONDS + 0.5) {
      return msg($('#pm'), `Il video dura ${Math.round(dur)} s: il massimo è ${CONFIG.MAX_VIDEO_SECONDS}. Accorcialo, oppure caricalo su YouTube e usa "Link".`);
    }
    $('#preview').append(el); s.media_type = type; s.duration = Math.round(dur); s.file = f;
  };

  // --- posizione (i pulsanti funzionano subito; la mappa si aggiunge appena Leaflet è pronto)
  let map = null, marker = null, circle = null;
  const drawPoint = () => {
    if (!map || s.lat == null) return;
    if (!marker) {
      marker = L.marker([s.lat, s.lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng, 'map'); });
      circle = L.circle([s.lat, s.lng], { radius: s.radius, color: '#e8743b' }).addTo(map);
    }
    marker.setLatLng([s.lat, s.lng]); circle.setLatLng([s.lat, s.lng]);
    if (map.getZoom() < 15) map.setView([s.lat, s.lng], 17);
  };
  const setPoint = (lat, lng, source, acc) => {
    s.lat = +lat.toFixed(6); s.lng = +lng.toFixed(6); s.source = source;
    $('#coords').value = `${s.lat}, ${s.lng}`;
    msg($('#lm'), `Punto fissato${acc ? ` (precisione GPS ± ${Math.round(acc)} m)` : ''}.`, 'ok');
    drawPoint();
  };
  waitLeaflet().then(() => {
    if (!document.body.contains($('#map'))) return;
    map = makeMap($('#map'), 41.9028, 12.4964, 5);
    if (map) { map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, 'map')); drawPoint(); }
  });
  $('#gps').onclick = async () => {
    $('#gps').disabled = true; msg($('#lm'), 'Cerco la posizione…', 'info');
    try { const p = await getPos(); setPoint(p.lat, p.lng, 'gps', p.acc); } catch (err) { msg($('#lm'), errText(err)); }
    $('#gps').disabled = false;
  };
  $('#setc').onclick = () => {
    const m = $('#coords').value.replace(/\s/g, '').match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
    const lat = m && +m[1], lng = m && +m[2];
    if (!m || Math.abs(lat) > 90 || Math.abs(lng) > 180) return msg($('#lm'), 'Formato: latitudine, longitudine (es. 41.8902, 12.4922).');
    setPoint(lat, lng, 'coordinates');
  };
  $('#radius').oninput = () => { s.radius = +$('#radius').value; $('#rout').textContent = `${s.radius} m`; if (circle) circle.setRadius(s.radius); };

  // --- visibilità
  $('#vis').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    s.vis = b.dataset.v; [...$('#vis').children].forEach((x) => x.classList.toggle('on', x === b));
    $('#v-restricted').hidden = s.vis !== 'restricted';
  };

  // --- precompilazione in modifica
  if (ed) {
    $(`#kind button[data-k="${s.kind}"]`).click();
    if (s.kind === 'file') {
      $('#preview').innerHTML = `<div class="msg info">File attuale: <b>${esc(TYPES[ed.media_type].n)}</b>. Scegli un nuovo file solo se vuoi sostituirlo.</div>`;
    }
    if (ed.text_body) { $('#txt').value = ed.text_body; $('#txt').oninput(); }
    if (ed.external_url) { $('#url').value = ed.external_url; $('#url').oninput(); }
    $('#title').value = ed.title || ''; $('#hint').value = ed.hint || '';
    (ed.tags || []).forEach((t) => { if (!allTags.includes(t)) allTags.unshift(t); }); drawTags();
    $(`#vis button[data-v="${s.vis}"]`).click();
    $('#emails').value = (ed.recipients || []).join(', ');
    $('#radius').value = s.radius; $('#rout').textContent = `${s.radius} m`;
    setPoint(ed.lat, ed.lng, ed.location_source || 'map');
    msg($('#lm'), 'Posizione attuale. Per spostarla: trascina lo spillo, tocca un altro punto, usa il GPS o scrivi le coordinate.', 'info');
  }

  // --- salvataggio
  $('#save').onclick = async () => {
    const err = (t) => msg($('#sm'), t);
    let external_url = null;
    if (s.kind === 'link') {
      external_url = extractUrl($('#url').value);
      if (!external_url) return err('Inserisci un link valido (es. https://…). Puoi incollare anche il messaggio di condivisione.');
    } else if (s.kind === 'text') {
      if (!$('#txt').value.trim()) return err('Scrivi il testo da lasciare in quel luogo.');
    } else if (!s.file && !(ed && ['photo', 'video', 'audio'].includes(ed.media_type))) return err('Scegli una foto, un video o un audio.');
    if (s.lat == null) return err('Indica il luogo: GPS, coordinate o tocco sulla mappa.');
    const title = $('#title').value.trim(); if (!title) return err('Dai un titolo al contenuto.');
    const recipients = s.vis === 'restricted' ? [...new Set($('#emails').value.toLowerCase().split(/[\s,;]+/).filter(Boolean))] : [];
    const bad = recipients.filter((x) => !EMAIL_RE.test(x));
    if (bad.length) return err(`Email non valide: ${esc(bad.join(', '))}`);
    if (s.vis === 'restricted' && !recipients.length) return err('Aggiungi almeno un destinatario, oppure scegli "Tutti" o "Solo io".');
    const btn = $('#save'); btn.disabled = true; btn.textContent = s.file ? 'Carico il file…' : 'Salvo…';
    const data = {
      file: s.kind === 'file' ? s.file : null, media_type: s.kind === 'file' ? s.media_type : s.kind, duration: s.kind === 'file' ? s.duration : null,
      text_body: s.kind === 'text' ? $('#txt').value.trim() : null, tags: [...s.tags],
      external_url, lat: s.lat, lng: s.lng, radius: s.radius, source: s.source, title, hint: $('#hint').value.trim(),
      visibility: s.vis, recipients, password: $('#pwd').value,
    };
    try {
      if (ed) {
        data.passwordAction = $('#nopwd')?.checked ? 'remove' : (data.password ? 'set' : 'keep');
        const slug = await B.update(ed, data);
        location.hash = `#/c/${slug}`;
        return;
      }
      viewCreated(title, await B.create(data));
    } catch (e) { err(errText(e)); btn.disabled = false; btn.textContent = ed ? 'Salva le modifiche' : 'Fissa nel luogo'; }
  };
}

function viewCreated(title, slug) {
  history.replaceState(null, '', location.pathname + '#/fatto');  // così '＋' e 'Torna alla mappa' funzionano
  app.innerHTML = `
    <div class="hero"><span class="pin"></span><h1>Fissato!</h1>
      <p class="muted">«${esc(title)}» ora vive in quel luogo. Manda il link: si aprirà solo sul posto.</p></div>
    <div class="card" id="sh"></div>
    <a class="btn ghost full" href="#/">Torna alla mappa</a>`;
  shareSheet(title, slug, $('#sh'));
}

function renderMedia(type, r) {
  if (type === 'text') return `<div class="textbody">${linkify(r.text_body)}</div>`;
  if (type === 'link' || (!r.url && r.external_url)) {
    const u = r.external_url || '';
    const yt = youTubeId(u), vm = vimeoId(u);
    const embed = yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Video"></iframe>`
      : vm ? `<iframe src="https://player.vimeo.com/video/${vm}" allow="autoplay; fullscreen" allowfullscreen title="Video"></iframe>` : '';
    return `${embed}
      <a class="linkcard" href="${esc(u)}" target="_blank" rel="noopener noreferrer">
        <span class="dom">🔗 ${esc(hostOf(u))}</span><span class="u">${esc(u)}</span></a>
      <a class="btn full" style="margin-top:10px" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Apri il link ↗</a>`;
  }
  if (type === 'photo') return `<img src="${esc(r.url)}" alt="">`;
  if (type === 'video') return `<video src="${esc(r.url)}" controls playsinline autoplay></video>`;
  return `<audio src="${esc(r.url)}" controls autoplay></audio>`;
}

async function viewContent(slug, user) {
  app.innerHTML = '<p class="muted center">Apro il contenuto…</p>';
  let t;
  try { t = await B.teaser(slug); } catch (err) { app.innerHTML = `<div class="msg err">${errText(err)}</div>`; return; }
  if (!t) {
    if (!user) { setPending(location.hash); return viewLogin('Questo contenuto è riservato. Accedi o registrati: se è per te, lo vedrai.'); }
    app.innerHTML = '<div class="card center"><h2>Contenuto non disponibile</h2><p class="muted">Non esiste, è stato rimosso, oppure non sei tra i destinatari.</p><a class="btn" href="#/">Vai a Ubi</a></div>';
    return;
  }
  const header = `<h1>${badge(t.media_type)} ${esc(t.title)}</h1>${t.author ? `<p class="muted">da ${esc(t.author)}</p>` : ''}${tagChips(t.tags)}${t.hint ? `<div class="msg info hint">${linkify(t.hint)}</div>` : ''}`;
  const showUnlocked = (r, d) => {
    stopWatch();
    app.innerHTML = `${header}<div class="msg ok">Sbloccato${d != null ? ` a ${d} m dal punto` : ''} ✓</div>
      <div class="card media">${renderMedia(t.media_type, r)}</div>
      ${t.is_owner ? `<a class="btn full" href="#/edit/${esc(slug)}" style="margin-bottom:10px">✏️ Modifica contenuto e posizione</a>` : ''}
      <a class="btn ghost full" href="#/">${user ? 'Torna alla mappa' : 'Scopri Ubi'}</a>`;
  };
  if (user && (t.is_owner || t.already_unlocked)) {
    try { const r = await B.unlock(slug, null, null); if (r.status === 'ok') return showUnlocked(r, null); } catch { /* prosegue */ }
  }

  app.innerHTML = `${header}
    <div class="card">
      <p class="dist" id="dist">—</p><p class="center muted small" id="dtxt">Attiva la posizione per sapere quanto manca</p>
      <div id="map" class="map tall"></div>
      ${B.demo ? '<p class="muted small">Demo: tocca la mappa per simulare la tua posizione.</p>' : ''}
      <a class="btn ghost full" style="margin-top:10px" target="_blank" rel="noopener"
         href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}&travelmode=walking">Indicazioni per arrivarci ↗</a>
    </div>
    <div class="card">
      ${t.requires_password ? '<label for="pwd">Password</label><input id="pwd" type="text" autocomplete="off">' : ''}
      <div id="um"></div>
      ${user ? '<button class="full accent" id="unlock">🔓 Sblocca qui</button>' : '<button class="full" id="login">Accedi per sbloccare</button>'}
    </div>`;
  if (!user) { $('#login').onclick = () => { setPending(location.hash); viewLogin(); }; }

  let me = null, meMarker = null, map = null;
  const update = (p) => {
    me = p;
    const d = distanceM(t.lat, t.lng, p.lat, p.lng);
    const near = d <= t.unlock_radius_m + Math.min(p.acc, 30);
    $('#dist').textContent = fmtDist(d); $('#dist').classList.toggle('near', near);
    $('#dtxt').textContent = near ? 'Sei arrivato: puoi sbloccare!' : `Avvicinati ancora (si apre entro ${t.unlock_radius_m} m) · GPS ± ${Math.round(p.acc)} m`;
    if (map) {
      if (!meMarker) { meMarker = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map); map.fitBounds([[t.lat, t.lng], [p.lat, p.lng]], { padding: [40, 40], maxZoom: 17 }); }
      meMarker.setLatLng([p.lat, p.lng]);
    }
  };
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (p) => update({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => { $('#dtxt').textContent = 'Posizione non disponibile: consenti l\'accesso alla posizione.'; },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }
  waitLeaflet().then(() => {
    if (!document.body.contains($('#map'))) return;
    map = makeMap($('#map'), t.lat, t.lng, 16);
    if (!map) return;
    L.circle([t.lat, t.lng], { radius: t.unlock_radius_m, color: '#e8743b' }).addTo(map);
    L.marker([t.lat, t.lng]).addTo(map).bindPopup('Il contenuto è qui');
    if (B.demo) map.on('click', (e) => { stopWatch(); update({ lat: e.latlng.lat, lng: e.latlng.lng, acc: 5 }); });
    if (me) update(me);
  });

  const btn = $('#unlock'); if (!btn) return;
  btn.onclick = async () => {
    btn.disabled = true; msg($('#um'), '');
    try {
      const pos = me || await getPos();
      const r = await B.unlock(slug, pos, $('#pwd')?.value || null);
      const M = {
        too_far: `Sei a ${fmtDist(r.distance_m ?? 0)}: avvicinati ancora.`,
        gps_inaccurate: 'Segnale GPS troppo impreciso: spostati all\'aperto e riprova.',
        password_required: 'Serve la password.', wrong_password: 'Password errata.',
        rate_limited: 'Troppi tentativi: riprova tra 15 minuti.', not_found: 'Contenuto non disponibile.',
        login_required: 'Accedi per sbloccare.',
      };
      if (r.status === 'ok') return showUnlocked(r, r.distance_m);
      msg($('#um'), M[r.status] || r.status);
    } catch (err) { msg($('#um'), errText(err)); }
    btn.disabled = false;
  };
}


// ======================= GUIDA E IDEE (FAQ) =======================
const FAQ_GUIDE = [
  ['Cos’è Ubi?', `<p>Ubi ti permette di <b>lasciare un contenuto in un luogo</b>: una foto, un video (fino a 60 secondi), un audio, un testo o un link. Chi lo riceve lo vede sulla mappa, ma può <b>aprirlo solo quando arriva lì</b> con il telefono.</p>`],
  ['1 · Registrati e installa l’app', `<ol>
    <li>Apri Ubi, tocca <b>Registrati</b>: nome, email, password (almeno 8 caratteri) e i due consensi.</li>
    <li>Resti collegato: non dovrai rifare l'accesso su quel telefono.</li>
    <li><b>Mettila nella schermata Home</b>, così si apre come un'app:<br>
      iPhone (Safari): tasto Condividi <b>⬆</b> → <b>Aggiungi alla schermata Home</b>.<br>
      Android (Chrome): menu <b>⋮</b> → <b>Installa app</b> o <b>Aggiungi a schermata Home</b>.</li>
    <li>Quando il telefono chiede l'accesso alla <b>posizione</b>, rispondi <b>Consenti</b>: serve per fissare e sbloccare i contenuti.</li></ol>`],
  ['2 · La mappa', `<ol>
    <li>Dopo l'accesso vedi la mappa con i <b>tuoi contenuti</b>, quelli <b>pubblici</b> e quelli che qualcuno ha lasciato <b>per te</b>.</li>
    <li>Ogni cerchio indica il tipo: <b>I</b> immagine, <b>V</b> video, <b>T</b> testo, <b>L</b> link, <b>A</b> audio. I tuoi hanno il bordo scuro.</li>
    <li><b>Tocca un cerchio</b> per aprire la scheda del contenuto.</li>
    <li>Il pulsante <b>📍</b> in alto riporta la mappa dove sei tu.</li>
    <li><b>Filtri</b>: sotto la mappa tocca un tipo (es. <i>Video</i>) e/o uno o più <b>#tag</b> (es. <i>#tramonto</i>) per vedere solo quei contenuti. Si combinano: <i>Video + #tramonto</i> mostra solo i video di tramonti. <b>Tutti i tag</b> azzera.</li></ol>`],
  ['3 · Lascia un contenuto', `<ol>
    <li>Tocca <b>＋ Lascia un contenuto in un luogo</b>.</li>
    <li><b>Cosa</b>: <i>Galleria</i> (foto, video max 60 s, audio), <i>Testo</i> (fino a 2000 caratteri) o <i>Link</i> (qualsiasi indirizzo: video su YouTube o altri siti, percorsi Wikiloc/Komoot, pagine web, mappe; puoi incollare anche il messaggio di condivisione).</li>
    <li><b>Dove</b>, in tre modi: <i>Usa la mia posizione</i> se sei sul posto; scrivi le <i>coordinate</i> (es. <code>41.8902, 12.4922</code>); oppure <i>tocca la mappa</i> e trascina lo spillo.</li>
    <li><b>Raggio</b>: da quanti metri si sblocca (consigliato 30–50 m; in città il GPS può sbagliare di qualche decina di metri).</li>
    <li><b>Titolo</b> e <b>indizio</b>: l'indizio si vede <i>prima</i> dello sblocco e aiuta a trovare il punto.</li>
    <li><b>Tag</b>: tocca quelli adatti o scrivine di tuoi (max 8). Servono a ritrovare i contenuti con i filtri.</li>
    <li><b>Chi può aprirlo</b>: <i>Persone scelte</i> (le loro email), <i>Tutti</i> o <i>Solo io</i>. Puoi aggiungere una <b>password</b>.</li>
    <li>Tocca <b>Fissa nel luogo</b>.</li></ol>`],
  ['4 · Condividi', `<ol>
    <li>Dopo il salvataggio, o dalla lista con <b>Condividi</b>, hai il <b>link</b> del contenuto.</li>
    <li>Mandalo con <b>WhatsApp</b>, <b>Copia link</b> o <b>Altro…</b> (SMS, email, social).</li>
    <li>Se hai scelto <i>Persone scelte</i>, chi riceve il link deve accedere a Ubi <b>con la stessa email</b> che hai indicato.</li>
    <li>Se c'è una password, comunicala a parte (o lasciala come indovinello!).</li></ol>`],
  ['5 · Sblocca un contenuto', `<ol>
    <li>Apri il link (o tocca il cerchio sulla mappa).</li>
    <li>Vedi il titolo, l'indizio, la mappa e <b>quanti metri mancano</b>. <b>Indicazioni per arrivarci</b> apre il navigatore.</li>
    <li>Quando la distanza diventa verde (<i>Sei arrivato</i>), tocca <b>🔓 Sblocca qui</b> e inserisci la password se richiesta.</li>
    <li>Una volta sbloccato, puoi <b>rivederlo ovunque</b>, anche da casa.</li>
    <li>Se dice <i>GPS impreciso</i>: spostati all'aperto, lontano da edifici alti, e riprova.</li></ol>`],
  ['6 · Gestisci i tuoi contenuti', `<ul>
    <li>Sotto la mappa trovi <b>I miei contenuti</b>: <b>Condividi</b>, <b>Apri</b> (tu li vedi sempre) o <b>Elimina</b> (tocca due volte per confermare: il file viene cancellato).</li></ul>`],
  ['7 · Account e accesso', `<ul>
    <li>Resti collegato finché non tocchi <b>Esci</b> in fondo alla pagina.</li>
    <li><b>Password dimenticata?</b> In <i>Accedi</i> scrivi l'email e tocca il pulsante: ti arriva un link per sceglierne una nuova. Aprilo con lo <b>stesso browser</b> in cui usi Ubi.</li>
    <li>Se usi Ubi dalla schermata Home su iPhone, la prima volta dovrai accedere anche lì.</li></ul>`],
  ['8 · Privacy e sicurezza', `<ul>
    <li>La posizione del telefono è usata <b>solo mentre usi l'app</b> e non viene salvata nel profilo.</li>
    <li>I file sono in un archivio privato: chi non è autorizzato <b>non può scaricarli</b>, neanche conoscendo il link.</li>
    <li>La distanza e la password sono <b>verificate dal server</b>, non solo dal telefono.</li>
    <li>Pubblica solo contenuti <b>tuoi</b> e con il permesso delle persone riprese.</li></ul>`],
  ['Limiti utili da sapere', `<ul>
    <li>Video: massimo <b>60 secondi</b> (per i più lunghi usa un <i>Link</i> a YouTube o a un altro sito).</li>
    <li>Gli indirizzi web scritti nei testi e negli indizi diventano <b>cliccabili</b>.</li>
    <li>File: massimo <b>50 MB</b>. Testo: <b>2000</b> caratteri. Tag: <b>8</b> per contenuto.</li>
    <li>Raggio di sblocco: da 10 a 500 metri.</li></ul>`],
];

const FAQ_IDEAS = [
  ['👨‍👩‍👧 Famiglia', 'famiglia, ricordo, anniversario', `<ul>
    <li><b>Auguri sul posto</b>: un video di buon compleanno o di anniversario da aprire al ristorante della festa o nel luogo del "sì".</li>
    <li><b>Ricordi per i figli</b>: un video nel parco dove giocavano da piccoli, da scoprire quando ci torneranno da grandi.</li>
    <li><b>Regali</b>: un indizio in ogni stanza o nel quartiere che porta al regalo nascosto.</li>
    <li><b>Istruzioni</b>: nella casa al mare, "come accendere lo scaldabagno" o "dove si buttano i rifiuti", da aprire solo lì. (Mai codici di allarmi o casseforti!)</li>
    <li><b>Messaggi dei nonni</b>: un audio con una storia di famiglia nel paese d'origine.</li></ul>`],
  ['❤️ Coppia', 'amore, anniversario', `<ul>
    <li>Una dedica sulla panchina del primo appuntamento, con password = la data in cui vi siete conosciuti.</li>
    <li>Una proposta di matrimonio: il video si sblocca solo arrivati al belvedere.</li>
    <li>Una mappa dei vostri luoghi: un contenuto per ogni tappa della vostra storia.</li></ul>`],
  ['📷 Fotografi', 'fotografia, panorama, tramonto', `<ul>
    <li><b>Farsi conoscere</b>: lascia le tue foto migliori, <i>pubbliche</i>, nei punti in cui le hai scattate, con nel testo il link al tuo sito o profilo. Chi passa di lì scopre il tuo lavoro.</li>
    <li><b>"Replica lo scatto"</b>: usa il tipo <i>Testo</i> (o una foto con indizio) e scrivi:
      <ol><li>punto esatto e <b>direzione</b> (es. "verso nord-ovest, la cupola allineata al lampione");</li>
      <li><b>ora e luce</b> (es. "20 minuti dopo il tramonto, ottobre");</li>
      <li><b>attrezzatura</b>: obiettivo e lunghezza focale;</li>
      <li><b>impostazioni</b>: ISO, tempo, diaframma, filtri, cavalletto sì/no;</li>
      <li>un consiglio di composizione.</li></ol></li>
    <li><b>Workshop</b>: un percorso di tappe con un esercizio fotografico in ognuna.</li></ul>`],
  ['⚽ Sport', 'sport, amici, ricordo', `<ul>
    <li>Il <b>tuo</b> video della partita girato dagli spalti, lasciato fuori dallo stadio: chi c'era può rivivere il gol.</li>
    <li>Il <b>gol di tuo figlio</b> al campetto, da riscoprire tra qualche anno.</li>
    <li>Gare di motori (es. Formula 1 a Monza): il tuo racconto <b>audio</b> della gara vista da una curva, lasciato in quella curva.</li>
    <li>Una <b>premiazione emblematica</b>: foto e ricordi della squadra nel luogo della festa.</li>
    <li>Percorsi di corsa o bici: un consiglio a ogni tappa ("qui inizia la salita, gestisci il fiato").</li>
    <li>⚠️ Usa solo video e foto <b>girati da te</b>: le riprese TV e le immagini ufficiali sono protette dal diritto d'autore.</li></ul>`],
  ['🗺️ Caccia al tesoro', 'caccia al tesoro, amici, famiglia', `<ol>
    <li>Scegli <b>4–8 tappe</b> raggiungibili a piedi e il premio finale.</li>
    <li>Per ogni tappa crea un contenuto <i>Testo</i> (o un audio/video) con <b>l'indizio della tappa successiva</b>.</li>
    <li>Nel campo <b>Indizio</b> (visibile prima dello sblocco) scrivi un aiuto per trovare il punto esatto.</li>
    <li>Usa un <b>raggio piccolo</b> (20–30 m) e il tag <b>#caccia al tesoro</b>.</li>
    <li>Visibilità: <i>Persone scelte</i> con le email dei giocatori, oppure <i>Tutti</i> con una <b>password</b> che si trova nella tappa precedente.</li>
    <li>Dai ai giocatori <b>solo il link della prima tappa</b>: il resto lo scopriranno camminando.</li>
    <li>Prova il percorso tu prima di lanciarlo (tu vedi sempre i tuoi contenuti).</li></ol>`],
  ['🏛️ Guide e turismo', 'guida, monumento, storia, arte', `<ul>
    <li>Un breve video o audio di spiegazione davanti a ogni punto di interesse (es. ingressi e dettagli del Colosseo).</li>
    <li>Testi con curiosità che si aprono solo sul posto: il visitatore guarda il monumento mentre legge.</li>
    <li>Presto: tour a tappe che le guide potranno vendere.</li></ul>`],
  ['✈️ Viaggi e quotidiano', 'ricordo, natura, mare, montagna, cibo', `<ul>
    <li>Un diario di viaggio: un contenuto "Solo io" in ogni luogo visitato, da ritrovare sulla mappa.</li>
    <li>Il piatto da ordinare in quella trattoria, il sentiero giusto per la cima, il punto migliore per il tramonto.</li>
    <li>Lo stesso luogo nelle quattro stagioni: torna e lascia una foto ogni volta.</li></ul>`],
];

function viewFaq() {
  stopWatch();
  const det = ([q, a], open = false) => `<details class="faq"${open ? ' open' : ''}><summary>${q}</summary><div>${a}</div></details>`;
  app.innerHTML = `
    <h1>Guida e idee</h1>
    <p class="muted">Tutto quello che serve per usare Ubi, passo passo, e qualche idea per iniziare.</p>
    <div class="seg" id="faqtabs"><button class="on" data-t="g">Come si usa</button><button data-t="i">Idee</button></div>
    <div id="faq-g">${FAQ_GUIDE.map((x, i) => det(x, i === 0)).join('')}</div>
    <div id="faq-i" hidden>${FAQ_IDEAS.map(([t, tags, body]) => `<details class="faq"><summary>${t}</summary><div>${body}
      <p class="muted small">Tag consigliati: ${tags.split(', ').map((x) => '#' + x).join(' ')}</p></div></details>`).join('')}</div>
    <a class="btn full" href="#/" style="margin-top:16px">Torna a Ubi</a>`;
  $('#faqtabs').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    [...$('#faqtabs').children].forEach((x) => x.classList.toggle('on', x === b));
    $('#faq-g').hidden = b.dataset.t !== 'g'; $('#faq-i').hidden = b.dataset.t !== 'i';
  };
  window.scrollTo(0, 0);
}

// ======================= AVVIO =======================
(async () => {
  try {
    B = CONFIG.SUPABASE_URL ? await supabaseBackend() : demoBackend();
    await B.init();
    $('#mode').hidden = !B.demo;
    window.addEventListener('hashchange', route);
    appReady = true;
    await route();
  } catch (err) {
    app.innerHTML = `<div class="msg err">Errore di avvio: ${errText(err)}</div>`;
  }
})();
