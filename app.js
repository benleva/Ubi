// Ubi — web app (Fase 1). Nessun build: file statici, librerie da CDN.
import { CONFIG } from './config.js?v=202611162118';

// Versione mostrata accanto al logo: aumentarla a ogni pubblicazione.
const APP_VERSION = 'v.22';
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
// Dating: pallino rosa (lei) o azzurro (lui)
const GENDER = { f: { c: '#ff5fa2', n: 'lei' }, m: { c: '#4fb3ff', n: 'lui' } };
const datingBadge = (g, extra = '') => { const x = GENDER[g] || { c: '#b06ad9', n: '' }; return `<span class="tico ${extra}" style="background:${x.c}" title="Dating${x.n ? ` · ${x.n}` : ''}">♥</span>`; };
const pinBadge = (c, extra = '') => (c.is_dating ? datingBadge(c.gender, extra) : badge(c.media_type, extra));
const isDating = (p) => !!(p && p.dating_consent_version && p.dating_consent_version === CONFIG.DATING_CONSENT_VERSION);
const setDatingTheme = (on) => document.body.classList.toggle('dating', !!on);
const TAGS_SUGGESTED = ['famiglia', 'amore', 'anniversario', 'amici', 'ricordo', 'sport', 'panorama', 'tramonto',
  'monumento', 'storia', 'arte', 'natura', 'mare', 'montagna', 'trekking', 'sentiero', 'passeggiata', 'mappa interattiva', 'città', 'cibo', 'fotografia', 'musica', 'guida', 'caccia al tesoro'];
const MAX_TAGS = 8;
const MAX_TAGS_DATING = 12;
// Tag del dating, a gruppi. Li vedono solo gli iscritti a Ubi Dating (maggiorenni).
const DATING_TAGS = [
  ['Chi sono', ['etero', 'gay', 'lesbica', 'bisessuale', 'pansessuale', 'trans', 'non binario', 'queer', 'asessuale']],
  ['Cosa cerco', ['amicizia', 'compagni di avventura', 'relazione stabile', 'relazione aperta', 'incontri occasionali', 'vediamo cosa nasce']],
  ['Come vivo le relazioni', ['monogamia', 'poliamore', 'voglio figli', 'ho figli', 'niente figli', 'no fumo', 'vegetariano/a', 'animali in casa']],
  ['Passioni', ['montagna', 'trekking', 'mare', 'viaggi', 'sport', 'bici', 'natura', 'cucina', 'vino', 'musica', 'concerti', 'ballo', 'arte', 'lettura', 'cinema', 'fotografia', 'animali', 'volontariato']],
];
const DATING_FLAT = new Set(DATING_TAGS.flatMap(([, l]) => l));
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
      (e) => reject(Object.assign(new Error(e.code === 1 ? 'Il telefono non permette a Ubi di usare la posizione.' : 'Posizione non disponibile: riprova all\'aperto, con il Wi-Fi acceso.'), { geoHelp: true })),
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
  // Link temporanei (1 ora) per file privati del bucket media
  const signAll = async (rows) => {
    for (const r of rows) { const x = await sb.storage.from('media').createSignedUrl(r.path, 3600); r.url = x.data?.signedUrl || null; }
    return rows;
  };
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
      return must(await sb.from('contents').select('id,share_slug,title,media_type,media_path,visibility,created_at,password_hash,tags,is_dating,replies_enabled')
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
        text_body: d.text_body || null, tags: d.tags || [], is_dating: !!d.is_dating, replies_enabled: d.replies_enabled !== false,
      };
      const res = await sb.from('contents').insert(row).select('share_slug').single();
      if (res.error) { if (media_path) await sb.storage.from('media').remove([media_path]); throw res.error; }
      if (d.recipients.length) must(await sb.from('content_recipients').insert(d.recipients.map((email) => ({ content_id: id, email }))));
      return res.data.share_slug;
    },
    async notifyRecipients(slug) {
      const { data, error } = await sb.functions.invoke(CONFIG.NOTIFY_FUNCTION || 'notify-recipients', { body: { slug } });
      if (error) {   // leggo il motivo vero restituito dalla funzione
        let detail = error.message;
        try { const b = await error.context.json(); detail = b.error || JSON.stringify(b); } catch { try { detail = await error.context.text() || detail; } catch { /* resta il messaggio */ } }
        const st = error.context?.status;
        throw new Error(`${st ? `[${st}] ` : ''}${detail}`);
      }
      return data;   // { sent, skipped, failed, errors }
    },
    // --- rubrica
    async listContacts() { return must(await sb.from('address_book').select('id,name,email').order('name')) || []; },
    async saveContact(c) {
      const u = await B.user();
      if (c.id) must(await sb.from('address_book').update({ name: c.name, email: c.email }).eq('id', c.id));
      else must(await sb.from('address_book').insert({ owner_id: u.id, name: c.name, email: c.email }));
    },
    async deleteContact(id) { must(await sb.from('address_book').delete().eq('id', id)); },
    // --- profilo, autore, messaggi
    avatarUrl(path) { return path ? sb.storage.from('avatars').getPublicUrl(path).data.publicUrl : null; },
    async saveMyProfile(d) {
      const u = await B.user();
      const old = await B.profile();
      let avatar_path = old?.avatar_path || null;
      if (d.avatarBlob) {
        const path = `${u.id}/avatar-${Date.now()}.jpg`;
        must(await sb.storage.from('avatars').upload(path, d.avatarBlob, { contentType: 'image/jpeg', upsert: false }));
        avatar_path = path;
      } else if (d.removeAvatar) avatar_path = null;
      must(await sb.from('profiles').update({
        display_name: d.display_name, bio: d.bio || null, contact_website: d.website || null, contact_instagram: d.instagram || null,
        contact_whatsapp: d.whatsapp || null, contact_email: d.email || null, avatar_path,
      }).eq('id', u.id));
      if (old?.avatar_path && old.avatar_path !== avatar_path) await sb.storage.from('avatars').remove([old.avatar_path]);
    },
    async getAuthor(id) { return (must(await sb.rpc('get_author', { p_user: id })) || [])[0] || null; },
    async authorPins(id) { return must(await sb.rpc('author_pins', { p_user: id })) || []; },
    async unreadCount() { return must(await sb.rpc('unread_count')) || 0; },
    async conversations() { return must(await sb.rpc('my_conversations')) || []; },
    async thread(other) {
      const me = (await B.user()).id;
      return must(await sb.from('messages').select('id,sender_id,recipient_id,body,created_at,read_at,content_id')
        .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
        .order('created_at', { ascending: true }).limit(300)) || [];
    },
    async markRead(other) { must(await sb.rpc('mark_read', { p_other: other })); },
    async sendMessage(other, body, contentId) {
      must(await sb.from('messages').insert({ recipient_id: other, body, content_id: contentId || null }));
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
        visibility: d.visibility, tags: d.tags || [], replies_enabled: d.replies_enabled !== false,
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
    // --- dating
    async joinDating(d) {
      const u = await B.user();
      must(await sb.from('profiles').update({ dating_gender: d.gender, dating_birth_date: d.birth, dating_consent_version: CONFIG.DATING_CONSENT_VERSION }).eq('id', u.id));
    },
    async leaveDating() { const u = await B.user(); must(await sb.from('profiles').update({ dating_consent_version: null }).eq('id', u.id)); },
    // --- risposte ai pin
    async addReply(slug, d) {
      const u = await B.user();
      const id = crypto.randomUUID();
      let path = null;
      if (d.file) {
        const ext = (d.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
        path = `${u.id}/r-${id}/risposta.${ext}`;
        must(await sb.storage.from('media').upload(path, d.file, { contentType: d.file.type, upsert: false }));
      }
      const res = await sb.rpc('add_reply', { p_id: id, p_slug: slug, p_media_type: d.media_type, p_media_path: path, p_text: d.text || null, p_duration: d.duration ?? null });
      if (res.error) { if (path) await sb.storage.from('media').remove([path]); throw res.error; }
      let mailed = false;
      try { const r = await sb.functions.invoke(CONFIG.REPLY_FUNCTION || 'notify-reply', { body: { reply_id: id } }); mailed = !r.error && r.data?.sent === 1; } catch { /* l'email è un extra */ }
      return { id, mailed };
    },
    async repliesFor(slug) {
      const rows = must(await sb.rpc('pin_replies_for', { p_slug: slug })) || [];
      for (const r of rows) {
        if (r.media_path) { const x = await sb.storage.from('media').createSignedUrl(r.media_path, 3600); r.url = x.data?.signedUrl || null; }
      }
      return rows;
    },
    async myReplies() { return must(await sb.rpc('my_replies')) || []; },
    // --- foto del profilo dating (max 6, visibili solo dopo il doppio sì)
    async myDatingPhotos() {
      const u = await B.user();
      const rows = must(await sb.from('dating_photos').select('id,path,created_at').eq('user_id', u.id).order('created_at')) || [];
      return signAll(rows);
    },
    async addDatingPhoto(blob) {
      const u = await B.user();
      const path = `${u.id}/dating/${crypto.randomUUID()}.jpg`;
      must(await sb.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
      const res = await sb.from('dating_photos').insert({ user_id: u.id, path });
      if (res.error) { await sb.storage.from('media').remove([path]); throw res.error; }
    },
    async removeDatingPhoto(p) {
      must(await sb.from('dating_photos').delete().eq('id', p.id));
      await sb.storage.from('media').remove([p.path]);
    },
    async datingPhotosOf(userId) { return signAll(must(await sb.rpc('dating_photos_of', { p_user: userId })) || []); },
    async replyWant(id) { return must(await sb.rpc('reply_want', { p_id: id })); },
    async replyRemove(id) {
      const path = must(await sb.rpc('reply_remove', { p_id: id }));
      if (path) await sb.storage.from('media').remove([path]);
    },
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
    async profile() { const p = db.profiles[db.user.id]; return p ? { ...p, id: db.user.id } : null; },
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
    _book() { db.book = db.book || {}; db.book[db.user.id] = db.book[db.user.id] || []; return db.book[db.user.id]; },
    async notifyRecipients() { return { sent: 0, skipped: 0, demo: true }; },
    async joinDating() { throw new Error('La sezione dating non è disponibile nella demo.'); },
    async leaveDating() {},
    async addReply() { throw new Error('Le risposte non sono disponibili nella demo.'); },
    async repliesFor() { return []; },
    async myReplies() { return []; },
    async myDatingPhotos() { return []; },
    async addDatingPhoto() { throw new Error('Le foto dating non sono disponibili nella demo.'); },
    async removeDatingPhoto() {},
    async datingPhotosOf() { return []; },
    async replyWant() { return false; },
    async replyRemove() {},
    async listContacts() { return [...B._book()].sort((a, b) => a.name.localeCompare(b.name)); },
    async saveContact(c) {
      const bk = B._book();
      if (bk.some((x) => x.email === c.email && x.id !== c.id)) throw new Error('duplicate key value violates unique constraint');
      if (c.id) Object.assign(bk.find((x) => x.id === c.id), { name: c.name, email: c.email });
      else bk.push({ id: crypto.randomUUID(), name: c.name, email: c.email });
      save();
    },
    async deleteContact(id) { db.book[db.user.id] = B._book().filter((x) => x.id !== id); save(); },
    avatarUrl(path) { return path || null; },   // nella demo la foto è salvata come dataURL
    async saveMyProfile(d) {
      const p = db.profiles[db.user.id];
      let avatar_path = p.avatar_path || null;
      if (d.avatarBlob) avatar_path = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(d.avatarBlob); });
      else if (d.removeAvatar) avatar_path = null;
      Object.assign(p, { display_name: d.display_name, bio: d.bio || null, contact_website: d.website || null, contact_instagram: d.instagram || null,
        contact_whatsapp: d.whatsapp || null, contact_email: d.email || null, avatar_path });
      save();
    },
    _canContact(other) {
      const u = db.user; if (!u || other === u.id) return false;
      db.messages = db.messages || [];
      return db.contents.some((c) => c.owner_id === other && canAccess(c, u)) || db.messages.some((m) => m.s === other && m.r === u.id);
    },
    async getAuthor(id) {
      const p = db.profiles[id]; const me = db.user.id === id;
      if (!p || !(me || B._canContact(id))) return null;
      return { id, display_name: p.display_name, bio: p.bio, website: p.contact_website, instagram: p.contact_instagram,
        whatsapp: p.contact_whatsapp, email: p.contact_email, can_message: B._canContact(id), is_me: me, avatar_path: p.avatar_path };
    },
    async authorPins(id) {
      return db.contents.filter((c) => c.owner_id === id && canAccess(c, db.user)).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((c) => ({ share_slug: c.share_slug, title: c.title, media_type: c.media_type, tags: c.tags || [], created_at: c.created_at }));
    },
    async unreadCount() { db.messages = db.messages || []; return db.messages.filter((m) => m.r === db.user.id && !m.read).length; },
    async conversations() {
      db.messages = db.messages || []; const me = db.user.id; const map = new Map();
      db.messages.filter((m) => m.s === me || m.r === me).forEach((m) => {
        const o = m.s === me ? m.r : m.s;
        const c = map.get(o) || { other_id: o, other_name: db.profiles[o]?.display_name, unread: 0 };
        c.last_body = m.body; c.last_at = m.at; c.last_from_me = m.s === me; if (m.r === me && !m.read) c.unread++;
        map.set(o, c);
      });
      return [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
    },
    async thread(o) {
      const me = db.user.id; db.messages = db.messages || [];
      return db.messages.filter((m) => (m.s === me && m.r === o) || (m.s === o && m.r === me))
        .map((m) => ({ sender_id: m.s, recipient_id: m.r, body: m.body, created_at: m.at, content_id: m.c }));
    },
    async markRead(o) { (db.messages || []).forEach((m) => { if (m.r === db.user.id && m.s === o) m.read = true; }); save(); },
    async sendMessage(o, body, cid) {
      if (!B._canContact(o)) throw new Error('Non puoi scrivere a questo utente.');
      db.messages.push({ s: db.user.id, r: o, body, c: cid || null, at: new Date().toISOString() }); save();
    },
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
        author_id: c.owner_id, author_avatar: db.profiles[c.owner_id]?.avatar_path || null,
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
const GEO_HELP = ' <a href="#/faq/posizione">Come attivare la posizione →</a>';
const errText = (e) => esc(e?.message || String(e)) + (e?.geoHelp ? GEO_HELP : '');

async function route() {
  try { await routeInner(); } catch (err) {
    console.error(err);
    app.insertAdjacentHTML('afterbegin', `<div class="msg err">Errore: ${authErr(err)}</div>`);
    document.querySelectorAll('button[disabled]').forEach((b) => { b.disabled = false; });
  }
}
async function routeInner() {
  stopWatch();
  refreshInbox();
  window.scrollTo(0, 0);   // ogni nuova schermata si apre dall'inizio
  if (B.recovery) return viewNewPassword();
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  setDatingTheme(page === 'dating' || (page === 'new' && arg === 'dating'));
  if (page === 'faq') return viewFaq(arg);
  if (page === 'invita') return viewInvite();
  if (page === 'avvisi') return viewOptout(arg);
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
  if (page === 'dating') return isDating(prof) ? viewDating(user, prof) : viewDatingJoin(prof);
  if (page === 'foto' && arg) return viewDatingPhotos(arg);
  if (page === 'new') {
    if (arg === 'dating' && !isDating(prof)) { location.hash = '#/dating'; return; }
    return viewNew(null, { dating: arg === 'dating' });
  }
  if (page === 'profilo') return viewMyProfile(prof);
  if (page === 'rubrica') return viewBook();
  if (page === 'u' && arg) return viewAuthor(arg);
  if (page === 'messaggi') return arg ? viewThread(arg, location.hash.split('/')[3]) : viewInbox();
  if (page === 'edit' && arg) {
    const c = await B.getForEdit(arg);
    if (c && c.is_dating) setDatingTheme(true);
    if (!c) { app.innerHTML = '<div class="card center"><h2>Non puoi modificare questo contenuto</h2><p class="muted">Solo chi l\'ha creato può modificarlo.</p><a class="btn" href="#/">Torna alla mappa</a></div>'; return; }
    return viewNew(c, { dating: !!c.is_dating });
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
  [/duplicate key|unique constraint|23505/i, 'Questa email è già nella tua rubrica.'],
  [/rubrica piena/i, 'Rubrica piena (massimo 1000 contatti).'],
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
async function homeMap(opts = {}) {
  const el = $('#hmap');
  await waitLeaflet();
  if (!document.body.contains(el)) return;
  const map = makeMap(el, 42.5, 12.5, 6);
  if (!map) return;
  const layer = L.layerGroup().addTo(map);
  let me = null, timer = null, first = true;
  const icon = (c) => L.divIcon({
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
    html: pinBadge(c, `pin${c.is_owner ? ' mine' : ''}${c.is_owner || c.unlocked ? '' : ' locked'}`),
  });
  let rows = [];
  const draw = () => {
    layer.clearLayers();
    // filtri: tipo (uno qualsiasi dei selezionati) E tag (uno qualsiasi dei selezionati) E, se scelto, solo i miei
    const types = [...typeFilter].filter((k) => k !== 'mine');
    const shown = rows.filter((c) =>
      (!opts.dating || c.is_dating) &&
      (opts.dating || !types.length || types.includes(c.media_type) || (types.includes('dating') && c.is_dating)) &&
      (opts.dating || !typeFilter.has('mine') || c.is_owner) &&
      (!tagFilter.size || (c.tags || []).some((t) => tagFilter.has(t))));
    document.querySelectorAll('#typebar .chip').forEach((b) => b.classList.toggle('on', typeFilter.has(b.dataset.k)));
    shown.forEach((c) => {
      L.marker([c.lat, c.lng], { icon: icon(c), title: c.title, keyboard: true })
        .on('click', () => { location.hash = `#/c/${c.share_slug}`; })
        .addTo(layer);
    });
    // nuvola: tag presenti nella zona, i più usati prima; i selezionati restano sempre visibili
    const count = new Map();
    rows.filter((c) => !opts.dating || c.is_dating).forEach((c) => (c.tags || []).forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
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
      const fit = rows.filter((c) => !opts.dating || c.is_dating);
      if (first && fit.length && !lastView && !me) {
        map.fitBounds(fit.map((c) => [c.lat, c.lng]), { padding: [40, 40], maxZoom: 16 });
      }
      first = false;
      msg($('#mm'), !rows.length || (opts.dating && !rows.some((c) => c.is_dating)) ? (opts.dating ? 'Nessun biglietto in questa zona: sposta la mappa o lasciane uno tu.' : 'Nessun contenuto in questa zona: sposta la mappa o lasciane uno tu.') : (!shownCount ? 'Nessun contenuto con questi filtri in questa zona.' : ''), 'info');
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
      <span class="row" style="flex:0 0 auto;gap:8px"><a href="#/profilo" class="me" aria-label="Il mio profilo">${avatarHtml(prof.avatar_path, prof.display_name, 44)}</a>
      <button class="ghost" id="nearme" type="button" aria-label="Centra sulla mia posizione">📍</button></span></div>
    <div id="hmap" class="map home"></div>
    <div class="chips types" id="typebar">${Object.entries(TYPES).map(([k, x]) => `<button class="chip" data-k="${k}"><span class="tico sm" style="background:${x.c}">${x.l}</span>${x.n}</button>`).join('')}
      <button class="chip" data-k="dating">${datingBadge('f', 'sm')}Dating</button>
      <button class="chip" data-k="mine"><span class="tico sm mine" style="background:#888">·</span>Miei</button></div>
    <div id="tagcloud" class="chips cloud"></div>
    <div id="mm"></div>
    <a href="#/new" class="btn accent full" style="background:var(--accent)">＋ Lascia un contenuto in un luogo</a>
    <div class="row" style="margin-top:10px"><a href="#/profilo" class="btn ghost">👤 Il mio profilo</a><a href="#/rubrica" class="btn ghost">📒 La mia rubrica</a></div>
    <a href="#/dating" class="btn full datingbtn" style="margin-top:10px">💗 Ubi Dating · incontra chi ama i tuoi luoghi</a>
    ${inviteBox(false)}
    <h2 style="margin-top:22px">I miei contenuti</h2>
    <div id="list"><p class="muted center">Carico i tuoi contenuti…</p></div>
    <p class="center small"><a href="#" id="out">Esci (${esc(user.email)})</a></p>`;
  $('#out').onclick = async (e) => { e.preventDefault(); await B.signOut(); location.hash = '#/'; route(); };
  homeMap();
  bindInvite(app);
  let items;
  try { items = await B.listMine(); } catch (err) { msg($('#list'), errText(err)); return; }
  if (!items.length) { $('#list').innerHTML = '<div class="card center muted">Non hai ancora lasciato nulla.<br>Inizia da un luogo che conta per te.</div>'; return; }
  $('#list').innerHTML = items.map((c, i) => `
    <div class="card" data-i="${i}">
      <div class="item"><div class="ico">${c.is_dating ? datingBadge(prof.dating_gender) : badge(c.media_type)}</div>
        <div><div class="t">${esc(c.title)}</div>
        <div class="meta">${c.is_dating ? '💗 Dating · ' : ''}${VIS[c.visibility]}${c.password_hash ? ' · 🔒 password' : ''} · ${new Date(c.created_at).toLocaleDateString('it-IT')}</div></div></div>
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

async function viewNew(ed = null, opts = {}) {
  const dating = !!opts.dating;
  const maxTags = dating ? MAX_TAGS_DATING : MAX_TAGS;
  const s = { sel: new Set(), book: [], tags: new Set(), kind: 'file', file: null, media_type: null, duration: null, lat: null, lng: null, source: null, radius: CONFIG.DEFAULT_RADIUS_M, vis: dating ? 'public' : 'restricted' };
  if (ed) {
    Object.assign(s, {
      tags: new Set(ed.tags || []), kind: ['photo', 'video', 'audio'].includes(ed.media_type) ? 'file' : ed.media_type,
      media_type: ed.media_type, radius: ed.unlock_radius_m, vis: ed.visibility,
    });
  }
  app.innerHTML = `
    <h1>${dating ? (ed ? '💗 Modifica il biglietto' : '💗 Nuovo biglietto dating') : (ed ? 'Modifica contenuto' : 'Nuovo contenuto')}</h1>
    ${ed ? '<div class="msg info">Il link già condiviso resta lo stesso: chi lo apre vedrà la versione aggiornata.</div>' : ''}
    ${dating ? `<div class="card datingtips"><b>Come funziona il biglietto</b>
      <ul class="small"><li>Lo lasci in un luogo che ami: sulla mappa appare con il tuo pallino ${datingBadge('f', 'sm')}${datingBadge('m', 'sm')}.</li>
      <li>Lo può aprire solo chi è iscritto a Ubi Dating (18+) ed è <b>arrivato fin lì</b>: avrete già una passione in comune.</li>
      <li>Resti <b>anonimo</b>: chi ti risponde vede solo il biglietto. Vi scoprite solo se scegliete entrambi «Voglio conoscerti».</li>
      <li><b>Consiglio:</b> registra un breve <b>video dal vivo</b>, sul posto: è il modo più sincero per presentarti.</li>
      <li>Non scrivere dove abiti, il cognome o i tuoi orari. Scegli un luogo pubblico.</li></ul></div>` : ''}
    <div class="card"><h2>1 · Cosa vuoi lasciare</h2>
      <div class="seg" id="kind"><button class="on" data-k="file">Galleria</button><button data-k="text">Testo</button><button data-k="link">Link</button></div>
      <div id="k-file"><label for="file">Foto, video (max ${CONFIG.MAX_VIDEO_SECONDS} s) o audio</label>
        <input id="file" type="file" accept="image/*,video/*,audio/*">
        <div class="row" style="margin-top:8px"><button type="button" class="ghost" id="capv">🎥 Registra ora un video</button><button type="button" class="ghost" id="capp">📷 Scatta ora</button></div>
        <input id="capvf" type="file" accept="video/*" capture="user" hidden><input id="cappf" type="file" accept="image/*" capture="environment" hidden>
        <p class="muted small">💡 Un <b>video registrato in tempo reale</b>, sul posto e dedicato a chi lo aprirà, rende il pin molto più emozionante (max ${CONFIG.MAX_VIDEO_SECONDS} s).</p>
        <p class="muted small">Un file per contenuto. <b>Vuoi lasciare tante foto?</b> Crea un album condiviso (Google Foto, iCloud, Drive…), scegli <a href="#" id="toalbum">Link</a> e incolla il link dell'album.</p></div>
      <div id="k-text" hidden><label for="txt">Il tuo testo</label>
        <textarea id="txt" maxlength="2000" rows="6" placeholder="Es. una dedica, le istruzioni per lo scatto, l'indizio per la caccia al tesoro…"></textarea>
        <p class="muted small"><span id="txtn">0</span>/2000 caratteri</p></div>
      <div id="k-link" hidden><label for="url">Link</label>
        <textarea id="url" rows="2" inputmode="url" placeholder="https://…  oppure incolla il messaggio di condivisione"></textarea>
        <p class="muted small">Qualsiasi link: un video (YouTube, Vimeo, Drive…), un percorso da seguire (Wikiloc, Komoot…), un sito, una mappa, un documento.
        <b>Tante foto in un pin:</b> incolla il link di un album condiviso (Google Foto: album → Condividi → Crea link; iPhone: Foto → album condiviso → Sito web pubblico → copia il link).
        Puoi incollare anche tutto il messaggio di condivisione: il link lo troviamo noi. Per i video più lunghi di ${CONFIG.MAX_VIDEO_SECONDS} secondi caricali su YouTube (anche "non in elenco") e incolla qui il link.</p>
        <div id="urlok" class="small"></div></div>
      <div id="pm"></div><div class="preview" id="preview"></div>
    </div>
    <div class="card"><h2>2 · Dove</h2>
      <button class="full" id="gps" type="button">📍 Usa la mia posizione attuale</button>
      <label for="addr">…oppure cerca un indirizzo o un luogo</label>
      <div class="row"><input id="addr" type="search" enterkeyhint="search" autocomplete="off" placeholder="Es. Alghero, via Sant'Antioco"><button id="find" type="button" class="ghost" style="flex:0 0 auto">🔎 Cerca</button></div>
      <div id="addrres"></div>
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
      <label>${dating ? 'Raccontati con i tag' : 'Tag'} <span class="muted small" id="tagn">(0/${maxTags})</span></label>
      ${dating ? '<p class="muted small">Li vedono solo gli iscritti a Ubi Dating: aiutano a trovare chi cerca le tue stesse cose. Sono facoltativi.</p>' : ''}
      <div class="chips" id="tags"></div>
      <div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="newtag" maxlength="24" placeholder="Aggiungi un tag tuo…" enterkeyhint="done">
        <button id="addtag" type="button" class="ghost" style="flex:0 0 auto">＋</button></div>
    </div>
    ${dating ? `<div class="card"><h2>4 · Chi può aprirlo</h2>
      <div class="msg info small">💗 I biglietti dating sono <b>visibili a tutti</b> sulla mappa, ma solo gli iscritti a Ubi Dating (18+) che arrivano sul posto possono aprirli e risponderti. Ti avvisiamo via email a ogni risposta.</div></div>` : ''}
    <div class="card" ${dating ? 'hidden' : ''}><h2>4 · Chi può aprirlo</h2>
      <div class="seg" id="vis"><button data-v="restricted" class="on">Persone scelte</button><button data-v="public">Tutti</button><button data-v="hidden">Solo io</button></div>
      <div id="v-restricted">
        <label>Dalla tua rubrica <span class="muted small" id="seln"></span></label>
        <div class="chips" id="book"><span class="muted small">Carico la rubrica…</span></div>
        <details class="quickadd"><summary>＋ Aggiungi un contatto alla rubrica</summary>
          <div class="row" style="flex-wrap:nowrap;margin-top:8px"><input id="qname" maxlength="60" placeholder="Nome"><input id="qemail" type="email" placeholder="email@esempio.it"></div>
          <button type="button" class="ghost full" id="qadd" style="margin-top:8px">Salva e seleziona</button><div id="qm"></div></details>
        <label for="emails">Altre email (facoltative)</label>
        <textarea id="emails" placeholder="maria@esempio.it, luca@esempio.it"></textarea>
        <p class="muted small">Solo chi accede con queste email potrà vederlo.</p>
        <div class="msg info small">📧 ${CONFIG.EMAIL_AUTO ? 'Quando premi <b>Fissa nel luogo</b>, le persone scelte ricevono <b>in automatico un\'email</b> con il link al pin.' : 'Dopo il salvataggio potrai avvisare le persone scelte con un\'email già scritta.'} Puoi anche mandare il link con WhatsApp.</div></div>
      <label for="pwd">${ed && ed.has_password ? 'Nuova password (lascia vuoto per mantenere quella attuale)' : 'Password (facoltativa)'}</label>
      <input id="pwd" type="text" autocomplete="off" maxlength="64" placeholder="${ed && ed.has_password ? '🔒 password attuale mantenuta' : 'Lascia vuoto per nessuna password'}">
      ${ed && ed.has_password ? '<label class="inline"><input type="checkbox" id="nopwd"><span>Togli la password</span></label>' : ''}
      <label class="inline" style="margin-top:12px"><input type="checkbox" id="replies" ${!ed || ed.replies_enabled !== false ? 'checked' : ''}>
        <span>Chi sblocca il pin può <b>lasciarmi una risposta</b> (testo, foto, video o audio): mi arriva un'email.</span></label>
    </div>
    <div id="sm"></div>
    <button class="full accent" id="save">${ed ? 'Salva le modifiche' : 'Fissa nel luogo'}</button>
    <p class="center"><a href="${ed ? `#/c/${esc(ed.share_slug)}` : '#/'}">Annulla</a></p>`;

  // --- tag
  const allTags = dating ? [] : [...TAGS_SUGGESTED];   // nel dating: tag tuoi (quelli dei gruppi sono a parte)
  const chip = (t) => `<button type="button" class="chip ${s.tags.has(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}</button>`;
  const drawTags = () => {
    $('#tags').innerHTML = dating
      ? DATING_TAGS.map(([g, list]) => `<div class="taggroup"><div class="muted small"><b>${g}</b></div>${list.map(chip).join('')}</div>`).join('')
        + (allTags.length ? `<div class="taggroup"><div class="muted small"><b>I tuoi tag</b></div>${allTags.map(chip).join('')}</div>` : '')
      : allTags.map(chip).join('');
    $('#tagn').textContent = `(${s.tags.size}/${maxTags})`;
  };
  const toggleTag = (t, forceOn = false) => {
    if (s.tags.has(t) && !forceOn) s.tags.delete(t);
    else if (s.tags.size >= maxTags && !s.tags.has(t)) { msg($('#sm'), `Massimo ${maxTags} tag per contenuto.`); return; }
    else s.tags.add(t);
    msg($('#sm'), ''); drawTags();
  };
  $('#tags').onclick = (e) => { const b = e.target.closest('button'); if (b) toggleTag(b.dataset.t); };
  const addCustom = () => {
    const t = normTag($('#newtag').value); if (!t) return;
    if (!allTags.includes(t) && !(dating && DATING_FLAT.has(t))) allTags.unshift(t);
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
  $('#toalbum').onclick = (e) => { e.preventDefault(); $('#kind button[data-k="link"]').click(); $('#url').focus(); };
  $('#txt').oninput = () => { $('#txtn').textContent = $('#txt').value.length; };
  $('#url').oninput = () => {
    const u = extractUrl($('#url').value);
    $('#urlok').innerHTML = !$('#url').value.trim() ? '' : u ? `<span style="color:var(--ok)">✓ Link trovato: <b>${esc(hostOf(u))}</b></span>` : '<span style="color:var(--err)">Non trovo un link valido (deve iniziare con https://)</span>';
  };
  $('#capv').onclick = () => $('#capvf').click();
  $('#capp').onclick = () => $('#cappf').click();
  $('#capvf').onchange = () => handleFile($('#capvf').files[0]);
  $('#cappf').onchange = () => handleFile($('#cappf').files[0]);
  $('#file').onchange = () => handleFile($('#file').files[0]);
  const clearFile = () => {
    s.file = null; s.duration = null; $('#preview').innerHTML = ''; msg($('#pm'), '');
    ['#file', '#capvf', '#cappf'].forEach((k) => { $(k).value = ''; });   // così si può riscegliere anche lo stesso file
  };
  const addRemoveBtn = () => {
    $('#preview').insertAdjacentHTML('beforeend', '<button type="button" class="ghost full" id="rmfile" style="margin-top:8px">✕ Togli il file e scegline un altro</button>');
    $('#rmfile').onclick = () => { clearFile(); if (ed && ['photo', 'video', 'audio'].includes(ed.media_type)) showCurrentFile(); };
  };
  const handleFile = async (f) => {
    s.file = null; s.duration = null; $('#preview').innerHTML = ''; msg($('#pm'), '');
    ['#file', '#capvf', '#cappf'].forEach((k) => { $(k).value = ''; });
    if (!f) return;
    const type = f.type.split('/')[0];
    if (!['image', 'video', 'audio'].includes(type)) return msg($('#pm'), 'Formato non supportato.');
    if (f.size > CONFIG.MAX_FILE_MB * 1048576) return msg($('#pm'), `File troppo grande (max ${CONFIG.MAX_FILE_MB} MB).`);
    const url = URL.createObjectURL(f);
    if (type === 'image') { $('#preview').innerHTML = `<img src="${url}" alt="anteprima">`; s.media_type = 'photo'; s.file = f; addRemoveBtn(); return; }
    const el = document.createElement(type); el.controls = true; el.preload = 'metadata'; el.src = url; if (type === 'video') el.playsInline = true;
    const dur = await new Promise((res) => { el.onloadedmetadata = () => res(el.duration); el.onerror = () => res(NaN); setTimeout(() => res(el.duration), 8000); });
    if (!Number.isFinite(dur)) return msg($('#pm'), 'Non riesco a leggere la durata del file. Prova con un altro formato (MP4, M4A, MP3).');
    if (type === 'video' && dur > CONFIG.MAX_VIDEO_SECONDS + 0.5) {
      return msg($('#pm'), `Il video dura ${Math.round(dur)} s: il massimo è ${CONFIG.MAX_VIDEO_SECONDS}. Accorcialo, oppure caricalo su YouTube e usa "Link".`);
    }
    $('#preview').append(el); s.media_type = type; s.duration = Math.round(dur); s.file = f; addRemoveBtn();
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
  // Ricerca indirizzo (OpenStreetMap Nominatim: gratuito, max 1 richiesta al secondo, solo su comando)
  const pickPlace = (r) => {
    $('#addrres').innerHTML = '';
    setPoint(+r.lat, +r.lon, 'map');
    if (map) map.setView([s.lat, s.lng], 18);
    msg($('#lm'), `Trovato: ${esc(r.display_name)}. Ora trascina lo spillo (o tocca la mappa) nel punto esatto.`, 'ok');
  };
  const findAddr = async () => {
    const q = $('#addr').value.trim();
    if (q.length < 3) return msg($('#lm'), 'Scrivi almeno città e via, es. "Alghero, via Sant\'Antioco".');
    $('#find').disabled = true; $('#addrres').innerHTML = ''; msg($('#lm'), 'Cerco l\'indirizzo…', 'info');
    try {
      const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=it&q=' + encodeURIComponent(q);
      const res = await withTimeout(fetch(u, { headers: { accept: 'application/json' } }), 15000);
      if (!res.ok) throw new Error('Ricerca non disponibile in questo momento, riprova tra poco.');
      const list = await res.json();
      if (!list.length) { msg($('#lm'), 'Nessun risultato. Prova a scrivere anche la città, oppure una via vicina, e poi sposta lo spillo.'); return; }
      if (list.length === 1) return pickPlace(list[0]);
      msg($('#lm'), 'Scegli il risultato giusto:', 'info');
      $('#addrres').innerHTML = list.map((r, i) => `<button type="button" class="ghost full addrpick" data-i="${i}">${esc(r.display_name)}</button>`).join('');
      $('#addrres').querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => pickPlace(list[+b.dataset.i]); });
    } catch (err) { msg($('#lm'), errText(err)); }
    finally { setTimeout(() => { $('#find').disabled = false; }, 1100); }
  };
  $('#find').onclick = findAddr;
  $('#addr').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); findAddr(); } };
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

  // --- rubrica: pulsanti dei contatti
  const drawBook = () => {
    $('#book').innerHTML = s.book.length ? s.book.map((c) => `<button type="button" class="chip ${s.sel.has(c.email) ? 'on' : ''}" data-e="${esc(c.email)}" title="${esc(c.email)}">${esc(c.name)}</button>`).join('')
      : '<span class="muted small">La rubrica è vuota: aggiungi qui sotto i contatti che usi spesso.</span>';
    $('#seln').textContent = s.sel.size ? `(${s.sel.size} selezionat${s.sel.size === 1 ? 'o' : 'i'})` : '';
  };
  $('#book').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const em = b.dataset.e; if (s.sel.has(em)) s.sel.delete(em); else s.sel.add(em); drawBook(); };
  let bookReady = false;
  B.listContacts().then((list) => {
    s.book = list; bookReady = true;
    if (ed) {   // in modifica: i destinatari già in rubrica diventano pulsanti selezionati, gli altri restano nel campo
      const inBook = new Set(list.map((c) => c.email));
      const others = (ed.recipients || []).filter((em) => { if (inBook.has(em)) { s.sel.add(em); return false; } return true; });
      $('#emails').value = others.join(', ');
    }
    drawBook();
  }).catch(() => { $('#book').innerHTML = '<span class="muted small">Rubrica non disponibile.</span>'; });
  $('#qadd').onclick = async () => {
    const name = $('#qname').value.trim(), email = $('#qemail').value.trim().toLowerCase();
    if (!name || !EMAIL_RE.test(email)) return msg($('#qm'), 'Scrivi un nome e un\'email valida.');
    try {
      await B.saveContact({ name, email });
      s.book = await B.listContacts(); s.sel.add(email); drawBook();
      $('#qname').value = ''; $('#qemail').value = ''; msg($('#qm'), `${esc(name)} aggiunto alla rubrica e selezionato ✓`, 'ok');
    } catch (err) { msg($('#qm'), authErr(err)); }
  };

  // --- precompilazione in modifica
  function showCurrentFile() {
    $('#preview').innerHTML = `<div class="msg info">File attuale: <b>${esc(TYPES[ed.media_type].n)}</b>. Per sostituirlo scegli un nuovo file qui sopra (o registra/scatta ora): il vecchio verrà cancellato quando salvi.</div>`;
  }
  if (ed) {
    $(`#kind button[data-k="${s.kind}"]`).click();
    if (s.kind === 'file') {
      showCurrentFile();
    }
    if (ed.text_body) { $('#txt').value = ed.text_body; $('#txt').oninput(); }
    if (ed.external_url) { $('#url').value = ed.external_url; $('#url').oninput(); }
    $('#title').value = ed.title || ''; $('#hint').value = ed.hint || '';
    (ed.tags || []).forEach((t) => { if (!allTags.includes(t) && !(dating && DATING_FLAT.has(t))) allTags.unshift(t); }); drawTags();
    $(`#vis button[data-v="${s.vis}"]`).click();
    $('#emails').value = (ed.recipients || []).join(', ');
    $('#radius').value = s.radius; $('#rout').textContent = `${s.radius} m`;
    setPoint(ed.lat, ed.lng, ed.location_source || 'map');
    msg($('#lm'), 'Posizione attuale. Per spostarla: trascina lo spillo, tocca un altro punto, cerca un indirizzo, usa il GPS o scrivi le coordinate.', 'info');
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
    if (s.lat == null) return err('Indica il luogo: GPS, indirizzo, coordinate o tocco sulla mappa.');
    const title = $('#title').value.trim(); if (!title) return err('Dai un titolo al contenuto.');
    if (s.vis === 'restricted' && ed && !bookReady) return err('Attendi un attimo: sto caricando la rubrica.');
    if (dating) s.vis = 'public';
    const recipients = s.vis === 'restricted' ? [...new Set([...s.sel, ...$('#emails').value.toLowerCase().split(/[\s,;]+/).filter(Boolean)])] : [];
    const bad = recipients.filter((x) => !EMAIL_RE.test(x));
    if (bad.length) return err(`Email non valide: ${esc(bad.join(', '))}`);
    if (s.vis === 'restricted' && !recipients.length) return err('Scegli almeno una persona dalla rubrica o scrivi un\'email, oppure scegli "Tutti" o "Solo io".');
    const btn = $('#save'); btn.disabled = true; btn.textContent = s.file ? 'Carico il file…' : 'Salvo…';
    const data = {
      file: s.kind === 'file' ? s.file : null, media_type: s.kind === 'file' ? s.media_type : s.kind, duration: s.kind === 'file' ? s.duration : null,
      text_body: s.kind === 'text' ? $('#txt').value.trim() : null, tags: [...s.tags],
      external_url, lat: s.lat, lng: s.lng, radius: s.radius, source: s.source, title, hint: $('#hint').value.trim(),
      visibility: dating ? 'public' : s.vis, recipients: dating ? [] : recipients, password: $('#pwd').value,
      is_dating: dating, replies_enabled: dating ? true : $('#replies').checked,
    };
    try {
      if (ed) {
        data.passwordAction = $('#nopwd')?.checked ? 'remove' : (data.password ? 'set' : 'keep');
        const slug = await B.update(ed, data);
        if (data.visibility === 'restricted' && data.recipients.length) await autoNotify(slug, null);   // avvisa solo i nuovi destinatari
        location.hash = `#/c/${slug}`;
        return;
      }
      const slug = await B.create(data);
      const me = await B.profile().catch(() => null);
      viewCreated(title, slug, data.visibility === 'restricted'
        ? { recipients: data.recipients, title, hint: data.hint, slug, author: me?.display_name } : null);
    } catch (e) { err(errText(e)); btn.disabled = false; btn.textContent = ed ? 'Salva le modifiche' : 'Fissa nel luogo'; }
  };
}

// Email già scritta da mandare con la propria app di posta (destinatari in copia nascosta).
function mailtoHref({ recipients, title, hint, slug, author }) {
  const url = shareUrl(slug);
  const body = [
    'Ciao!',
    '',
    `${author || 'Un amico'} ha lasciato per te un contenuto su Ubi: «${title}».`,
    hint ? `Indizio: ${hint}` : null,
    '',
    'Si apre solo quando arrivi sul posto. Apri il link qui sotto per vedere dov\'è:',
    url,
    '',
    'Per aprirlo accedi a Ubi con questo indirizzo email (la prima volta: "Registrati").',
  ].filter((x) => x !== null).join('\n');
  return `mailto:?bcc=${encodeURIComponent(recipients.join(','))}&subject=${encodeURIComponent(`📍 ${author || 'Qualcuno'} ha lasciato qualcosa per te su Ubi`)}&body=${encodeURIComponent(body)}`;
}
function emailCard(info) {
  return `<div class="card" id="mailcard"><h2>📧 Avvisa i destinatari via email</h2>
    <div id="automsg"></div>
    <p class="muted small">Si apre la tua app di posta con l'email già scritta (${info.recipients.length} destinatar${info.recipients.length === 1 ? 'io' : 'i'} in copia nascosta): devi solo premere Invia.</p>
    <a class="btn full" href="${esc(mailtoHref(info))}">✉️ Scrivi l'email con la mia posta</a>
    <p class="muted small" style="margin-top:8px">${info.recipients.map(esc).join(', ')}</p></div>`;
}
async function autoNotify(slug, box) {
  if (!CONFIG.EMAIL_AUTO) return;
  if (box) msg(box, 'Invio automatico dell\'avviso in corso…', 'info');
  try {
    const r = await B.notifyRecipients(slug);
    if (r.failed) {
      const e = (r.errors || [])[0] || {};
      if (box) msg(box, `Invio automatico non riuscito (${r.failed}): il servizio email ha risposto <b>${esc(e.status || '')}</b> ${esc(e.detail || '')}. Usa il pulsante qui sotto.`, 'err');
      return;
    }
    if (box) msg(box, r.sent ? `✓ Avviso inviato automaticamente a ${r.sent} person${r.sent === 1 ? 'a' : 'e'}${r.skipped ? ` (${r.skipped} già avvisat${r.skipped === 1 ? 'a' : 'e'} o che non vogliono avvisi)` : ''}.`
      : 'Nessuna email nuova da inviare (destinatari già avvisati o che non vogliono avvisi).', 'ok');
  } catch (err) {
    if (box) msg(box, `Invio automatico non riuscito: <b>${esc(err?.message || String(err))}</b><br>Usa il pulsante qui sotto.`, 'err');
  }
}

function viewCreated(title, slug, info = null) {
  history.replaceState(null, '', location.pathname + '#/fatto');  // così '＋' e 'Torna alla mappa' funzionano
  app.innerHTML = `
    <div class="hero"><span class="pin"></span><h1>Fissato!</h1>
      <p class="muted">«${esc(title)}» ora vive in quel luogo. Manda il link: si aprirà solo sul posto.</p></div>
    ${info && info.recipients.length ? emailCard(info) : ''}
    <div class="card" id="sh"></div>
    <a class="btn ghost full" href="#/">Torna alla mappa</a>`;
  shareSheet(title, slug, $('#sh'));
  if (info && info.recipients.length) autoNotify(slug, $('#automsg'));
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
  setDatingTheme(t.is_dating);
  const header = t.is_dating
    ? `<h1>${datingBadge(t.gender)} ${esc(t.title)}</h1><div class="msg info small">💗 Biglietto Ubi Dating${GENDER[t.gender] ? ` di <b>${GENDER[t.gender].n}</b>` : ''}: chi l'ha lasciato resta anonimo finché non vi scegliete entrambi.</div>${tagChips(t.tags)}${t.hint ? `<div class="msg info hint">${linkify(t.hint)}</div>` : ''}`
    : `<h1>${badge(t.media_type)} ${esc(t.title)}</h1>${t.author ? authorLine(t, user) : ''}${tagChips(t.tags)}${t.hint ? `<div class="msg info hint">${linkify(t.hint)}</div>` : ''}`;
  const showUnlocked = (r, d) => {
    stopWatch();
    app.innerHTML = `${header}<div class="msg ok">Sbloccato${d != null ? ` a ${d} m dal punto` : ''} ✓</div>
      <div class="card media">${renderMedia(t.media_type, r)}</div>
      ${t.is_owner ? `<a class="btn full" href="#/edit/${esc(slug)}" style="margin-bottom:10px">✏️ Modifica o sostituisci il contenuto</a>
        <button class="danger full" id="delpin" style="margin-bottom:10px">🗑 Elimina questo pin</button>
        ${t.is_dating ? '' : '<button class="ghost full" id="mailbtn" style="margin-bottom:10px">📧 Avvisa i destinatari via email</button><div id="mailbox"></div>'}` : ''}
      <div id="replybox"></div>
      <a class="btn ghost full" href="${t.is_dating ? '#/dating' : '#/'}">${user ? (t.is_dating ? 'Torna a Ubi Dating' : 'Torna alla mappa') : 'Scopri Ubi'}</a>`;
    if (user) replySection(t, slug, $('#replybox')).catch((err) => msg($('#replybox'), errText(err)));
    if ($('#delpin')) $('#delpin').onclick = async () => {
      const b = $('#delpin');
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma: elimina per sempre'; return; }
      b.disabled = true;
      try { const c = await B.getForEdit(slug); if (c) await B.remove(c); location.hash = t.is_dating ? '#/dating' : '#/'; }
      catch (err) { alertIn(b.parentElement, errText(err)); b.disabled = false; }
    };
  };
  if (user && (t.is_owner || t.already_unlocked)) {
    try {
      const r = await B.unlock(slug, null, null);
      if (r.status === 'ok') {
        showUnlocked(r, null);
        if (t.is_owner && $('#mailbtn')) $('#mailbtn').onclick = async () => {
          const c = await B.getForEdit(slug); const me = await B.profile().catch(() => null);
          if (!c || c.visibility !== 'restricted' || !(c.recipients || []).length) {
            return msg($('#mailbox'), 'Questo pin non ha destinatari scelti (è pubblico o solo tuo): condividi il link con WhatsApp o Copia.', 'info');
          }
          $('#mailbox').innerHTML = emailCard({ recipients: c.recipients, title: c.title, hint: c.hint, slug, author: me?.display_name });
          $('#mailbtn').hidden = true;
          autoNotify(slug, $('#automsg'));
        };
        return;
      }
    } catch { /* prosegue */ }
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
      ${!user ? '<button class="full" id="login">Accedi per sbloccare</button>'
        : (t.is_dating && !t.is_owner && !t.i_am_dating) ? '<div class="msg info small">I biglietti dating si aprono solo se sei iscritto a Ubi Dating (riservato ai maggiorenni).</div><a class="btn full accent" href="#/dating">💗 Iscriviti a Ubi Dating</a>'
        : '<button class="full accent" id="unlock">🔓 Sblocca qui</button>'}
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
      (e) => { $('#dtxt').innerHTML = (e && e.code === 1 ? 'Il telefono non permette a Ubi di usare la posizione.' : 'Posizione non disponibile: riprova all\'aperto.') + GEO_HELP; },
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
        dating_required: 'Questo biglietto si apre solo se sei iscritto a Ubi Dating (18+). <a href="#/dating">Iscriviti</a>',
      };
      if (r.status === 'ok') return showUnlocked(r, r.distance_m);
      msg($('#um'), M[r.status] || r.status);
    } catch (err) { msg($('#um'), errText(err)); }
    btn.disabled = false;
  };
}


// Ridimensiona una foto (lato lungo max 1600 px, JPEG) senza ritagliarla
function fitImage(file, max = 1600) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res(b) : rej(new Error('Immagine non leggibile'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => rej(new Error('Immagine non leggibile: prova con una foto JPG o PNG.'));
    img.src = url;
  });
}
const MAX_DATING_PHOTOS = 6;
async function drawMyDatingPhotos(box) {
  const list = await B.myDatingPhotos();
  box.innerHTML = `<div class="photogrid">${list.map((p, i) => `<div class="ph"><img src="${esc(p.url || '')}" alt="Foto ${i + 1}"><button type="button" data-i="${i}" aria-label="Elimina foto">✕</button></div>`).join('')}
    ${list.length < MAX_DATING_PHOTOS ? '<label class="ph add"><input type="file" accept="image/*" multiple hidden id="dpf"><span>＋<br>Aggiungi</span></label>' : ''}</div>
    <p class="muted small">${list.length}/${MAX_DATING_PHOTOS} foto. Le vede <b>solo chi hai scelto e ti ha scelto</b> (doppio sì): prima resti anonimo/a.</p><div id="dpm"></div>`;
  box.querySelectorAll('button[data-i]').forEach((b) => {
    b.onclick = async () => {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Sicuro?'; b.classList.add('wide'); return; }
      try { await B.removeDatingPhoto(list[+b.dataset.i]); drawMyDatingPhotos(box); } catch (err) { msg($('#dpm'), errText(err)); }
    };
  });
  const inp = box.querySelector('#dpf');
  if (inp) inp.onchange = async () => {
    const files = [...inp.files].slice(0, MAX_DATING_PHOTOS - list.length);
    msg($('#dpm'), `Carico ${files.length} foto…`, 'info');
    try { for (const f of files) await B.addDatingPhoto(await fitImage(f)); drawMyDatingPhotos(box); }
    catch (err) { msg($('#dpm'), errText(err)); }
  };
}
async function viewDatingPhotos(userId) {
  setDatingTheme(true);
  app.innerHTML = '<p class="muted center">Carico…</p>';
  const list = await B.datingPhotosOf(userId);
  app.innerHTML = `<h1>📷 ${list.length ? `Le foto di ${esc(list[0].name || '')}` : 'Foto'}</h1>
    ${list.length ? `<div class="photostack">${list.map((p) => `<img src="${esc(p.url || '')}" alt="">`).join('')}</div>`
      : '<div class="card center muted">Nessuna foto da mostrare. Le foto si vedono solo dopo che vi siete scelti a vicenda.</div>'}
    <p class="center"><a href="#/dating">Torna a Ubi Dating</a></p>`;
}

// ======================= INVITA UN AMICO (card con QR) =======================
const INVITE_URL = 'https://ubipin.it';
const INVITE_IMG = 'invito-ubi.png';
const INVITE_TEXT = 'Ti presento Ubi: lascia foto, video e messaggi in un luogo, si aprono solo quando ci arrivi. Provala:';
// Condivide l'invito con il menu del telefono (WhatsApp, Instagram, Messaggi, Telegram, email…)
async function shareInvite(dating = false, out = null) {
  const url = dating ? `${INVITE_URL}/#/dating` : INVITE_URL;
  const text = dating ? 'Ti presento Ubi Dating: biglietti lasciati nei luoghi del cuore, si aprono solo arrivando lì. Per maggiorenni.' : INVITE_TEXT;
  try {
    if (navigator.share) {
      let data = { title: dating ? 'Ubi Dating' : 'Ubi', text, url };
      if (!dating) {
        try {
          const blob = await (await fetch(INVITE_IMG)).blob();
          const file = new File([blob], 'Ubi-card.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) data = { ...data, files: [file] };
        } catch { /* senza immagine va bene lo stesso */ }
      }
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      if (out) msg(out, 'Invito copiato: incollalo su WhatsApp o sui social.', 'ok');
    }
  } catch (err) { if (err && err.name !== 'AbortError' && out) msg(out, 'Condivisione non riuscita: usa il pulsante WhatsApp.'); }
}
// Riquadro "Invita un amico": Condividi (menu del telefono) + WhatsApp + card con QR
function inviteBox(dating = false) {
  const url = dating ? `${INVITE_URL}/#/dating` : INVITE_URL;
  const text = dating ? 'Ti presento Ubi Dating, per chi ama gli stessi luoghi:' : INVITE_TEXT;
  return `<div class="card invitebox"><b>📲 Invita un amico</b>
    <div class="row" style="margin-top:10px">
      <button type="button" class="accent" data-invite="${dating ? 'd' : 'u'}">📤 Condividi</button>
      <a class="btn" style="background:#25d366;border-color:#25d366;color:#fff" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}">WhatsApp</a>
      ${dating ? '' : '<a class="btn ghost" href="#/invita">QR</a>'}
    </div><div class="invmsg"></div></div>`;
}
// Collega i pulsanti "Condividi" presenti nella pagina
function bindInvite(root = document) {
  root.querySelectorAll('[data-invite]').forEach((b) => {
    b.onclick = () => shareInvite(b.dataset.invite === 'd', b.closest('.invitebox')?.querySelector('.invmsg'));
  });
}
function viewInvite() {
  app.innerHTML = `
    <h1>📲 Invita un amico</h1>
    <p class="muted">Fagli inquadrare il QR con la fotocamera, oppure condividi la card.</p>
    <div class="invitecard"><img src="${INVITE_IMG}" alt="Card di Ubi con QR code per aprire ubipin.it"></div>
    <button class="full accent" id="share">📤 Condividi la card</button>
    <div class="row" style="margin-top:10px">
      <a class="btn" style="background:#25d366;border-color:#25d366" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${INVITE_TEXT} ${INVITE_URL}`)}">WhatsApp</a>
      <button class="ghost" id="copy">Copia link</button>
      <a class="btn ghost" href="${INVITE_IMG}" download="Ubi-card.png">Salva immagine</a>
    </div>
    <div id="im"></div>
    <div class="card small" style="margin-top:16px"><b>Vuoi la card nel Wallet?</b> Salva l'immagine, poi con un'app gratuita come <i>Pass2U Wallet</i> crea una card con QR <code>${INVITE_URL}</code> e aggiungila al Wallet.</div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  $('#share').onclick = () => shareInvite(false, $('#im'));
  $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText(INVITE_URL); msg($('#im'), 'Link copiato ✓', 'ok'); }
    catch { msg($('#im'), INVITE_URL, 'info'); }
  };
}

// ======================= RISPOSTE AI PIN =======================
// Controlla un file scelto per una risposta: tipo, dimensione, durata dei video.
async function checkMediaFile(f) {
  const type = f.type.split('/')[0];
  if (!['image', 'video', 'audio'].includes(type)) throw new Error('Formato non supportato.');
  if (f.size > CONFIG.MAX_FILE_MB * 1048576) throw new Error(`File troppo grande (max ${CONFIG.MAX_FILE_MB} MB).`);
  const url = URL.createObjectURL(f);
  if (type === 'image') { const el = document.createElement('img'); el.src = url; el.alt = 'anteprima'; return { media_type: 'photo', duration: null, el }; }
  const el = document.createElement(type); el.controls = true; el.preload = 'metadata'; el.src = url; if (type === 'video') el.playsInline = true;
  const dur = await new Promise((res) => { el.onloadedmetadata = () => res(el.duration); el.onerror = () => res(NaN); setTimeout(() => res(el.duration), 8000); });
  if (!Number.isFinite(dur)) throw new Error('Non riesco a leggere la durata del file. Prova con un altro formato (MP4, M4A, MP3).');
  if (type === 'video' && dur > CONFIG.MAX_VIDEO_SECONDS + 0.5) throw new Error(`Il video dura ${Math.round(dur)} s: il massimo è ${CONFIG.MAX_VIDEO_SECONDS}.`);
  return { media_type: type, duration: Math.round(dur), el };
}
const replyMedia = (r) => !r.url ? '' : r.media_type === 'photo' ? `<img src="${esc(r.url)}" alt="">`
  : r.media_type === 'video' ? `<video src="${esc(r.url)}" controls playsinline preload="metadata"></video>`
  : r.media_type === 'audio' ? `<audio src="${esc(r.url)}" controls preload="metadata"></audio>` : '';
const anonName = (g) => (g === 'f' ? 'Anonima' : g === 'm' ? 'Anonimo' : 'Anonimo/a');
const fmtDate = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

// Sotto un pin sbloccato: risposte ricevute (creatore) oppure modulo/stato della mia risposta (chi ha sbloccato).
async function replySection(t, slug, box) {
  if (!box) return;
  if (t.is_owner) {
    const rows = await B.repliesFor(slug);
    if (!document.body.contains(box)) return;
    if (!rows.length) {
      box.innerHTML = `<div class="card muted small center">${t.replies_enabled ? '💬 Ancora nessuna risposta. Quando qualcuno sblocca il pin e ti risponde, ti arriva un\'email.' : 'Le risposte a questo pin sono disattivate (puoi attivarle da Modifica).'}</div>`;
      return;
    }
    box.innerHTML = `<h2>💬 Risposte ricevute (${rows.length})</h2>` + rows.map((r) => `
      <div class="card reply" data-id="${esc(r.id)}">
        <div class="replyhead">${t.is_dating ? datingBadge(r.author_gender, 'sm') : ''}<b>${r.revealed ? esc(r.author_name || 'Utente') : anonName(r.author_gender)}</b>
          <span class="muted small">· ${fmtDate(r.created_at)}</span></div>
        <div class="media">${replyMedia(r)}</div>
        ${r.text_body ? `<div class="textbody">${linkify(r.text_body)}</div>` : ''}
        <div class="actions">
          ${r.revealed && r.author_id ? `<a class="btn" href="#/messaggi/${esc(r.author_id)}/${esc(slug)}">✉️ Scrivi${t.is_dating ? ` a ${esc(r.author_name || '')}` : ''}</a>${t.is_dating ? `<a class="btn ghost" href="#/foto/${esc(r.author_id)}">📷 Le sue foto</a>` : ''}`
            : r.owner_wants ? `<span class="muted small">Hai scelto 💗: ${r.author_wants ? '' : 'aspetti la sua scelta.'}</span>`
            : `<button data-a="want">💗 Voglio conoscerti${r.author_wants ? ' (ha già scelto te!)' : ''}</button>`}
          <button class="ghost danger" data-a="del">Elimina</button>
        </div></div>`).join('');
    box.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const card = b.closest('.reply'); const id = card.dataset.id;
      b.disabled = true;
      try {
        if (b.dataset.a === 'want') {
          const both = await B.replyWant(id);
          if (both) alertOk(card, '💗 Vi siete scelti! Ora vedi chi è e potete scrivervi.');
          return replySection(t, slug, box);
        }
        if (b.dataset.a === 'del') {
          if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; b.disabled = false; return; }
          await B.replyRemove(id); return replySection(t, slug, box);
        }
      } catch (err) { alertIn(card, errText(err)); b.disabled = false; }
    };
    return;
  }
  if (!t.replies_enabled) return;
  if (t.i_replied) {
    const r = (await B.myReplies()).find((x) => x.share_slug === slug);
    if (!r || !document.body.contains(box)) return;
    box.innerHTML = `<div class="card reply" data-id="${esc(r.id)}"><h2>✓ Hai risposto il ${fmtDate(r.created_at)}</h2>
      ${r.text_body ? `<div class="textbody">${linkify(r.text_body)}</div>` : `<p class="muted small">Hai inviato ${({ photo: 'una foto', video: 'un videomessaggio', audio: 'un audio' })[r.media_type] || 'una risposta'}.</p>`}
      ${myReplyStatus(r)}
      <div class="actions">${myReplyActions(r)}<button class="ghost danger" data-a="del">Ritira la risposta</button></div></div>`;
    bindMyReply(box, () => replySection({ ...t, i_replied: !box.dataset.removed }, slug, box));
    return;
  }
  box.innerHTML = `<div class="card"><h2>${t.is_dating ? '💌 Rispondi al biglietto' : '💬 Lascia una risposta a chi l\'ha creato'}</h2>
    <p class="muted small">${t.is_dating ? 'Resti anonimo/a: vi scoprite solo se scegliete entrambi «Voglio conoscerti».' : 'Riceverà un\'email e vedrà il tuo nome.'} 💡 Un videomessaggio registrato qui, adesso, vale più di mille parole.</p>
    <div class="row"><button type="button" class="ghost" data-c="v">🎥 Videomessaggio</button><button type="button" class="ghost" data-c="p">📷 Foto</button><button type="button" class="ghost" data-c="a">🎙 Audio</button></div>
    <input type="file" id="rfv" accept="video/*" capture="user" hidden><input type="file" id="rfp" accept="image/*" hidden><input type="file" id="rfa" accept="audio/*" hidden>
    <div id="rprev" class="preview"></div>
    <label for="rtxt">Messaggio <span class="muted small">(facoltativo se alleghi un file)</span></label>
    <textarea id="rtxt" maxlength="1000" rows="4" placeholder="${t.is_dating ? 'Es. Anch\'io salgo qui ogni estate…' : 'Es. Che bel ricordo, grazie!'}"></textarea>
    <div id="rm"></div><button class="full accent" id="rsend">Invia la risposta</button></div>`;
  const st = { file: null, media_type: null, duration: null };
  const pick = async (f) => {
    st.file = null; $('#rprev').innerHTML = ''; msg($('#rm'), '');
    if (!f) return;
    try { const m = await checkMediaFile(f); Object.assign(st, { file: f, media_type: m.media_type, duration: m.duration }); $('#rprev').append(m.el);
      $('#rprev').insertAdjacentHTML('beforeend', '<button type="button" class="ghost small-btn" id="rclear">✕ Togli il file</button>');
      $('#rclear').onclick = () => pick(null);
    } catch (err) { msg($('#rm'), errText(err)); }
  };
  box.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => $(`#rf${b.dataset.c}`).click(); });
  ['v', 'p', 'a'].forEach((k) => { $(`#rf${k}`).onchange = (e) => pick(e.target.files[0]); });
  $('#rsend').onclick = async () => {
    const text = $('#rtxt').value.trim();
    if (!st.file && !text) return msg($('#rm'), 'Scrivi un messaggio o allega un video, una foto o un audio.');
    const btn = $('#rsend'); btn.disabled = true; btn.textContent = st.file ? 'Carico il file…' : 'Invio…';
    try {
      const res = await B.addReply(slug, { file: st.file, media_type: st.file ? st.media_type : 'text', duration: st.duration, text });
      box.innerHTML = `<div class="msg ok">Risposta inviata ✓ ${res.mailed ? 'Il creatore del pin riceverà un\'email.' : ''}</div>`;
      setTimeout(() => replySection({ ...t, i_replied: true }, slug, box), 1500);
    } catch (err) { msg($('#rm'), errText(err)); btn.disabled = false; btn.textContent = 'Invia la risposta'; }
  };
}
const alertOk = (el, text) => el.insertAdjacentHTML('beforeend', `<div class="msg ok">${text}</div>`);
function myReplyStatus(r) {
  if (!r.is_dating) return '';
  if (r.revealed) return `<div class="msg ok">💗 Vi siete scelti! Il biglietto è di <b>${esc(r.owner_name || '')}</b>.</div>`;
  if (r.owner_wants && !r.author_wants) return '<div class="msg info">💗 Ha scelto di conoscerti! Tocca «Voglio conoscerti» per scoprirvi.</div>';
  if (r.author_wants) return '<p class="muted small">Hai scelto 💗: aspetti la sua scelta. Se sceglie anche lei/lui, vedrete i vostri nomi e potrete scrivervi.</p>';
  return '<p class="muted small">Restate anonimi finché non scegliete entrambi «Voglio conoscerti».</p>';
}
function myReplyActions(r) {
  if (r.revealed && r.owner_id) return `<a class="btn" href="#/messaggi/${esc(r.owner_id)}/${esc(r.share_slug)}">✉️ Scrivi</a>${r.is_dating ? `<a class="btn ghost" href="#/foto/${esc(r.owner_id)}">📷 Le sue foto</a>` : ''}`;
  if (r.is_dating && !r.author_wants) return '<button data-a="want">💗 Voglio conoscerti</button>';
  return '';
}
function bindMyReply(box, refresh) {
  box.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const card = b.closest('.reply'); const id = card.dataset.id;
    b.disabled = true;
    try {
      if (b.dataset.a === 'want') { await B.replyWant(id); return refresh(); }
      if (b.dataset.a === 'del') {
        if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma: ritira'; b.disabled = false; return; }
        await B.replyRemove(id); card.remove(); box.dataset.removed = '1'; return refresh();
      }
    } catch (err) { alertIn(card, errText(err)); b.disabled = false; }
  };
}

// ======================= UBI DATING (solo maggiorenni) =======================
const DATING_CONSENTS = [
  'Dichiaro di avere <b>almeno 18 anni</b> e che la data di nascita indicata è vera.',
  'Sono <b>l\'unico responsabile</b> di ciò che pubblico, dei messaggi che invio e degli incontri che decido di fare. Ubi non verifica l\'identità degli utenti e non è responsabile del loro comportamento.',
  'Non pubblicherò contenuti sessuali, offensivi o illegali, né immagini di altre persone senza il loro consenso, né dati che permettano di trovarmi (indirizzo, cognome, orari).',
  'Ho capito che <b>resto anonimo</b> finché io e l\'altra persona non scegliamo entrambi «Voglio conoscerti», e che posso ritirare risposte e biglietti in ogni momento.',
  'Incontrerò chi conosco qui solo in <b>luoghi pubblici</b>, avvisando una persona di fiducia, e segnalerò comportamenti scorretti a info@ubipin.it.',
  'Acconsento espressamente al trattamento della mia data di nascita, del mio genere (mostrato come pallino rosa o azzurro) e della mia partecipazione a Ubi Dating, come descritto nell\'<a href="privacy.html" target="_blank" rel="noopener">informativa privacy</a> (art. 9.2.a GDPR).',
];
function viewDatingJoin(prof) {
  setDatingTheme(true);
  const maxBirth = new Date(); maxBirth.setFullYear(maxBirth.getFullYear() - 18);
  const maxStr = maxBirth.toISOString().slice(0, 10);
  let gender = prof?.dating_gender || null;
  app.innerHTML = `
    <h1>💗 Ubi Dating</h1>
    <div class="card datingtips"><p><b>Incontra chi ama i tuoi stessi luoghi.</b></p>
      <ul class="small"><li>Lasci un <b>biglietto</b> (un video dal vivo, una foto, un testo) in un posto che ami: una vetta, un sentiero, una spiaggia, un rifugio.</li>
      <li>Lo può aprire solo chi è iscritto e <b>arriva fin lì</b>: avrete già una passione in comune.</li>
      <li>Chi lo apre può risponderti con un videomessaggio, una foto o un testo: ti arriva un'email.</li>
      <li>Restate <b>anonimi</b> finché non scegliete entrambi «Voglio conoscerti». Poi potete scrivervi.</li></ul></div>
    <div class="card"><form id="f">
      <label>Sono</label>
      <div class="seg" id="gen"><button type="button" data-g="f" class="${gender === 'f' ? 'on' : ''}">${datingBadge('f', 'sm')}Donna</button><button type="button" data-g="m" class="${gender === 'm' ? 'on' : ''}">${datingBadge('m', 'sm')}Uomo</button></div>
      <label for="birth">Data di nascita</label>
      <input id="birth" type="date" required max="${maxStr}" min="1900-01-01" value="${esc(prof?.dating_birth_date || '')}">
      <p class="muted small">Serve solo a verificare che tu sia maggiorenne: non viene mostrata a nessuno.</p>
      <h2 style="margin-top:18px">Consensi informati</h2>
      ${DATING_CONSENTS.map((c, i) => `<label class="inline"><input type="checkbox" required id="dc${i}"><span>${c}</span></label>`).join('')}
      <div id="m"></div>
      <button class="full accent" type="submit">Entra in Ubi Dating</button>
    </form></div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  $('#gen').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    gender = b.dataset.g; [...$('#gen').children].forEach((x) => x.classList.toggle('on', x === b));
  };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    if (!gender) return msg($('#m'), 'Scegli Donna o Uomo.');
    const birth = $('#birth').value;
    if (!birth || birth > maxStr) return msg($('#m'), 'Ubi Dating è riservato ai maggiorenni (18+).');
    if (DATING_CONSENTS.some((_, i) => !$(`#dc${i}`).checked)) return msg($('#m'), 'Per entrare devi accettare tutti i consensi.');
    const btn = e.submitter || $('#f button[type=submit]'); btn.disabled = true;
    try { await B.joinDating({ gender, birth }); location.hash = '#/dating'; route(); } catch (err) { msg($('#m'), authErr(err)); btn.disabled = false; }
  };
}
async function viewDating(user, prof) {
  setDatingTheme(true);
  app.innerHTML = `
    <div class="homebar"><h1>💗 Ubi Dating</h1>
      <button class="ghost" id="nearme" type="button" aria-label="Centra sulla mia posizione">📍</button></div>
    <p class="muted small">Biglietti lasciati da chi ama questi luoghi: ${datingBadge('f', 'sm')}lei, ${datingBadge('m', 'sm')}lui. Si aprono solo sul posto.</p>
    <div id="hmap" class="map home"></div>
    <div id="typebar" hidden></div>
    <div id="tagcloud" class="chips cloud"></div>
    <div id="mm"></div>
    <a href="#/new/dating" class="btn accent full">＋ Lascia un biglietto in un luogo che ami</a>
    <h2 style="margin-top:22px">I miei biglietti</h2><div id="mine"><p class="muted center">Carico…</p></div>
    <h2 style="margin-top:22px">📷 Le mie foto</h2><div id="dphotos"><p class="muted center">Carico…</p></div>
    <h2 style="margin-top:22px">Le mie risposte</h2><div id="myrep"><p class="muted center">Carico…</p></div>
    ${inviteBox(true)}
    <div class="card small"><b>🛡️ Sicurezza</b><ul>
      <li>Incontra le persone solo in luoghi pubblici e avvisa qualcuno di fiducia.</li>
      <li>Non condividere indirizzo, cognome o orari finché non ti senti sicuro/a.</li>
      <li>Comportamenti scorretti? Scrivi a <a href="mailto:info@ubipin.it">info@ubipin.it</a>.</li></ul></div>
    <p class="center small"><a href="#/">Torna a Ubi</a> · <a href="#" id="leave">Esci da Ubi Dating</a></p>`;
  homeMap({ dating: true });
  bindInvite(app);
  drawMyDatingPhotos($('#dphotos')).catch((err) => msg($('#dphotos'), errText(err)));
  $('#leave').onclick = async (e) => {
    e.preventDefault();
    if (e.target.dataset.confirm !== '1') { e.target.dataset.confirm = '1'; e.target.textContent = 'Conferma: esci da Ubi Dating (i tuoi biglietti restano finché non li elimini)'; return; }
    try { await B.leaveDating(); location.hash = '#/'; } catch (err) { msg($('#mm'), errText(err)); }
  };
  try {
    const mine = (await B.listMine()).filter((c) => c.is_dating);
    $('#mine').innerHTML = mine.length ? mine.map((c) => `
      <div class="card"><div class="item"><div class="ico">${datingBadge(prof.dating_gender)}</div>
        <div><div class="t">${esc(c.title)}</div><div class="meta">${fmtDate(c.created_at)}</div></div></div>
        <div class="actions"><a class="btn" href="#/c/${esc(c.share_slug)}">Apri e vedi le risposte</a><a class="btn ghost" href="#/edit/${esc(c.share_slug)}">Modifica</a><button class="danger" data-i="${mine.indexOf(c)}">Elimina</button></div></div>`).join('')
      : '<div class="card center muted">Non hai ancora lasciato biglietti.<br>Scegli un luogo che ami davvero.</div>';
    $('#mine').onclick = async (e) => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma eliminazione'; return; }
      b.disabled = true;
      try { await B.remove(mine[+b.dataset.i]); route(); } catch (err) { alertIn(b.closest('.card'), errText(err)); b.disabled = false; }
    };
  } catch (err) { msg($('#mine'), errText(err)); }
  const loadMy = async () => {
    try {
      const reps = (await B.myReplies()).filter((r) => r.is_dating);
      $('#myrep').innerHTML = reps.length ? reps.map((r) => `
        <div class="card reply" data-id="${esc(r.id)}"><div class="t"><a href="#/c/${esc(r.share_slug)}">${esc(r.title)}</a></div>
          <div class="meta muted small">Hai risposto il ${fmtDate(r.created_at)}</div>
          ${myReplyStatus(r)}<div class="actions">${myReplyActions(r)}<button class="ghost danger" data-a="del">Ritira</button></div></div>`).join('')
        : '<div class="card center muted small">Quando sblocchi un biglietto e rispondi, lo ritrovi qui.</div>';
      bindMyReply($('#myrep'), loadMy);
    } catch (err) { msg($('#myrep'), errText(err)); }
  };
  loadMy();
}

// ======================= PROFILO, AUTORE, MESSAGGI =======================
function avatarHtml(path, name, size = 40) {
  const url = path ? B.avatarUrl(path) : null;
  const initial = esc((name || '?').trim().charAt(0).toUpperCase() || '?');
  return url ? `<img class="avatar" src="${esc(url)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar ph" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 2.2)}px">${initial}</span>`;
}
function authorLine(t, user) {
  const prof = user && t.author_id ? `href="#/u/${esc(t.author_id)}"` : '';
  return `<div class="authorline">${prof ? `<a ${prof}>` : ''}${avatarHtml(t.author_avatar, t.author, 36)}${prof ? '</a>' : ''}
    <span>da ${prof ? `<a ${prof}><b>${esc(t.author)}</b></a>` : `<b>${esc(t.author)}</b>`}</span>
    ${user && !t.is_owner && t.author_id ? `<a class="btn ghost small-btn" href="#/messaggi/${esc(t.author_id)}/${esc(location.hash.split('/')[2] || '')}">✉️ Scrivi</a>` : ''}</div>`;
}
async function refreshInbox() {
  const a = $('#inbox'); if (!a) return;
  let u = null; try { u = await B.user(); } catch { /* niente */ }
  a.hidden = !u; if ($('#mybtn')) $('#mybtn').hidden = !u; if (!u) return;
  try { const n = await B.unreadCount(); $('#unread').textContent = n > 9 ? '9+' : String(n); $('#unread').hidden = !n; } catch { $('#unread').hidden = true; }
}
// Riduce la foto a 400 px e la ricodifica in JPEG: più leggera e senza dati nascosti (GPS, modello del telefono…).
function resizeImage(file, max = 400) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.round(Math.min(max, img.width, img.height));
      const c = document.createElement('canvas'); c.width = side; c.height = side;   // ritaglio quadrato centrato
      const sx = (img.width - Math.min(img.width, img.height)) / 2, sy = (img.height - Math.min(img.width, img.height)) / 2;
      c.getContext('2d').drawImage(img, sx, sy, Math.min(img.width, img.height), Math.min(img.width, img.height), 0, 0, side, side);
      c.toBlob((b) => (b ? res(b) : rej(new Error('Immagine non leggibile'))), 'image/jpeg', 0.85);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => rej(new Error('Formato immagine non supportato: prova con JPG o PNG.'));
    img.src = url;
  });
}
const normInstagram = (v) => String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
function normPhone(v) {
  let x = String(v || '').replace(/[^\d+]/g, '');
  if (!x) return '';
  if (x.startsWith('00')) x = '+' + x.slice(2);
  if (!x.startsWith('+') && /^3\d{8,9}$/.test(x)) x = '+39' + x;   // cellulare italiano senza prefisso
  return x;
}

async function viewMyProfile(prof) {
  const st = { blob: null, remove: false };
  const p = prof || {};
  app.innerHTML = `
    <h1>Il mio profilo</h1>
    <p class="muted">Foto, presentazione e contatti sono visibili a chi può vedere i tuoi pin. I contatti sono tutti facoltativi.</p>
    <div class="card center">
      <div id="av">${avatarHtml(p.avatar_path, p.display_name, 110)}</div>
      <div class="actions" style="justify-content:center">
        <label class="btn ghost" style="flex:0 1 auto">📷 Scegli foto<input id="avf" type="file" accept="image/*" hidden></label>
        <button class="danger" id="avx" type="button" style="flex:0 1 auto"${p.avatar_path ? '' : ' hidden'}>Togli foto</button>
      </div>
    </div>
    <div class="card"><form id="f">
      <label for="name">Nome visibile</label><input id="name" required maxlength="60" value="${esc(p.display_name || '')}">
      <label for="bio">Chi sono (max 300 caratteri)</label>
      <textarea id="bio" maxlength="300" rows="3" placeholder="Es. Guida turistica a Roma, appassionato di fotografia e trekking.">${esc(p.bio || '')}</textarea>
      <h2 style="margin-top:18px">Contatti pubblici (facoltativi)</h2>
      <label for="web">Sito web</label><input id="web" inputmode="url" placeholder="https://…" value="${esc(p.contact_website || '')}">
      <label for="ig">Instagram</label><input id="ig" placeholder="@nomeutente" value="${esc(p.contact_instagram ? '@' + p.contact_instagram : '')}">
      <label for="wa">WhatsApp</label><input id="wa" inputmode="tel" placeholder="+39 333 1234567" value="${esc(p.contact_whatsapp || '')}">
      <label for="em">Email pubblica</label><input id="em" type="email" placeholder="contatti@esempio.it" value="${esc(p.contact_email || '')}">
      <p class="muted small">Anche senza contatti pubblici, gli altri possono scriverti con i <b>messaggi di Ubi</b>, senza vedere la tua email.</p>
      <div id="m"></div>
      <button class="full accent" type="submit">Salva il profilo</button>
    </form></div>
    <a class="btn ghost full" href="#/rubrica">📒 La mia rubrica</a>
    <p class="center"><a href="#/u/${esc(p.id || '')}">Vedi come ti vedono gli altri</a> · <a href="#/">Torna alla mappa</a></p>
    <p class="center small"><a href="privacy.html">Informativa privacy</a> · Per eliminare l'account scrivi a <a href="mailto:info@ubipin.it">info@ubipin.it</a></p>`;
  $('#avf').onchange = async () => {
    const f = $('#avf').files[0]; if (!f) return;
    try {
      st.blob = await resizeImage(f); st.remove = false;
      $('#av').innerHTML = `<img class="avatar" src="${URL.createObjectURL(st.blob)}" alt="" style="width:110px;height:110px">`; $('#avx').hidden = false;
    } catch (err) { msg($('#m'), errText(err)); }
  };
  $('#avx').onclick = () => { st.blob = null; st.remove = true; $('#av').innerHTML = avatarHtml(null, $('#name').value, 110); $('#avx').hidden = true; };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const web = $('#web').value.trim() ? extractUrl($('#web').value) : '';
    if (web === null) return msg($('#m'), 'Il sito deve essere un indirizzo valido (https://…).');
    const ig = normInstagram($('#ig').value);
    if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) return msg($('#m'), 'Nome Instagram non valido.');
    const wa = normPhone($('#wa').value);
    if (wa && !/^\+\d{8,15}$/.test(wa)) return msg($('#m'), 'Numero WhatsApp non valido: usa il prefisso internazionale, es. +39 333 1234567.');
    const em = $('#em').value.trim().toLowerCase();
    if (em && !EMAIL_RE.test(em)) return msg($('#m'), 'Email pubblica non valida.');
    const btn = $('#f button[type=submit]'); btn.disabled = true; btn.textContent = 'Salvo…';
    try {
      await B.saveMyProfile({ display_name: $('#name').value.trim(), bio: $('#bio').value.trim(), website: web, instagram: ig, whatsapp: wa, email: em,
        avatarBlob: st.blob, removeAvatar: st.remove });
      msg($('#m'), 'Profilo salvato ✓', 'ok');
    } catch (err) { msg($('#m'), errText(err)); }
    btn.disabled = false; btn.textContent = 'Salva il profilo';
  };
}

async function viewBook() {
  let list = [], editing = null, q = '';
  app.innerHTML = `
    <h1>📒 La mia rubrica</h1>
    <p class="muted">I contatti a cui mandi i pin più spesso. Quando crei un pin con "Persone scelte" li trovi come pulsanti da toccare. La rubrica la vedi solo tu.</p>
    <div class="card"><form id="f">
      <h2 id="ftitle">Nuovo contatto</h2>
      <label for="cname">Nome</label><input id="cname" maxlength="60" required placeholder="Es. Maria">
      <label for="cemail">Email</label><input id="cemail" type="email" required placeholder="maria@esempio.it">
      <p class="muted small">Usa l'email con cui la persona accede (o accederà) a Ubi.</p>
      <div id="m"></div>
      <div class="row"><button class="accent" type="submit" id="csave">Aggiungi</button><button class="ghost" type="button" id="ccancel" hidden>Annulla</button></div>
    </form></div>
    <input id="q" type="search" placeholder="🔎 Cerca nella rubrica" style="margin:6px 0 4px">
    <div id="list"><p class="muted center">Carico…</p></div>
    <p class="center"><a href="#/">Torna alla mappa</a></p>`;
  const resetForm = () => { editing = null; $('#f').reset(); $('#ftitle').textContent = 'Nuovo contatto'; $('#csave').textContent = 'Aggiungi'; $('#ccancel').hidden = true; };
  const draw = () => {
    const rows = list.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q));
    $('#list').innerHTML = !list.length ? '<div class="card center muted">Nessun contatto. Aggiungi il primo qui sopra.</div>'
      : !rows.length ? '<p class="muted center">Nessun risultato.</p>'
      : `<p class="muted small">${list.length} contatt${list.length === 1 ? 'o' : 'i'}</p>` + rows.map((c) => `
        <div class="card item" data-id="${esc(c.id)}">${avatarHtml(null, c.name, 38)}
          <div style="flex:1;min-width:0"><div class="t">${esc(c.name)}</div><div class="meta ellipsis">${esc(c.email)}</div></div>
          <button class="ghost" data-a="edit" style="min-height:38px;padding:6px 10px">✏️</button>
          <button class="danger" data-a="del" style="min-height:38px;padding:6px 10px">🗑</button></div>`).join('');
  };
  const load = async () => { try { list = await B.listContacts(); draw(); } catch (err) { msg($('#list'), errText(err)); } };
  $('#q').oninput = () => { q = $('#q').value.trim().toLowerCase(); draw(); };
  $('#ccancel').onclick = () => { resetForm(); msg($('#m'), ''); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#cname').value.trim(), email = $('#cemail').value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return msg($('#m'), 'Email non valida.');
    try {
      await B.saveContact({ id: editing, name, email });
      msg($('#m'), editing ? 'Contatto aggiornato ✓' : `${esc(name)} aggiunto ✓`, 'ok'); resetForm(); load();
    } catch (err) { msg($('#m'), authErr(err)); }
  };
  $('#list').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = list.find((x) => x.id === b.closest('.card').dataset.id); if (!c) return;
    if (b.dataset.a === 'edit') {
      editing = c.id; $('#cname').value = c.name; $('#cemail').value = c.email;
      $('#ftitle').textContent = 'Modifica contatto'; $('#csave').textContent = 'Salva'; $('#ccancel').hidden = false; window.scrollTo(0, 0);
    }
    if (b.dataset.a === 'del') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; return; }
      try { await B.deleteContact(c.id); load(); } catch (err) { alertIn(b.closest('.card'), errText(err)); }
    }
  };
  load();
}

async function viewAuthor(id) {
  app.innerHTML = '<p class="muted center">Carico il profilo…</p>';
  let a, pins;
  try { a = await B.getAuthor(id); pins = a ? await B.authorPins(id) : []; } catch (err) { app.innerHTML = `<div class="msg err">${errText(err)}</div>`; return; }
  if (!a) { app.innerHTML = '<div class="card center"><h2>Profilo non disponibile</h2><p class="muted">Puoi vedere il profilo di chi ha pin che tu puoi aprire.</p><a class="btn" href="#/">Torna alla mappa</a></div>'; return; }
  const contacts = [
    a.website && `<a class="btn ghost" href="${esc(a.website)}" target="_blank" rel="noopener noreferrer">🌐 ${esc(hostOf(a.website))}</a>`,
    a.instagram && `<a class="btn ghost" href="https://www.instagram.com/${esc(a.instagram)}/" target="_blank" rel="noopener noreferrer">📸 @${esc(a.instagram)}</a>`,
    a.whatsapp && `<a class="btn ghost" href="https://wa.me/${esc(a.whatsapp.replace('+', ''))}" target="_blank" rel="noopener noreferrer">💬 WhatsApp ${esc(a.whatsapp)}</a>`,
    a.email && `<a class="btn ghost" href="mailto:${esc(a.email)}">✉ ${esc(a.email)}</a>`,
  ].filter(Boolean);
  app.innerHTML = `
    <div class="card center profile">
      ${avatarHtml(a.avatar_path, a.display_name, 110)}
      <h1>${esc(a.display_name || 'Utente')}</h1>
      ${a.bio ? `<p class="bio">${linkify(a.bio)}</p>` : ''}
      ${contacts.length ? `<div class="contacts">${contacts.join('')}</div>` : ''}
      ${a.is_me ? '<a class="btn full" href="#/profilo">✏️ Modifica il mio profilo</a>'
        : a.can_message ? `<a class="btn full accent" style="background:var(--accent)" href="#/messaggi/${esc(a.id)}">✉️ Scrivi a ${esc(a.display_name || '')}</a>` : ''}
    </div>
    <h2>${a.is_me ? 'I tuoi pin visibili agli altri' : `I pin di ${esc(a.display_name || '')}`}</h2>
    ${pins.length ? pins.map((c) => `<a class="card item pinrow" href="#/c/${esc(c.share_slug)}"><div class="ico">${badge(c.media_type)}</div>
        <div><div class="t">${esc(c.title)}</div>${tagChips(c.tags)}</div></a>`).join('') : '<p class="muted">Nessun pin da mostrare.</p>'}
    <p class="center"><a href="#/">Torna alla mappa</a></p>`;
}

async function viewInbox() {
  app.innerHTML = '<h1>Messaggi</h1><div id="list"><p class="muted center">Carico…</p></div><p class="center"><a href="#/">Torna alla mappa</a></p>';
  let rows;
  try { rows = await B.conversations(); } catch (err) { msg($('#list'), errText(err)); return; }
  $('#list').innerHTML = rows.length ? rows.map((c) => `
    <a class="card item conv" href="#/messaggi/${esc(c.other_id)}">
      ${avatarHtml(null, c.other_name, 42)}
      <div style="flex:1;min-width:0"><div class="t">${esc(c.other_name || 'Utente')}${c.unread ? ` <span class="pill">${c.unread}</span>` : ''}</div>
        <div class="meta ellipsis">${c.last_from_me ? 'Tu: ' : ''}${esc(c.last_body)}</div></div></a>`).join('')
    : '<div class="card center muted">Nessun messaggio.<br>Apri il profilo di un autore o un suo pin e tocca <b>✉️ Scrivi</b>.</div>';
}

async function viewThread(other, slug) {
  app.innerHTML = '<p class="muted center">Carico…</p>';
  let a, t = null, msgs;
  try {
    a = await B.getAuthor(other);
    if (slug) t = await B.teaser(slug).catch(() => null);
    msgs = await B.thread(other);
    await B.markRead(other); refreshInbox();
  } catch (err) { app.innerHTML = `<div class="msg err">${errText(err)}</div>`; return; }
  if (!a) { app.innerHTML = '<div class="card center"><h2>Conversazione non disponibile</h2><a class="btn" href="#/messaggi">Messaggi</a></div>'; return; }
  const me = (await B.user()).id;
  const bubbles = () => msgs.map((m) => `<div class="bubble ${m.sender_id === me ? 'mine' : ''}">${linkify(m.body)}
      <span class="when">${new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>`).join('');
  app.innerHTML = `
    <div class="authorline"><a href="#/u/${esc(other)}">${avatarHtml(a.avatar_path, a.display_name, 40)}</a>
      <h1 style="margin:0"><a href="#/u/${esc(other)}" style="color:inherit;text-decoration:none">${esc(a.display_name || 'Utente')}</a></h1></div>
    ${t ? `<div class="msg info">A proposito di: <a href="#/c/${esc(slug)}"><b>${esc(t.title)}</b></a></div>` : ''}
    <div class="thread" id="thread">${msgs.length ? bubbles() : '<p class="muted center">Scrivi il primo messaggio.</p>'}</div>
    ${a.can_message ? `<form id="f" class="card"><textarea id="body" maxlength="1000" rows="3" placeholder="Scrivi un messaggio…" required></textarea>
      <div id="m"></div><button class="full" type="submit">Invia</button></form>` : '<p class="muted">Non puoi più scrivere a questo utente.</p>'}
    <p class="center"><a href="#/messaggi">Tutti i messaggi</a></p>`;
  const th = $('#thread'); th.scrollTop = th.scrollHeight;
  if (!$('#f')) return;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('#body').value.trim(); if (!body) return;
    const btn = $('#f button'); btn.disabled = true;
    try {
      await B.sendMessage(other, body, msgs.length ? null : t?.id);
      msgs = await B.thread(other); $('#thread').innerHTML = bubbles(); $('#body').value = ''; th.scrollTop = th.scrollHeight; msg($('#m'), '');
    } catch (err) { msg($('#m'), errText(err)); }
    btn.disabled = false;
  };
}

// ======================= GUIDA E IDEE (FAQ) =======================
const FAQ_GUIDE = [
  ['Cos’è Ubi?', `<p>Ubi ti permette di <b>lasciare un contenuto in un luogo</b>: una foto, un video (fino a 60 secondi), un audio, un testo o un link. Chi lo riceve lo vede sulla mappa, ma può <b>aprirlo solo quando arriva lì</b> con il telefono.</p>`],
  ['📍 La posizione non funziona? Come attivarla', `<p>Se Ubi dice che <b>non riesce a trovare la tua posizione</b>, di solito è perché il telefono non ha ancora dato il permesso a Safari (o a Chrome). Si sistema una volta sola.</p>
    <p><b>iPhone e iPad (Safari)</b></p>
    <ol>
      <li>Apri <b>Impostazioni</b> (l'icona grigia con l'ingranaggio ⚙️).</li>
      <li>Tocca <b>Privacy e sicurezza</b> → <b>Localizzazione</b> e controlla che l'interruttore in alto sia <b>attivo</b>.</li>
      <li>Nella stessa pagina scorri l'elenco fino a <b>Siti web di Safari</b>: scegli <b>Mentre usi l'app</b> e attiva <b>Posizione esatta</b> (senza, la posizione è troppo approssimativa per sbloccare i pin).</li>
      <li>Torna a <b>Impostazioni</b> e scendi fino a <b>Safari</b> (sui modelli più recenti: <b>Impostazioni → App → Safari</b>).</li>
      <li>Scorri <b>fino in fondo</b>, alla sezione <b>Impostazioni per i siti web</b>, tocca <b>Posizione</b> e scegli <b>Chiedi</b> oppure <b>Consenti</b>.</li>
      <li>Torna su Safari, <b>ricarica ubipin.it</b> e, quando compare la richiesta, tocca <b>Consenti</b>.</li>
    </ol>
    <p class="muted small">Scorciatoia: con ubipin.it aperto in Safari, tocca l'icona a sinistra dell'indirizzo (<b>aA</b> o ☰) → <b>Impostazioni sito web</b> → <b>Posizione</b> → <b>Consenti</b>. Se usi Ubi dall'icona nella schermata Home valgono le stesse impostazioni di Safari: dopo averle cambiate chiudi Ubi e riaprila.</p>
    <p><b>Android (Chrome)</b></p>
    <ol>
      <li>Scorri dall'alto dello schermo e attiva <b>Posizione</b> (o da <b>Impostazioni → Posizione</b>, con <b>Precisione della posizione</b> attiva).</li>
      <li>Con ubipin.it aperto in Chrome, tocca l'icona a sinistra dell'indirizzo → <b>Autorizzazioni</b> (o <b>Impostazioni sito</b>) → <b>Posizione</b> → <b>Consenti</b>.</li>
      <li>Ricarica la pagina.</li>
    </ol>
    <p><b>Il permesso c'è ma la posizione è imprecisa?</b> Esci all'aperto, lontano da palazzi alti, tieni acceso il Wi-Fi (aiuta anche se non sei connesso) e aspetta qualche secondo: per sbloccare serve una precisione di almeno 100 metri.</p>`],
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
    <li><b>Dove</b>, in quattro modi: <i>Usa la mia posizione</i> se sei sul posto; <i>cerca un indirizzo</i> (es. <code>Alghero, via Sant'Antioco</code>) e poi trascina lo spillo nel punto esatto; scrivi le <i>coordinate</i> (es. <code>41.8902, 12.4922</code>); oppure <i>tocca la mappa</i> e trascina lo spillo.</li>
    <li><b>Raggio</b>: da quanti metri si sblocca (consigliato 30–50 m; in città il GPS può sbagliare di qualche decina di metri).</li>
    <li><b>Titolo</b> e <b>indizio</b>: l'indizio si vede <i>prima</i> dello sblocco e aiuta a trovare il punto.</li>
    <li><b>Tag</b>: tocca quelli adatti o scrivine di tuoi (max 8). Servono a ritrovare i contenuti con i filtri.</li>
    <li><b>Chi può aprirlo</b>: <i>Persone scelte</i> (tocca i nomi della tua <b>rubrica</b> o scrivi le email), <i>Tutti</i> o <i>Solo io</i>. Puoi aggiungere una <b>password</b>.</li>
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
  ['6b · Il tuo profilo e i messaggi', `<ol>
    <li>Tocca <b>👤 Profilo</b> in alto (o la tua foto in home): aggiungi una <b>foto</b>, una breve <b>presentazione</b> e, se vuoi, i <b>contatti pubblici</b> (sito, Instagram, WhatsApp, email). Sono tutti facoltativi.</li>
    <li>Chi apre un tuo pin vede la tua foto e il tuo nome: toccandoli apre il tuo <b>profilo</b>, con i contatti e l'elenco dei tuoi pin pubblici.</li>
    <li>Nella scheda di un pin tocca <b>✉️ Scrivi</b> per mandare un messaggio privato all'autore. La tua email non viene mostrata.</li>
    <li><b>📒 Rubrica</b> (dalla home o dal profilo): salva nome ed email delle persone a cui mandi i pin; nella creazione li scegli con un tocco. Puoi anche aggiungere un contatto al volo dal modulo del pin. La rubrica la vedi solo tu.</li>
    <li>I messaggi arrivano nella busta <b>✉️</b> in alto: il numero arancione indica quelli da leggere.</li>
    <li>Puoi scrivere a chi ha pin che puoi vedere, e rispondere a chi ti ha scritto.</li></ol>`],
  ['6c · Rispondere a un pin', `<ol>
    <li>Dopo aver <b>sbloccato</b> un pin sul posto, sotto il contenuto trovi <b>Lascia una risposta</b>: un testo, una foto, un audio o un <b>videomessaggio</b> registrato lì, in quel momento.</li>
    <li>Chi ha creato il pin riceve un'<b>email</b> e trova la risposta aprendo il pin.</li>
    <li>Quando crei un pin puoi disattivare le risposte (casella in fondo, sezione 4).</li>
    <li>Puoi ritirare la tua risposta quando vuoi; il creatore può eliminarla.</li></ol>`],
  ['💗 Ubi Dating', `<ol>
    <li>Riservato ai <b>maggiorenni</b>. Si entra da <b>💗 Ubi Dating</b> in home: indichi genere e data di nascita e accetti i consensi. Sei responsabile di ciò che pubblichi e degli incontri che fai.</li>
    <li>Lasci un <b>biglietto</b> in un luogo che ami (meglio un video dal vivo): sulla mappa appare con un pallino <b>rosa</b> (lei) o <b>azzurro</b> (lui), visibile a tutti.</li>
    <li>Lo può aprire e rispondere solo chi è iscritto e <b>arriva sul posto</b>: avrete già una passione in comune.</li>
    <li>Siete <b>anonimi</b>: vi scoprite solo se entrambi toccate <b>«Voglio conoscerti»</b>. Da lì vedete i nomi e potete scrivervi.</li>
    <li>In <b>Le mie foto</b> puoi caricare fino a <b>6 foto</b>: le vede solo chi ha fatto con te il doppio sì («📷 Le sue foto»).</li>
    <li>Incontratevi solo in luoghi pubblici e segnalate abusi a info@ubipin.it.</li></ol>`],
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
    <li>File: massimo <b>50 MB</b>, <b>uno per contenuto</b>. Testo: <b>2000</b> caratteri. Tag: <b>8</b> per contenuto.</li>
    <li><b>Più foto nello stesso pin?</b> Crea un album condiviso e lascia il suo <i>Link</i>:<br>
      Google Foto: apri l'album → <b>Condividi</b> → <b>Crea link</b> → copia.<br>
      iPhone: app Foto → album condiviso → <b>Persone</b> → attiva <b>Sito web pubblico</b> → copia il link.<br>
      Google Drive: cartella → <b>Condividi</b> → «Chiunque abbia il link» → copia.<br>
      Il link si apre solo a chi sblocca il pin, ma chiunque lo riceva in altro modo può vederlo: non condividerlo altrove.</li>
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
  ['✈️ Viaggi e quotidiano', 'ricordo, natura, mare, montagna, trekking, sentiero, passeggiata, mappa interattiva, cibo', `<ul>
    <li>Un diario di viaggio: un contenuto "Solo io" in ogni luogo visitato, da ritrovare sulla mappa.</li>
    <li>Il piatto da ordinare in quella trattoria, il sentiero giusto per la cima, il punto migliore per il tramonto.</li>
    <li><b>Trekking</b>: all'inizio del sentiero lascia un <i>Link</i> alla mappa interattiva del percorso (Wikiloc, Komoot…) e, lungo la strada, consigli sui bivi e sui punti panoramici.</li>
    <li>Lo stesso luogo nelle quattro stagioni: torna e lascia una foto ogni volta.</li></ul>`],
];

// Pagina di arrivo dal link "non voglio più ricevere avvisi" presente nelle email.
function viewOptout(esito) {
  const T = {
    ok: ['✓ Fatto', 'Non riceverai più avvisi email da Ubi. Potrai comunque aprire i contenuti che ti vengono condivisi, entrando in Ubi.'],
    'non-valido': ['Link non valido', 'Il link di disiscrizione è incompleto o è stato modificato. Usa quello presente in fondo all\'email.'],
    errore: ['Qualcosa è andato storto', 'Non siamo riusciti a registrare la richiesta. Riprova tra qualche minuto.'],
  };
  const [t, d] = T[esito] || T['non-valido'];
  app.innerHTML = `<div class="hero"><span class="pin"></span><h1>${t}</h1><p class="muted">${d}</p></div>
    <a class="btn full" href="#/">Vai a Ubi</a>`;
}

function viewFaq(arg) {
  stopWatch();
  const det = ([q, a], open = false) => {
    const isGeo = q.startsWith('📍 La posizione');
    return `<details class="faq"${isGeo ? ' id="faq-posizione"' : ''}${open || (isGeo && arg === 'posizione') ? ' open' : ''}><summary>${q}</summary><div>${a}</div></details>`;
  };
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
  if (arg === 'posizione') $('#faq-posizione').scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
}

// ======================= AVVIO =======================
(async () => {
  try {
    B = CONFIG.SUPABASE_URL ? await supabaseBackend() : demoBackend();
    await B.init();
    $('#mode').hidden = !B.demo;
    if ($('#ver')) $('#ver').textContent = APP_VERSION;
    window.addEventListener('hashchange', route);
    appReady = true;
    await route();
  } catch (err) {
    app.innerHTML = `<div class="msg err">Errore di avvio: ${errText(err)}</div>`;
  }
})();
