// Ubi — web app (Fase 1). Nessun build: file statici, librerie da CDN.
import { CONFIG } from './config.js?v=202611210045';
import { qrMatrix } from './qr.js?v=1';
import { LANG, LOC, setLang, startI18n } from './i18n.js?v=202611210045';
startI18n();

// Versione mostrata accanto al logo: aumentarla a ogni pubblicazione.
const APP_VERSION = 'v.75';
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
const iconBadge = (ch, color, title, extra = '') => `<span class="tico ${extra}" style="background:${color}" title="${title}">${ch}</span>`;
// Monumenti e curiosità (tag #curiosità): pallino «M»
const MONU = { l: 'M', c: '#9a6b2f', n: 'Monumenti' };
const isMonu = (c) => (c.tags || []).includes('curiosità');
const monuBadge = (extra = '') => `<span class="tico ${extra}" style="background:${MONU.c}" title="Monumento o curiosità">M</span>`;
// Luoghi degli scrittori (tag #letteratura): pallino con il libro
const isLit = (c) => (c.tags || []).includes('letteratura');
// Caccia al tesoro: forziere dorato con il numero della tappa (si distingue dai pallini rossi)
const CHEST_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5C3 6.9 5.9 4 9.5 4h5C18.1 4 21 6.9 21 10.5V11H3z" fill="#8a4b12"/><path d="M3 11h18v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="#a85d1a"/><path d="M3 11h18v2.2H3z" fill="#5e3209"/><path d="M7 4.6v15.4M17 4.6v15.4" stroke="#ffd96a" stroke-width="1.6"/><rect x="10" y="10" width="4" height="5" rx="1" fill="#ffd96a" stroke="#5e3209" stroke-width=".8"/></svg>';
const chestBadge = (step, extra = '') => `<span class="tico chest ${extra}" title="Caccia al tesoro${step ? ` · tappa ${step}` : ''}">${CHEST_SVG}${step ? `<b class="cnum">${step}</b>` : ''}</span>`;
const litBadge = (extra = '') => `<span class="tico ${extra}" style="background:#1f6f5c;font-size:.8em" title="Luogo di uno scrittore">📖</span>`;
const pinBadge = (c, extra = '') => (c.hunt_step && !c.is_dating ? chestBadge(c.hunt_step, extra) : isLit(c) && !c.is_dating ? litBadge(extra) : isMonu(c) && !c.is_dating ? monuBadge(extra) : c.is_dating ? datingBadge(c.gender, extra)
  : c.unlock_at && Date.parse(c.unlock_at) > Date.now() ? iconBadge('⏳', '#8a6d3b', 'Capsula del tempo', extra)
  : badge(c.media_type, extra));
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
// PostgREST: una funzione «setof jsonb» può arrivare come [{nome_funzione: {...}}] oppure [{...}]
const unwrapRow = (fn) => (r) => (r && typeof r === 'object' && r[fn] && Object.keys(r).length === 1 ? r[fn] : r);
const shareUrl = (slug) => `${location.origin}${location.pathname}#/c/${slug}`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
};
// Risposte delle cacce: maiuscole, accenti, apostrofi e spazi non contano («la Chiesa» = «LA CHIESA» = «chiesa»? no: le parole devono esserci tutte)
const normAnswer = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// ---------- Caccia al tesoro: schermate «Esatto!/Sbagliato» e modalità caccia sulla mappa ----------
const T2 = (it, en) => (LANG === 'en' ? en : it);   // testi con numeri dentro: li scrivo già nelle due lingue
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* niente vibrazione */ } };
// Tappe fatte da me, per caccia (solo su questo telefono): servono a colorarle di verde sulla mappa
const huntTrail = (id) => { try { return JSON.parse(store.get(`ubi_hunt_${id}`)) || { done: {} }; } catch { return { done: {} }; } };
function huntRecord(t, slug) {
  const h = huntTrail(t.hunt_id);
  h.title = t.hunt_title || h.title || ''; h.steps = t.hunt_steps || h.steps || 0;
  h.done[t.hunt_step] = { slug, lat: t.lat, lng: t.lng };
  store.set(`ubi_hunt_${t.hunt_id}`, JSON.stringify(h));
}
const huntFocus = () => { try { return JSON.parse(store.get('ubi_hunt_focus')); } catch { return null; } };
// done = la tappa «step» è già sbloccata (verde con ✓)
const stepBar = (step, steps, done = false) => { const lbl = done ? T2(`Tappa ${step} di ${steps} ✓`, `Stage ${step} of ${steps} ✓`) : T2(`Tappa ${step} di ${steps}`, `Stage ${step} of ${steps}`);
  return `<div class="hsteps" aria-label="${lbl}">${Array.from({ length: steps }, (_, i) => { const ok = i + 1 < step || (done && i + 1 === step);
    return `<span class="${ok ? 'ok' : i + 1 === step ? 'now' : ''}">${ok ? '✓' : i + 1}</span>`; }).join('<i></i>')}</div><p class="hsteplbl">${lbl}</p>`; };
// Schermata intera: kind = 'ok' (verde) o 'bad' (rosso). Si chiude col pulsante; onClose dopo.
function huntOverlay({ kind, icon, title, sub = '', step, steps, button, onClose }) {
  document.querySelectorAll('.hov').forEach((e) => e.remove());
  const o = document.createElement('div');
  o.className = `hov ${kind}`; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  o.innerHTML = `<div class="hovin">${kind === 'ok' ? '<div class="confetti" aria-hidden="true">' + '<i></i>'.repeat(18) + '</div>' : ''}
    <div class="hovico">${icon}</div><h1>${title}</h1>${sub ? `<p class="hovsub">${sub}</p>` : ''}
    ${step && steps > 1 ? stepBar(step, steps, kind === 'ok') : ''}
    <button class="full hovbtn" type="button">${button}</button></div>`;
  document.body.appendChild(o);
  buzz(kind === 'ok' ? [60, 40, 60, 40, 160] : [220]);
  const b = o.querySelector('.hovbtn'); setTimeout(() => b.focus(), 50);
  b.onclick = () => { o.classList.add('out'); setTimeout(() => o.remove(), 220); onClose && onClose(); };
}
function huntToast(text) {
  const d = document.createElement('div'); d.className = 'htoast'; d.textContent = text;
  document.body.appendChild(d); buzz([40, 30, 40]);
  setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3700);
}
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
      return must(await sb.from('contents').select('id,share_slug,title,hint,media_type,media_path,visibility,created_at,password_hash,tags,is_dating,replies_enabled,unlock_at,open_anywhere,hunt_id,hunt_step')
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
        unlock_at: d.unlock_at || null, open_anywhere: !!(d.unlock_at && d.open_anywhere), hunt_id: d.hunt_id || null, hunt_step: d.hunt_id ? d.hunt_step : null,
        text_body: d.text_body || null, tags: d.tags || [], is_dating: !!d.is_dating, replies_enabled: d.replies_enabled !== false,
      };
      const res = await sb.from('contents').insert(row).select('share_slug').single();
      if (res.error) { if (media_path) await sb.storage.from('media').remove([media_path]); throw res.error; }
      if (d.recipients.length) must(await sb.from('content_recipients').insert(d.recipients.map((email) => ({ content_id: id, email }))));
      return res.data.share_slug;
    },
    // aggiunge una foto a un pin di solo testo (curiosità già create)
    async addPhoto(c, file, text_body) {
      const u = await B.user();
      const media_path = `${u.id}/${c.id}/media-${Date.now()}.jpg`;
      must(await sb.storage.from('media').upload(media_path, file, { contentType: file.type, upsert: false }));
      const res = await sb.from('contents').update({ media_type: 'photo', media_path, text_body }).eq('id', c.id).eq('owner_id', u.id).select('id').single();
      if (res.error) { await sb.storage.from('media').remove([media_path]); throw res.error; }
    },
    async notifyRecipients(slug) {
      const { data, error } = await sb.functions.invoke(CONFIG.NOTIFY_FUNCTION || 'notify-recipients', { body: { slug, lang: LANG } });
      if (error) {   // leggo il motivo vero restituito dalla funzione
        let detail = error.message;
        try { const b = await error.context.json(); detail = b.error || JSON.stringify(b); } catch { try { detail = await error.context.text() || detail; } catch { /* resta il messaggio */ } }
        const st = error.context?.status;
        throw new Error(`${st ? `[${st}] ` : ''}${detail}`);
      }
      return data;   // { sent, skipped, failed, errors }
    },
    // --- rubrica
    async listContacts() { return must(await sb.from('address_book').select('id,name,email,groups').order('name')) || []; },
    async saveContact(c) {
      const u = await B.user();
      const row = { name: c.name, email: c.email, ...(c.groups ? { groups: c.groups } : {}) };
      if (c.id) must(await sb.from('address_book').update(row).eq('id', c.id));
      else must(await sb.from('address_book').insert({ owner_id: u.id, ...row }));
    },
    // --- caccia al tesoro
    async listHunts() { return must(await sb.from('hunts').select('*').order('created_at', { ascending: false })) || []; },
    async getHunt(id) { return must(await sb.from('hunts').select('*').eq('id', id).maybeSingle()); },
    async createHunt(h) { return must(await sb.from('hunts').insert({ title: h.title, prize: h.prize, max_winners: h.max_winners }).select('*').single()); },
    async deleteHunt(id) { must(await sb.from('hunts').delete().eq('id', id)); },
    async huntSteps(id) { return must(await sb.from('contents').select('share_slug,title,hunt_step,lat,lng').eq('hunt_id', id).order('hunt_step')) || []; },
    // ---- Doni e negozi ----
    async myGifts() { return (must(await sb.rpc('my_gifts')) || []).map(unwrapRow('my_gifts')); },
    async giftClaim(t) { return must(await sb.rpc('gift_claim', { p_token: t })); },
    async giftGet(id) { return must(await sb.rpc('gift_get', { p_id: id })); },
    async giftUnlock(id, pos) { return must(await sb.rpc('gift_unlock', { p_id: id, p_lat: pos ? pos.lat : null, p_lng: pos ? pos.lng : null })); },
    async giftSend(id, message, from) { return must(await sb.rpc('gift_send', { p_id: id, p_message: message, p_from: from })); },
    async giftSendCancel(id) { must(await sb.rpc('gift_send_cancel', { p_id: id })); },
    async giftPeek(t) { return must(await sb.rpc('gift_peek', { p_token: t })); },
    async giftAccept(t) { return must(await sb.rpc('gift_accept', { p_token: t })); },
    async giftTrees(b) { return must(await sb.rpc('map_gift_trees', { s: b.s, w: b.w, n: b.n, e: b.e })) || []; },
    async cashierInfo(t, pin) { return must(await sb.rpc('cashier_info', { p_token: t, p_pin: pin })); },
    async cashierCheck(t, pin, code, redeem = false) { return must(await sb.rpc('cashier_check', { p_token: t, p_pin: pin, p_code: code, p_redeem: redeem })); },
    async cashierExtend(t, pin, code, days) { return must(await sb.rpc('cashier_extend', { p_token: t, p_pin: pin, p_code: code, p_days: days })); },
    async cashierIssue(t, pin, item, days = 180) { return must(await sb.rpc('cashier_issue', { p_token: t, p_pin: pin, p_item: item, p_days: days })); },
    async adminBusinesses() { return (must(await sb.rpc('admin_businesses')) || []).map(unwrapRow('admin_businesses')); },
    async adminBusinessSave(p) { return must(await sb.rpc('admin_business_save', { p })); },
    async adminBusinessToggle(id, enabled, hide) { must(await sb.rpc('admin_business_toggle', { p_id: id, p_enabled: enabled, p_hide: hide })); },
    async adminItemSave(p) { return must(await sb.rpc('admin_item_save', { p })); },
    async adminCampaignCreate(o) {
      return must(await sb.rpc('admin_campaign_create', { p_business: o.business_id, p_title: o.title, p_theme: o.theme, p_opens: o.opens_at, p_expires: o.expires_at,
        p_lat: o.lat, p_lng: o.lng, p_radius: o.radius_m, p_spread: o.spread_m, p_intro: o.intro || '', p_prizes: o.prizes }));
    },
    async adminCampaignCards(id) { return must(await sb.rpc('admin_campaign_cards', { p_campaign: id })) || []; },
    async adminCampaignDates(id, opens, expires) { must(await sb.rpc('admin_campaign_dates', { p_campaign: id, p_opens: opens, p_expires: expires })); },
    async publicPartners() { return must(await sb.rpc('public_partners')) || []; },
    async adminPartnerData() { return must(await sb.rpc('admin_partner_data')) || []; },
    async adminPartnerSave(id, p) { must(await sb.rpc('admin_partner_save', { p_id: id, p })); },
    // Copia la caccia con tutte le tappe (stesse foto, testi, indizi e risposte), spostata di dlat/dlng.
    // Le foto vengono copiate nella cartella del nuovo pin, così chi gioca la copia le può vedere.
    async duplicateHunt(id, { title, dlat, dlng }) {
      const u = await B.user();
      const h = await B.getHunt(id); if (!h) throw new Error('Caccia non trovata.');
      const rows = must(await sb.from('contents').select('*').eq('hunt_id', id).order('hunt_step')) || [];
      const nh = await B.createHunt({ title, prize: h.prize, max_winners: h.max_winners });
      const made = [], files = [];
      try {
        for (const r of rows) {
          const nid = crypto.randomUUID();
          let media_path = null;
          if (r.media_path) {
            media_path = `${u.id}/${nid}/${r.media_path.split('/').pop()}`;
            must(await sb.storage.from('media').copy(r.media_path, media_path)); files.push(media_path);
          }
          const { id: _i, share_slug: _s, created_at: _c, ...rest } = r;
          must(await sb.from('contents').insert({ ...rest, id: nid, owner_id: u.id, media_path, hunt_id: nh.id, parent_id: null,
            lat: Math.max(-89.9, Math.min(89.9, r.lat + dlat)), lng: ((r.lng + dlng + 540) % 360) - 180 }));
          made.push(nid);
          if (r.visibility === 'restricted') {
            const rc = must(await sb.from('content_recipients').select('email').eq('content_id', r.id)) || [];
            if (rc.length) must(await sb.from('content_recipients').insert(rc.filter((x) => x.email).map((x) => ({ content_id: nid, email: x.email }))));
          }
        }
      } catch (err) {   // qualcosa è andato storto: tolgo la copia a metà
        if (made.length) await sb.from('contents').delete().in('id', made);
        if (files.length) await sb.storage.from('media').remove(files);
        await sb.from('hunts').delete().eq('id', nh.id);
        throw err;
      }
      return nh;
    },
    async huntWinners(id) { return must(await sb.rpc('hunt_winners_list', { p_hunt: id })) || []; },
    async huntRedeem(id, code) { return (must(await sb.rpc('hunt_redeem', { p_hunt: id, p_code: code })) || [])[0]; },
    async myHuntPrize(slug) { return (must(await sb.rpc('my_hunt_prize', { p_slug: slug })) || [])[0] || null; },
    // --- amministratore: banner e iscritti
    async isAdmin() { try { return !!must(await sb.rpc('is_admin')); } catch { return false; } },
    async listAds() { return must(await sb.from('ads').select('*').order('sort').order('created_at')) || []; },
    async saveAd(a) {
      const row = { title: a.title, body: a.body || null, link_url: a.link_url || null, image_url: a.image_url || null, color: a.color, active: a.active, sort: a.sort || 0 };
      if (a.id) must(await sb.from('ads').update(row).eq('id', a.id)); else must(await sb.from('ads').insert(row));
    },
    async deleteAd(id) { must(await sb.from('ads').delete().eq('id', id)); },
    async uploadAdImage(blob) {
      const u = await B.user();
      const path = `${u.id}/ads/${crypto.randomUUID()}.jpg`;
      must(await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
      return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    },
    async adminUsers() { return must(await sb.rpc('admin_users')) || []; },
    async adminPinStats() { return must(await sb.rpc('admin_pin_stats')) || []; },
    async huntStats(id) { try { return must(await sb.rpc('hunt_stats', { p_hunt: id })) || []; } catch { return null; } },   // null se il database non è aggiornato
    async setSignupSource(slug) { try { must(await sb.rpc('set_signup_source', { p_slug: slug })); } catch { /* database non aggiornato */ } },
    async adminSetPlan(id, plan) { must(await sb.rpc('admin_set_plan', { p_user: id, p_plan: plan })); },
    async myQuota() { try { return (must(await sb.rpc('my_quota')) || [])[0] || null; } catch { return null; } },   // null se il database non è ancora aggiornato
    async adminId() { try { return must(await sb.rpc('ubi_admin_id')); } catch { return null; } },
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
        ...(d.media_type === 'text' ? { text_body: d.text_body } : kindIsFile ? {} : { text_body: null }),   // il testo sotto una foto resta
        duration_seconds: kindIsFile ? (d.file ? d.duration : old.duration_seconds) : null,
        lat: d.lat, lng: d.lng, unlock_radius_m: d.radius, location_source: d.source,
        visibility: d.visibility, tags: d.tags || [], replies_enabled: d.replies_enabled !== false,
        unlock_at: d.unlock_at || null, open_anywhere: !!(d.unlock_at && d.open_anywhere),
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
      try { const r = await sb.functions.invoke(CONFIG.REPLY_FUNCTION || 'notify-reply', { body: { reply_id: id, lang: LANG } }); mailed = !r.error && r.data?.sent === 1; } catch { /* l'email è un extra */ }
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
      const rows = must(await sb.rpc('map_contents', { p_min_lat: b.s, p_min_lng: b.w, p_max_lat: b.n, p_max_lng: b.e })) || [];
      // i miei pin li prendo sempre anche direttamente: la funzione del database ne restituisce al massimo 500 per zona
      try {
        const u = await B.user();
        const mine = must(await sb.from('contents').select('share_slug,title,media_type,lat,lng,tags,is_dating,unlock_at,hunt_step')
          .eq('owner_id', u.id).gte('lat', b.s).lte('lat', b.n).gte('lng', b.w).lte('lng', b.e).limit(2000)) || [];
        const have = new Set(rows.map((r) => r.share_slug));
        mine.forEach((m) => { if (!have.has(m.share_slug)) rows.push({ ...m, is_owner: true, unlocked: true }); });
      } catch { /* restano quelli della funzione */ }
      return rows;
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
        unlock_at: d.unlock_at || null, open_anywhere: !!(d.unlock_at && d.open_anywhere),
        hunt_id: d.hunt_id || null, hunt_step: d.hunt_id ? d.hunt_step : null, replies_enabled: d.replies_enabled !== false,
      });
      save(); return slug;
    },
    async addPhoto(c, file, text_body) {
      const x = db.contents.find((y) => y.id === c.id); if (!x) throw new Error('Pin non trovato');
      await putBlob(x.id, file); Object.assign(x, { media_type: 'photo', media_path: x.id, text_body }); save();
    },
    async remove(c) { db.contents = db.contents.filter((x) => x.id !== c.id); save(); },
    _book() { db.book = db.book || {}; db.book[db.user.id] = db.book[db.user.id] || []; return db.book[db.user.id]; },
    async notifyRecipients() { return { sent: 0, skipped: 0, demo: true }; },
    async joinDating() { throw new Error('La sezione dating non è disponibile nella demo.'); },
    async leaveDating() {},
    // risposte nella demo: solo testo, salvate sul telefono
    async addReply(slug, d) {
      const c = db.contents.find((x) => x.share_slug === slug); if (!c || !db.user) throw new Error('Pin non trovato.');
      if (d.file) throw new Error('Nella demo si può rispondere solo con un messaggio scritto.');
      (db.replies = db.replies || []).push({ id: crypto.randomUUID(), content_id: c.id, author_id: db.user.id, author_name: db.profiles[db.user.id]?.display_name || 'Utente',
        media_type: 'text', text_body: d.text, created_at: new Date().toISOString(), revealed: true }); save(); return { mailed: false };
    },
    async repliesFor(slug) { const c = db.contents.find((x) => x.share_slug === slug); return c ? (db.replies || []).filter((r) => r.content_id === c.id).reverse() : []; },
    async myReplies() { return (db.replies || []).filter((r) => r.author_id === db.user?.id).map((r) => ({ ...r, share_slug: db.contents.find((c) => c.id === r.content_id)?.share_slug })); },
    async myDatingPhotos() { return []; },
    async listHunts() { return (db.hunts || []).filter((h) => h.owner_id === db.user?.id); },
    async getHunt(id) { return (db.hunts || []).find((h) => h.id === id) || null; },
    async createHunt(h) { const x = { id: crypto.randomUUID(), owner_id: db.user.id, created_at: new Date().toISOString(), ...h }; (db.hunts = db.hunts || []).push(x); save(); return x; },
    async deleteHunt(id) { db.hunts = (db.hunts || []).filter((h) => h.id !== id); db.contents.forEach((c) => { if (c.hunt_id === id) { c.hunt_id = null; c.hunt_step = null; } }); save(); },
    ...demoGifts(() => db, save),
    async huntSteps(id) { return db.contents.filter((c) => c.hunt_id === id).sort((a, b) => a.hunt_step - b.hunt_step).map((c) => ({ share_slug: c.share_slug, title: c.title, hunt_step: c.hunt_step, lat: c.lat, lng: c.lng })); },
    async duplicateHunt(id, { title, dlat, dlng }) {
      const h = await B.getHunt(id); const nh = await B.createHunt({ title, prize: h.prize, max_winners: h.max_winners });
      db.contents.filter((c) => c.hunt_id === id).forEach((c) => db.contents.push({ ...c, id: crypto.randomUUID(), share_slug: Math.random().toString(16).slice(2, 14),
        hunt_id: nh.id, lat: c.lat + dlat, lng: c.lng + dlng, created_at: new Date().toISOString() }));
      save(); return nh;
    },
    async huntWinners() { return []; },
    async huntRedeem() { return { status: 'not_found' }; },
    async myHuntPrize(slug) {   // demo: stessa logica del database, codice salvato sul telefono
      const c = db.contents.find((x) => x.share_slug === slug); if (!c || !c.hunt_id || !db.user) return null;
      if (!db.unlocks.some((x) => x.c === c.id && x.u === db.user.id)) return null;
      const steps = db.contents.filter((x) => x.hunt_id === c.hunt_id).length, h = (db.hunts || []).find((x) => x.id === c.hunt_id) || {};
      const base = { steps, is_last: c.hunt_step === steps, prize: h.prize || '', hunt_title: h.title || c.hunt_title || '' };
      if (!base.is_last) return base;
      db.huntCodes = db.huntCodes || {}; const k = `${c.hunt_id}:${db.user.id}`;
      if (!db.huntCodes[k]) { db.huntCodes[k] = Math.random().toString(36).slice(2, 8).toUpperCase(); save(); }
      return { ...base, code: db.huntCodes[k], redeemed_at: null };
    },
    async isAdmin() { return !!db.admin; },
    // banner nella demo: salvati sul telefono, immagine come dataURL
    async listAds() { return [...(db.ads || [])]; },
    async saveAd(a) { db.ads = db.ads || []; const o = db.ads.find((x) => x.id === a.id);
      if (o) Object.assign(o, a); else db.ads.push({ ...a, id: crypto.randomUUID(), created_at: new Date().toISOString() }); save(); },
    async deleteAd(id) { db.ads = (db.ads || []).filter((x) => x.id !== id); save(); },
    async uploadAdImage(blob) { return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); }); },
    async adminUsers() { return []; },
    async adminPinStats() { return []; },
    async huntStats() { return null; },
    async setSignupSource() {},
    async adminSetPlan() {},
    async myQuota() { return null; },
    async adminId() { return null; },
    async addDatingPhoto() { throw new Error('Le foto dating non sono disponibili nella demo.'); },
    async removeDatingPhoto() {},
    async datingPhotosOf() { return []; },
    async replyWant() { return false; },
    async replyRemove() {},
    async listContacts() { return [...B._book()].sort((a, b) => a.name.localeCompare(b.name)); },
    async saveContact(c) {
      const bk = B._book();
      if (bk.some((x) => x.email === c.email && x.id !== c.id)) throw new Error('duplicate key value violates unique constraint');
      if (c.id) Object.assign(bk.find((x) => x.id === c.id), { name: c.name, email: c.email, groups: c.groups || [] });
      else bk.push({ id: crypto.randomUUID(), name: c.name, email: c.email, groups: c.groups || [] });
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
        external_url: d.media_type === 'link' ? d.external_url : null, text_body: d.media_type === 'text' ? d.text_body : (kindIsFile ? c.text_body : null),
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
          is_owner: c.owner_id === u.id, unlocked: db.unlocks.some((x) => x.c === c.id && x.u === u.id), tags: c.tags || [], hunt_step: c.hunt_step || null }));
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
        unlock_at: c.unlock_at || null, open_anywhere: !!c.open_anywhere, hunt_id: c.hunt_id || null,
        hunt_step: c.hunt_step || null, hunt_steps: c.hunt_id ? db.contents.filter((x) => x.hunt_id === c.hunt_id).length : null,
        hunt_title: c.hunt_title || null, hunt_locked: false,
        replies_enabled: c.replies_enabled !== false, i_replied: (db.replies || []).some((r) => r.content_id === c.id && r.author_id === db.user?.id),
      };
    },
    async unlock(slug, pos, password) {
      const u = db.user; if (!u) return { status: 'login_required' };
      const c = db.contents.find((x) => x.share_slug === slug);
      if (!c || !canAccess(c, u)) return { status: 'not_found' };
      const ok = async (d) => ({ status: 'ok', distance_m: d, external_url: c.external_url, text_body: c.text_body, url: c.media_path ? URL.createObjectURL(await getBlob(c.media_path) || new Blob()) : null });
      if (c.owner_id === u.id || db.unlocks.some((x) => x.c === c.id && x.u === u.id)) return ok(null);
      if (c.unlock_at && Date.now() < Date.parse(c.unlock_at)) return { status: 'too_early' };
      if (c.unlock_at && c.open_anywhere) { db.unlocks.push({ c: c.id, u: u.id }); save(); return ok(null); }
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
const LIMIT_MSG = {
  UBI_LIMITE_PIN: 'Hai raggiunto <b>500 pin</b>: complimenti, sei tra i più attivi di Ubi! Per continuare puoi eliminare qualche pin vecchio, oppure passare al piano <b>Pro</b>.',
  UBI_LIMITE_FILE: 'Hai raggiunto <b>100 file</b> (foto, video e audio). Puoi creare pin di testo o link, eliminare qualche file vecchio, oppure passare al piano <b>Pro</b>.',
  UBI_LIMITE_VIDEO: 'Hai raggiunto <b>10 video</b>. Puoi usare foto o un link YouTube, eliminare un video vecchio, oppure passare al piano <b>Pro</b>.',
};
const limitKey = (e) => Object.keys(LIMIT_MSG).find((k) => String(e?.message || e).includes(k));
const proBtn = '<br><a class="btn ghost" href="#" data-pro="1" style="margin-top:8px">💬 Scrivici per il piano Pro</a>';
const errText = (e) => { const k = limitKey(e); return k ? LIMIT_MSG[k] + proBtn : esc(e?.message || String(e)) + (e?.geoHelp ? GEO_HELP : ''); };
// il bottone «Scrivici» apre la chat con l'amministratore
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-pro]'); if (!a) return;
  e.preventDefault();
  const id = await B.adminId();
  if (id) location.hash = `#/messaggi/${id}`; else alert('Scrivici dalla pagina FAQ: ti attiviamo il piano Pro.');
});

async function route() {
  try { await routeInner(); } catch (err) {
    console.error(err);
    app.insertAdjacentHTML('afterbegin', `<div class="msg err">Errore: ${authErr(err)}</div>`);
    document.querySelectorAll('button[disabled]').forEach((b) => { b.disabled = false; });
  }
}
async function routeInner() {
  stopWatch();
  document.querySelectorAll('.hov,.htoast').forEach((e) => e.remove());
  refreshInbox();
  window.scrollTo(0, 0);   // ogni nuova schermata si apre dall'inizio
  if (B.recovery) return viewNewPassword();
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  setDatingTheme(page === 'dating' || (page === 'new' && arg === 'dating'));
  if (page === 'faq') return viewFaq(arg);
  if (page === 'invita') return viewInvite();
  if (page === 'avvisi') return viewOptout(arg);
  if (page === 'cassa' && arg) return viewCashier(arg);
  if (page === 'business') return viewBusiness();
  const user = await B.user();
  if (page === 'regalo' && arg && !user) { setPending(location.hash); return viewGiftReceive(arg, null); }
  if (page === 'dono' && arg && !user) {
    setPending(location.hash);
    app.innerHTML = `<div class="giftpage th-regalo">${giftArt('regalo')}<h1>${T2('C\'è un regalo per te!', 'There is a gift for you!')}</h1>
      <p>${T2('Accedi o registrati per farlo tuo: poi lo apri nel negozio, tra le date scritte sul biglietto.', 'Log in or sign up to make it yours: then open it in the shop, between the dates on the card.')}</p>
      <a class="btn full accent" href="#/" id="dlog">🎁 ${T2('Accedi o registrati', 'Log in or sign up')}</a>
      <p class="muted small center">${T2('Ubi è gratis.', 'Ubi is free.')}</p></div>`;
    $('#dlog').onclick = (e) => { e.preventDefault(); viewLogin(); };
    return;
  }
  if (page === 'c' && arg) {
    if (!user && !store.get('ubi_from_pin')) store.set('ubi_from_pin', arg);   // per le statistiche: da quale pin arriva un nuovo iscritto
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
    if (arg && arg.startsWith('caccia-')) {
      const id = arg.slice(7);
      const h = await B.getHunt(id); if (!h) { location.hash = '#/cacce'; return; }
      const steps = await B.huntSteps(id);
      return viewNew(null, { hunt: { id, title: h.title, step: steps.length ? Math.max(...steps.map((x) => x.hunt_step)) + 1 : 1 } });
    }
    return viewNew(null, { dating: arg === 'dating', capsule: arg === 'capsula' });
  }
  if (page === 'capsule') return viewCapsules();
  if (page === 'dono' && arg) return viewGiftClaim(decodeURIComponent(arg));
  if (page === 'regalo' && arg) return viewGiftReceive(arg, user);
  if (page === 'doni') return arg ? viewGift(arg) : viewGifts();
  if (page === 'cacce') return viewHunts();
  if (page === 'caccia' && arg) return viewHunt(arg);
  if (page === 'admin') return viewAdmin(arg);
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
    try {
      await B.saveProfile($('#name').value.trim());
      const from = store.get('ubi_from_pin'); if (from) { store.set('ubi_from_pin', null); B.setSignupSource(from); }
      route();
    } catch (err) { msg($('#m'), errText(err)); }
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
// Filtri della mappa: ogni pin appartiene a una sola categoria (Monumenti, Scrittori, Dating o il suo tipo).
// Nessun bottone acceso = si vede tutto. Accendi uno o più bottoni per vedere solo quelle categorie.
const showCats = new Set();
let onlyMine = false;   // «Miei»: acceso mostra solo i miei
// ogni pin sta in UNA sola categoria: monumenti e scrittori hanno il loro bottone, anche se hanno una foto
const pinCat = (c) => (c.is_dating ? 'dating' : isLit(c) ? 'lit' : isMonu(c) ? 'monu' : c.media_type);
async function homeMap(opts = {}) {
  const el = $('#hmap');
  await waitLeaflet();
  if (!document.body.contains(el)) return;
  const map = makeMap(el, 42.5, 12.5, 6);
  if (!map) return;
  // pin vicini raggruppati in un cerchio con il numero: toccandolo si ingrandisce
  let layer;
  try { layer = (L.markerClusterGroup ? L.markerClusterGroup({
    maxClusterRadius: 45, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 17, chunkedLoading: true,
    iconCreateFunction: (cl) => { const n = cl.getChildCount(); const z = n < 10 ? 34 : n < 100 ? 40 : 48;
      return L.divIcon({ className: '', iconSize: [z, z], iconAnchor: [z / 2, z / 2], html: `<span class="clus" style="width:${z}px;height:${z}px">${n}</span>` }); },
  }) : L.layerGroup()).addTo(map); } catch { layer = L.layerGroup().addTo(map); }   // senza raggruppamento, ma la mappa funziona
  let me = null, timer = null, first = true;
  const icon = (c) => L.divIcon({
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
    html: pinBadge(c, `pin${c.is_owner ? ' mine' : ''}${c.is_owner || c.unlocked ? '' : ' locked'}`),
  });
  let rows = [];
  const hunt = opts.dating ? null : huntFocus();   // modalità caccia: la prossima tappa in primo piano
  const huntSlugs = new Set();                     // pin disegnati dalla caccia (fuori dai gruppi)
  const draw = () => {
    layer.clearLayers();
    // filtri: categoria scelta (nessuna = tutte) E tag (uno qualsiasi dei selezionati) E, se scelto, solo i miei
    const shown = rows.filter((c) =>
      (!opts.dating || c.is_dating) &&
      (opts.dating || (!showCats.size && !onlyMine) || showCats.has(pinCat(c)) || (onlyMine && c.is_owner)) &&
      (!tagFilter.size || (c.tags || []).some((t) => tagFilter.has(t))));
    // bottoni: acceso/spento e quanti pin di quel tipo ci sono nella zona inquadrata
    const cnt = {}; rows.forEach((c) => { const k = pinCat(c); cnt[k] = (cnt[k] || 0) + 1; if (c.is_owner) cnt.mine = (cnt.mine || 0) + 1; });
    document.querySelectorAll('#typebar .chip').forEach((b) => {
      const k = b.dataset.k;
      b.classList.toggle('on', k === 'all' ? !showCats.size && !onlyMine : k === 'mine' ? onlyMine : showCats.has(k));
      const n = b.querySelector('.n'); if (n) n.textContent = k === 'all' ? rows.length : cnt[k] || 0;
    });
    const mks = shown.filter((c) => !huntSlugs.has(c.share_slug)).map((c) => L.marker([c.lat, c.lng], { icon: icon(c), title: c.title, keyboard: true })
      .on('click', () => { location.hash = `#/c/${c.share_slug}`; }));
    if (layer.addLayers) layer.addLayers(mks); else mks.forEach((m) => m.addTo(layer));
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
    if (k === 'all') { showCats.clear(); onlyMine = false; }
    else if (k === 'mine') onlyMine = !onlyMine;
    else if (showCats.has(k)) showCats.delete(k); else showCats.add(k);
    const n = draw();
    msg($('#mm'), rows.length && !n ? 'Nessun pin di questo tipo in questa zona: guarda i numeri sui bottoni, oppure tocca «Tutto».' : '', 'info');
  };
  let giftLayer = null, giftsFell = false;
  const loadGifts = async (b) => {   // alberi e regali delle campagne: cadono la prima volta, il mio si illumina
    if (opts.dating || !B.giftTrees) return;
    try {
      const t = await B.giftTrees({ s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() });
      if (!document.body.contains(el)) return;
      t.sort((a, x) => a.mine - x.mine);
      giftLayer = drawGiftTrees(map, t, { fall: !giftsFell && t.length > 0, layer: giftLayer });
      if (t.length) giftsFell = true;
    } catch { /* i regali non sono indispensabili per la mappa */ }
  };
  const load = async () => {
    const b = map.getBounds().pad(0.3);
    loadGifts(b);
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
  if (hunt) { first = false; return huntMode(); }
  if (lastView) map.setView(lastView.c, lastView.z); else load();
  if (!lastView) getPos().then((p) => { if (document.body.contains(el) && first !== null) { me = p; L.circleMarker([p.lat, p.lng], { radius: 7, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map); map.setView([p.lat, p.lng], 15); } }).catch(() => {});

  // ---- Modalità caccia ----
  async function huntMode() {
    el.classList.add('huntmode');
    el.insertAdjacentHTML('beforebegin', `<div class="huntbar" id="huntbar">
      <div class="hbtop"><b>🗺️ <span translate="no">${esc(hunt.title)}</span></b><button class="ghost hexit" id="huntexit" type="button">✕ ${T2('Esci dalla caccia', 'Leave the hunt')}</button></div>
      ${hunt.steps > 1 ? stepBar(hunt.next, hunt.steps) : ''}
      <p class="hdist" id="hdist">${T2('Cerco la prossima tappa…', 'Looking for the next stage…')}</p></div>`);
    $('#huntexit').onclick = () => { store.set('ubi_hunt_focus', null); lastView = null; route(); };
    const trail = huntTrail(hunt.hunt_id);
    const ico = (html, cls, size = 34) => L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<span class="tico pin ${cls}">${html}</span>` });
    Object.entries(trail.done || {}).forEach(([step, x]) => {
      if (!x || x.lat == null) return;
      huntSlugs.add(x.slug);
      L.marker([x.lat, x.lng], { icon: ico('✓', 'hdone'), title: T2(`Tappa ${step} ✓`, `Stage ${step} ✓`), zIndexOffset: 500 })
        .on('click', () => { location.hash = `#/c/${x.slug}`; }).addTo(map);
    });
    // la prossima tappa: tra i pin visibili, quella col numero giusto più vicina alla tappa appena fatta
    let target = null;
    for (const d of [0.05, 0.3, 1.5]) {
      try {
        const rs = await B.mapContents({ s: hunt.lat - d, w: hunt.lng - d * 1.4, n: hunt.lat + d, e: hunt.lng + d * 1.4 });
        const c = rs.filter((x) => x.hunt_step === hunt.next && !x.is_owner && !huntSlugs.has(x.share_slug))
          .sort((a, b) => (a.unlocked - b.unlocked) || distanceM(hunt.lat, hunt.lng, a.lat, a.lng) - distanceM(hunt.lat, hunt.lng, b.lat, b.lng));
        if (c.length) { target = c[0]; break; }
      } catch { /* riprovo più largo */ }
    }
    if (!document.body.contains(el)) return;
    if (!target) {
      $('#hdist').textContent = T2(`La tappa ${hunt.next} non è ancora sulla mappa: segui l'indizio e riprova tra poco.`, `Stage ${hunt.next} isn't on the map yet: follow the clue and try again shortly.`);
      map.setView([hunt.lat, hunt.lng], 16); load(); return;
    }
    huntSlugs.add(target.share_slug);
    const tm = L.marker([target.lat, target.lng], { icon: L.divIcon({ className: '', iconSize: [46, 46], iconAnchor: [23, 23], html: chestBadge(hunt.next, 'pin hnext') }), title: T2(`Tappa ${hunt.next}`, `Stage ${hunt.next}`), zIndexOffset: 1000 })
      .on('click', () => { location.hash = `#/c/${target.share_slug}`; }).addTo(map);
    map.fitBounds([[hunt.lat, hunt.lng], [target.lat, target.lng]], { padding: [60, 60], maxZoom: 17 });
    load();
    if (hunt.fresh) {
      setTimeout(() => huntToast(T2('Nuova tappa sbloccata! 🎉', 'New stage unlocked! 🎉')), 500);
      store.set('ubi_hunt_focus', JSON.stringify({ ...hunt, fresh: 0 }));
    }
    let meM = null, line = null, fitted = false;
    const upd = (p) => {
      if (!document.body.contains(el)) { stopWatch(); return; }
      const ll = [p.lat, p.lng];
      if (!meM) meM = L.circleMarker(ll, { radius: 8, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map); else meM.setLatLng(ll);
      if (!line) line = L.polyline([ll, [target.lat, target.lng]], { color: '#b07a0c', weight: 3, dashArray: '8 10', opacity: 0.9 }).addTo(map);
      else line.setLatLngs([ll, [target.lat, target.lng]]);
      const dm = distanceM(p.lat, p.lng, target.lat, target.lng);
      $('#hdist').innerHTML = `📍 <b>${fmtDist(dm)}</b> ${T2('in linea d\'aria dalla tappa', 'as the crow flies to stage')} ${hunt.next} · <a href="#/c/${esc(target.share_slug)}">${T2('apri la tappa', 'open the stage')}</a>`;
      if (!fitted) { fitted = true; map.fitBounds([ll, [target.lat, target.lng]], { padding: [60, 60], maxZoom: 17 }); }
    };
    $('#hdist').innerHTML = `<a href="#/c/${esc(target.share_slug)}">${T2('Tocca il forziere per aprire la tappa', 'Tap the chest to open the stage')}</a>`;
    if (navigator.geolocation) {
      stopWatch();
      watchId = navigator.geolocation.watchPosition((p) => upd({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    }
    void tm;
  }
}

function topTools() {
  const l = LANG === 'en' ? '🇮🇹 Italiano' : '🇬🇧 English';
  return `<p class="center small toptools" style="margin:2px 0 10px"><span translate="no">🌐 Lingua / Language: <a href="#" data-langsw>${l}</a></span> · <a href="#" data-logout>Esci</a></p>`;
}
function bindTopTools(root) {
  root.querySelector('[data-langsw]')?.addEventListener('click', (e) => { e.preventDefault(); setLang(LANG === 'en' ? 'it' : 'en'); });
  root.querySelector('[data-logout]')?.addEventListener('click', async (e) => { e.preventDefault(); await B.signOut(); location.hash = '#/'; route(); });
}

async function viewHome(user, prof) {
  app.innerHTML = `
    <div class="homebar"><h1>Ciao ${esc(prof.display_name || '')}</h1>
      <span class="row" style="flex:0 0 auto;gap:8px"><a href="#/profilo" class="me" aria-label="Il mio profilo">${avatarHtml(prof.avatar_path, prof.display_name, 44)}</a>
      <button class="ghost" id="nearme" type="button" aria-label="Centra sulla mia posizione">📍</button></span></div>
    ${topTools()}
    <div id="hmap" class="map home"></div>
    <div class="chips types" id="typebar"><button class="chip on" data-k="all">Tutto<span class="n"></span></button>${Object.entries(TYPES).map(([k, x]) => `<button class="chip" data-k="${k}"><span class="tico sm" style="background:${x.c}">${x.l}</span>${x.n}<span class="n"></span></button>`).join('')}
      <button class="chip" data-k="monu">${monuBadge('sm')}Monumenti<span class="n"></span></button>
      <button class="chip" data-k="lit">${litBadge('sm')}Scrittori<span class="n"></span></button>
      <button class="chip" data-k="dating">${datingBadge('f', 'sm')}Dating<span class="n"></span></button>
      <button class="chip" data-k="mine"><span class="tico sm mine" style="background:#888">·</span>Miei<span class="n"></span></button></div>
    <p class="muted small" style="margin:2px 0 6px">Accendi i bottoni per vedere solo quelle categorie (si sommano). «Tutto» rimette tutti i pin. Il numero dice quanti ce ne sono nella zona.</p>
    <div id="tagcloud" class="chips cloud"></div>
    <div id="mm"></div>
    <div id="mygifts"></div>
    <a href="#/new" class="btn accent full" style="background:var(--accent)">＋ Lascia un contenuto in un luogo</a>
    <div class="row" style="margin-top:10px"><a href="#/profilo" class="btn ghost">👤 Il mio profilo</a><a href="#/rubrica" class="btn ghost">📒 La mia rubrica</a></div>
    <div class="row" style="margin-top:10px"><a href="#/capsule" class="btn ghost">⏳ Capsula del tempo</a><a href="#/cacce" class="btn ghost">🗺️ Caccia al tesoro</a></div>
    <div id="adminrow" class="row" style="margin-top:10px" hidden><a href="#/admin/banner" class="btn ghost">📣 Banner pubblicitari</a><a href="#/admin/iscritti" class="btn ghost">👥 Iscritti (Excel)</a><a href="#/admin/curiosita" class="btn ghost">🗺️ Curiosità</a><a href="#/admin/negozi" class="btn ghost">🏪 Negozi</a></div>
    <div id="adslot" style="margin-top:10px"></div>
    <a href="#/dating" class="btn full datingbtn" style="margin-top:10px">💗 Ubi Dating · incontra chi ama i tuoi luoghi</a>
    ${inviteBox(false)}
    <h2 style="margin-top:22px">I miei contenuti</h2>
    <div id="list"><p class="muted center">Carico i tuoi contenuti…</p></div>
    <p class="center small"><a href="#" id="out">Esci (${esc(user.email)})</a></p>`;
  $('#out').onclick = async (e) => { e.preventDefault(); await B.signOut(); location.hash = '#/'; route(); };
  bindTopTools(app);
  homeMap();
  bindInvite(app);
  drawAdSlot($('#adslot'));
  B.myGifts().then((gs) => {
    const live = gs.filter((g) => ['open', 'not_yet', 'unlocked'].includes(g.state));
    if (live.length && $('#mygifts')) $('#mygifts').innerHTML = `<a class="card item glink giftcta" href="${live.length === 1 ? `#/doni/${esc(live[0].id)}` : '#/doni'}">
      <div class="ico">${giftIcon(live[0].theme, true)}</div><div><div class="t">${live.length === 1 ? T2('Hai un regalo da aprire', 'You have a gift to open') : T2(`Hai ${live.length} regali`, `You have ${live.length} gifts`)}</div>
      <div class="meta"><span translate="no">${esc(live[0].business)}</span> · ${T2('fino al', 'until')} ${dLong(live[0].expires_at)}</div></div></a>`;
  }).catch(() => {});
  B.isAdmin().then((ok) => { if (ok && $('#adminrow')) $('#adminrow').hidden = false; });
  let items;
  try { items = await B.listMine(); } catch (err) { msg($('#list'), errText(err)); return; }
  if (!items.length) { $('#list').innerHTML = '<div class="card center muted">Non hai ancora lasciato nulla.<br>Inizia da un luogo che conta per te.</div>'; return; }
  // cerca nei miei contenuti: testo (titolo, indizio, tag) + categoria
  const CATS = [['all', 'Tutto'], ...Object.entries(TYPES).map(([k, x]) => [k, x.n]), ['monu', 'Monumenti'], ['lit', 'Scrittori'], ['dating', 'Dating']];
  const cnt = { all: items.length }; items.forEach((c) => { const k = pinCat(c); cnt[k] = (cnt[k] || 0) + 1; });
  let cat = '';
  const catIcon = (k) => k === 'all' ? '<span class="tico sm" style="background:#888">★</span>' : k === 'monu' ? monuBadge('sm') : k === 'lit' ? litBadge('sm') : k === 'dating' ? datingBadge('f', 'sm') : `<span class="tico sm" style="background:${TYPES[k].c}">${TYPES[k].l}</span>`;
  $('#list').innerHTML = `<input id="mysearch" type="search" placeholder="🔍 Cerca nei miei contenuti (titolo, indizio, #tag)" autocomplete="off">
    <div class="mycats" id="mycats">${CATS.filter(([k]) => k === 'all' || cnt[k]).map(([k, n]) => `<button type="button" class="mycat" data-c="${k}" aria-expanded="false">${catIcon(k)}<span class="lbl">${esc(n)}</span><span class="n">${cnt[k] || 0}</span></button>`).join('')}</div>
    <p class="muted small" id="mycount"></p><div id="myitems"></div>`;
  const drawMine = () => {
    const q = $('#mysearch').value.trim().toLowerCase().replace(/^#/, '');
    if (!cat && !q) { $('#mycount').textContent = 'Tocca una categoria per aprire i tuoi contenuti, oppure cerca qui sopra.'; $('#myitems').innerHTML = ''; return; }
    const vis = items.map((c, i) => [c, i]).filter(([c]) => (!cat || cat === 'all' || pinCat(c) === cat) &&
      (!q || `${c.title} ${c.hint || ''} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q)));
    $('#mycount').textContent = `${vis.length} di ${items.length} contenuti`;
    $('#myitems').innerHTML = vis.slice(0, 200).map(([c, i]) => `
    <div class="card" data-i="${i}">
      <div class="item"><div class="ico">${c.is_dating ? datingBadge(prof.dating_gender) : pinBadge(c)}</div>
        <div><div class="t">${esc(c.title)}</div>
        <div class="meta">${c.is_dating ? '💗 Dating · ' : ''}${VIS[c.visibility]}${c.password_hash ? ' · 🔒 password' : ''} · ${new Date(c.created_at).toLocaleDateString(LOC)}</div></div></div>
      ${tagChips(c.tags)}
      <div class="actions">
        <button class="ghost" data-a="share">Condividi</button>
        <a class="btn ghost" href="#/c/${esc(c.share_slug)}">Apri</a>
        <a class="btn ghost" href="#/edit/${esc(c.share_slug)}">Modifica</a>
        <button class="danger" data-a="del">Elimina</button>
      </div></div>`).join('') + (vis.length > 200 ? '<p class="muted small center">Ne mostro 200: scrivi qualcosa nella ricerca per trovare gli altri.</p>' : '');
  };
  $('#mysearch').oninput = drawMine;
  $('#mycats').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cat = cat === b.dataset.c ? '' : b.dataset.c; $('#mycats').querySelectorAll('.mycat').forEach((x) => { const on = x.dataset.c === cat; x.classList.toggle('on', on); x.setAttribute('aria-expanded', on ? 'true' : 'false'); }); drawMine(); if (cat) $('#mycount').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  drawMine();
  $('#list').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b || !b.closest('.card[data-i]')) return;
    const c = items[+b.closest('.card').dataset.i];
    if (b.dataset.a === 'share') return shareSheet(c.title, c.share_slug, b.closest('.card'), c.hint);
    if (b.dataset.a === 'del') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma eliminazione'; return; }
      b.disabled = true;
      try { await B.remove(c); route(); } catch (err) { alertIn(b.closest('.card'), errText(err)); }
    }
  };
}
const alertIn = (el, text) => el.insertAdjacentHTML('beforeend', `<div class="msg err">${text}</div>`);

// Testo pronto per condividere un pin (nella lingua dell'app)
const pinShareText = (title) => LANG === 'en'
  ? `📍 «${title}» — a memory left in this place with Ubi: it only opens when you get there. #Ubi #ubipin #memories`
  : `📍 «${title}» — un ricordo lasciato in questo luogo con Ubi: si apre solo quando ci arrivi. #Ubi #ubipin #ricordi`;
// Caccia al tesoro: si condivide il link della tappa 1, con un messaggio che parla del gioco e del premio
const huntShareText = (title, prize) => LANG === 'en'
  ? `🗺️ Treasure hunt «${title}» on Ubi!${prize ? ` Prize: ${prize}.` : ''} Start from stage 1 — you'll discover the rest by playing. #treasurehunt #Ubi #ubipin`
  : `🗺️ Caccia al tesoro «${title}» con Ubi!${prize ? ` In palio: ${prize}.` : ''} Parti dalla tappa 1: il resto lo scopri giocando. #cacciaaltesoro #caccialtesoro #Ubi #ubipin`;
function shareSheet(title, slug, container, hint = '', hunt = null) {
  const url = shareUrl(slug);
  const old = container.querySelector('.share'); if (old) { old.remove(); return; }
  const text = hunt ? huntShareText(hunt.title, hunt.prize) : pinShareText(title);
  container.insertAdjacentHTML('beforeend', `
    <div class="share"><p class="linkbox">${esc(url)}</p>
      <div class="actions"><button data-s="copy">Copia messaggio e link</button></div>
      ${socialButtons(url, text, hunt ? { k: 'hunt', title: hunt.title, prize: hunt.prize || '', steps: hunt.steps || 0 } : { k: 'pin', title, hint: hint || '' })}</div>`);
  const box = container.querySelector('.share');
  bindSocials(box);
  box.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.s === 'copy') { try { await navigator.clipboard.writeText(`${text} ${url}`); b.textContent = 'Copiato ✓'; } catch { b.textContent = 'Copia a mano il link'; } }
  };
}
// Riquadro "Condividi questo pin": pulsante grande (menu del telefono con immagine) + link + social
function pinShareCard(title, slug, hint = '', hunt = null) {
  return `<div class="card pinshare" data-slug="${esc(slug)}" data-title="${esc(title)}" data-hint="${esc(hint || '')}"${hunt ? ` data-hunt="${esc(JSON.stringify(hunt))}"` : ''}>
    <button type="button" class="accent full" data-pinshare>📤 ${hunt ? 'Condividi la caccia' : 'Condividi questo pin'}</button>
    <p class="muted small" style="margin:8px 0 0">${hunt ? 'Si condivide il link della <b>tappa 1</b> con un\'immagine della caccia e il premio: le altre tappe si scoprono giocando.' : 'Pubblicalo sui social o mandalo agli amici: chi lo apre scopre il luogo e Ubi.'}</p>
    <div class="pinsharemsg"></div><div class="pinsharebox"></div></div>`;
}
function bindPinShare(root = document) {
  root.querySelectorAll('.pinshare').forEach((c) => {
    const { slug, title, hint } = c.dataset; const url = shareUrl(slug);
    let hunt = null; try { hunt = c.dataset.hunt ? JSON.parse(c.dataset.hunt) : null; } catch { /* pin normale */ }
    const text = hunt ? huntShareText(hunt.title, hunt.prize) : pinShareText(title);
    const filePromise = cardFile(hunt ? { k: 'hunt', title: hunt.title, prize: hunt.prize, steps: hunt.steps } : { k: 'pin', title, hint }, url);
    shareSheet(title, slug, c.querySelector('.pinsharebox'), hint, hunt);
    c.querySelector('[data-pinshare]').onclick = async () => {
      navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
      if (navigator.share) {
        try {
          const file = await filePromise;
          let data = { title: `Ubi — ${hunt ? hunt.title : title}`, text, url };
          // con l'immagine il link va dentro il testo: alcune app (Facebook) se ricevono anche «url» scartano la foto
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) data = { files: [file], text: `${text} ${url}` };
          await navigator.share(data);
        } catch (err) { if (err && err.name !== 'AbortError') msg(c.querySelector('.pinsharemsg'), 'Messaggio e link copiati ✓ Incollali dove vuoi.', 'ok'); }
      } else msg(c.querySelector('.pinsharemsg'), 'Messaggio e link copiati ✓ Incollali dove vuoi, oppure usa le icone qui sotto.', 'ok');
    };
  });
}

async function viewNew(ed = null, opts = {}) {
  const dating = !!opts.dating;
  const hunt = opts.hunt || null;                      // { id, title, step }: tappa di una caccia al tesoro
  const isStage = !!(hunt || (ed && ed.hunt_id));
  const capsuleOn = !!opts.capsule || !!(ed && ed.unlock_at);
  const maxTags = dating ? MAX_TAGS_DATING : MAX_TAGS;
  const s = { sel: new Set(), book: [], tags: new Set(), kind: 'file', file: null, media_type: null, duration: null, lat: null, lng: null, source: null, radius: CONFIG.DEFAULT_RADIUS_M, vis: dating || hunt ? 'public' : 'restricted' };
  if (ed) {
    Object.assign(s, {
      tags: new Set(ed.tags || []), kind: ['photo', 'video', 'audio'].includes(ed.media_type) ? 'file' : ed.media_type,
      media_type: ed.media_type, radius: ed.unlock_radius_m, vis: ed.visibility,
    });
  }
  app.innerHTML = `
    <h1>${dating ? (ed ? '💗 Modifica il biglietto' : '💗 Nuovo biglietto dating')
      : hunt ? `🗺️ Tappa ${hunt.step} · ${esc(hunt.title)}`
      : opts.capsule && !ed ? '⏳ Nuova capsula del tempo' : (ed ? 'Modifica contenuto' : 'Nuovo contenuto')}</h1>
    <div id="quota"></div>
    ${hunt ? `<div class="card datingtips" style="background:#fff8ee;border-color:#f3d9b8"><b>Come funziona la tappa</b><ul class="small">
      <li>Nel campo <b>Indizio</b> scrivi cosa si vede prima di arrivare (es. «Dove il tram fa capolinea»).</li>
      <li>Nel <b>contenuto</b> (testo, foto o video) metti l'indizio per la tappa ${hunt.step + 1} oppure, se è l'ultima, un messaggio di congratulazioni.</li>
      <li>Le tappe dalla 2 in poi compaiono sulla mappa <b>solo dopo aver trovato la precedente</b>.</li>
      <li>Chi sblocca l'<b>ultima tappa</b> riceve un <b>codice premio unico</b> da mostrarti.</li></ul></div>` : ''}
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
        <p class="muted small">💡 Un <b>video registrato in tempo reale</b>, sul posto e dedicato a chi lo aprirà, rende il pin molto più emozionante (max ${CONFIG.MAX_VIDEO_SECONDS} s). Foto e video pesanti li <b>alleggeriamo noi</b> sul tuo telefono prima di caricarli.</p>
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
    <div class="card" ${dating || hunt ? 'hidden' : ''}><h2>⏳ Capsula del tempo <span class="muted small">(facoltativo)</span></h2>
      <label class="inline"><input type="checkbox" id="capsule" ${capsuleOn ? 'checked' : ''}><span>Si può aprire solo <b>da una data e un'ora</b> nel futuro (compleanni, anniversari, «da aprire tra 10 anni»…)</span></label>
      <div id="capbox" ${capsuleOn ? '' : 'hidden'}>
        <label for="unlockat">Si apre dal</label><input id="unlockat" type="datetime-local">
        <label class="inline"><input type="checkbox" id="anywhere" ${ed && ed.open_anywhere ? 'checked' : ''}><span>Dopo quella data si può aprire <b>anche da lontano</b>, senza andare sul posto</span></label>
        <p class="muted small">Prima della data chi lo riceve vede solo titolo, indizio e il conto alla rovescia.</p></div></div>
    ${dating ? `<div class="card"><h2>4 · Chi può aprirlo</h2>
      <div class="msg info small">💗 I biglietti dating sono <b>visibili a tutti</b> sulla mappa, ma solo gli iscritti a Ubi Dating (18+) che arrivano sul posto possono aprirli e risponderti. Ti avvisiamo via email a ogni risposta.</div></div>` : ''}
    <div class="card" ${dating ? 'hidden' : ''}><h2>4 · Chi può aprirlo</h2>
      <div class="seg" id="vis"><button data-v="restricted" class="on">Persone scelte</button><button data-v="public">Tutti</button><button data-v="hidden">Solo io</button></div>
      <div id="v-restricted">
        <div id="groupbox" hidden><label>👥 Gruppi <span class="muted small">(un tocco seleziona tutti i membri)</span></label><div class="chips" id="groupchips"></div></div>
        <label>Dalla tua rubrica <span class="muted small" id="seln"></span></label>
        <div class="chips" id="book"><span class="muted small">Carico la rubrica…</span></div>
        <details class="quickadd"><summary>＋ Aggiungi un contatto alla rubrica</summary>
          <div class="row" style="flex-wrap:nowrap;margin-top:8px"><input id="qname" maxlength="60" placeholder="Nome"><input id="qemail" type="email" placeholder="email@esempio.it"></div>
          <button type="button" class="ghost full" id="qadd" style="margin-top:8px">Salva e seleziona</button><div id="qm"></div></details>
        <label for="emails">Altre email (facoltative)</label>
        <textarea id="emails" placeholder="maria@esempio.it, luca@esempio.it"></textarea>
        <p class="muted small">Solo chi accede con queste email potrà vederlo.</p>
        <div class="msg info small">📧 ${CONFIG.EMAIL_AUTO ? 'Quando premi <b>Fissa nel luogo</b>, le persone scelte ricevono <b>in automatico un\'email</b> con il link al pin.' : 'Dopo il salvataggio potrai avvisare le persone scelte con un\'email già scritta.'} Puoi anche mandare il link con WhatsApp.</div></div>
      ${isStage ? `<label for="pwd">🧩 Risposta all'indovinello ${ed && ed.has_password ? '(lascia vuoto per tenere quella attuale)' : '(facoltativa)'}</label>
      <input id="pwd" type="text" autocomplete="off" maxlength="64" placeholder="${ed && ed.has_password ? '🔒 risposta attuale mantenuta' : 'Es. campanile'}">
      <p class="muted small">Chi gioca deve <b>scriverla giusta</b>, oltre a essere sul posto, per sbloccare questa tappa. Maiuscole, accenti e spazi non contano. Scrivi l'indovinello nell'<b>indizio</b> di questa tappa o nel contenuto della tappa prima.</p>`
      : `<label for="pwd">${ed && ed.has_password ? 'Nuova password (lascia vuoto per mantenere quella attuale)' : 'Password (facoltativa)'}</label>
      <input id="pwd" type="text" autocomplete="off" maxlength="64" placeholder="${ed && ed.has_password ? '🔒 password attuale mantenuta' : 'Lascia vuoto per nessuna password'}">`}
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
    s.file = null; s.duration = null; s.needShrink = false; $('#preview').innerHTML = ''; msg($('#pm'), '');
    ['#file', '#capvf', '#cappf'].forEach((k) => { $(k).value = ''; });
    if (!f) return;
    const type = f.type.split('/')[0];
    if (!['image', 'video', 'audio'].includes(type)) return msg($('#pm'), 'Formato non supportato.');
    if (type === 'image') {
      let img = f;
      try { const b = await fitImage(f, 2000); if (b.size < f.size) img = new File([b], 'foto.jpg', { type: 'image/jpeg' }); } catch { /* resta l'originale */ }
      if (img.size > CONFIG.MAX_FILE_MB * 1048576) return msg($('#pm'), `Foto troppo grande (max ${CONFIG.MAX_FILE_MB} MB).`);
      $('#preview').innerHTML = `<img src="${URL.createObjectURL(img)}" alt="anteprima">`; s.media_type = 'photo'; s.file = img; addRemoveBtn(); return;
    }
    if (type === 'audio' && f.size > CONFIG.MAX_FILE_MB * 1048576) return msg($('#pm'), `Audio troppo grande (max ${CONFIG.MAX_FILE_MB} MB).`);
    const url = URL.createObjectURL(f);
    const el = document.createElement(type); el.controls = true; el.preload = 'metadata'; el.src = url; if (type === 'video') el.playsInline = true;
    const dur = await new Promise((res) => { el.onloadedmetadata = () => res(el.duration); el.onerror = () => res(NaN); setTimeout(() => res(el.duration), 8000); });
    if (!Number.isFinite(dur)) return msg($('#pm'), 'Non riesco a leggere la durata del file. Prova con un altro formato (MP4, M4A, MP3).');
    if (type === 'video' && dur > CONFIG.MAX_VIDEO_SECONDS + 0.5) {
      return msg($('#pm'), `Il video dura ${Math.round(dur)} s: il massimo è ${CONFIG.MAX_VIDEO_SECONDS}. Accorcialo, oppure caricalo su YouTube e usa "Link".`);
    }
    $('#preview').append(el); s.media_type = type; s.duration = Math.round(dur);
    if (type === 'video' && f.size > VIDEO_TARGET_MB * 1048576) {
      // video pesante: lo riduciamo sul telefono (gratis, nessun servizio esterno). Serve un tocco per partire.
      if (!canShrinkVideo()) return msg($('#pm'), `Il video pesa ${Math.round(f.size / 1048576)} MB (max ${CONFIG.MAX_FILE_MB}) e questo browser non sa ridurlo. Registralo in qualità più bassa (su iPhone: Impostazioni › Fotocamera › Registra video › 720p) oppure usa un link YouTube.`);
      s.needShrink = true;
      $('#preview').insertAdjacentHTML('beforeend', `<button type="button" class="accent full" id="shrink" style="margin-top:8px">🎬 Alleggerisci il video (circa ${Math.max(5, Math.round(dur))} secondi)</button>
        <p class="muted small">Pesa ${Math.round(f.size / 1048576)} MB: lo riduciamo noi sul tuo dispositivo. Tieni lo schermo acceso e resta su questa pagina.</p>`);
      $('#shrink').onclick = async () => {
        const b = $('#shrink'); b.disabled = true;
        try {
          const out = await shrinkVideo(el, dur, (pc) => { b.textContent = `Riduco il video… ${pc}%`; });
          if (out.size > CONFIG.MAX_FILE_MB * 1048576) throw new Error('Anche ridotto è troppo pesante: accorcialo un po\'.');
          s.file = out; s.needShrink = false;
          b.remove(); $('#preview').querySelector('p.muted')?.remove();
          el.src = URL.createObjectURL(out);
          msg($('#pm'), `Fatto ✓ Da ${Math.round(f.size / 1048576)} MB a ${(out.size / 1048576).toFixed(1)} MB.`, 'ok');
          addRemoveBtn();
        } catch (e) { b.disabled = false; b.textContent = '🎬 Riprova ad alleggerire'; msg($('#pm'), errText(e)); }
      };
      return;
    }
    s.file = f; addRemoveBtn();
  };
  // avvisi sui limiti del piano gratuito (si vedono solo quando ci si avvicina)
  if (!ed) B.myQuota().then((q) => {
    if (!q || q.unlimited || !$('#quota')) return;
    const near = [];
    if (q.pins >= q.max_pins) return msg($('#quota'), LIMIT_MSG.UBI_LIMITE_PIN + proBtn, 'info');
    if (q.pins >= q.max_pins - 50) near.push(`ti restano <b>${q.max_pins - q.pins} pin</b>`);
    if (q.files >= q.max_files) near.push('hai finito i <b>file</b> (puoi fare pin di testo o link)');
    else if (q.files >= q.max_files - 10) near.push(`ti restano <b>${q.max_files - q.files} file</b>`);
    if (q.videos >= q.max_videos) near.push('hai finito i <b>video</b>');
    else if (q.videos >= q.max_videos - 2) near.push(`ti restano <b>${q.max_videos - q.videos} video</b>`);
    if (near.length) msg($('#quota'), `Piano gratuito: ${near.join(', ')}.` + proBtn, 'info');
  });

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
    const groups = [...new Set(s.book.flatMap((c) => c.groups || []))].sort();
    $('#groupbox').hidden = !groups.length;
    $('#groupchips').innerHTML = groups.map((g) => {
      const members = s.book.filter((c) => (c.groups || []).includes(g));
      const all = members.every((c) => s.sel.has(c.email));
      return `<button type="button" class="chip ${all ? 'on' : ''}" data-g="${esc(g)}">👥 ${esc(g)} (${members.length})</button>`;
    }).join('');
  };
  $('#groupchips').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const members = s.book.filter((c) => (c.groups || []).includes(b.dataset.g));
    const all = members.every((c) => s.sel.has(c.email));
    members.forEach((c) => (all ? s.sel.delete(c.email) : s.sel.add(c.email)));
    drawBook();
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

  // --- capsula del tempo
  const toLocalInput = (d) => { const x = new Date(d); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  $('#unlockat').min = toLocalInput(Date.now() + 60000);
  if (ed && ed.unlock_at) $('#unlockat').value = toLocalInput(ed.unlock_at);
  else if (opts.capsule) $('#unlockat').value = toLocalInput(Date.now() + 365 * 86400000);
  $('#capsule').onchange = () => { $('#capbox').hidden = !$('#capsule').checked; };
  if (hunt && !ed) $('#vis button[data-v="public"]').click();

  // --- salvataggio
  $('#save').onclick = async () => {
    const err = (t) => msg($('#sm'), t);
    let external_url = null;
    if (s.kind === 'link') {
      external_url = extractUrl($('#url').value);
      if (!external_url) return err('Inserisci un link valido (es. https://…). Puoi incollare anche il messaggio di condivisione.');
    } else if (s.kind === 'text') {
      if (!$('#txt').value.trim()) return err('Scrivi il testo da lasciare in quel luogo.');
    } else if (s.needShrink) return err('Prima tocca «🎬 Alleggerisci il video»: è troppo pesante per caricarlo così.');
    else if (!s.file && !(ed && ['photo', 'video', 'audio'].includes(ed.media_type))) return err('Scegli una foto, un video o un audio.');
    if (s.lat == null) return err('Indica il luogo: GPS, indirizzo, coordinate o tocco sulla mappa.');
    const title = $('#title').value.trim(); if (!title) return err('Dai un titolo al contenuto.');
    let unlock_at = null;
    if (!dating && !hunt && $('#capsule').checked) {
      const v = $('#unlockat').value;
      if (!v) return err('Capsula del tempo: scegli la data e l\'ora di apertura.');
      unlock_at = new Date(v).toISOString();
      const unchanged = ed && ed.unlock_at && Math.abs(Date.parse(ed.unlock_at) - Date.parse(unlock_at)) < 60000;
      if (!unchanged && Date.parse(unlock_at) <= Date.now()) return err('Capsula del tempo: la data deve essere nel futuro.');
    }
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
      visibility: dating ? 'public' : s.vis, recipients: dating ? [] : recipients, password: isStage ? normAnswer($('#pwd').value) : $('#pwd').value,
      is_dating: dating, replies_enabled: dating ? true : $('#replies').checked,
      unlock_at, open_anywhere: !!unlock_at && $('#anywhere').checked,
      hunt_id: hunt ? hunt.id : null, hunt_step: hunt ? hunt.step : null,
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
      if (hunt) { location.hash = `#/caccia/${hunt.id}`; return; }
      const me = await B.profile().catch(() => null);
      viewCreated(title, slug, data.visibility === 'restricted'
        ? { recipients: data.recipients, title, hint: data.hint, slug, author: me?.display_name } : null);
    } catch (e) { err(errText(e)); btn.disabled = false; btn.textContent = ed ? 'Salva le modifiche' : 'Fissa nel luogo'; }
  };
}

// Email già scritta da mandare con la propria app di posta (destinatari in copia nascosta).
// In due lingue: prima quella dell'app, poi l'altra (non sappiamo che lingua parla chi la riceve).
function mailtoHref({ recipients, title, hint, slug, author }) {
  const url = shareUrl(slug);
  const it = [
    'Ciao!', '',
    `${author || 'Un amico'} ha lasciato per te un contenuto su Ubi: «${title}».`,
    hint ? `Indizio: ${hint}` : null, '',
    'Si apre solo quando arrivi sul posto. Apri il link qui sotto per vedere dov\'è:', url, '',
    'Per aprirlo accedi a Ubi con questo indirizzo email (la prima volta: "Registrati").',
  ];
  const en = [
    'Hi!', '',
    `${author || 'A friend'} left something for you on Ubi: «${title}».`,
    hint ? `Hint: ${hint}` : null, '',
    'It only opens when you get there. Open the link below to see where it is:', url, '',
    'To open it, log in to Ubi with this email address (the first time: "Sign up").',
  ];
  const [a, b] = LANG === 'en' ? [en, it] : [it, en];
  const body = [...a, '', '———', '', ...b].filter((x) => x !== null).join('\n');
  const subject = LANG === 'en' ? `📍 ${author || 'Someone'} left something for you on Ubi` : `📍 ${author || 'Qualcuno'} ha lasciato qualcosa per te su Ubi`;
  return `mailto:?bcc=${encodeURIComponent(recipients.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
      <p class="muted">«<span translate="no">${esc(title)}</span>» ora vive in quel luogo. Manda il link: si aprirà solo sul posto.</p></div>
    ${pinShareCard(title, slug, info?.hint)}
    ${info && info.recipients.length ? emailCard(info) : ''}
    <a class="btn ghost full" href="#/">Torna alla mappa</a>`;
  bindPinShare(app);
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
  const story = r.text_body ? `<div class="textbody story">${linkify(r.text_body)}</div>` : '';
  if (type === 'photo') return `<img src="${esc(r.url)}" alt="">${story}`;
  if (type === 'video') return `<video src="${esc(r.url)}" controls playsinline autoplay></video>${story}`;
  return `<audio src="${esc(r.url)}" controls autoplay></audio>${story}`;
}

async function viewContent(slug, user) {
  app.innerHTML = '<p class="muted center">Apro il contenuto…</p>';
  let t;
  try { t = await B.teaser(slug); } catch (err) { app.innerHTML = `<div class="msg err">${errText(err)}</div>`; return; }
  if (!t) {
    if (!user) { setPending(location.hash); return viewLogin('Questo contenuto è riservato. Accedi o registrati: se è per te, lo vedrai.'); }
    app.innerHTML = `<div class="card center"><p style="font-size:44px;margin:0">🔒</p><h2>Questo ricordo è riservato</h2>
      <p class="muted">Solo chi l'ha ricevuto può aprirlo, oppure è stato rimosso.</p>
      <p>Con Ubi anche tu puoi lasciare foto, video e messaggi in un luogo: si aprono solo quando qualcuno ci arriva.</p>
      <a class="btn full accent" href="#/">📍 Scopri Ubi e lascia il tuo</a></div>`;
    return;
  }
  setDatingTheme(t.is_dating);
  if (t.hunt_locked && !t.is_owner) {
    app.innerHTML = `<h1>🗺️ <span translate="no">${esc(t.title)}</span></h1><div class="card center"><p style="font-size:42px;margin:0">🔒</p>
      <p>Questa è la <b>tappa ${t.hunt_step}</b> della caccia al tesoro «${esc(t.hunt_title || '')}».</p>
      <p class="muted">Trova e sblocca prima la tappa ${t.hunt_step - 1}: dopo, questa comparirà sulla mappa.</p>
      <a class="btn" href="#/">Vai alla mappa</a></div>`;
    return;
  }
  const huntLine = t.hunt_id ? `<div class="msg info small">🗺️ Caccia al tesoro «${esc(t.hunt_title || '')}» · tappa <b>${t.hunt_step}</b> di ${t.hunt_steps}</div>${t.hunt_steps > 1 ? `<div class="hprog">${stepBar(t.hunt_step, t.hunt_steps)}</div>` : ''}` : '';
  const opensAt = t.unlock_at ? new Date(t.unlock_at) : null;
  const early = opensAt && Date.now() < opensAt.getTime() && !t.is_owner;
  const anywhereNow = opensAt && t.open_anywhere && Date.now() >= opensAt.getTime();
  const capLine = opensAt ? `<div class="msg info small">⏳ Capsula del tempo · si apre dal <b>${opensAt.toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' })}</b> alle <b>${opensAt.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })}</b>${t.open_anywhere ? ', anche da lontano' : ', sul posto'}</div>` : '';
  const header0 = t.is_dating
    ? `<h1>${datingBadge(t.gender)} <span translate="no">${esc(t.title)}</span></h1><div class="msg info small">💗 Biglietto Ubi Dating${GENDER[t.gender] ? ` di <b>${GENDER[t.gender].n}</b>` : ''}: chi l'ha lasciato resta anonimo finché non vi scegliete entrambi.</div>${tagChips(t.tags)}${t.hint ? `<div class="msg info hint">${linkify(t.hint)}</div>` : ''}`
    : `<h1>${badge(t.media_type)} <span translate="no">${esc(t.title)}</span></h1>${t.author ? authorLine(t, user) : ''}${tagChips(t.tags)}${t.hint ? `<div class="msg info hint">${linkify(t.hint)}</div>` : ''}`;
  const header = header0 + huntLine + capLine;
  const player = t.hunt_id && !t.is_owner;
  const isLast = player && t.hunt_step >= t.hunt_steps;
  const huntNext = !player ? '' : isLast ? ''
    : `<button class="full huntgo" id="huntgo" type="button">🗺️ ${t.hunt_step + 1 === t.hunt_steps ? T2("Scopri l'ultima tappa", 'Reveal the last stage') : T2('Scopri la prossima tappa', 'Reveal the next stage')}</button>`;
  const showUnlocked = (r, d) => {
    stopWatch();
    if (player) { huntRecord(t, slug); if (isLast && huntFocus()?.hunt_id === t.hunt_id) store.set('ubi_hunt_focus', null); }
    const hdr = player && t.hunt_steps > 1 ? header0 + huntLine.replace(/<div class="hprog">[\s\S]*$/, `<div class="hprog">${stepBar(t.hunt_step, t.hunt_steps, true)}</div>`) + capLine : header;
    app.innerHTML = `${hdr}<div class="msg ok">Sbloccato${d != null ? ` a ${d} m dal punto` : ''} ✓</div>
      <div class="card media">${renderMedia(t.media_type, r)}</div>
      ${huntNext}<div id="prizebox"></div>
      ${t.is_owner ? `<a class="btn full" href="#/edit/${esc(slug)}" style="margin-bottom:10px">✏️ Modifica o sostituisci il contenuto</a>
        <button class="danger full" id="delpin" style="margin-bottom:10px">🗑 Elimina questo pin</button>
        ${t.is_dating ? '' : '<button class="ghost full" id="mailbtn" style="margin-bottom:10px">📧 Avvisa i destinatari via email</button><div id="mailbox"></div>'}` : ''}
      ${t.is_dating ? '' : pinShareCard(t.title, slug, t.hint, t.hunt_id && t.hunt_step === 1 ? { title: t.hunt_title || t.title, prize: '', steps: t.hunt_steps } : null)}
      <div id="replybox"></div>
      <a class="btn ghost full" href="${t.is_dating ? '#/dating' : '#/'}">${user ? (t.is_dating ? 'Torna a Ubi Dating' : 'Torna alla mappa') : 'Scopri Ubi'}</a>`;
    bindPinShare(app);
    if ($('#huntgo')) $('#huntgo').onclick = () => {
      store.set('ubi_hunt_focus', JSON.stringify({ hunt_id: t.hunt_id, title: t.hunt_title || '', next: t.hunt_step + 1, steps: t.hunt_steps, lat: t.lat, lng: t.lng, fresh: 1 }));
      lastView = null; location.hash = '#/';
    };
    if (user) replySection(t, slug, $('#replybox')).catch((err) => msg($('#replybox'), errText(err)));
    if (user && t.hunt_id) huntPrizeBox(t, slug, $('#prizebox')).catch(() => {});
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
      ${t.requires_password ? (t.hunt_id ? '<label for="pwd">🧩 La tua risposta all\'indovinello</label><input id="pwd" type="text" autocomplete="off" autocapitalize="off" placeholder="Scrivi qui la risposta">' : '<label for="pwd">Password</label><input id="pwd" type="text" autocomplete="off">') : ''}
      <div id="um"></div>
      ${!user ? '<button class="full" id="login">Accedi per sbloccare</button>'
        : (t.is_dating && !t.is_owner && !t.i_am_dating) ? '<div class="msg info small">I biglietti dating si aprono solo se sei iscritto a Ubi Dating (riservato ai maggiorenni).</div><a class="btn full accent" href="#/dating">💗 Iscriviti a Ubi Dating</a>'
        : early ? `<div class="capsule center"><div style="font-size:44px">⏳</div><p>Questa capsula si apre tra</p><div class="countdown" id="countdown">…</div>
            <p class="muted small">${t.open_anywhere ? 'Quel giorno potrai aprirla da dove vuoi.' : 'Quel giorno dovrai essere sul posto.'}</p></div>`
        : `<button class="full accent" id="unlock">${anywhereNow ? '🔓 Apri la capsula' : '🔓 Sblocca qui'}</button>`}
    </div>
    ${t.is_dating ? '' : pinShareCard(t.title, slug, t.hint, t.hunt_id && t.hunt_step === 1 ? { title: t.hunt_title || t.title, prize: '', steps: t.hunt_steps } : null)}`;
  bindPinShare(app);
  if (early) {
    const tick = () => {
      const el = $('#countdown'); if (!el) { clearInterval(iv); return; }
      let s = Math.max(0, Math.floor((opensAt.getTime() - Date.now()) / 1000));
      if (!s) { clearInterval(iv); route(); return; }
      const dd = Math.floor(s / 86400); s %= 86400; const hh = Math.floor(s / 3600); s %= 3600; const mm = Math.floor(s / 60); s %= 60;
      el.textContent = `${dd ? `${dd} g ` : ''}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const iv = setInterval(tick, 1000); tick();
  }
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
      const pos = anywhereNow ? (me || null) : (me || await getPos());
      const typed = $('#pwd')?.value || '';
      const r = await B.unlock(slug, pos, (t.hunt_id ? normAnswer(typed) : typed) || null);
      const M = {
        too_far: T2(`📍 Ti mancano ${fmtDist(Math.max(1, (r.distance_m ?? 0) - (t.unlock_radius_m || 0)))}: avvicinati ancora.`, `📍 ${fmtDist(Math.max(1, (r.distance_m ?? 0) - (t.unlock_radius_m || 0)))} to go: get closer.`),
        gps_inaccurate: 'Segnale GPS troppo impreciso: spostati all\'aperto e riprova.',
        password_required: t.hunt_id ? 'Scrivi la risposta all\'indovinello.' : 'Serve la password.', wrong_password: t.hunt_id ? 'Risposta sbagliata: rileggi l\'indovinello e riprova.' : 'Password errata.',
        rate_limited: 'Troppi tentativi: riprova tra 15 minuti.', not_found: 'Contenuto non disponibile.',
        login_required: 'Accedi per sbloccare.',
        dating_required: 'Questo biglietto si apre solo se sei iscritto a Ubi Dating (18+). <a href="#/dating">Iscriviti</a>',
        too_early: 'È una capsula del tempo: non si può ancora aprire.',
        hunt_locked: 'Trova prima la tappa precedente della caccia al tesoro.',
      };
      if (r.status === 'ok') {
        showUnlocked(r, r.distance_m);
        if (player) {
          const first = t.hunt_step === 1 && t.hunt_steps > 1;
          huntOverlay({
            kind: 'ok', icon: isLast ? '🏆' : first ? '🚀' : '✅',
            title: isLast ? T2('Hai vinto! 🎉', 'You won! 🎉') : first ? T2('Si parte!', "Let's go!") : T2('Esatto!', 'Correct!'),
            sub: isLast ? T2(`Hai completato «${esc(t.hunt_title || '')}»`, `You completed «${esc(t.hunt_title || '')}»`)
              : first ? T2('Prima tappa trovata. Leggi il primo indizio!', 'First stage found. Read the first clue!')
              : T2(`Tappa ${t.hunt_step} superata. Ecco il prossimo indizio.`, `Stage ${t.hunt_step} cleared. Here is the next clue.`),
            step: t.hunt_step, steps: t.hunt_steps,
            button: isLast ? T2('🎁 Guarda cosa hai vinto', '🎁 See what you won') : T2("📜 Leggi l'indizio", '📜 Read the clue'),
            onClose: () => {
              const el = isLast ? $('#prizebox') : $('.card.media');
              if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); }
            },
          });
        }
        return;
      }
      if (player && r.status === 'wrong_password') {
        huntOverlay({ kind: 'bad', icon: '❌', title: T2('Sbagliato', 'Wrong'), sub: T2("Rileggi bene l'indovinello e riprova: maiuscole e accenti non contano.", "Read the riddle again and retry: capitals and accents don't matter."),
          button: T2('↻ Riprova', '↻ Try again'), onClose: () => { const i = $('#pwd'); if (i) { i.focus(); i.select(); } } });
        btn.disabled = false; return;
      }
      msg($('#um'), M[r.status] || r.status, r.status === 'too_far' ? 'warn' : 'err');
    } catch (err) { msg($('#um'), errText(err)); }
    btn.disabled = false;
  };
}


// Ridimensiona una foto (lato lungo max 1600 px, JPEG) senza ritagliarla
// ---------- Video più leggeri, direttamente sul dispositivo (nessun servizio esterno, nessun costo) ----------
const VIDEO_TARGET_MB = 20;
const shrinkMime = () => ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || null;
const canShrinkVideo = () => !!(shrinkMime() && HTMLCanvasElement.prototype.captureStream && (window.AudioContext || window.webkitAudioContext));
// Rivede il video e lo ri-registra più piccolo (max 1280 px, bitrate calcolato per stare sotto ~16 MB).
// Va chiamata direttamente da un tocco dell'utente: Safari fa partire l'audio solo così.
function shrinkVideo(v, dur, onProgress) {
  const mime = shrinkMime();
  const k = Math.min(1, 1280 / Math.max(v.videoWidth || 1280, v.videoHeight || 720));
  const c = document.createElement('canvas');
  c.width = Math.round((v.videoWidth || 1280) * k / 2) * 2; c.height = Math.round((v.videoHeight || 720) * k / 2) * 2;
  const g = c.getContext('2d');
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC(); const dest = ac.createMediaStreamDestination();
  try { ac.createMediaElementSource(v).connect(dest); } catch { /* già collegato: va bene */ }
  const stream = c.captureStream(30);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const vbps = Math.max(600000, Math.min(2500000, Math.floor((16 * 8388608) / Math.max(dur, 1)) - 128000));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vbps, audioBitsPerSecond: 96000 });
  const parts = []; rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  v.controls = false; v.muted = false; v.currentTime = 0;
  rec.start(1000);
  const playing = v.play();   // subito, dentro il tocco
  return new Promise((res, rej) => {
    let stopped = false;
    const finish = () => { if (stopped) return; stopped = true; try { rec.stop(); } catch { /* già fermo */ } };
    rec.onstop = () => {
      v.pause(); v.controls = true; ac.close().catch(() => {});
      const type = mime.split(';')[0];
      const blob = new Blob(parts, { type });
      if (!blob.size) return rej(new Error('Non sono riuscito a ridurre il video: prova a registrarlo in qualità più bassa.'));
      res(new File([blob], type === 'video/mp4' ? 'video.mp4' : 'video.webm', { type }));
    };
    const draw = () => {
      if (stopped) return;
      g.drawImage(v, 0, 0, c.width, c.height);
      onProgress(Math.min(99, Math.round((v.currentTime / dur) * 100)));
      if (v.ended) return finish();
      requestAnimationFrame(draw);
    };
    v.onended = finish;
    Promise.resolve(playing).then(draw).catch(() => { stopped = true; try { rec.stop(); } catch { /* */ } rej(new Error('Il browser non ha fatto partire il video: tocca di nuovo il bottone.')); });
  });
}

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

// ======================= CAPSULA DEL TEMPO =======================
const fmtWhen = (d) => new Date(d).toLocaleString(LOC, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function viewCapsules() {
  app.innerHTML = `<h1>⏳ Capsula del tempo</h1>
    <div class="card datingtips" style="background:#fbf6ec;border-color:#eadcc0"><b>Un messaggio per il futuro.</b>
      <ul class="small"><li>Lasci un video, una foto o una lettera in un luogo e scegli <b>da quando</b> si potrà aprire: tra un mese, al compleanno dei 18 anni, tra dieci anni.</li>
      <li>Fino a quel momento chi lo riceve vede solo il titolo e il conto alla rovescia.</li>
      <li>Decidi tu se, arrivata la data, serve andare sul posto oppure si apre <b>anche da lontano</b>.</li></ul></div>
    <a href="#/new/capsula" class="btn accent full">＋ Crea una capsula del tempo</a>
    <h2 style="margin-top:22px">Le mie capsule</h2><div id="caps"><p class="muted center">Carico…</p></div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  try {
    const list = (await B.listMine()).filter((c) => c.unlock_at).sort((a, b) => Date.parse(a.unlock_at) - Date.parse(b.unlock_at));
    $('#caps').innerHTML = list.length ? list.map((c) => {
      const open = Date.parse(c.unlock_at) <= Date.now();
      return `<div class="card"><div class="item"><div class="ico">${iconBadge(open ? '🔓' : '⏳', open ? '#2e7d32' : '#8a6d3b', '')}</div>
        <div><div class="t">${esc(c.title)}</div><div class="meta">${open ? 'Aperta dal' : 'Si apre il'} ${fmtWhen(c.unlock_at)}${c.open_anywhere ? ' · da ovunque' : ' · sul posto'}</div></div></div>
        <div class="actions"><a class="btn" href="#/c/${esc(c.share_slug)}">Apri</a><a class="btn ghost" href="#/edit/${esc(c.share_slug)}">Modifica</a></div></div>`;
    }).join('') : '<div class="card center muted">Non hai ancora creato capsule del tempo.</div>';
  } catch (err) { msg($('#caps'), errText(err)); }
}

// ======================= CACCIA AL TESORO =======================
async function huntPrizeBox(t, slug, box) {
  if (!box) return;
  if (t.is_owner) { box.innerHTML = `<a class="btn ghost full" href="#/caccia/${esc(t.hunt_id)}" style="margin-bottom:10px">🗺️ Gestisci la caccia e i premi</a>`; return; }
  const p = await B.myHuntPrize(slug);
  if (!p || !document.body.contains(box)) return;
  if (!p.is_last) { if ($('#huntgo')) return; box.innerHTML = `<div class="msg ok">🗺️ Tappa ${t.hunt_step} di ${p.steps} trovata! La tappa ${t.hunt_step + 1} ora compare sulla mappa: segui l'indizio qui sopra.</div>`; return; }
  // Caccia di una sola tappa = offerta in negozio: stessi codici unici, testi da promozione
  if (p.steps === 1) {
    box.innerHTML = p.code
      ? `<div class="card prize center"><div style="font-size:46px">🎁</div><h2>Offerta sbloccata!</h2>
        <p><b>${esc(p.prize)}</b></p><div class="prizecode">${esc(p.code)}</div>
        ${p.redeemed_at ? `<p class="muted">Codice già usato il ${fmtWhen(p.redeemed_at)}.</p>` : '<p><b>Mostra questo codice alla cassa.</b> È solo tuo, vale una volta: sei tra i primi che hanno sbloccato l\'offerta.</p>'}</div>`
      : `<div class="card center"><h2>🎁 Offerta esaurita</h2><p class="muted">I codici sconto di questa offerta sono già stati presi tutti. Il contenuto resta tuo: guardalo quando vuoi.</p></div>`;
    return;
  }
  if (p.code) {
    box.innerHTML = `<div class="card prize center"><div style="font-size:46px">🏆</div><h2>Hai completato «<span translate="no">${esc(p.hunt_title)}</span>»!</h2>
      <p>Hai vinto: <b>${esc(p.prize)}</b></p><div class="prizecode">${esc(p.code)}</div>
      ${p.redeemed_at ? `<p class="muted">Premio già ritirato il ${fmtWhen(p.redeemed_at)}.</p>` : '<p><b>Mostra questo codice</b> a chi ha organizzato la caccia per ritirare il premio. Il codice è solo tuo e vale una volta.</p>'}</div>`;
    return;
  }
  box.innerHTML = `<div class="card center"><h2>🏁 Hai completato «<span translate="no">${esc(p.hunt_title)}</span>»!</h2><p class="muted">${p.sold_out ? 'Peccato: i premi sono già stati vinti tutti. Grazie per aver giocato!' : 'Complimenti!'}</p></div>`;
}
async function viewHunts() {
  app.innerHTML = `<h1>🗺️ Caccia al tesoro</h1>
    <div class="card datingtips" style="background:#fff8ee;border-color:#f3d9b8"><b>Una promo da giocare in città.</b>
      <ul class="small"><li>Crei la caccia e scegli il <b>premio</b> (es. «una birra media o una maglietta») e quanti vincitori al massimo.</li>
      <li>Aggiungi le <b>tappe</b> (es. 3): ognuna è un pin con un indizio. La tappa successiva compare solo dopo aver trovato la precedente.</li>
      <li>Chi sblocca l'ultima riceve un <b>codice unico</b>: lo verifichi qui e lo segni come ritirato.</li>
      <li><b>Offerta in negozio</b> (es. «−20% ai primi 30»): crea una caccia con <b>una sola tappa</b> davanti al prodotto. I primi che la sbloccano ricevono ognuno un codice diverso; finiti i codici, gli altri vedono «Offerta esaurita».</li></ul></div>
    <div class="card"><form id="hf"><h2>Nuova caccia</h2>
      <label for="ht">Nome</label><input id="ht" maxlength="80" required placeholder="Es. La caccia del Kymera">
      <label for="hp">Premio</label><input id="hp" maxlength="200" required placeholder="Es. Una birra media o una maglietta">
      <label for="hm">Numero massimo di vincitori</label><input id="hm" type="number" min="1" max="10000" value="30">
      <div id="hm2"></div><button class="full accent" type="submit">Crea la caccia</button></form></div>
    <h2 style="margin-top:22px">Le mie cacce</h2><div id="hl"><p class="muted center">Carico…</p></div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  $('#hf').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const h = await B.createHunt({ title: $('#ht').value.trim(), prize: $('#hp').value.trim(), max_winners: Math.max(1, +$('#hm').value || 30) });
      location.hash = `#/caccia/${h.id}`;
    } catch (err) { msg($('#hm2'), errText(err)); }
  };
  try {
    const list = await B.listHunts();
    $('#hl').innerHTML = list.length ? list.map((h) => `<a class="card item" href="#/caccia/${esc(h.id)}" style="text-decoration:none;color:inherit">
      <div class="ico">${chestBadge(0)}</div><div><div class="t">${esc(h.title)}</div><div class="meta">🏆 ${esc(h.prize)} · max ${h.max_winners} vincitori</div></div></a>`).join('')
      : '<div class="card center muted">Nessuna caccia ancora.</div>';
  } catch (err) { msg($('#hl'), errText(err)); }
}
async function viewHunt(id) {
  app.innerHTML = '<p class="muted center">Carico…</p>';
  const h = await B.getHunt(id);
  if (!h) { app.innerHTML = '<div class="card center">Caccia non trovata. <a href="#/cacce">Le mie cacce</a></div>'; return; }
  const [steps, winners] = await Promise.all([B.huntSteps(id), B.huntWinners(id)]);
  const next = steps.length ? Math.max(...steps.map((x) => x.hunt_step)) + 1 : 1;
  app.innerHTML = `<h1>🗺️ <span translate="no">${esc(h.title)}</span></h1>
    <p class="muted">🏆 ${esc(h.prize)} · vincitori: <b>${winners.length}/${h.max_winners}</b></p>
    <div class="card"><h2>Tappe</h2>
      ${steps.length ? steps.map((x) => `<div class="item"><div class="ico">${chestBadge(x.hunt_step)}</div><div style="flex:1"><div class="t">${esc(x.title)}</div></div>
        <a class="btn ghost" href="#/c/${esc(x.share_slug)}">Apri</a></div>`).join('') : '<p class="muted">Nessuna tappa: aggiungi la prima.</p>'}
      ${next <= 20 ? `<a class="btn accent full" href="#/new/caccia-${esc(id)}" style="margin-top:10px">＋ Aggiungi la tappa ${next}</a>` : ''}
      ${steps.length ? `<p class="muted small">Le tappe dalla 2 in poi si scoprono giocando: condividi la caccia qui sotto.</p>` : ''}</div>
    ${steps.length ? pinShareCard((steps.find((x) => x.hunt_step === 1) || steps[0]).title, (steps.find((x) => x.hunt_step === 1) || steps[0]).share_slug, '', { title: h.title, prize: h.prize, steps: steps.length }) : ''}
    <div class="card" id="hstats" hidden></div>
    <div class="card"><h2>✅ Verifica un codice premio</h2>
      <div class="row"><input id="code" maxlength="6" placeholder="Es. A1B2C3" style="text-transform:uppercase;font-size:20px;letter-spacing:3px"><button class="accent" id="chk" style="flex:0 0 auto">Verifica</button></div>
      <div id="cm"></div></div>
    <div class="card"><h2>Vincitori</h2>
      ${winners.length ? `<table class="tbl"><tr><th>Codice</th><th>Nome</th><th>Vinto</th><th>Ritirato</th></tr>${winners.map((w) => `<tr><td><b>${esc(w.code)}</b></td><td>${esc(w.name || '—')}</td><td>${fmtWhen(w.won_at)}</td><td>${w.redeemed_at ? `✅ <span class="small muted">${fmtWhen(w.redeemed_at)}</span>` : `<button type="button" class="accent small" data-redeem="${esc(w.code)}">✓ Ritirato</button>`}</td></tr>`).join('')}</table>
        <p class="muted small">Il cliente ti mostra il codice sul telefono: se è uguale a quello sulla sua riga, tocca <b>✓ Ritirato</b> (due tocchi per confermare). Così nessuno ritira due volte.</p>`
        : '<p class="muted">Ancora nessun vincitore.</p>'}</div>
    ${steps.length ? `<div class="card"><h2>📑 Duplica la caccia</h2>
      <p class="small">Crea una copia con le stesse tappe (foto, testi, indizi e risposte) da mettere in un'altra zona, per esempio per un altro locale. Vincitori e statistiche ripartono da zero.</p>
      <button type="button" class="full" id="dupopen">📑 Duplica caccia</button><div id="dupbox" hidden></div></div>` : ''}
    <p class="center small"><a href="#/cacce">Le mie cacce</a> · <a href="#" id="hdel">Elimina la caccia</a></p>`;
  if ($('#dupopen')) $('#dupopen').onclick = () => huntDuplicatePanel(h, steps);
  bindPinShare(app);
  B.huntStats(id).then((st) => {
    if (!st || !st.length || !$('#hstats')) return;
    const tot = st.reduce((a, r) => a + Number(r.sblocchi), 0), nu = st.reduce((a, r) => a + Number(r.nuovi_iscritti), 0);
    $('#hstats').innerHTML = `<h2>📊 Statistiche</h2>
      <p><b>${tot}</b> sblocchi · <b>${nu}</b> nuovi iscritti a Ubi arrivati da questa caccia · <b>${winners.length}</b> codici dati, <b>${winners.filter((w) => w.redeemed_at).length}</b> ritirati</p>
      ${st.length > 1 ? `<table class="tbl"><tr><th>Tappa</th><th>Sblocchi</th><th>Nuovi iscritti</th></tr>${st.map((r) => `<tr><td>${r.tappa} · ${esc(r.titolo)}</td><td>${r.sblocchi}</td><td>${r.nuovi_iscritti}</td></tr>`).join('')}</table>` : ''}
      <p class="muted small">Solo numeri: Ubi non comunica nomi né email di chi ha sbloccato.</p>`;
    $('#hstats').hidden = false;
  });
  app.querySelectorAll('[data-redeem]').forEach((b) => { b.onclick = async () => {
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma ritiro?'; setTimeout(() => { if (document.body.contains(b) && !b.disabled) { b.dataset.confirm = ''; b.textContent = '✓ Ritirato'; } }, 4000); return; }
    b.disabled = true; b.textContent = '…';
    try {
      const r = await B.huntRedeem(id, b.dataset.redeem);
      if (r.status === 'already') alert(`Questo premio era già stato ritirato${r.redeemed_at ? ' il ' + fmtWhen(r.redeemed_at) : ''}.`);
      viewHunt(id);
    } catch (err) { b.disabled = false; b.textContent = '✓ Ritirato'; alert(errText(err)); }
  }; });
  $('#chk').onclick = async () => {
    const code = $('#code').value.trim(); if (!code) return;
    try {
      const r = await B.huntRedeem(id, code);
      const M = { ok: ['ok', `✅ Codice valido! Consegna «${esc(r.prize)}» a <b>${esc(r.name || 'il vincitore')}</b>. Segnato come ritirato.`],
        already: ['err', `⚠️ Codice già usato il ${r.redeemed_at ? fmtWhen(r.redeemed_at) : ''}${r.name ? ` da ${esc(r.name)}` : ''}.`],
        not_found: ['err', '❌ Codice non valido per questa caccia.'] };
      const [k, t] = M[r.status] || ['err', esc(r.status)];
      msg($('#cm'), t, k);
      if (r.status === 'ok') { const h = location.hash; setTimeout(() => { if (location.hash === h) viewHunt(id); }, 2500); }
    } catch (err) { msg($('#cm'), errText(err)); }
  };
  $('#hdel').onclick = async (e) => {
    e.preventDefault();
    if (e.target.dataset.confirm !== '1') { e.target.dataset.confirm = '1'; e.target.textContent = 'Conferma: elimina la caccia (le tappe restano come pin normali)'; return; }
    try { await B.deleteHunt(id); location.hash = '#/cacce'; } catch (err) { msg($('#cm'), errText(err)); }
  };
}

// Duplica: scegli sulla mappa dove va la tappa 1; le altre si spostano insieme, con le stesse distanze.
async function huntDuplicatePanel(h, steps) {
  const box = $('#dupbox'); $('#dupopen').hidden = true; box.hidden = false;
  const s1 = steps.find((x) => x.hunt_step === 1) || steps[0];
  box.innerHTML = `<label for="dupt">Nome della copia</label><input id="dupt" maxlength="80" value="${esc((h.title + ' – copia').slice(0, 80))}">
    <p class="small" style="margin:12px 0 6px"><b>Dove la metti?</b> Tocca la mappa nel punto della nuova <b>tappa 1</b>: le altre tappe si spostano insieme, alla stessa distanza tra loro.</p>
    <div class="row" style="margin-bottom:8px"><input id="dupq" placeholder="Cerca un posto (es. Clusone, piazza)"><button type="button" class="ghost" id="dupgo" style="flex:0 0 auto">Cerca</button></div>
    <button type="button" class="ghost full" id="dupme">📍 Usa la mia posizione</button>
    <div class="map" id="dupmap" style="height:300px;margin-top:8px"></div>
    <p class="muted small" id="dupinfo">Nessun punto scelto: tocca la mappa.</p>
    <button type="button" class="full accent" id="dupok" disabled>📑 Duplica qui</button><div id="dupm"></div>
    <p class="muted small">Dopo puoi aprire ogni tappa e usare <b>Modifica</b> per sistemarla al punto giusto (davanti al locale, a una vetrina…).</p>`;
  await waitLeaflet();
  const map = makeMap($('#dupmap'), s1.lat, s1.lng, 15); if (!map) return;
  const orig = L.layerGroup().addTo(map), copy = L.layerGroup().addTo(map);
  const ico = (n, cls) => L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: chestBadge(n, `pin ${cls}`) });
  steps.forEach((x) => L.marker([x.lat, x.lng], { icon: ico(x.hunt_step, 'dupold') }).addTo(orig));
  let shift = null;
  const place = (lat, lng) => {
    shift = { dlat: lat - s1.lat, dlng: lng - s1.lng };
    copy.clearLayers();
    const pts = steps.map((x) => [x.lat + shift.dlat, x.lng + shift.dlng]);
    steps.forEach((x, i) => L.marker(pts[i], { icon: ico(x.hunt_step, 'dupnew'), zIndexOffset: 500 }).addTo(copy));
    if (pts.length > 1) L.polyline(pts, { color: '#c8901a', weight: 3, dashArray: '6 8' }).addTo(copy);
    map.fitBounds(pts.length > 1 ? pts : [pts[0], pts[0]], { padding: [50, 50], maxZoom: 17 });
    $('#dupinfo').textContent = `Nuova tappa 1 a ${fmtDist(distanceM(s1.lat, s1.lng, lat, lng))} dalla vecchia. Le tappe nuove sono i forzieri pieni.`;
    $('#dupok').disabled = false;
  };
  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
  $('#dupme').onclick = async () => { try { const p = await getPos(); place(p.lat, p.lng); } catch { msg($('#dupm'), 'Posizione non disponibile: tocca la mappa.'); } };
  const search = async () => {
    const q = $('#dupq').value.trim(); if (!q) return;
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&q=${encodeURIComponent(q)}`)).json();
      if (!r.length) return msg($('#dupm'), 'Posto non trovato: prova con un altro nome o tocca la mappa.');
      $('#dupm').innerHTML = ''; map.setView([+r[0].lat, +r[0].lon], 16);
    } catch { msg($('#dupm'), 'Ricerca non disponibile: sposta la mappa a mano.'); }
  };
  $('#dupgo').onclick = search; $('#dupq').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } };
  $('#dupok').onclick = async () => {
    if (!shift) return;
    const b = $('#dupok'); b.disabled = true; b.textContent = 'Copio le tappe…';
    try {
      const nh = await B.duplicateHunt(h.id, { title: $('#dupt').value.trim() || h.title, ...shift });
      location.hash = `#/caccia/${nh.id}`;
    } catch (err) { b.disabled = false; b.textContent = '📑 Duplica qui'; msg($('#dupm'), errText(err)); }
  };
}

// ======================= DONI (regali da sbloccare in un negozio) =======================
// Un dono appartiene a una persona alla volta, si apre sul posto tra due date e si può regalare.
// Nasce da una campagna (garden: tanti alberi) o dalla Cassa di un negozio (pub: «regala una birra»).
const THEMES = {
  natale: { e: '🎄', n: 'Natale', en: 'Christmas', c: '#1e7d45' },
  capodanno: { e: '🎆', n: 'Capodanno', en: "New Year's Eve", c: '#3b2a7a' },
  sanvalentino: { e: '💝', n: 'San Valentino', en: "Valentine's Day", c: '#c2185b' },
  pasqua: { e: '🥚', n: 'Pasqua', en: 'Easter', c: '#7cb342' },
  festamamma: { e: '💐', n: 'Festa della mamma', en: "Mother's Day", c: '#d81b60' },
  compleanno: { e: '🎂', n: 'Compleanno', en: 'Birthday', c: '#f57c00' },
  regalo: { e: '🎁', n: 'Regalo', en: 'Gift', c: '#c0392b' },
};
const themeOf = (k) => THEMES[k] || THEMES.regalo;
const TREE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.2l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z" fill="#ffd54a"/>'
  + '<polygon points="12,4 16.5,9.5 14.3,9.5 18.6,14.5 16,14.5 20.5,19.6 3.5,19.6 8,14.5 5.4,14.5 9.7,9.5 7.5,9.5" fill="#1e7d45"/>'
  + '<rect x="10.6" y="19.6" width="2.8" height="3" fill="#8a4b12"/>'
  + '<circle class="l1" cx="11" cy="9" r="1" fill="#ffd54a"/><circle class="l2" cx="14.2" cy="12.6" r="1" fill="#ff5252"/>'
  + '<circle class="l3" cx="9.3" cy="13.4" r="1" fill="#4fc3f7"/><circle class="l1" cx="15.6" cy="17.4" r="1" fill="#ffd54a"/>'
  + '<circle class="l2" cx="8" cy="17.6" r="1" fill="#ff5252"/><circle class="l3" cx="12" cy="16" r="1" fill="#fff"/></svg>';
const BOX_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="27" width="46" height="31" rx="3" fill="#c0392b"/>'
  + '<rect x="6" y="19" width="52" height="11" rx="3" fill="#e74c3c"/><rect x="29" y="19" width="6" height="39" fill="#ffd54a"/>'
  + '<path d="M32 19c-5-11-18-10-14-2 2 3 8 3 14 2zm0 0c5-11 18-10 14-2-2 3-8 3-14 2z" fill="#ffd54a"/></svg>';
// icona sulla mappa: albero per Natale, emoji per gli altri temi; il mio è più grande e si illumina
const giftIcon = (theme, mine) => theme === 'natale'
  ? `<span class="gtree${mine ? ' gmine' : ''}">${TREE_SVG}</span>`
  : `<span class="gtree gemo${mine ? ' gmine' : ''}" style="--gc:${themeOf(theme).c}">${theme === 'regalo' ? BOX_SVG : themeOf(theme).e}</span>`;
const giftArt = (theme) => `<div class="giftart th-${esc(theme)}">${theme === 'natale' ? TREE_SVG : BOX_SVG}${theme !== 'natale' && theme !== 'regalo' ? `<span class="gae">${themeOf(theme).e}</span>` : ''}</div>`;
const dLong = (d) => new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'long', year: 'numeric' });
const giftUrl = (kind, token) => `${location.origin}${location.pathname}#/${kind}/${token}`;

// Disegna alberi/pacchi su una mappa Leaflet; fall = animazione «cadono dal cielo»
function drawGiftTrees(map, trees, { fall = false, onMine = null, layer = null } = {}) {
  const g = layer || L.layerGroup().addTo(map);
  if (layer) layer.clearLayers();
  trees.slice(0, 600).forEach((t, i) => {
    const size = t.mine ? 48 : 28;
    const html = `<span class="gwrap${fall ? ' gfall' : ''}" style="animation-delay:${fall ? Math.min(1.6, i * 0.035 + Math.random() * 0.3).toFixed(2) : 0}s">${giftIcon(t.theme, t.mine)}</span>`;
    const m = L.marker([t.lat, t.lng], { icon: L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html }),
      zIndexOffset: t.mine ? 2000 : 0, keyboard: !!t.mine, title: t.mine ? T2('Il tuo regalo', 'Your gift') : '' });
    m.on('click', () => { if (t.mine && t.gift_id) { if (onMine) onMine(t); else location.hash = `#/doni/${t.gift_id}`; } else huntToast(T2('Questo è il regalo di qualcun altro 🎁', "This is someone else's gift 🎁")); });
    m.addTo(g);
  });
  return g;
}

// ---------- Il biglietto: QR scansionato (#/dono/<token>) ----------
async function viewGiftClaim(token) {
  app.innerHTML = '<div class="card center muted">Apro il tuo regalo…</div>';
  let r;
  try { r = await B.giftClaim(token); } catch (err) { app.innerHTML = `<div class="card">${errText(err)}</div>`; return; }
  if (r.status === 'ok') { history.replaceState(null, '', `#/doni/${r.gift.id}`); return viewGift(r.gift.id, { fresh: true }); }
  const M = {
    taken: T2('Questo regalo è già stato preso da un\'altra persona. Se è tuo, chiedi al negozio un nuovo biglietto.', 'This gift has already been taken by someone else. If it is yours, ask the shop for a new card.'),
    not_found: T2('Biglietto non trovato: controlla il codice.', 'Card not found: check the code.'),
  };
  app.innerHTML = `<div class="card center">${giftArt('regalo')}<h2>${T2('Ops!', 'Oops!')}</h2><p>${M[r.status] || esc(r.status)}</p><a class="btn" href="#/doni">${T2('I miei regali', 'My gifts')}</a></div>`;
}

// ---------- Il link «Regalalo» (#/regalo/<token>) ----------
async function viewGiftReceive(token, user) {
  app.innerHTML = '<div class="card center muted">…</div>';
  let p = null; try { p = await B.giftPeek(token); } catch { /* sotto */ }
  if (!p) {
    app.innerHTML = `<div class="card center">${giftArt('regalo')}<h2>${T2('Questo regalo non è più disponibile', 'This gift is no longer available')}</h2>
      <p class="muted">${T2('Il link vale una volta sola: forse è già stato accettato, annullato o è scaduto.', 'The link works only once: it may have been accepted, cancelled or expired.')}</p><a class="btn" href="#/">Ubi</a></div>`;
    return;
  }
  const from = p.from ? esc(p.from) : T2('qualcuno che ti vuole bene', 'someone who cares about you');
  app.innerHTML = `<div class="giftpage th-${esc(p.theme)}">
    ${giftArt(p.theme)}
    <h1>${T2('Hai ricevuto un regalo!', 'You received a gift!')}</h1>
    <p class="gfrom">${T2('Da', 'From')}: <b>${from}</b></p>
    ${p.prize ? `<p class="gprize">🎁 <b>${esc(p.prize)}</b></p>` : ''}
    <div class="card"><p>📍 ${T2('Ti aspetta da', 'Waiting for you at')} <b translate="no">${esc(p.business)}</b>${p.address ? `<br><span class="muted small">${esc(p.address)}</span>` : ''}</p>
      <p class="small">🗓️ ${new Date(p.opens_at) > new Date() ? `${T2('Si apre dal', 'Opens from')} <b>${dLong(p.opens_at)}</b> · ` : ''}${T2('Valido fino al', 'Valid until')} <b>${dLong(p.expires_at)}</b></p>
      ${p.has_message ? `<p class="small">💌 ${T2('Dentro c\'è anche un messaggio per te: lo leggi quando lo apri sul posto.', 'There is also a message for you inside: you can read it when you open it there.')}</p>` : ''}</div>
    ${user ? `<button class="full accent" id="acc" type="button">🎁 ${T2('Accetta il regalo', 'Accept the gift')}</button>`
      : `<a class="btn full accent" href="#/" id="acc2">🎁 ${T2('Accedi o registrati per accettarlo', 'Log in or sign up to accept it')}</a>
         <p class="muted small center">${T2('Ubi è gratis: ti serve solo per aprire il regalo quando arrivi lì.', 'Ubi is free: you only need it to open the gift when you get there.')}</p>`}
    <div id="am"></div></div>`;
  if (!user) { $('#acc2').onclick = (e) => { e.preventDefault(); viewLogin(); }; return; }
  $('#acc').onclick = async () => {
    $('#acc').disabled = true;
    try {
      const r = await B.giftAccept(token);
      if (r.status === 'ok') { history.replaceState(null, '', `#/doni/${r.gift.id}`); return viewGift(r.gift.id, { fresh: true }); }
      const M = { own: T2('È un regalo che hai creato tu: mandalo a un\'altra persona.', 'You created this gift: send it to someone else.'),
        used: T2('Questo link è già stato usato.', 'This link has already been used.'), expired: T2('Questo regalo è scaduto.', 'This gift has expired.') };
      msg($('#am'), M[r.status] || esc(r.status)); $('#acc').disabled = false;
    } catch (err) { msg($('#am'), errText(err)); $('#acc').disabled = false; }
  };
}

// ---------- I miei regali ----------
async function viewGifts() {
  app.innerHTML = `<h1>🎁 ${T2('I miei regali', 'My gifts')}</h1><div id="gl"><p class="muted center">…</p></div>
    <div class="card"><h2>${T2('Hai un biglietto?', 'Got a card?')}</h2><p class="muted small">${T2('Inquadra il QR con la fotocamera oppure scrivi qui il codice stampato.', 'Scan the QR with your camera or type the printed code here.')}</p>
      <div class="row"><input id="gcode" placeholder="ABCD-EFGH" autocapitalize="characters" autocomplete="off"><button type="button" id="gok" style="flex:0 0 auto">${T2('Apri', 'Open')}</button></div><div id="gm"></div></div>
    <p class="center"><a href="#/">${T2('Torna alla mappa', 'Back to the map')}</a></p>`;
  $('#gok').onclick = () => { const v = $('#gcode').value.trim(); if (v) location.hash = `#/dono/${encodeURIComponent(v)}`; };
  let list = [];
  try { list = await B.myGifts(); } catch (err) { msg($('#gl'), errText(err)); return; }
  const ST = { open: T2('da aprire', 'to open'), not_yet: T2('non ancora', 'not yet'), unlocked: T2('aperto: ritiralo', 'opened: collect it'),
    redeemed: T2('ritirato ✓', 'collected ✓'), expired: T2('scaduto', 'expired'), hidden: '' };
  $('#gl').innerHTML = list.length ? list.map((g) => `<a class="card item glink" href="#/doni/${esc(g.id)}">
      <div class="ico">${giftIcon(g.theme, true)}</div>
      <div><div class="t">${g.prize ? esc(g.prize) : T2('Regalo a sorpresa', 'Surprise gift')} · <span translate="no">${esc(g.business)}</span></div>
      <div class="meta">${g.gifted ? T2('🎁 in regalo (link inviato)', '🎁 being gifted (link sent)') : ST[g.state] || ''} · ${T2('fino al', 'until')} ${dLong(g.expires_at)}</div></div></a>`).join('')
    : `<div class="card center muted">${T2('Non hai ancora regali. Quando un negozio ti dà un biglietto, inquadra il QR.', "You don't have gifts yet. When a shop gives you a card, scan its QR.")}</div>`;
}

// Tracce per scrivere il pensiero
const GIFT_STARTERS = () => (LANG === 'en'
  ? ['I am giving you this because…', 'I remember that time when…', 'When you open it, think about…']
  : ['Ti regalo questo perché…', 'Mi ricordo quella volta che…', 'Quando lo apri, pensa a…']);
const GIFT_IDEAS = () => (LANG === 'en' ? {
  natale: ['A small gift for a great year together. When you open it, raise a glass for me too 🎄', 'Merry Christmas! This is to remind you how special you are ✨'],
  piante: ['This plant grows with you: every time you water it, think of me 🌱', 'A flower to say thank you, since I never manage to say it out loud', 'For your new home: may it bring roots and lots of light 🏡'],
  amici: ['This beer is waiting for you. Sorry we don’t see each other enough: next round is on you 🍺', 'The first coffee of the day is on me ☕'],
  amore: ['For you, simply because I love you ❤️', 'Open it thinking of us 💝'],
  grazie: ['For all the times you were there. Thank you, really.'],
} : {
  natale: ['Un piccolo regalo per un grande anno insieme. Quando lo apri, brinda anche per me 🎄', 'Buon Natale! Questo è per ricordarti quanto sei speciale ✨'],
  piante: ['Questa pianta cresce con te: ogni volta che la annaffi, pensa a me 🌱', 'Un fiore per dirti grazie, che a voce non riesco mai', 'Per la tua nuova casa: che porti radici e tanta luce 🏡', 'Ti regalo una pianta perché i fiori appassiscono, noi no'],
  amici: ['Questa birra ti aspetta. Scusa se non ci vediamo abbastanza: la prossima la offri tu 🍺', 'Il primo caffè di oggi lo bevi pensando a me ☕'],
  amore: ['Per te, semplicemente perché ti amo ❤️', 'Aprilo pensando a noi 💝'],
  grazie: ['Per tutte le volte che ci sei stato. Grazie, davvero.', 'Per la mamma, che fa fiorire tutto quello che tocca 💐'],
});

// ---------- La pagina del mio regalo ----------
async function viewGift(id, { fresh = false } = {}) {
  let g;
  try { g = await B.giftGet(id); } catch (err) { app.innerHTML = `<div class="card">${errText(err)}</div>`; return; }
  if (!g) { app.innerHTML = `<div class="card center"><h2>${T2('Regalo non trovato', 'Gift not found')}</h2><p class="muted">${T2('Forse l\'hai regalato a qualcun altro.', 'Maybe you gave it to someone else.')}</p><a class="btn" href="#/doni">${T2('I miei regali', 'My gifts')}</a></div>`; return; }
  const th = themeOf(g.theme), from = g.from != null ? (g.from ? esc(g.from) : T2('qualcuno che ti vuole bene', 'someone who cares about you')) : '';
  const open = g.state === 'open', notYet = g.state === 'not_yet';
  const intro = g.intro ? esc(g.intro) : T2('Vieni a sbloccare il tuo regalo', 'Come and unlock your gift');
  const head = `${giftArt(g.theme)}
    ${g.state === 'unlocked' || g.state === 'redeemed' ? '' : `<h1>${intro}</h1>`}
    <p class="gwhere">📍 <b translate="no">${esc(g.business)}</b>${g.address ? ` · ${esc(g.address)}` : ''}</p>
    ${from && g.state !== 'unlocked' && g.state !== 'redeemed' ? `<p class="gfrom">💌 ${T2('Un regalo da', 'A gift from')} <b>${from}</b>${g.has_message ? T2(': dentro c\'è un messaggio per te', ': there is a message for you inside') : ''}</p>` : ''}`;
  let body = '';
  if (g.state === 'unlocked' || g.state === 'redeemed') {
    body = `<h1>🎉 ${T2('Hai trovato', 'You found')}: <span class="gprizebig">${esc(g.prize || '')}</span></h1>
      ${g.prize_image ? `<img class="gimg" src="${esc(g.prize_image)}" alt="">` : ''}
      ${g.prize_meaning ? `<p class="gmeaning">🌿 ${esc(g.prize_meaning)}</p>` : ''}
      ${g.message ? `<div class="card gmsg"><p>${esc(g.message).replace(/\n/g, '<br>')}</p><p class="gsign">— ${from || T2('qualcuno che ti vuole bene', 'someone who cares about you')}</p></div>` : ''}
      ${g.state === 'redeemed' ? `<div class="msg ok">✓ ${T2('Ritirato il', 'Collected on')} ${dLong(g.redeemed_at)}</div>`
        : `<div class="card center gcodebox"><p class="small">${T2('Mostra questo codice in cassa', 'Show this code at the till')}</p><div class="gcode">${esc(g.redeem_code || '')}</div>
          <p class="small muted">${T2('Ritiralo entro il', 'Collect it by')} <b>${dLong(g.expires_at)}</b></p></div>`}`;
  } else if (g.state === 'expired') {
    body = `<div class="msg warn">⏰ ${T2('Questo regalo è scaduto il', 'This gift expired on')} ${dLong(g.expires_at)}.</div>`;
  } else if (g.state === 'hidden') {
    body = `<div class="msg info">${T2('Questo regalo non è più disponibile.', 'This gift is no longer available.')}</div>`;
  } else {
    body = `${g.prize ? `<p class="gprize">🎁 <b>${esc(g.prize)}</b></p>` : `<p class="gprize">🎁 ${T2('Cosa c\'è dentro? Lo scopri solo lì.', "What's inside? You'll only find out there.")}</p>`}
      <p class="gdates">🗓️ ${notYet ? `${T2('Si apre dal', 'Opens from')} <b>${dLong(g.opens_at)}</b> · ` : ''}${T2('fino al', 'until')} <b>${dLong(g.expires_at)}</b></p>
      <div id="gmap" class="map" style="height:260px"></div>
      <p class="center" id="gdist"></p>
      ${g.gifted ? '' : `<button class="full accent" id="gunlock" type="button" ${notYet ? 'disabled' : ''}>🔓 ${notYet ? T2('Si apre dal', 'Opens from') + ' ' + dLong(g.opens_at) : T2('Sblocca qui', 'Unlock here')}</button>`}
      <div id="gum"></div>
      <div class="card" id="gsend"></div>`;
  }
  app.innerHTML = `<div class="giftpage th-${esc(g.theme)}" style="--gc:${th.c}">${head}${body}
    <p class="center small" style="margin-top:16px"><a href="#/doni">${T2('I miei regali', 'My gifts')}</a> · <a href="#/">${T2('Mappa', 'Map')}</a></p></div>`;
  if (fresh && (open || notYet)) huntToast(T2('🎁 Il regalo è tuo!', '🎁 The gift is yours!'));
  if (!(open || notYet)) return;
  let lastPos = null;
  giftSendPanel(g);
  // mappa dell'area: cadono gli alberi, il mio si illumina
  waitLeaflet().then(async () => {
    const el = $('#gmap'); if (!el) return;
    const map = makeMap(el, g.area_lat, g.area_lng, 17); if (!map) return;
    L.circle([g.area_lat, g.area_lng], { radius: g.radius_m, color: th.c, weight: 2, fillOpacity: 0.06, dashArray: '6 6' }).addTo(map);
    const d = 0.004;
    let trees = [];
    try { trees = await B.giftTrees({ s: g.area_lat - d, w: g.area_lng - d * 1.4, n: g.area_lat + d, e: g.area_lng + d * 1.4 }); } catch { /* solo il mio */ }
    if (!trees.some((t) => t.gift_id === g.id)) trees.push({ lat: g.lat, lng: g.lng, theme: g.theme, mine: true, gift_id: g.id });
    trees.sort((a, b) => a.mine - b.mine);   // il mio cade per ultimo
    drawGiftTrees(map, trees, { fall: true, onMine: () => $('#gunlock') && $('#gunlock').scrollIntoView({ behavior: 'smooth', block: 'center' }) });
    let meM = null;
    const upd = (p) => {
      if (!document.body.contains(el)) { stopWatch(); return; }
      lastPos = { ...p, at: Date.now() };
      if (!meM) meM = L.circleMarker([p.lat, p.lng], { radius: 7, color: '#1f3a5f', fillOpacity: 0.9 }).addTo(map); else meM.setLatLng([p.lat, p.lng]);
      const dm = distanceM(p.lat, p.lng, g.area_lat, g.area_lng);
      $('#gdist').innerHTML = dm <= g.radius_m ? `<b class="ok">✓ ${T2('Sei nell\'area: puoi sbloccare!', "You're in the area: you can unlock!")}</b>`
        : `📍 ${T2('Ti mancano', 'You are')} <b>${fmtDist(dm - g.radius_m)}</b>${LANG === 'en' ? ' away' : ''}`;
    };
    if (navigator.geolocation) { stopWatch(); watchId = navigator.geolocation.watchPosition((p) => upd({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }); }
  });
  const ub = $('#gunlock');
  if (ub) ub.onclick = async () => {
    ub.disabled = true; msg($('#gum'), T2('Controllo dove sei…', 'Checking where you are…'), 'info');
    let pos = lastPos && Date.now() - lastPos.at < 15000 ? lastPos : null;   // posizione appena letta dalla mappa: niente attesa
    if (!pos) { try { pos = await getPos(); } catch (err) { msg($('#gum'), errText(err)); ub.disabled = false; return; } }
    try {
      const r = await B.giftUnlock(g.id, pos);
      if (r.status === 'ok') {
        stopWatch();
        huntOverlay({ kind: 'ok', icon: '🎁', title: T2('Regalo sbloccato!', 'Gift unlocked!'), sub: g.has_message ? T2('Dentro c\'è anche un messaggio per te 💌', 'There is a message for you inside 💌') : '',
          button: T2('🎉 Guarda cosa hai trovato', '🎉 See what you found'), onClose: () => { const c = $('.gcodebox'); if (c) c.classList.add('flash'); } });
        return viewGift(g.id);
      }
      const M = { too_far: T2(`📍 Ti mancano ${fmtDist(Math.max(1, (r.distance_m || 0) - (r.radius_m || 0)))}: entra nell'area del negozio.`, `📍 ${fmtDist(Math.max(1, (r.distance_m || 0) - (r.radius_m || 0)))} to go: get into the shop's area.`),
        not_yet: T2('Non è ancora il giorno giusto: si apre dal', 'Not the right day yet: it opens from') + ' ' + dLong(g.opens_at) + '.',
        expired: T2('Questo regalo è scaduto.', 'This gift has expired.'), gifting: T2('Hai creato un link per regalarlo: annullalo qui sotto se vuoi aprirlo tu.', 'You created a link to give it away: cancel it below if you want to open it yourself.'),
        no_position: T2('Posizione non disponibile.', 'Location not available.') };
      msg($('#gum'), M[r.status] || esc(r.status), r.status === 'too_far' ? 'warn' : 'err');
    } catch (err) { msg($('#gum'), errText(err)); }
    ub.disabled = false;
  };
}

// «Regalalo a chi vuoi tu»: pensiero guidato + link da mandare (vale una volta)
function giftSendPanel(g) {
  const box = $('#gsend'); if (!box) return;
  const draw = () => {
    box.innerHTML = g.gifted
      ? `<h2>🎁 ${T2('Link del regalo inviato', 'Gift link sent')}</h2><p class="small">${T2('Quando la persona lo accetta, il regalo passa a lei e sparisce da qui. Il link vale una volta sola.', 'When the person accepts it, the gift moves to them and disappears from here. The link works only once.')}</p>
         <div class="row"><button class="ghost" type="button" id="gnew">${T2('Crea un nuovo link', 'Create a new link')}</button><button class="danger" type="button" id="gcancel">${T2('Annulla: lo tengo io', 'Cancel: I keep it')}</button></div><div id="gsm"></div>`
      : `<button class="full giftbtn" type="button" id="gopen">🎁 ${T2('Regalalo a chi vuoi tu', 'Give it to someone you love')}</button>
         <p class="muted small center" style="margin:6px 0 0">${T2('Un\'amica, tuo figlio, la nonna: il regalo passa a loro, con un tuo pensiero.', 'A friend, your child, your grandma: the gift goes to them, with a note from you.')}</p>`;
    if ($('#gopen')) $('#gopen').onclick = compose;
    if ($('#gnew')) $('#gnew').onclick = compose;
    if ($('#gcancel')) $('#gcancel').onclick = async () => { try { await B.giftSendCancel(g.id); g.gifted = false; draw(); viewGift(g.id); } catch (err) { msg($('#gsm'), errText(err)); } };
  };
  const compose = async () => {
    const ideas = GIFT_IDEAS();
    const groups = [...(g.theme === 'natale' ? ['natale'] : []), 'piante', 'amici', 'amore', 'grazie'];
    const prof = await B.profile().catch(() => null);
    const ph = (ideas[groups[0]] || [])[0] || '';
    box.innerHTML = `<h2>✍️ ${T2('Scrivi un pensiero per chi lo riceverà', 'Write a note for whoever receives it')}</h2>
      <p class="muted small">${T2('Lo leggerà solo quando aprirà il regalo, sul posto.', 'They will read it only when they open the gift, on the spot.')}</p>
      <div class="chips" id="gst">${GIFT_STARTERS().map((x) => `<button type="button" class="chip" data-s="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <textarea id="gtxt" rows="5" maxlength="500" placeholder="${esc(ph)}"></textarea>
      <p class="muted small"><span id="gtn">0</span>/500</p>
      <details class="gideas"><summary>💡 ${T2('Non sai cosa scrivere? Prendi un\'idea', "Don't know what to write? Take an idea")}</summary>
        ${groups.map((k) => `<p class="small gk">${{ natale: T2('Natale', 'Christmas'), piante: T2('Piante e fiori', 'Plants and flowers'), amici: T2('Amici', 'Friends'), amore: T2('Amore', 'Love'), grazie: T2('Grazie', 'Thank you') }[k]}</p>
          ${(ideas[k] || []).map((x) => `<button type="button" class="gidea" data-i="${esc(x)}">${esc(x)}</button>`).join('')}`).join('')}</details>
      <label for="gfrom">${T2('Firma', 'Signature')}</label><input id="gfrom" maxlength="60" value="${esc(prof?.display_name || '')}">
      <label class="check"><input type="checkbox" id="ganon"> ${T2('Resta anonimo: «da qualcuno che ti vuole bene»', 'Stay anonymous: «from someone who cares about you»')}</label>
      <button class="full giftbtn" type="button" id="gmake">🎁 ${T2('Crea il link del regalo', 'Create the gift link')}</button><div id="gsm"></div>`;
    const ta = $('#gtxt');
    ta.oninput = () => { $('#gtn').textContent = ta.value.length; };
    $('#gst').onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; const s0 = b.dataset.s.replace(/…$/, ' ');
      ta.value = ta.value ? `${ta.value.trim()}\n${s0}` : s0; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.oninput(); };
    box.querySelectorAll('.gidea').forEach((b) => { b.onclick = () => { ta.value = b.dataset.i; ta.oninput(); ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    $('#ganon').onchange = () => { $('#gfrom').disabled = $('#ganon').checked; };
    $('#gmake').onclick = async () => {
      const b = $('#gmake'); b.disabled = true;
      try {
        const r = await B.giftSend(g.id, ta.value, $('#ganon').checked ? '' : $('#gfrom').value);
        if (r.status !== 'ok') { msg($('#gsm'), esc(r.status)); b.disabled = false; return; }
        g.gifted = true;
        const url = giftUrl('regalo', r.token);
        const text = T2(`🎁 Ti ho fatto un regalo da ${g.business}! Aprilo entro il ${dLong(g.expires_at)}:`, `🎁 I got you a gift at ${g.business}! Open it by ${dLong(g.expires_at)}:`);
        box.innerHTML = `<h2>🎁 ${T2('Ecco il link del regalo', 'Here is the gift link')}</h2>
          <p class="small">${T2('Mandalo alla persona a cui vuoi regalarlo. Vale una volta sola: quando lo accetta, il regalo passa a lei.', 'Send it to the person you want to give it to. It works only once: when they accept it, the gift moves to them.')}</p>
          <p class="linkbox">${esc(url)}</p>
          <div class="row"><a class="btn" style="background:#25d366" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}">WhatsApp</a>
          <button type="button" id="gshare">${T2('Condividi…', 'Share…')}</button><button type="button" class="ghost" id="gcopy">${T2('Copia', 'Copy')}</button></div>
          <div id="gsm"></div><p class="small center"><a href="#" id="gback">${T2('Ci ho ripensato: annulla', 'Changed my mind: cancel')}</a></p>`;
        $('#gcopy').onclick = async () => { try { await navigator.clipboard.writeText(`${text} ${url}`); $('#gcopy').textContent = T2('Copiato ✓', 'Copied ✓'); } catch { /* copia a mano */ } };
        $('#gshare').onclick = async () => { try { if (navigator.share) await navigator.share({ text: `${text} ${url}` }); else $('#gcopy').click(); } catch { /* annullato */ } };
        $('#gback').onclick = async (e) => { e.preventDefault(); await B.giftSendCancel(g.id); g.gifted = false; viewGift(g.id); };
        const u = $('#gunlock'); if (u) u.remove();
      } catch (err) { msg($('#gsm'), errText(err)); b.disabled = false; }
    };
  };
  draw();
}

// ======================= PAGINA «PER LE ATTIVITÀ» (#/business) =======================
// Presentazioni da scaricare e stampare (file in /pdf). Quelle senza file non compaiono finché non sono pronte.
const PDFS = [
  { k: 'attivita', t: 'Ubi per le attività (presentazione completa)', f: 'pdf/Ubi-per-le-attivita.pdf' },
  { k: 'campagne', t: 'Campagne regalo (garden e negozi)', f: 'pdf/Ubi-campagne-regalo.pdf' },
  { k: 'consumazione', t: 'Regala una consumazione (bar e pub)', f: 'pdf/Ubi-regala-una-consumazione.pdf' },
  { k: 'caccia', t: 'Caccia al tesoro', f: 'pdf/Ubi-caccia-al-tesoro.pdf' },
  { k: 'capsula', t: 'Capsula del tempo', f: 'pdf/Ubi-capsula-del-tempo.pdf' },
  { k: 'banner', t: 'Banner pubblicitario', f: 'pdf/Ubi-banner-pubblicitario.pdf' },
];
// Contatti per le attività (numero di lavoro di Andrea, pubblico per sua scelta)
const BIZ_PHONE = '351 666 1495', BIZ_WA = 'https://wa.me/393516661495';
const bizContacts = (topic = 'Ubi per la mia attività') => `<div class="bizcontacts">
  <a class="btn full" style="background:#25d366;color:#fff" href="${BIZ_WA}?text=${encodeURIComponent(`Ciao Andrea, vorrei informazioni su ${topic}.`)}" target="_blank" rel="noopener">💬 Scrivici su WhatsApp</a>
  <div class="row"><a class="btn ghost" href="tel:+39${BIZ_PHONE.replace(/ /g, '')}">📞 ${BIZ_PHONE}</a><a class="btn ghost" href="mailto:info@ubipin.it?subject=${encodeURIComponent(topic)}">✉️ Email</a></div></div>`;
const PDF_ICON = '<svg class="pdfi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15H6z" fill="#e53935"/><path d="M15 2v5h5" fill="#ffcdd2"/><text x="13" y="18" text-anchor="middle" font-size="6.5" font-weight="900" fill="#fff" font-family="sans-serif">PDF</text></svg>';
// Video tutorial (cartella /video): un pulsante «▶️ Guarda come funziona» per servizio
const VIDEOS = {
  pin: { f: 'video/Ubi-tutorial-come-si-apre-un-pin.mp4', s: 20 },
  campagne: { f: 'video/Ubi-tutorial-campagne-regalo.mp4', s: 42 },
  consumazione: { f: 'video/Ubi-tutorial-regala-una-consumazione.mp4', s: 36 },
  caccia: { f: 'video/Ubi-tutorial-caccia-al-tesoro.mp4', s: 39 },
  capsula: { f: 'video/Ubi-tutorial-capsula-del-tempo.mp4', s: 31 },
  lascia: { f: 'video/Ubi-tutorial-lascia.mp4', s: 21 },
  condividi: { f: 'video/Ubi-tutorial-condividi.mp4', s: 18 },
  gestisci: { f: 'video/Ubi-tutorial-gestisci.mp4', s: 18 },
  rispondi: { f: 'video/Ubi-tutorial-rispondi.mp4', s: 19 },
  gruppi: { f: 'video/Ubi-tutorial-gruppi.mp4', s: 21 },
  whatsapp: { f: 'video/Ubi-tutorial-whatsapp.mp4', s: 16 },
  a_negozio: { f: 'video/Ubi-admin-negozio.mp4', s: 23 },
  a_campagna: { f: 'video/Ubi-admin-campagna.mp4', s: 19 },
  a_banner: { f: 'video/Ubi-admin-banner.mp4', s: 18 },
  a_caccia: { f: 'video/Ubi-admin-caccia.mp4', s: 21 },
};
const videoBtn = (k, short = false) => { const v = VIDEOS[k]; return v ? `<a class="btn full vidbtn" href="${v.f}" target="_blank" rel="noopener">▶️ ${short ? 'Video' : 'Guarda come funziona'} <span class="small">(${v.s} s)</span></a>` : ''; };
const pdfShort = (k) => { const x = PDFS.find((y) => y.k === k); return x && x.f ? `<a class="btn ghost full pdfbtn" href="${x.f}" target="_blank" rel="noopener" download>${PDF_ICON}<span>Scarica PDF</span></a>` : ''; };
const pdfBtn = (k) => { const x = PDFS.find((y) => y.k === k); return x && x.f ? `<a class="btn ghost full pdfbtn" href="${x.f}" target="_blank" rel="noopener" download>${PDF_ICON}<span>Scarica il PDF: ${esc(x.t)}</span></a>` : ''; };
const PARTNER_CATS = {
  garden: { e: '🌿', n: 'Garden' }, fiorista: { e: '💐', n: 'Fiorista' }, bar: { e: '☕', n: 'Bar' }, pub: { e: '🍺', n: 'Pub' },
  ristorante: { e: '🍽️', n: 'Ristorante' }, pasticceria: { e: '🧁', n: 'Pasticceria' }, negozio: { e: '🛍️', n: 'Negozio' }, altro: { e: '⭐', n: 'Attività' },
};
async function viewBusiness() {
  const mail = 'mailto:info@ubipin.it?subject=Voglio%20diventare%20partner%20di%20Ubi';
  app.innerHTML = `<div class="biz" translate="no">
    <section class="bizhero">${TREE_SVG}<p class="bizk">UBI PER LE ATTIVITÀ</p>
      <h1>Porta i clienti nel tuo negozio.<br><em>Con un regalo.</em></h1>
      <p>Regali da sbloccare solo da te: il cliente torna, scopre il premio e ne parla agli amici.</p>
      <a class="btn full accent" style="background:var(--accent);color:#fff" href="${mail}">✉️ Diventa partner</a>
      ${pdfBtn('attivita').replace('class="btn ghost full pdfbtn"', 'class="btn full pdfbtn pdflight"')}</section>
    <h2>Come funziona</h2>
    <div class="bizsteps">
      <div><b>1</b><p><strong>Dai un biglietto</strong> con un QR ai tuoi clienti, alla cassa.</p></div>
      <div><b>2</b><p><strong>Sulla mappa</strong> cadono gli alberi: il suo si illumina e lo aspetta nel tuo negozio.</p></div>
      <div><b>3</b><p><strong>Torna da te</strong>, lo sblocca nell'area che scegli, scopre il premio e lo ritira in cassa.</p></div></div>
    <h2>Cosa puoi fare</h2>
    <div class="bizcards">
      <div class="card"><span class="bize">🎄</span><h3>Campagne regalo</h3><p>Natale, San Valentino, Festa della mamma, Pasqua: tanti regali a sorpresa, uno per cliente, con scadenza.</p>${videoBtn('campagne', true)}${pdfShort('campagne')}</div>
      <div class="card"><span class="bize">🍺</span><h3>Regala una consumazione</h3><p>Un caffè, una birra, un hamburger: il cliente paga al banco e lo regala a chi vuole, con un messaggio.</p>${videoBtn('consumazione', true)}${pdfShort('consumazione')}</div>
      <div class="card"><span class="bize">🗺️</span><h3>Caccia al tesoro</h3><p>Indovinelli e tappe nel paese, con il premio da ritirare da te.</p>${videoBtn('caccia', true)}${pdfShort('caccia')}</div>
      <div class="card"><span class="bize">⏳</span><h3>Capsula del tempo</h3><p>Messaggi e video che si aprono in una data scelta: matrimoni, scuole, sagre, anniversari.</p>${videoBtn('capsula', true)}${pdfShort('capsula')}</div>
      <div class="card"><span class="bize">📣</span><h3>Banner</h3><p>Il tuo logo nella pagina principale di Ubi, con il link al tuo sito o ai social.</p>${pdfShort('banner')}</div></div>
    <h2>Perché funziona</h2>
    <ul class="bizwhy">
      <li><b>Il cliente torna</b>: il regalo si apre solo nel tuo negozio, tra le date che scegli tu.</li>
      <li><b>Clienti nuovi</b>: chi riceve un biglietto può regalarlo a un amico, con un pensiero scritto.</li>
      <li><b>Numeri chiari</b>: dalla tua pagina Cassa vedi biglietti attivati, regalati e ritirati.</li>
      <li><b>Niente da installare</b>: Ubi funziona dal browser del telefono, per te e per i clienti.</li>
      <li><b>Lo prepariamo noi</b>: tu ci dici premi e date, noi creiamo la campagna e i biglietti da stampare.</li></ul>
    <h2>▶️ Guarda come funziona</h2>
    <div class="pdfs">${videoBtn('campagne').replace('Guarda come funziona', 'Campagne regalo')}${videoBtn('consumazione').replace('Guarda come funziona', 'Regala una consumazione')}${videoBtn('caccia').replace('Guarda come funziona', 'Caccia al tesoro')}${videoBtn('capsula').replace('Guarda come funziona', 'Capsula del tempo')}${videoBtn('pin').replace('Guarda come funziona', 'Come si apre un pin')}</div>
    <h2>📄 Presentazioni da scaricare</h2>
    <p class="muted small">Da stampare o da mandare via email e WhatsApp.</p>
    <div class="pdfs">${PDFS.filter((x) => x.f).map((x) => pdfBtn(x.k)).join('')}</div>
    <h2>⭐ I nostri partner</h2>
    <div id="partners"><p class="muted center">…</p></div>
    <div class="card center bizcta"><h2>Vuoi la tua campagna?</h2><p>Scrivici o chiamaci: nome dell'attività, paese e che tipo di regalo ti piacerebbe offrire.</p>
      ${bizContacts()}
      <p class="small muted">Guida completa: <a href="#/faq/negozi">come funziona per i negozi</a></p></div>
    <p class="center"><a href="#/">Ubi</a></p></div>`;
  let ps = [];
  try { ps = await B.publicPartners(); } catch { /* elenco non disponibile */ }
  const box = $('#partners'); if (!box) return;
  box.innerHTML = ps.length ? `<div class="partners">${ps.map((x) => { const c = PARTNER_CATS[x.category] || PARTNER_CATS.altro;
    return `<div class="card partner">${x.logo_url ? `<img src="${esc(x.logo_url)}" alt="" loading="lazy">` : `<span class="plogo">${c.e}</span>`}
      <div><h3 translate="no">${esc(x.name)}</h3><p class="small muted">${c.e} ${c.n}${x.city ? ` · ${esc(x.city)}` : ''}</p>
      ${x.blurb ? `<p class="small">${esc(x.blurb)}</p>` : ''}
      <p class="small">${x.website ? `<a href="${esc(x.website)}" target="_blank" rel="noopener">Sito</a>` : ''}${x.website && x.lat != null ? ' · ' : ''}${x.lat != null ? `<a href="https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}" target="_blank" rel="noopener">📍 Dove si trova</a>` : ''}</p></div></div>`; }).join('')}</div>`
    : '<div class="card center"><p><b>Stiamo scegliendo i primi partner.</b></p><p class="muted">Diventa la prima attività della tua zona su Ubi.</p></div>';
}

// ======================= CASSA del negozio (#/cassa/<token>) =======================
async function viewCashier(token) {
  const KEY = `ubi_cassa_${token}`;
  let pin = null; try { pin = sessionStorage.getItem(KEY); } catch { /* niente */ }
  const askPin = (err = '') => {
    app.innerHTML = `<div class="card cassa"><h1>🧾 Cassa</h1><p class="muted">${T2('Scrivi il PIN del negozio per controllare i regali dei clienti.', "Enter the shop PIN to check customers' gifts.")}</p>
      <input id="cpin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN">
      <button class="full" id="cgo" type="button">${T2('Entra', 'Enter')}</button><div id="cm"></div></div>`;
    if (err) msg($('#cm'), esc(err));
    $('#cpin').focus();
    const go = () => { pin = $('#cpin').value.trim(); try { sessionStorage.setItem(KEY, pin); } catch { /* niente */ } load(); };
    $('#cgo').onclick = go; $('#cpin').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  };
  const fail = (r) => { if (r && r.status === 'error') { try { sessionStorage.removeItem(KEY); } catch { /* niente */ } askPin(r.message); return true; } return false; };
  const load = async () => {
    if (!pin) return askPin();
    let info;
    try { info = await B.cashierInfo(token, pin); } catch (err) { return askPin(err.message); }
    if (fail(info)) return;
    app.innerHTML = `<div class="cassa"><h1>🧾 ${T2('Cassa', 'Till')} · <span translate="no">${esc(info.business)}</span></h1>
      <div class="card"><h2>${T2('Controlla un regalo', 'Check a gift')}</h2>
        <p class="muted small">${T2('Scrivi il codice che il cliente ti mostra sul telefono (o quello del biglietto).', 'Type the code the customer shows on their phone (or the one on the card).')}</p>
        <div class="row"><input id="ccode" autocapitalize="characters" autocomplete="off" placeholder="ABC123"><button id="cchk" type="button" style="flex:0 0 auto">${T2('Verifica', 'Check')}</button></div>
        <div id="cres"></div></div>
      ${info.items.length ? `<div class="card"><h2>🎁 ${T2('Vendi un regalo', 'Sell a gift')}</h2>
        <p class="muted small">${T2('Il cliente paga qui, tu tocchi l\'articolo: nasce un regalo con il suo QR da mandare a chi vuole.', 'The customer pays here, you tap the item: a gift is created with a QR to send to anyone.')}</p>
        <div class="citems">${info.items.map((i) => `<button type="button" class="ghost" data-item="${esc(i.id)}">🎁 ${esc(i.name)}${i.value ? ` <span class="muted small">${esc(i.value)}</span>` : ''}</button>`).join('')}</div>
        <div id="cissue"></div></div>` : ''}
      ${info.campaigns.length ? `<div class="card"><h2>📊 ${T2('Numeri', 'Numbers')}</h2>${info.campaigns.map((c) => `<p><b>${themeOf(c.theme).e} ${esc(c.title)}</b><br>
        <span class="small">${c.kind === 'omaggio' ? `${T2('Biglietti', 'Cards')}: ${c.total} · ${T2('attivati', 'activated')}: ${c.claimed} · ` : `${T2('Venduti', 'Sold')}: ${c.total} · `}${T2('regalati ad altri', 'given to others')}: ${c.gifted} · ${T2('aperti', 'opened')}: ${c.unlocked} · ${T2('ritirati', 'collected')}: <b>${c.redeemed}</b>${c.redeemed_gifted ? ` (${c.redeemed_gifted} ${T2('da chi l\'ha ricevuto in regalo', 'by gift recipients')})` : ''}</span></p>`).join('')}</div>` : ''}
      <p class="center small"><a href="#" id="cexit">${T2('Esci dalla cassa', 'Leave the till')}</a></p></div>`;
    $('#cexit').onclick = (e) => { e.preventDefault(); try { sessionStorage.removeItem(KEY); } catch { /* niente */ } pin = null; askPin(); };
    const check = async (redeem = false) => {
      const code = $('#ccode').value.trim(); if (!code) return;
      const out = $('#cres');
      try {
        const r = await B.cashierCheck(token, pin, code, redeem);
        if (fail(r)) return;
        const prize = esc(r.prize || '');
        if (r.status === 'valid') {
          out.innerHTML = `<div class="cbig ok">✓ ${T2('Valido', 'Valid')}<br><b>${prize}</b>${r.gifted ? `<br><span class="small">🎁 ${T2('ricevuto in regalo', 'received as a gift')}</span>` : ''}</div>
            <button class="full accent" type="button" id="cred">✓ ${T2('Segna come ritirato', 'Mark as collected')}</button>`;
          $('#cred').onclick = () => { const b = $('#cred'); if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = T2('Tocca ancora per confermare', 'Tap again to confirm'); return; } check(true); };
        } else if (r.status === 'redeemed') {
          out.innerHTML = `<div class="cbig ok">✓ ${T2('Ritirato', 'Collected')}: <b>${prize}</b></div>`; buzz([60, 40, 120]); $('#ccode').value = '';
        } else if (r.status === 'already') {
          out.innerHTML = `<div class="cbig bad">⚠️ ${T2('Già ritirato il', 'Already collected on')} ${new Date(r.redeemed_at).toLocaleString(LOC)}<br><b>${prize}</b></div>`;
        } else if (r.status === 'locked') {
          out.innerHTML = `<div class="cbig warn">🔒 ${T2('Non ancora aperto', 'Not opened yet')}<br><span class="small">${T2('Il cliente deve aprirlo sul telefono stando qui nel negozio.', 'The customer has to open it on the phone while here in the shop.')}</span></div>`;
        } else if (r.status === 'expired') {
          out.innerHTML = `<div class="cbig warn">⏰ ${T2('Scaduto il', 'Expired on')} ${dLong(r.expires_at)}<br><b>${prize}</b></div>
            <button class="ghost full" type="button" id="cext">${T2('Proroga di 7 giorni', 'Extend by 7 days')}</button>`;
          $('#cext').onclick = async () => { const x = await B.cashierExtend(token, pin, code, 7); if (fail(x)) return; out.innerHTML = `<div class="cbig ok">${T2('Prorogato fino al', 'Extended until')} ${dLong(x.expires_at)}</div>`; };
        } else out.innerHTML = `<div class="cbig bad">✗ ${T2('Codice non trovato', 'Code not found')}</div>`;
      } catch (err) { msg(out, errText(err)); }
    };
    $('#cchk').onclick = () => check(false);
    $('#ccode').onkeydown = (e) => { if (e.key === 'Enter') check(false); };
    app.querySelectorAll('[data-item]').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.c !== '1') { app.querySelectorAll('[data-item]').forEach((x) => { x.dataset.c = ''; x.classList.remove('accent'); }); b.dataset.c = '1'; b.classList.add('accent'); msg($('#cissue'), T2('Tocca ancora per creare il regalo (dopo che il cliente ha pagato).', 'Tap again to create the gift (after the customer has paid).'), 'info'); return; }
        b.dataset.c = ''; b.classList.remove('accent');
        try {
          const r = await B.cashierIssue(token, pin, b.dataset.item);
          if (fail(r)) return;
          const url = giftUrl('dono', r.token);
          $('#cissue').innerHTML = `<div class="card center cqr"><p><b>🎁 ${esc(r.prize)}</b> · ${T2('valido fino al', 'valid until')} ${dLong(r.expires_at)}</p>
            ${qrSvg(url, 220)}<p class="small">${T2('Il cliente inquadra il QR con la fotocamera: il regalo diventa suo e poi può regalarlo a chi vuole.', 'The customer scans the QR with the camera: the gift becomes theirs and then they can give it to anyone.')}</p>
            <p class="small muted">${T2('Codice', 'Code')}: <b>${esc(r.code)}</b></p>
            <a class="btn" style="background:#25d366" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`🎁 ${r.prize} – ${url}`)}">${T2('Manda su WhatsApp', 'Send on WhatsApp')}</a></div>`;
        } catch (err) { msg($('#cissue'), errText(err)); }
      };
    });
  };
  load();
}
const qrSvg = (text, size = 200) => {
  const m = qrMatrix(text), n = m.length, q = 2;
  let d = ''; m.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + q} ${y + q}h1v1h-1z`; }));
  return `<svg class="qr" width="${size}" height="${size}" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};

// ======================= ADMIN: negozi, campagne, biglietti =======================
async function adminShopsTab(box) {
  let list;
  try { list = await B.adminBusinesses(); } catch (err) { box.innerHTML = `<div class="card">${errText(err)}</div>`; return; }
  try { const pd = await B.adminPartnerData(); list.forEach((b) => { b.p = pd.find((x) => x.id === b.id) || null; }); } catch { /* SQL partner non ancora lanciato */ }
  const today = new Date().toISOString().slice(0, 10);
  box.innerHTML = `<p class="muted small">${T2('Ogni negozio ha la sua spunta: togliendola sparisce il pannello e la Cassa, ma non si cancella niente. «Nascondi anche i doni» li toglie pure dalla mappa dei clienti.', '')}</p>
    <button type="button" class="full" id="bnew">＋ Nuovo negozio</button><div id="bform"></div>
    ${list.map((b, i) => `<div class="card shop" data-i="${i}">
      <div class="row" style="align-items:center"><h2 style="margin:0;flex:1">${esc(b.name)}</h2>
        <span class="pill ${b.active ? 'on' : 'off'}">${b.active ? 'attivo' : 'sospeso'}</span></div>
      <p class="small muted">${esc(b.address || '')}</p>
      <label class="check"><input type="checkbox" data-a="en" ${b.enabled ? 'checked' : ''}> <b>Area riservata attiva</b></label>
      <label class="check"><input type="checkbox" data-a="hide" ${b.hide_campaigns ? 'checked' : ''}> Nascondi anche i doni dalla mappa (casi gravi)</label>
      <div class="row" style="align-items:center"><label style="flex:0 0 auto;margin:0">Attivo fino al</label><input type="date" data-a="until" value="${esc(b.active_until || '')}" min="${today}"><button type="button" class="ghost" data-a="nountil" style="flex:0 0 auto">✕</button></div>
      ${b.active_until && b.active_until < today ? '<div class="msg warn small">Scaduto: il servizio è sospeso da solo.</div>' : ''}
      <details><summary>🧾 Cassa ${b.has_pin ? '' : '<span class="pill off">manca il PIN</span>'}</summary>
        <p class="linkbox small">${esc(`${location.origin}${location.pathname}#/cassa/${b.cashier_token}`)}</p>
        <div class="row"><button type="button" class="ghost" data-a="copycassa">Copia link</button><input data-a="pin" inputmode="numeric" maxlength="8" placeholder="Nuovo PIN (4-8 cifre)"><button type="button" data-a="savepin" style="flex:0 0 auto">Salva PIN</button></div></details>
      <details><summary>🛍️ Catalogo (${b.items.length})</summary>
        ${b.items.map((it) => `<div class="row small citem"><span style="flex:1">${it.active ? '' : '🚫 '}<b>${esc(it.name)}</b> ${esc(it.value_label || '')}${it.meaning ? `<br><span class="muted">${esc(it.meaning)}</span>` : ''}</span>
          <button type="button" class="ghost" data-a="itemtoggle" data-id="${esc(it.id)}" data-on="${it.active ? 1 : 0}" style="flex:0 0 auto">${it.active ? 'Togli' : 'Rimetti'}</button></div>`).join('')}
        <input data-a="iname" placeholder="Nome (es. Birra media, Stella di Natale mignon)"><input data-a="ivalue" placeholder="Valore indicativo (es. 5 €)">
        <input data-a="imeaning" placeholder="Significato / descrizione (facoltativo)"><input data-a="iimage" placeholder="Foto: link https (facoltativo)">
        <button type="button" data-a="additem">＋ Aggiungi al catalogo</button></details>
      <details ${b.campaigns.length ? 'open' : ''}><summary>🎄 Campagne (${b.campaigns.length})</summary>
        ${b.campaigns.map((c) => `<div class="camp"><b>${themeOf(c.theme).e} ${esc(c.title)}</b> <span class="small muted">${c.kind === 'vendita' ? 'vendite dalla cassa' : `${dLong(c.opens_at)} → ${dLong(c.expires_at)}`}</span><br>
          <span class="small">Doni ${c.total} · attivati ${c.claimed} · regalati ${c.gifted} · aperti ${c.unlocked} · ritirati <b>${c.redeemed}</b></span>
          ${c.kind === 'omaggio' ? `<div class="row"><a class="btn ghost" href="#/admin/biglietti/${esc(c.id)}">🖨️ Biglietti</a><button type="button" class="ghost" data-a="prolong" data-id="${esc(c.id)}" data-exp="${esc(c.expires_at)}">⏰ Cambia scadenza</button></div>` : ''}</div>`).join('')}
        <button type="button" class="full" data-a="newcamp">＋ Nuova campagna</button><div class="campform"></div></details>
      <details><summary>⭐ Partner (pagina «Per le attività») ${b.p && b.p.show_as_partner ? '<span class="pill on">visibile</span>' : ''}</summary>
        <label class="check"><input type="checkbox" data-a="pshow" ${b.p && b.p.show_as_partner ? 'checked' : ''}> <b>Mostra tra i partner</b> (solo con il loro consenso)</label>
        <select data-a="pcat"><option value="">Categoria…</option>${Object.entries(PARTNER_CATS).map(([k, x]) => `<option value="${k}" ${b.p && b.p.category === k ? 'selected' : ''}>${x.e} ${x.n}</option>`).join('')}</select>
        <input data-a="pcity" maxlength="60" placeholder="Paese / città" value="${esc(b.p?.city || '')}">
        <input data-a="pblurb" maxlength="200" placeholder="Una frase sul negozio (max 200)" value="${esc(b.p?.blurb || '')}">
        <input data-a="plogo" placeholder="Logo: link https (facoltativo)" value="${esc(b.p?.logo_url || '')}">
        <input data-a="pweb" placeholder="Sito o pagina social: https://…" value="${esc(b.p?.website || '')}">
        <button type="button" data-a="psave">Salva dati partner</button></details>
      <div class="row" style="margin-top:8px"><button type="button" class="ghost" data-a="edit">✏️ Modifica dati</button></div>
      <div class="bm"></div></div>`).join('')}`;
  $('#bnew').onclick = () => shopForm($('#bform'), {});
  box.querySelectorAll('.shop').forEach((card) => {
    const b = list[+card.dataset.i], q = (a) => card.querySelector(`[data-a="${a}"]`), out = card.querySelector('.bm');
    const reload = () => adminShopsTab(box);
    q('en').onchange = async () => { try { await B.adminBusinessToggle(b.id, q('en').checked, q('hide').checked); reload(); } catch (err) { msg(out, errText(err)); } };
    q('hide').onchange = q('en').onchange;
    q('until').onchange = async () => { try { await B.adminBusinessSave({ ...b, pin: '', active_until: q('until').value }); reload(); } catch (err) { msg(out, errText(err)); } };
    q('nountil').onclick = async () => { q('until').value = ''; q('until').onchange(); };
    q('copycassa').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}#/cassa/${b.cashier_token}`); q('copycassa').textContent = 'Copiato ✓'; } catch { /* a mano */ } };
    q('savepin').onclick = async () => { const p = q('pin').value.trim(); if (!/^[0-9]{4,8}$/.test(p)) return msg(out, 'Il PIN deve avere da 4 a 8 cifre.'); try { await B.adminBusinessSave({ ...b, pin: p }); msg(out, 'PIN salvato ✓ Comunicalo al negozio a voce, non per email.', 'ok'); q('pin').value = ''; } catch (err) { msg(out, errText(err)); } };
    q('additem').onclick = async () => {
      if (!q('iname').value.trim()) return msg(out, 'Scrivi il nome dell\'articolo.');
      try { await B.adminItemSave({ business_id: b.id, name: q('iname').value.trim(), value_label: q('ivalue').value.trim(), meaning: q('imeaning').value.trim(), image_url: q('iimage').value.trim() }); reload(); } catch (err) { msg(out, errText(err)); }
    };
    card.querySelectorAll('[data-a="itemtoggle"]').forEach((x) => { x.onclick = async () => { try { await B.adminItemSave({ id: x.dataset.id, active: x.dataset.on !== '1' }); reload(); } catch (err) { msg(out, errText(err)); } }; });
    card.querySelectorAll('[data-a="prolong"]').forEach((x) => { x.onclick = async () => {
      const v = prompt('Nuova scadenza (AAAA-MM-GG): dopo questa data i doni spariscono', x.dataset.exp.slice(0, 10)); if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
      try { await B.adminCampaignDates(x.dataset.id, null, new Date(`${v}T23:59:00`).toISOString()); reload(); } catch (err) { msg(out, errText(err)); } }; });
    q('newcamp').onclick = () => campaignForm(card.querySelector('.campform'), b, reload);
    q('psave').onclick = async () => {
      try { await B.adminPartnerSave(b.id, { show_as_partner: q('pshow').checked, category: q('pcat').value, city: q('pcity').value.trim(), blurb: q('pblurb').value.trim(), logo_url: q('plogo').value.trim(), website: q('pweb').value.trim() }); reload(); }
      catch (err) { msg(out, errText(err)); }
    };
    q('edit').onclick = () => shopForm(out, b);
  });
}

function shopForm(box, b) {
  box.innerHTML = `<div class="card"><h2>${b.id ? 'Modifica negozio' : 'Nuovo negozio'}</h2>
    <label>Nome</label><input id="sname" maxlength="80" value="${esc(b.name || '')}">
    <label>Indirizzo</label><input id="saddr" maxlength="200" value="${esc(b.address || '')}">
    <label>Posizione (per i regali venduti in cassa)</label><div class="row"><input id="slat" placeholder="lat" value="${b.lat ?? ''}"><input id="slng" placeholder="lng" value="${b.lng ?? ''}"><button type="button" class="ghost" id="shere" style="flex:0 0 auto">📍 Qui</button></div>
    <label>Telefono</label><input id="sphone" maxlength="40" value="${esc(b.phone || '')}">
    <label>Come acquistare (link e-commerce, facoltativo)</label><input id="sbuy" placeholder="https://…" value="${esc(b.buy_url || '')}">
    <label>Note (solo per te)</label><textarea id="snotes" rows="2" maxlength="1000">${esc(b.notes || '')}</textarea>
    ${b.id ? '' : '<label>PIN della Cassa (4-8 cifre)</label><input id="spin" inputmode="numeric" maxlength="8">'}
    <button type="button" class="full" id="ssave">Salva</button><div id="sm"></div></div>`;
  $('#shere').onclick = async () => { try { const p = await getPos(); $('#slat').value = p.lat.toFixed(6); $('#slng').value = p.lng.toFixed(6); } catch (err) { msg($('#sm'), errText(err)); } };
  $('#ssave').onclick = async () => {
    if (!$('#sname').value.trim()) return msg($('#sm'), 'Scrivi il nome del negozio.');
    try {
      await B.adminBusinessSave({ ...b, id: b.id || '', name: $('#sname').value.trim(), address: $('#saddr').value.trim(), lat: $('#slat').value.trim(), lng: $('#slng').value.trim(),
        phone: $('#sphone').value.trim(), buy_url: $('#sbuy').value.trim(), notes: $('#snotes').value.trim(), pin: $('#spin') ? $('#spin').value.trim() : '',
        enabled: b.id ? b.enabled : true, hide_campaigns: b.hide_campaigns || false, active_until: b.active_until || '' });
      viewAdmin('negozi');
    } catch (err) { msg($('#sm'), errText(err)); }
  };
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function campaignForm(box, b, done) {
  const y = new Date().getFullYear();
  box.innerHTML = `<div class="card"><h3>Nuova campagna · ${esc(b.name)}</h3>
    <label>Titolo</label><input id="ctit" maxlength="80" value="Natale ${y} · ${esc(b.name)}">
    <label>Tema</label><select id="cthm">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.e} ${t.n}</option>`).join('')}</select>
    <label>Frase sul regalo</label><input id="cintro" maxlength="300" value="Vieni a sbloccare il tuo regalo">
    <div class="row"><div><label>Si apre dal</label><input id="copen" type="date"></div><div><label>Scade (incluso)</label><input id="cexp" type="date" value="${y + 1}-01-08"></div></div>
    <label>Area: tocca la mappa nel punto dove andranno i clienti (es. zona decorazioni)</label>
    <div id="cmap" class="map" style="height:260px"></div>
    <div class="row"><div><label>Raggio di sblocco (m)</label><input id="crad" type="number" min="10" max="2000" value="50"></div><div><label>Alberi sparsi in (m)</label><input id="cspr" type="number" min="5" max="2000" value="30"></div></div>
    <p class="muted small">Dentro le serre il GPS è impreciso: un raggio di 40–60 m copre tutto il garden.</p>
    <label>Premi e quantità</label><div id="cpr"></div><button type="button" class="ghost" id="cadd">＋ Altro premio</button>
    <p id="ctot" class="small"></p>
    <button type="button" class="full accent" id="cgo">🎄 Crea la campagna</button><div id="cm2"></div></div>`;
  const today = new Date(); $('#copen').value = today.toISOString().slice(0, 10);
  const row = (p = {}) => {
    const d = document.createElement('div'); d.className = 'prow';
    d.innerHTML = `<select class="pitem"><option value="">— scrivi il premio qui sotto, o scegli dal catalogo —</option>${b.items.filter((i) => i.active).map((i) => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select>
      <div class="row"><input class="plabel" placeholder="Premio (es. Sconto 10% decorazioni)" value="${esc(p.label || '')}"><input class="pqty" type="number" min="1" max="2000" value="${p.qty || 10}" style="flex:0 0 80px" aria-label="Quantità"></div>`;
    d.querySelector('.pitem').onchange = (e) => { const it = b.items.find((i) => i.id === e.target.value); if (it) d.querySelector('.plabel').value = it.name; tot(); };
    d.querySelector('.pqty').oninput = tot;
    $('#cpr').appendChild(d);
  };
  const prizes = () => [...box.querySelectorAll('.prow')].map((d) => { const it = b.items.find((i) => i.id === d.querySelector('.pitem').value);
    return { item_id: it ? it.id : '', label: d.querySelector('.plabel').value.trim(), qty: +d.querySelector('.pqty').value || 0, image: it?.image_url || '', meaning: it?.meaning || '' }; })
    .filter((p) => p.label && p.qty > 0);
  function tot() { const n = prizes().reduce((a, p) => a + p.qty, 0); $('#ctot').textContent = `Totale: ${n} doni (${n} biglietti da stampare)`; }
  row({ label: 'Sconto 10% sulle decorazioni', qty: 150 }); row({ label: 'Stella di Natale mignon', qty: 40 }); tot();
  $('#cadd').onclick = () => { row(); tot(); };
  let center = b.lat != null ? { lat: b.lat, lng: b.lng } : null, mk = null, circ = null;
  await waitLeaflet();
  const map = makeMap($('#cmap'), center ? center.lat : 45.69, center ? center.lng : 9.8, center ? 17 : 12);
  const place = (ll) => {
    center = ll; if (!map) return;
    if (mk) { mk.setLatLng([ll.lat, ll.lng]); circ.setLatLng([ll.lat, ll.lng]); } else {
      mk = L.marker([ll.lat, ll.lng], { icon: L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html: giftIcon($('#cthm').value, true) }) }).addTo(map);
      circ = L.circle([ll.lat, ll.lng], { radius: +$('#crad').value || 50, dashArray: '6 6', weight: 2, fillOpacity: 0.06 }).addTo(map);
    }
  };
  if (map) { map.on('click', (e) => place(e.latlng)); if (center) place(center); }
  $('#crad').oninput = () => circ && circ.setRadius(+$('#crad').value || 50);
  $('#cgo').onclick = async () => {
    const pr = prizes(), o = $('#copen').value, x = $('#cexp').value;
    if (!center) return msg($('#cm2'), 'Tocca la mappa per scegliere l\'area.');
    if (!pr.length) return msg($('#cm2'), 'Aggiungi almeno un premio.');
    if (!o || !x || x < o) return msg($('#cm2'), 'Controlla le date.');
    const b2 = $('#cgo'); b2.disabled = true; b2.textContent = 'Creo i doni…';
    try {
      const id = await B.adminCampaignCreate({ business_id: b.id, title: $('#ctit').value.trim() || 'Campagna', theme: $('#cthm').value, intro: $('#cintro').value.trim(),
        opens_at: new Date(`${o}T00:00:00`).toISOString(), expires_at: new Date(`${x}T23:59:00`).toISOString(),
        lat: center.lat, lng: center.lng, radius_m: +$('#crad').value || 50, spread_m: +$('#cspr').value || 30, prizes: pr });
      location.hash = `#/admin/biglietti/${id}`;
    } catch (err) { b2.disabled = false; b2.textContent = '🎄 Crea la campagna'; msg($('#cm2'), errText(err)); }
  };
}

// Biglietti da stampare: 8 per foglio A4 (Stampa → Salva come PDF)
async function adminCardsPrint(campaignId) {
  let list, shops;
  try { [list, shops] = await Promise.all([B.adminCampaignCards(campaignId), B.adminBusinesses()]); } catch (err) { app.innerHTML = `<div class="card">${errText(err)}</div>`; return; }
  let camp = null, shop = null;
  shops.forEach((s) => s.campaigns.forEach((c) => { if (c.id === campaignId) { camp = c; shop = s; } }));
  if (!camp) { app.innerHTML = '<div class="card">Campagna non trovata.</div>'; return; }
  const th = themeOf(camp.theme);
  const fmt = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
  app.innerHTML = `<div class="noprint"><h1>🖨️ Biglietti · ${esc(camp.title)}</h1>
      <p class="muted">${list.length} biglietti, 8 per foglio A4. Premi <b>Stampa</b> e scegli «Salva come PDF» per mandarli in tipografia, oppure stampali direttamente. Il premio non è scritto: è una sorpresa.</p>
      <div class="row"><button type="button" id="pp">🖨️ Stampa / Salva PDF</button><a class="btn ghost" href="#/admin/negozi">Torna ai negozi</a></div></div>
    <div class="cards">${list.map((c) => `<div class="gcard th-${esc(camp.theme)}" style="--gc:${th.c}">
      <div class="gch">${camp.theme === 'natale' ? TREE_SVG : `<span class="gce">${th.e}</span>`}<div><b>${T2('Un regalo per te', 'A gift for you')}</b><br><span translate="no">${esc(shop.name)}</span></div></div>
      ${qrSvg(giftUrl('dono', c.claim_token), 150)}
      <p class="gcc">${esc(fmt(c.card_code))}</p>
      <p class="gct">${T2('Inquadra il QR con la fotocamera', 'Scan the QR with your camera')}<br>${T2('Aprilo da', 'Open it at')} ${esc(shop.name)} ${T2('dal', 'from')} ${new Date(camp.opens_at).toLocaleDateString(LOC)} ${T2('al', 'to')} ${new Date(camp.expires_at).toLocaleDateString(LOC)}</p>
      <p class="gcu">🎁 ${T2('Puoi anche regalarlo a chi vuoi', 'You can also give it to anyone')} · ubipin.it</p></div>`).join('')}</div>`;
  $('#pp').onclick = () => window.print();
}

// ---------- Doni in modalità demo: la stessa logica del database, salvata sul telefono ----------
function demoGifts(getDb, save) {
  const ALPHA = 'ACDEFGHJKMNPQRTUVWXY34679';
  const code = (n) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const D = () => { const db = getDb(); db.biz = db.biz || []; db.camps = db.camps || []; db.gifts = db.gifts || []; db.items = db.items || []; return db; };
  const uid = () => getDb().user?.id;
  const ctx = (g) => { const db = D(); const c = db.camps.find((x) => x.id === g.campaign_id); const b = db.biz.find((x) => x.id === c.business_id); return { c, b }; };
  const exp = (g, c) => g.expires_at || c.expires_at;
  const state = (g) => { const { c, b } = ctx(g); const now = Date.now();
    return g.redeemed_at ? 'redeemed' : b.hide_campaigns ? 'hidden' : now > Date.parse(exp(g, c)) ? 'expired' : g.unlocked_at ? 'unlocked' : now < Date.parse(c.opens_at) ? 'not_yet' : 'open'; };
  const json = (g) => { const { c, b } = ctx(g); const u = g.unlocked_at;
    return { id: g.id, state: state(g), mine: g.holder_id === uid(), business: b.name, address: b.address, campaign: c.title, theme: c.theme, kind: c.kind, intro: c.intro,
      opens_at: c.opens_at, expires_at: exp(g, c), lat: g.lat, lng: g.lng, area_lat: c.lat, area_lng: c.lng, radius_m: c.radius_m,
      has_message: !!g.message, from: g.giver_id ? (g.giver_name || '') : null, gifted: !!g.transfer_token,
      prize: u || c.kind === 'vendita' ? g.prize_label : null, prize_image: u ? g.prize_image : null, prize_meaning: u ? g.prize_meaning : null,
      message: u ? g.message : null, redeem_code: u ? g.redeem_code : null, redeemed_at: g.redeemed_at, unlocked_at: g.unlocked_at }; };
  const active = (b) => b.enabled && (!b.active_until || b.active_until >= new Date().toISOString().slice(0, 10));
  const auth = (t, pin) => { const b = D().biz.find((x) => x.cashier_token === String(t).toUpperCase());
    if (!b) return { err: 'Cassa non trovata: controlla il link.' }; if (b.pin !== pin) return { err: 'PIN sbagliato.' }; if (!active(b)) return { err: 'Il servizio per questo negozio è sospeso.' }; return { b }; };
  const byCode = (b, k) => { k = String(k).toUpperCase().replace(/[^A-Z0-9]/g, ''); const ids = D().camps.filter((c) => c.business_id === b.id).map((c) => c.id);
    return D().gifts.find((g) => ids.includes(g.campaign_id) && (g.redeem_code === k || g.card_code === k)); };
  const stats = (c) => { const gs = D().gifts.filter((g) => g.campaign_id === c.id);
    return { id: c.id, title: c.title, theme: c.theme, kind: c.kind, opens_at: c.opens_at, expires_at: c.expires_at, lat: c.lat, lng: c.lng, radius_m: c.radius_m,
      total: gs.length, claimed: gs.filter((g) => g.holder_id).length, gifted: gs.filter((g) => g.gifted_at).length, unlocked: gs.filter((g) => g.unlocked_at).length,
      redeemed: gs.filter((g) => g.redeemed_at).length, redeemed_gifted: gs.filter((g) => g.redeemed_at && g.gifted_at).length }; };
  const newGift = (c, p, lat, lng, expires = null) => { const g = { id: crypto.randomUUID(), campaign_id: c.id, item_id: p.item_id || null, prize_label: p.label, prize_image: p.image || null,
    prize_meaning: p.meaning || null, card_code: code(8), claim_token: code(16), lat, lng, holder_id: null, expires_at: expires, created_at: new Date().toISOString() }; D().gifts.push(g); return g; };
  return {
    async myGifts() { return D().gifts.filter((g) => g.holder_id === uid() && state(g) !== 'hidden').map(json); },
    async giftClaim(t) { if (!uid()) return { status: 'login' }; const k = String(t).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const g = D().gifts.find((x) => x.claim_token === k || x.card_code === k); if (!g) return { status: 'not_found' };
      if (!g.holder_id) { g.holder_id = uid(); g.claimed_at = new Date().toISOString(); save(); } else if (g.holder_id !== uid()) return { status: 'taken' };
      return { status: 'ok', gift: json(g) }; },
    async giftGet(id) { const g = D().gifts.find((x) => x.id === id && x.holder_id === uid()); return g ? json(g) : null; },
    async giftUnlock(id, pos) { const g = D().gifts.find((x) => x.id === id && x.holder_id === uid()); if (!g) return { status: 'not_found' };
      const st = state(g); if (st === 'unlocked' || st === 'redeemed') return { status: 'ok', gift: json(g) }; if (st !== 'open') return { status: st };
      if (g.transfer_token) return { status: 'gifting' }; if (!pos) return { status: 'no_position' };
      const { c } = ctx(g); const d = distanceM(pos.lat, pos.lng, c.lat, c.lng);
      if (d > c.radius_m) return { status: 'too_far', distance_m: Math.round(d), radius_m: c.radius_m };
      g.unlocked_at = new Date().toISOString(); g.redeem_code = code(6); save(); return { status: 'ok', gift: json(g) }; },
    async giftSend(id, message, from) { const g = D().gifts.find((x) => x.id === id && x.holder_id === uid()); if (!g) return { status: 'not_found' };
      if (!['open', 'not_yet'].includes(state(g))) return { status: state(g) };
      g.transfer_token = code(16); g.message = (message || '').trim().slice(0, 500) || null; g.giver_name = (from || '').trim().slice(0, 60) || null; save();
      return { status: 'ok', token: g.transfer_token }; },
    async giftSendCancel(id) { const g = D().gifts.find((x) => x.id === id && x.holder_id === uid() && !x.unlocked_at); if (g) { g.transfer_token = null; save(); } },
    async giftPeek(t) { const g = D().gifts.find((x) => x.transfer_token === String(t).toUpperCase()); if (!g || g.unlocked_at) return null; const { c, b } = ctx(g);
      if (b.hide_campaigns || Date.now() > Date.parse(exp(g, c))) return null;
      return { business: b.name, address: b.address, theme: c.theme, kind: c.kind, campaign: c.title, opens_at: c.opens_at, expires_at: exp(g, c), from: g.giver_name, prize: c.kind === 'vendita' ? g.prize_label : null, has_message: !!g.message }; },
    async giftAccept(t) { if (!uid()) return { status: 'login' }; const g = D().gifts.find((x) => x.transfer_token === String(t).toUpperCase()); if (!g) return { status: 'used' };
      if (!['open', 'not_yet'].includes(state(g))) return { status: 'expired' }; if (g.holder_id === uid()) return { status: 'own' };
      Object.assign(g, { giver_id: g.holder_id, holder_id: uid(), claimed_at: new Date().toISOString(), gifted_at: new Date().toISOString(), transfer_token: null }); save();
      return { status: 'ok', gift: json(g) }; },
    async giftTrees(bb) { return D().gifts.filter((g) => { const { c, b } = ctx(g); return !b.hide_campaigns && !g.redeemed_at && Date.now() <= Date.parse(exp(g, c))
        && (c.kind === 'omaggio' ? g.lat >= bb.s && g.lat <= bb.n && g.lng >= bb.w && g.lng <= bb.e : g.holder_id === uid()); })
      .map((g) => ({ lat: g.lat, lng: g.lng, theme: ctx(g).c.theme, mine: g.holder_id === uid() && !!uid(), gift_id: g.holder_id === uid() ? g.id : null })); },
    async cashierInfo(t, pin) { const a = auth(t, pin); if (a.err) return { status: 'error', message: a.err };
      return { business: a.b.name, items: D().items.filter((i) => i.business_id === a.b.id && i.active).map((i) => ({ id: i.id, name: i.name, value: i.value_label })),
        campaigns: D().camps.filter((c) => c.business_id === a.b.id).map(stats) }; },
    async cashierCheck(t, pin, k, redeem = false) { const a = auth(t, pin); if (a.err) return { status: 'error', message: a.err };
      const g = byCode(a.b, k); if (!g) return { status: 'not_found' }; const { c } = ctx(g);
      if (g.redeemed_at) return { status: 'already', prize: g.prize_label, redeemed_at: g.redeemed_at };
      if (!g.unlocked_at) return { status: 'locked', prize: g.prize_label };
      if (Date.now() > Date.parse(exp(g, c))) return { status: 'expired', prize: g.prize_label, expires_at: exp(g, c) };
      if (redeem) { g.redeemed_at = new Date().toISOString(); save(); return { status: 'redeemed', prize: g.prize_label, gifted: !!g.gifted_at }; }
      return { status: 'valid', prize: g.prize_label, gifted: !!g.gifted_at, expires_at: exp(g, c) }; },
    async cashierExtend(t, pin, k, days) { const a = auth(t, pin); if (a.err) return { status: 'error', message: a.err }; const g = byCode(a.b, k); if (!g) return { status: 'not_found' };
      const { c } = ctx(g); g.expires_at = new Date(Math.max(Date.now(), Date.parse(exp(g, c))) + days * 864e5).toISOString(); save(); return { status: 'ok', expires_at: g.expires_at }; },
    async cashierIssue(t, pin, itemId, days = 180) { const a = auth(t, pin); if (a.err) return { status: 'error', message: a.err };
      const it = D().items.find((i) => i.id === itemId && i.business_id === a.b.id); if (!it) throw new Error('Articolo non trovato.');
      if (a.b.lat == null) throw new Error('Manca la posizione del negozio.');
      let c = D().camps.find((x) => x.business_id === a.b.id && x.kind === 'vendita');
      if (!c) { c = { id: crypto.randomUUID(), business_id: a.b.id, title: a.b.name, theme: 'regalo', kind: 'vendita', opens_at: new Date().toISOString(), expires_at: new Date(Date.now() + 20 * 365 * 864e5).toISOString(), lat: a.b.lat, lng: a.b.lng, radius_m: 60, created_at: new Date().toISOString() }; D().camps.push(c); }
      const g = newGift(c, { item_id: it.id, label: it.name, image: it.image_url, meaning: it.meaning }, a.b.lat, a.b.lng, new Date(Date.now() + days * 864e5).toISOString()); save();
      return { status: 'ok', token: g.claim_token, code: g.card_code, prize: g.prize_label, expires_at: g.expires_at }; },
    async adminBusinesses() { return D().biz.map((b) => ({ ...b, active: active(b), has_pin: !!b.pin, items: D().items.filter((i) => i.business_id === b.id),
      campaigns: D().camps.filter((c) => c.business_id === b.id).map(stats) })); },
    async adminBusinessSave(p) { const db = D(); let b = db.biz.find((x) => x.id === p.id);
      if (!b) { b = { id: crypto.randomUUID(), cashier_token: code(14), enabled: true, hide_campaigns: false, created_at: new Date().toISOString() }; db.biz.unshift(b); }
      Object.assign(b, { name: p.name || b.name, address: p.address || null, lat: p.lat === '' || p.lat == null ? null : +p.lat, lng: p.lng === '' || p.lng == null ? null : +p.lng,
        phone: p.phone || null, buy_url: p.buy_url || null, notes: p.notes || null, active_until: p.active_until || null,
        enabled: p.enabled ?? b.enabled, hide_campaigns: p.hide_campaigns ?? b.hide_campaigns });
      if (/^[0-9]{4,8}$/.test(p.pin || '')) b.pin = p.pin; save(); return b.id; },
    async adminBusinessToggle(id, en, hide) { const b = D().biz.find((x) => x.id === id); if (b) { b.enabled = en; b.hide_campaigns = hide; save(); } },
    async adminItemSave(p) { const db = D(); let i = db.items.find((x) => x.id === p.id);
      if (!i) { i = { id: crypto.randomUUID(), business_id: p.business_id, active: true, sort: 0 }; db.items.push(i); }
      Object.assign(i, { name: p.name || i.name, meaning: p.meaning ?? i.meaning ?? null, value_label: p.value_label ?? i.value_label ?? null, image_url: p.image_url ?? i.image_url ?? null, active: p.active ?? i.active }); save(); return i.id; },
    async adminCampaignCreate(o) { const db = D(); const c = { id: crypto.randomUUID(), business_id: o.business_id, title: o.title, theme: o.theme, kind: 'omaggio', opens_at: o.opens_at, expires_at: o.expires_at,
        lat: o.lat, lng: o.lng, radius_m: o.radius_m, intro: o.intro || null, created_at: new Date().toISOString() }; db.camps.unshift(c);
      o.prizes.forEach((p) => { for (let k = 0; k < p.qty; k++) { const r = o.spread_m * Math.sqrt(Math.random()), a = 2 * Math.PI * Math.random();
        newGift(c, p, o.lat + r * Math.cos(a) / 111320, o.lng + r * Math.sin(a) / (111320 * Math.cos(o.lat * Math.PI / 180))); } });
      save(); return c.id; },
    async adminCampaignCards(id) { return D().gifts.filter((g) => g.campaign_id === id).map((g) => ({ card_code: g.card_code, claim_token: g.claim_token, claimed: !!g.holder_id })); },
    async adminCampaignDates(id, o, x) { const c = D().camps.find((y) => y.id === id); if (c) { if (o) c.opens_at = o; if (x) c.expires_at = x; save(); } },
    async publicPartners() { return D().biz.filter((b) => b.show_as_partner && active(b)).map((b) => ({ name: b.name, category: b.category, city: b.city, logo_url: b.logo_url, blurb: b.blurb, website: b.website, lat: b.lat, lng: b.lng, partner_since: b.partner_since })); },
    async adminPartnerData() { return D().biz.map((b) => ({ id: b.id, show_as_partner: !!b.show_as_partner, category: b.category, city: b.city, logo_url: b.logo_url, blurb: b.blurb, website: b.website, partner_since: b.partner_since })); },
    async adminPartnerSave(id, p) { const b = D().biz.find((x) => x.id === id); if (!b) return;
      Object.assign(b, { show_as_partner: !!p.show_as_partner, category: p.category || null, city: p.city || null, logo_url: p.logo_url || null, blurb: p.blurb || null, website: p.website || null });
      if (p.show_as_partner && !b.partner_since) b.partner_since = new Date().toISOString().slice(0, 10); save(); },
  };
}

// ======================= BANNER PUBBLICITARI =======================
let adTimer = null;
async function drawAdSlot(box) {
  if (!box) return;
  let ads = [];
  try { ads = (await B.listAds()).filter((a) => a.active); } catch { return; }
  if (!ads.length || !document.body.contains(box)) return;
  const card = (a) => `<a class="adbanner" style="background:${esc(a.color)}" ${a.link_url ? `href="${esc(a.link_url)}" target="_blank" rel="noopener sponsored"` : ''}>
      ${a.image_url ? `<img src="${esc(a.image_url)}" alt="">` : ''}<span class="adtxt"><b>${esc(a.title)}</b>${a.body ? `<span>${esc(a.body)}</span>` : ''}</span><span class="adtag">Sponsor</span></a>`;
  // Banner raggruppati per sito del link (es. tutti i libri su amazon.it = un gruppo, Calma Chiara = un altro):
  // si alternano i gruppi e dentro ogni gruppo l'ordine è casuale, così nessun prodotto ne copre un altro.
  const grpOf = (a) => { try { return new URL(a.link_url).hostname.replace(/^www\./, ''); } catch { return 'nolink:' + a.id; } };
  const groups = {}; ads.forEach((a) => { (groups[grpOf(a)] = groups[grpOf(a)] || []).push(a); });
  const keys = Object.keys(groups).sort(() => Math.random() - 0.5);
  const bags = {}; let g = 0;
  const shuffle = (arr) => { const b = arr.slice(); for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
  const next = () => {
    const key = keys[g % keys.length]; g++;
    if (!bags[key] || !bags[key].length) bags[key] = shuffle(groups[key]);
    return bags[key].pop();
  };
  box.innerHTML = card(next());
  clearInterval(adTimer);
  if (ads.length > 1) adTimer = setInterval(() => {
    if (!document.body.contains(box)) { clearInterval(adTimer); return; }
    const a = next();
    box.firstElementChild.classList.add('fade');
    setTimeout(() => { if (document.body.contains(box)) box.innerHTML = card(a); }, 600);
  }, 9000);   // rotazione lenta: un banner ogni 9 secondi
}

// ======================= AMMINISTRATORE =======================
async function viewAdmin(tab) {
  if (!(await B.isAdmin())) { app.innerHTML = '<div class="card center">Pagina riservata all\'amministratore. <a href="#/">Torna a Ubi</a></div>'; return; }
  if (tab === 'biglietti') return adminCardsPrint(location.hash.split('/')[3]);
  const t = ['iscritti', 'curiosita', 'pin', 'negozi', 'guida'].includes(tab) ? tab : 'banner';
  app.innerHTML = `<h1>⚙️ Amministrazione</h1>
    <div class="admtabs"><a class="btn ${t === 'banner' ? 'on' : 'ghost'}" href="#/admin/banner">📣 Banner</a><a class="btn ${t === 'iscritti' ? 'on' : 'ghost'}" href="#/admin/iscritti">👥 Iscritti</a><a class="btn ${t === 'pin' ? 'on' : 'ghost'}" href="#/admin/pin">📊 Pin</a><a class="btn ${t === 'curiosita' ? 'on' : 'ghost'}" href="#/admin/curiosita">🗺️ Curiosità</a><a class="btn ${t === 'negozi' ? 'on' : 'ghost'}" href="#/admin/negozi">🏪 Negozi</a><a class="btn ${t === 'guida' ? 'on' : 'ghost'}" href="#/admin/guida">📘 Guida</a></div>
    <div id="adm" style="margin-top:12px"><p class="muted center">Carico…</p></div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  if (t === 'iscritti') return adminUsersTab($('#adm'));
  if (t === 'pin') return adminPinTab($('#adm'));
  if (t === 'curiosita') return adminSeedTab($('#adm'));
  if (t === 'negozi') return adminShopsTab($('#adm'));
  if (t === 'guida') { $('#adm').innerHTML = ADMIN_GUIDE; return; }
  return adminAdsTab($('#adm'));
}
// ---------- Curiosità: pin pronti (testo nostro + foto libere da Wikimedia Commons) ----------
const WIKI = 'https://it.wikipedia.org/w/api.php', COMMONS = 'https://commons.wikimedia.org/w/api.php';
const wget = async (base, params) => {
  const u = new URL(base); Object.entries({ format: 'json', origin: '*', ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u); if (!r.ok) throw new Error('Wikipedia non risponde'); return r.json();
};
const metres = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r; return Math.round(Math.hypot(x, y) * R); };
const stripHtml = (h) => { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
async function wikiPage(item) {
  const props = { action: 'query', prop: 'coordinates|pageimages', piprop: 'name', redirects: 1 };
  let j = await wget(WIKI, { ...props, titles: item.wiki });
  let pg = Object.values(j.query?.pages || {})[0];
  let viaSearch = false;
  if ((!pg || pg.missing !== undefined) && item.search) {
    j = await wget(WIKI, { ...props, generator: 'search', gsrsearch: item.search, gsrlimit: 1 });
    pg = Object.values(j.query?.pages || {})[0]; viaSearch = true;
  }
  if (!pg || pg.missing !== undefined) return { page: null };
  return { page: pg.title, viaSearch, coord: pg.coordinates?.[0] || null, image: pg.pageimage || null };
}
async function commonsPhoto(name) {
  const j = await wget(COMMONS, { action: 'query', titles: 'File:' + name, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: 1600 });
  const ii = Object.values(j.query?.pages || {})[0]?.imageinfo?.[0];
  if (!ii) return null;   // foto non presente su Commons: non la uso
  const m = ii.extmetadata || {};
  const lic = stripHtml(m.LicenseShortName?.value);
  if (!/^(cc|public domain|pd|pubblico dominio)/i.test(lic)) return null;   // solo licenze libere
  return { url: ii.thumburl || ii.url, page: ii.descriptionurl, credit: `Foto: ${stripHtml(m.Artist?.value) || 'autore su Wikimedia Commons'}, ${lic}, via Wikimedia Commons` };
}
// Posizione da OpenStreetMap (Nominatim): una richiesta al secondo, come chiede il servizio
let osmLast = 0;
async function osmFind(q) {
  let cache = {}; try { cache = JSON.parse(localStorage.getItem('ubi_osm_cache') || '{}'); } catch { /* niente cache */ }
  if (q in cache) return cache[q];
  const res = await osmFetch(q);
  cache[q] = res; try { localStorage.setItem('ubi_osm_cache', JSON.stringify(cache)); } catch { /* pazienza */ }
  return res;
}
async function osmFetch(q) {
  const wait = 1100 - (Date.now() - osmLast); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  osmLast = Date.now();
  const u = new URL('https://nominatim.openstreetmap.org/search'); u.searchParams.set('q', q); u.searchParams.set('format', 'json'); u.searchParams.set('limit', '1'); u.searchParams.set('countrycodes', 'it');
  const r = await fetch(u, { headers: { 'Accept-Language': 'it' } }); if (!r.ok) return null;
  const j = await r.json(); return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
}
// Altre foto libere su Commons: prima per nome del luogo, poi geotaggate vicino al punto
async function commonsCandidates(r) {
  const props = { prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: 400 };
  const take = (j) => Object.values(j.query?.pages || {}).sort((x, y) => (x.index || 0) - (y.index || 0)).map((pg) => {
    const ii = pg.imageinfo?.[0]; if (!ii || !/^image\/(jpeg|png|webp)/.test(ii.mime || '')) return null;
    const lic = stripHtml(ii.extmetadata?.LicenseShortName?.value);
    if (!/^(cc|public domain|pd|pubblico dominio)/i.test(lic)) return null;
    return { name: pg.title.replace(/^File:/, ''), thumb: ii.thumburl || ii.url };
  }).filter(Boolean);
  const out = []; const add = (list) => list.forEach((c) => { if (!out.some((o) => o.name === c.name)) out.push(c); });
  const q = (r.osm || `${r.title} ${r.town}`).replace(/,/g, ' ');
  try { add(take(await wget(COMMONS, { action: 'query', generator: 'search', gsrnamespace: 6, gsrsearch: `${q} filetype:bitmap`, gsrlimit: 8, ...props }))); } catch { /* niente */ }
  if (out.length < 3 && r.posOk) {
    try { add(take(await wget(COMMONS, { action: 'query', generator: 'geosearch', ggsnamespace: 6, ggscoord: `${r.lat}|${r.lng}`, ggsradius: 300, ggslimit: 8, ...props }))); } catch { /* niente */ }
  }
  // prima le foto il cui nome contiene parole del luogo (es. «Duomo», «Cantù»)
  const words = `${q} ${r.town}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(chiesa|della|delle|dello|degli|santa|santo|santi|villa|piazza|palazzo|parco|museo|torre|via)$/.test(w));
  out.forEach((c) => { const n = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); c.score = words.filter((w) => n.includes(w)).length; });
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 6);
}
// prepara una curiosità: posizione da Wikipedia e foto candidate (la prima è la migliore)
async function seedPrep(it) {
  const r = { ...it, lat0: it.lat, lng0: it.lng, cands: [], pick: -1 };
  try {
    const w = it.wiki ? await wikiPage(it) : { page: null };
    const townPage = w.page && w.page.toLowerCase() === it.town.toLowerCase();
    if (w.coord && !townPage) { const d = metres(it.lat, it.lng, w.coord.lat, w.coord.lon); if (d < 1500) { r.lat = w.coord.lat; r.lng = w.coord.lon; r.posOk = true; } }
    r.page = townPage ? null : w.page;
    if (w.image && !townPage) r.cands.push({ name: w.image, thumb: null, score: 9 });
  } catch { /* resta senza */ }
  for (const c of await commonsCandidates(r)) if (!r.cands.some((o) => o.name === c.name)) r.cands.push(c);
  if (r.cands[0] && !r.cands[0].thumb) {
    const p = await commonsPhoto(r.cands[0].name).catch(() => null); if (p) r.cands[0].thumb = p.url; else r.cands.shift();
  }
  r.pick = r.cands.length && r.cands[0].score > 0 ? 0 : -1;   // nessuna foto che somigli al luogo: meglio solo testo
  return r;
}
async function seedTryOsm(r) {
  if (r.posOk || !r.osm) return;
  try { const o = await osmFind(r.osm); if (o && metres(r.lat0, r.lng0, o.lat, o.lng) < 4000) { r.lat = o.lat; r.lng = o.lng; r.posOk = true; r.posOsm = true; } } catch { /* approssimativa */ }
}
// crea il pin, o aggiunge la foto a quello già creato solo testo
async function seedSave(r) {
  let file = null, photo = null;
  if (r.pick >= 0) {
    photo = await commonsPhoto(r.cands[r.pick].name);
    if (photo) {
      const res = await fetch(photo.url);
      if (res.ok) file = new File([await fitImage(await res.blob(), 1600)], 'foto.jpg', { type: 'image/jpeg' }); else photo = null;
    }
  }
  const text = (photo ? `${r.text}\n\n${photo.credit} – ${photo.page}` : r.text).slice(0, 2000);
  if (r.old?.id) { if (file) await B.addPhoto(r.old, file, text); return !!file; }
  await seedTryOsm(r);
  await B.create({
    title: r.title, hint: r.hint, media_type: file ? 'photo' : 'text', file, text_body: text,
    lat: r.lat, lng: r.lng, radius: 80, source: 'coordinates', visibility: 'public', recipients: [],
    tags: [r.kind === 'lit' ? 'letteratura' : 'curiosità', (r.tag || r.town).toLowerCase().replace(/[^a-zà-ù0-9' ]/g, '').slice(0, 24)], replies_enabled: true,
  });
  return !!file;
}
async function adminSeedTab(box) {
  box.innerHTML = '<div class="card"><p class="muted">Carico le curiosità…</p></div>';
  const items = await (await fetch('./seed/curiosita.json?v=' + Date.now())).json();
  const mineList = await B.listMine(); const mine = new Map(mineList.map((c) => [c.title, c]));
  const towns = [...new Set(items.map((i) => i.town))];
  const stat = (t) => { const its = items.filter((i) => i.town === t); const d = its.filter((i) => mine.has(i.title)); const txt = d.filter((i) => mine.get(i.title).media_type === 'text').length;
    return `${t} · ${d.length}/${its.length} creati${txt ? ` · ${txt} senza foto` : ''}`; };
  const noPhoto = mineList.filter((c) => c.media_type === 'text' && ((c.tags || []).includes('curiosità') || (c.tags || []).includes('letteratura'))).length;
  box.innerHTML = `<div class="card"><p><b>${items.length}</b> curiosità in ${towns.length} comuni. Scegli un comune: cerco le foto libere su Wikimedia Commons e tu scegli quella giusta.</p>
    ${noPhoto ? `<p class="small">📷 Hai <b>${noPhoto}</b> curiosità già create senza foto: apri il loro comune, scegli una foto e premi «Aggiungi foto».</p>` : ''}
    <button class="accent full" id="seedauto">⚡ Fai tutto in automatico</button>
    <p class="muted small">Crea tutte le curiosità mancanti e aggiunge una foto a quelle già create senza, scegliendo da solo la foto più adatta. Lascia la pagina aperta: puoi interrompere e riprendere quando vuoi, riparte da dove era rimasto.</p><div id="automsg"></div>
    <p class="small" style="margin-top:14px">Oppure scegli tu le foto, comune per comune:</p>
    <select id="seedtown" class="full"><option value="">— scegli un comune —</option>${towns.map((t) => `<option value="${esc(t)}">${esc(stat(t))}</option>`).join('')}</select></div><div id="seedbox"></div>`;
  $('#seedtown').onchange = () => { const t = $('#seedtown').value; if (t) seedTown(t); };
  let stop = false;
  $('#seedauto').onclick = async () => {
    const btn = $('#seedauto');
    if (btn.dataset.run) { stop = true; btn.textContent = 'Mi fermo dopo questa…'; return; }
    const todo = items.filter((it) => { const o = mine.get(it.title); return !o || o.media_type === 'text'; });
    if (!todo.length) return msg($('#automsg'), 'Tutto fatto: non ci sono curiosità da creare né pin senza foto.', 'ok');
    btn.dataset.run = '1'; btn.textContent = '⏸ Ferma'; stop = false;
    let done = 0, photos = 0; const bad = [], approx = [];
    const pool = []; let next = 0;
    const take = () => { while (pool.length < 4 && next < todo.length) { const it = todo[next++]; pool.push(seedPrep(it).then((r) => ({ it, r }))); } };
    take();   // la ricerca foto parte in anticipo, 4 alla volta
    while (pool.length && !stop) {
      const { it, r } = await pool.shift(); take();
      r.old = mine.get(it.title) || null;
      msg($('#automsg'), `${done + bad.length + 1} di ${todo.length}: ${esc(it.town)} – «${esc(it.title)}»…<br>Foto messe: ${photos}`, 'info');
      try {
        const hadOld = !!r.old?.id;
        const withPhoto = await seedSave(r);
        if (withPhoto) photos++;
        if (!hadOld) { mine.set(it.title, { media_type: withPhoto ? 'photo' : 'new' }); if (!r.posOk) approx.push(`${it.town}: ${it.title}`); }
        else if (withPhoto) r.old.media_type = 'photo';
        done++;
      } catch (e) { bad.push(`${it.title}: ${errText(e)}`); }
    }
    delete btn.dataset.run; btn.textContent = '⚡ Fai tutto in automatico';
    msg($('#automsg'), `${stop ? 'Fermato. ' : 'Finito! '}Lavorate ${done} curiosità, ${photos} con foto.${bad.length ? `<br>Non riuscite: ${bad.map(esc).join(' · ')}` : ''}${approx.length ? `<br>Posizione approssimativa (aprile e spostale con «Modifica»): ${approx.map(esc).join(' · ')}` : ''}`, bad.length ? 'err' : 'ok');
  };

  async function seedTown(town) {
    const sbx = $('#seedbox'); sbx.innerHTML = '<div class="card"><p class="muted">Cerco foto e posizioni…</p></div>';
    const rows = await Promise.all(items.filter((i) => i.town === town).map(async (it) => {
      const old = mine.get(it.title);
      if (old && old.media_type !== 'text') return { ...it, old, done: true, cands: [], pick: -1 };   // già creato con foto
      const r = await seedPrep(it); r.old = old; r.done = !!old;
      return r;
    }));
    const tryOsm = async (r) => {
      if (r.posOk || !r.osm) return;
      try { const o = await osmFind(r.osm); if (o && metres(r.lat0, r.lng0, o.lat, o.lng) < 4000) { r.lat = o.lat; r.lng = o.lng; r.posOk = true; r.posOsm = true; } } catch { /* approssimativa */ }
    };
    const thumbs = (r, i) => r.cands.length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${r.cands.map((c, k) => `<img src="${esc(c.thumb)}" alt="" loading="lazy" data-r="${i}" data-k="${k}" style="height:82px;width:110px;max-width:110px;object-fit:cover;flex:0 0 auto;border-radius:8px;cursor:pointer;outline:${k === r.pick ? '4px solid var(--accent, #e4572e)' : 'none'};opacity:${k === r.pick ? 1 : .6}">`).join('')}
        <button type="button" class="ghost small" data-r="${i}" data-k="-1" style="width:auto;flex:0 0 auto;opacity:${r.pick < 0 ? 1 : .6}">${r.pick < 0 ? '✓ ' : ''}Senza foto</button></div>` : '<p class="muted small">Nessuna foto libera trovata su Wikimedia Commons.</p>';
    const draw = () => {
      sbx.innerHTML = `<div class="card"><p class="small">Tocca la foto che corrisponde davvero al luogo (le prime sono le più probabili). Le foto sono tutte con licenza libera; il credito viene messo sotto il testo.</p>
        <button class="accent full" id="seedgo">Crea i pin selezionati e aggiungi le foto scelte</button><div id="seedmsg"></div></div>
        ${rows.map((r, i) => `<div class="card seedrow">
          <label class="inline"><input type="checkbox" data-i="${i}" ${r.done && r.old.media_type !== 'text' ? 'disabled' : 'checked'}><span><b>${esc(r.title)}</b>${r.done ? (r.old.media_type === 'text' ? ' · <span class="muted">già creato, senza foto: aggiungo quella scelta</span>' : (r.old.media_type === 'new' ? ' · <span class="muted">appena creato (per aggiungere la foto ricarica la pagina)</span>' : ' · <span class="muted">già creato con foto</span>')) : ''}</span></label>
          ${r.done && r.old.media_type !== 'text' ? '' : thumbs(r, i)}
          ${r.done ? '' : `<p class="small">${r.posOk ? '✓' : r.osm ? '📍' : '⚠️'} <a href="https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}" target="_blank" rel="noopener">${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}</a>${r.page ? ` · Wikipedia: ${esc(r.page)}` : ''}</p>`}
          <p class="muted small">${esc(r.hint)}</p></div>`).join('')}`;
      sbx.querySelectorAll('[data-k]').forEach((el) => { el.onclick = () => { const r = rows[+el.dataset.r]; r.pick = +el.dataset.k; const keep = [...sbx.querySelectorAll('input[data-i]')].map((x) => x.checked); draw(); sbx.querySelectorAll('input[data-i]').forEach((x, j) => { if (!x.disabled) x.checked = keep[j]; }); }; });
      $('#seedgo').onclick = go;
    };
    async function go() {
      const pick = [...sbx.querySelectorAll('input[data-i]:checked')].map((x) => rows[+x.dataset.i]).filter((r) => !r.done || r.pick >= 0);
      if (!pick.length) return msg($('#seedmsg'), 'Niente da fare: seleziona una curiosità (per quelle già create scegli una foto).');
      $('#seedgo').disabled = true; let ok = 0; const bad = [], made = [];
      for (const r of pick) {
        msg($('#seedmsg'), `«${r.title}» (${ok + bad.length + 1} di ${pick.length})…`, 'info');
        try {
          let file = null, photo = null;
          if (r.pick >= 0) {
            photo = await commonsPhoto(r.cands[r.pick].name); if (!photo) throw new Error('foto non disponibile');
            const res = await fetch(photo.url); if (!res.ok) throw new Error('foto non scaricabile');
            file = new File([await fitImage(await res.blob(), 1600)], 'foto.jpg', { type: 'image/jpeg' });
          }
          const text = (photo ? `${r.text}\n\n${photo.credit} – ${photo.page}` : r.text).slice(0, 2000);
          if (r.done) { await B.addPhoto(r.old, file, text); r.old.media_type = 'photo'; }
          else {
            await tryOsm(r);
            await B.create({
              title: r.title, hint: r.hint, media_type: file ? 'photo' : 'text', file, text_body: text,
              lat: r.lat, lng: r.lng, radius: 80, source: 'coordinates', visibility: 'public', recipients: [],
              tags: [r.kind === 'lit' ? 'letteratura' : 'curiosità', (r.tag || r.town).toLowerCase().replace(/[^a-zà-ù0-9' ]/g, '').slice(0, 24)], replies_enabled: true,
            });
            r.done = true; r.old = { media_type: file ? 'photo' : 'new' }; mine.set(r.title, r.old); made.push(r);
          }
          ok++;
        } catch (e) { bad.push(`${r.title}: ${errText(e)}`); }
      }
      const approx = made.filter((r) => !r.posOk).map((r) => r.title);
      draw();
      msg($('#seedmsg'), `Fatto: ${ok}.${bad.length ? ' Non riusciti: ' + bad.map(esc).join(' · ') : ''}${approx.length ? `<br>Posizione approssimativa, da spostare con «Modifica»: ${approx.map(esc).join(' · ')}` : ''}`, bad.length ? 'err' : 'ok');
      const opt = $('#seedtown').querySelector(`option[value="${CSS.escape(town)}"]`); if (opt) opt.textContent = stat(town);
    }
    draw();
  }
}
// File CSV con «;» (Excel italiano lo apre a colonne) e BOM per gli accenti
function downloadCsv(name, head, rows) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(';'), ...rows.map((r) => r.map(q).join(';'))];
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a); a.click(); a.remove();
}
async function adminPinTab(box) {
  let rows;
  try { rows = await B.adminPinStats(); }
  catch (e) { box.innerHTML = `<div class="card"><p class="msg err">Statistiche non disponibili: lancia su Supabase il file <b>supabase/migrations/20261119100000_statistiche_pin.sql</b>.</p></div>`; return; }
  const d = (x) => (x ? new Date(x).toLocaleDateString(LOC) : '');
  const tot = rows.reduce((a, r) => a + Number(r.sblocchi || 0), 0), nuovi = rows.reduce((a, r) => a + Number(r.nuovi_iscritti || 0), 0);
  box.innerHTML = `<div class="card"><p><b>${rows.length}</b> pin pubblici o di cacce · <b>${tot}</b> sblocchi da altre persone · <b>${nuovi}</b> nuovi iscritti arrivati da un pin</p>
    <button class="accent full" id="pxls">📥 Scarica per Excel</button>
    <p class="muted small">Sono numeri vostri, per il marketing: a un locale potete dire quante persone hanno sbloccato il suo pin e quante si sono iscritte arrivando da lì, senza dare nomi né email. «Nuovi iscritti» conta chi ha aperto il link del pin prima di registrarsi (dal 19/11/2026).</p></div>
    <div class="card" style="overflow-x:auto"><table class="tbl"><tr><th>Pin</th><th>Autore</th><th>Caccia</th><th>Sblocchi</th><th>Nuovi iscritti</th><th>Codici dati / ritirati</th><th>Ultimo sblocco</th></tr>
    ${rows.map((r) => `<tr><td><a href="#/c/${esc(r.slug)}">${esc(r.titolo)}</a></td><td>${esc(r.autore || '')}</td><td>${esc(r.caccia ? `${r.caccia} · tappa ${r.tappa}` : '')}</td><td><b>${r.sblocchi}</b></td><td>${r.nuovi_iscritti}</td>
      <td>${r.codici_dati == null ? '' : `${r.codici_dati} / ${r.codici_ritirati}`}</td><td>${d(r.ultimo_sblocco)}</td></tr>`).join('')}</table></div>`;
  $('#pxls').onclick = () => downloadCsv('statistiche-pin-ubi',
    ['Pin', 'Link', 'Autore', 'Email autore', 'Visibilità', 'Caccia', 'Tappa', 'Creato il', 'Sblocchi', 'Primo sblocco', 'Ultimo sblocco', 'Nuovi iscritti dal pin', 'Codici dati', 'Codici ritirati'],
    rows.map((r) => [r.titolo, shareUrl(r.slug), r.autore, r.autore_email, r.visibilita === 'public' ? 'tutti' : r.visibilita, r.caccia || '', r.tappa ?? '', d(r.creato_il), r.sblocchi, d(r.primo_sblocco), d(r.ultimo_sblocco), r.nuovi_iscritti, r.codici_dati ?? '', r.codici_ritirati ?? '']));
}
async function adminUsersTab(box) {
  const rows = await B.adminUsers();
  const d = (x) => (x ? new Date(x).toLocaleDateString(LOC) : '');
  box.innerHTML = `<div class="card"><p><b>${rows.length}</b> iscritti · <b>${rows.filter((r) => r.ubi_dating).length}</b> in Ubi Dating</p>
    <button class="accent full" id="xls">📥 Scarica per Excel</button><p class="muted small">Il file si apre con Excel, Numbers o Fogli Google.</p></div>
    <p class="muted small">Piano gratuito: 500 pin, 100 file, 10 video. Tocca «Gratis» per passare un utente a <b>Pro</b> (senza limiti), e viceversa.</p>
    <div class="card" style="overflow-x:auto"><table class="tbl"><tr><th>Email</th><th>Nome</th><th>Iscritto</th><th>Ultimo accesso</th><th>Dating</th><th>Pin</th><th>File</th><th>Piano</th></tr>
    ${rows.map((r, i) => `<tr><td>${esc(r.email)}</td><td>${esc(r.nome || '')}</td><td>${d(r.iscritto_il)}</td><td>${d(r.ultimo_accesso)}</td><td>${r.ubi_dating ? '💗' : ''}</td><td>${r.pin_creati}</td><td>${r.file_caricati ?? ''}</td>
      <td>${r.id ? `<button class="${r.piano === 'pro' ? 'accent' : 'ghost'} small" data-plan="${i}">${r.piano === 'pro' ? '⭐ Pro' : 'Gratis'}</button>` : ''}</td></tr>`).join('')}</table></div>`;
  box.querySelectorAll('[data-plan]').forEach((b) => { b.onclick = async () => {
    const r = rows[+b.dataset.plan]; const to = r.piano === 'pro' ? 'free' : 'pro';
    b.disabled = true;
    try { await B.adminSetPlan(r.id, to); r.piano = to; b.textContent = to === 'pro' ? '⭐ Pro' : 'Gratis'; b.className = `${to === 'pro' ? 'accent' : 'ghost'} small`; }
    catch (e) { alert(e.message || e); }
    b.disabled = false;
  }; });
  $('#xls').onclick = () => downloadCsv('iscritti-ubi',
    ['Email', 'Nome', 'Iscritto il', 'Ultimo accesso', 'Email confermata', 'Ubi Dating', 'Pin creati', 'File', 'Piano', 'Arrivato dal pin', 'Pin sbloccati'],
    rows.map((r) => [r.email, r.nome, d(r.iscritto_il), d(r.ultimo_accesso), r.email_confermata ? 'sì' : 'no', r.ubi_dating ? 'sì' : 'no', r.pin_creati, r.file_caricati ?? '', r.piano || 'free', r.arrivato_da_pin || '', r.pin_sbloccati ?? '']));
}
async function adminAdsTab(box) {
  const ads = await B.listAds();
  let editing = null, img = null;
  box.innerHTML = `<div class="card"><form id="af"><h2 id="aft">Nuovo banner</h2>
      <label for="at">Nome</label><input id="at" maxlength="60" required placeholder="Es. Kymera">
      <label for="ab">Testo breve</label><input id="ab" maxlength="120" placeholder="Es. Birre artigianali in centro">
      <label for="al">Link (sito, Instagram, mappa…)</label><input id="al" type="url" placeholder="https://…">
      <label for="ac">Colore di sfondo</label><input id="ac" type="color" value="#1f3a5f">
      <label>Logo o immagine (facoltativo)</label><input id="ai" type="file" accept="image/*"><div id="aprev"></div>
      <label class="inline"><input type="checkbox" id="aa" checked><span>Attivo (compare in home a rotazione)</span></label>
      <div id="am"></div><div class="row"><button class="accent" type="submit" id="asave">Salva banner</button><button class="ghost" type="button" id="acancel" hidden>Annulla</button></div></form></div>
    <p class="muted small">Anteprima: il banner ha la stessa larghezza del pulsante Ubi Dating e ruota lentamente (uno ogni 9 secondi).</p>
    <div id="alist">${ads.map((a) => `<div class="card" data-id="${esc(a.id)}"><div class="adbanner" style="background:${esc(a.color)}">${a.image_url ? `<img src="${esc(a.image_url)}" alt="">` : ''}<span class="adtxt"><b>${esc(a.title)}</b>${a.body ? `<span>${esc(a.body)}</span>` : ''}</span><span class="adtag">${a.active ? 'Attivo' : 'Spento'}</span></div>
      <div class="actions"><button class="ghost" data-a="edit">✏️ Modifica</button><button class="ghost" data-a="toggle">${a.active ? '⏸ Spegni' : '▶️ Accendi'}</button><button class="danger" data-a="del">🗑</button></div></div>`).join('') || '<div class="card center muted">Nessun banner. Crea il primo qui sopra (es. Chiara, Kymera).</div>'}</div>`;
  $('#ai').onchange = async () => {
    const f = $('#ai').files[0]; if (!f) return;
    try { img = await fitImage(f, 400); $('#aprev').innerHTML = `<img src="${URL.createObjectURL(img)}" style="max-height:60px;margin-top:8px">`; } catch (err) { msg($('#am'), errText(err)); }
  };
  $('#acancel').onclick = () => adminAdsTab(box);
  $('#af').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const old = ads.find((a) => a.id === editing);
      const image_url = img ? await B.uploadAdImage(img) : (old?.image_url || null);
      await B.saveAd({ id: editing, title: $('#at').value.trim(), body: $('#ab').value.trim(), link_url: $('#al').value.trim(), color: $('#ac').value, active: $('#aa').checked, image_url, sort: old?.sort || 0 });
      adminAdsTab(box);
    } catch (err) { msg($('#am'), errText(err)); }
  };
  $('#alist').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const a = ads.find((x) => x.id === b.closest('.card').dataset.id); if (!a) return;
    try {
      if (b.dataset.a === 'edit') {
        editing = a.id; $('#at').value = a.title; $('#ab').value = a.body || ''; $('#al').value = a.link_url || ''; $('#ac').value = a.color; $('#aa').checked = a.active;
        $('#aft').textContent = 'Modifica banner'; $('#acancel').hidden = false; window.scrollTo(0, 0); return;
      }
      if (b.dataset.a === 'toggle') { await B.saveAd({ ...a, active: !a.active }); return adminAdsTab(box); }
      if (b.dataset.a === 'del') {
        if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Conferma'; return; }
        await B.deleteAd(a.id); return adminAdsTab(box);
      }
    } catch (err) { alertIn(b.closest('.card'), errText(err)); }
  };
}


// ---------- Guida dell'amministratore (solo per l'admin: niente dati riservati, solo istruzioni) ----------
const ADMIN_GUIDE = `<div class="aguide">
<p class="muted small">La tua guida per gestire Ubi. Tocca un titolo per aprirlo.</p>
<details open><summary>1 · Il pannello</summary>
<p>Tutto si gestisce da <b>ubipin.it/#/admin</b>, visibile solo al tuo account.</p>
<table class="tbl"><tr><th>Scheda</th><th>A cosa serve</th></tr>
<tr><td>📣 Banner</td><td>Pubblicità in home: crea, modifica, accendi e spegni</td></tr>
<tr><td>👥 Iscritti</td><td>Elenco iscritti, piano Gratis/Pro, download per Excel</td></tr>
<tr><td>📊 Pin</td><td>Sblocchi, nuovi iscritti e codici premio per ogni pin pubblico o di caccia</td></tr>
<tr><td>🗺️ Curiosità</td><td>Pin pronti dei comuni (testi + foto libere da Wikimedia)</td></tr>
<tr><td>🏪 Negozi</td><td>Clienti business: Cassa, catalogo, campagne regalo, biglietti, partner</td></tr></table>
<p class="small">Se una scheda dice che manca qualcosa, quasi sempre manca un pezzo di SQL su Supabase (sezione 8).</p></details>

<details><summary>2 · Aprire e gestire un negozio</summary>
<ol><li><b>Negozi → ＋ Nuovo negozio</b>: nome e indirizzo. Posizione: tocca <b>📍 Qui</b> quando sei nel negozio, oppure incolla lat/lng da Google Maps.</li>
<li>Facoltativi: telefono, link «Come acquistare», note solo per te.</li>
<li>Scegli il <b>PIN della Cassa</b> (4–8 cifre) e premi <b>Salva</b>.</li>
<li>Apri <b>🧾 Cassa → Copia link</b> e mandalo al negozio. Il PIN <b>a voce</b>, mai nello stesso messaggio.</li></ol>
<table class="tbl"><tr><th>Comando</th><th>Cosa succede (non si cancella niente)</th></tr>
<tr><td>☑️ Area riservata attiva</td><td>Tolta: la Cassa dice «servizio sospeso». I regali già dati restano apribili</td></tr>
<tr><td>Attivo fino al</td><td>Dal giorno dopo si sospende da solo. ✕ toglie la data</td></tr>
<tr><td>Nascondi anche i doni</td><td>Casi gravi: i regali spariscono anche dalla mappa</td></tr>
<tr><td>Nuovo PIN → Salva PIN</td><td>Cambia il PIN (es. se un dipendente se ne va)</td></tr>
<tr><td>✏️ Modifica dati</td><td>Nome, indirizzo, posizione, telefono, note</td></tr></table>
<p><b>⭐ Partner</b>: spunta «Mostra tra i partner» solo con il consenso del negozio, poi categoria, paese, frase, logo e sito → Salva. Compare in ubipin.it/#/business; se lo sospendi, sparisce da solo.</p>
<p class="small">Dopo 8 PIN sbagliati in 15 minuti la Cassa si blocca per 15 minuti.</p>${videoBtn('a_negozio')}</details>

<details><summary>3 · Catalogo e campagne regalo</summary>
<p><b>🛍️ Catalogo</b>: articoli con nome, valore, significato (es. dei fiori) e foto (link https). <b>Togli/Rimetti</b> li nasconde dalla Cassa.</p>
<ol><li><b>🎄 Campagne → ＋ Nuova campagna</b>: titolo e tema (Natale, Capodanno, San Valentino, Pasqua, Festa della mamma, Compleanno, Regalo).</li>
<li>Frase sul regalo, es. «Vieni a sbloccare il tuo regalo».</li>
<li>Date: «Si apre dal» e «Scade (incluso)», es. 1/12 → 8/1. Dopo la scadenza i regali spariscono e i codici non valgono più.</li>
<li>Area: tocca la mappa dove devono andare i clienti. Raggio 40–60 m nei garden; «Alberi sparsi in» = quanto si allargano sulla mappa.</li>
<li>Premi e quantità (es. 150 × Sconto 10%, 40 × Stella mignon): assegnati a caso, massimo 2000.</li>
<li><b>Crea la campagna</b> → pagina <b>🖨️ Biglietti</b>, 8 per A4: Stampa → Salva come PDF.</li></ol>
<p>Ogni campagna mostra doni, attivati, regalati, aperti, ritirati. <b>🖨️ Biglietti</b> per ristampare, <b>⏰ Cambia scadenza</b> per prorogare tutto.</p>
<p class="small">Premi a sorte = possibile concorso a premi: il negozio lo verifichi con il suo consulente.</p>${videoBtn('a_campagna')}</details>

<details><summary>4 · La Cassa (cosa spiegare al negozio)</summary>
<ul><li><b>Controlla un regalo</b>: il cliente mostra il codice di 6 caratteri → <b>Verifica</b>.
<ul><li>✓ Valido → consegna e <b>Segna come ritirato</b> (due tocchi)</li><li>🔒 Non ancora aperto → il cliente deve aprirlo stando nell'area</li>
<li>⏰ Scaduto → se vuole, <b>Proroga di 7 giorni</b></li><li>⚠️ Già ritirato → non va dato di nuovo</li></ul></li>
<li><b>Vendi un regalo</b> (bar, pub): il cliente paga al banco, il barista tocca l'articolo due volte → QR da inquadrare (vale 6 mesi) o «Manda su WhatsApp».</li>
<li><b>Numeri</b>: attivati, regalati, aperti, ritirati. <b>Esci dalla cassa</b> richiede di nuovo il PIN.</li></ul>
<p class="small">Per vendere servono posizione del negozio e almeno un articolo in catalogo. Ubi non incassa nulla.</p></details>

<details><summary>5 · Banner pubblicitari</summary>
<ol><li><b>📣 Banner</b>: nome e testo breve.</li><li>Link: sito, Instagram, Maps, WhatsApp o Vinted.</li>
<li>Colore di sfondo e, se vuoi, logo o immagine.</li><li>Lascia <b>Attivo</b> e premi <b>Salva banner</b>.</li></ol>
<p>Ogni banner: <b>✏️ Modifica</b>, <b>⏸ Spegni / ▶️ Accendi</b>, <b>Elimina</b> (due tocchi). Ruotano uno ogni 9 secondi, alternando i gruppi per sito del link (libri, Vinted, negozi…).</p>
<p class="small">Tanti banner insieme: chiedimi il comando SQL unico.</p>${videoBtn('a_banner')}</details>

<details><summary>6 · Cacce al tesoro</summary>
<ol><li><b>Profilo → Le mie cacce</b>: nome, premio, numero massimo di vincitori.</li>
<li>Tappa 1: pin nel punto di partenza, <b>senza risposta</b> se si apre solo arrivando (es. volantino con le regole).</li>
<li>Tappe dopo: <b>🧩 Risposta all'indovinello</b> (maiuscole e accenti non contano). L'indovinello sta nel contenuto della tappa prima.</li>
<li>Ogni tappa compare (forziere dorato) solo dopo la precedente. All'ultima, i primi N ricevono un codice unico.</li></ol>
<ul><li><b>✅ Verifica un codice premio</b> e <b>✓ Ritirato</b> sul vincitore</li><li><b>📊 Statistiche</b> di gioco</li>
<li><b>📤 Condividi la caccia</b>: link della tappa 1 con immagine e hashtag</li>
<li><b>📑 Duplica caccia</b>: tocchi dove va la nuova tappa 1, poi sistemi ogni tappa con Modifica</li></ul>
<p class="small">Per togliere la risposta: Modifica → spunta «Togli la password» (la casella vuota non basta).</p>${videoBtn('a_caccia')}</details>

<details><summary>7 · Iscritti, statistiche, curiosità</summary>
<p><b>👥 Iscritti</b>: Gratis/⭐ Pro cambia il piano (gratis 500 pin, 100 file, 10 video). 📥 Scarica per Excel.</p>
<p><b>📊 Pin</b>: sblocchi, nuovi iscritti dal pin, codici dati/ritirati. Numeri da mostrare ai locali, senza nomi né email.</p>
<p><b>🗺️ Curiosità</b>: «⚡ Fai tutto in automatico» crea i pin dei comuni con foto libere; lascia la pagina aperta.</p></details>

<details><summary>8 · Aggiornamenti, SQL e sicurezza</summary>
<ol><li><b>SQL</b>: Supabase → SQL Editor → incolla tutto → <b>Run</b> → «Success». Sempre prima dell'app che lo usa; aggiunge e non cancella.</li>
<li><b>App</b>: in alto compare la nuova versione; se vedi la vecchia, chiudi e riapri.</li>
<li>Chi usa l'app durante un aggiornamento continua con la vecchia finché non ricarica.</li></ol>
<ul><li>Mai condividere la chiave <b>service_role</b> di Supabase.</li><li>Mai incollare chiavi o password in chat (es. SMTP Brevo).</li>
<li>PIN delle Casse a voce; cambialo se un dipendente lascia.</li><li>Prima di cancellare dal database, chiedi: di solito basta spegnere o sospendere.</li></ul></details>

<details><summary>9 · Problemi frequenti</summary>
<table class="tbl"><tr><th>Problema</th><th>Soluzione</th></tr>
<tr><td>Versione vecchia</td><td>Chiudi e riapri la pagina</td></tr>
<tr><td>Non trova la posizione</td><td>iPhone: Privacy → Localizzazione → Safari → «Mentre usi l'app» (FAQ)</td></tr>
<tr><td>Nel negozio ma «ti mancano X m»</td><td>Aumenta il raggio (40–60 m garden, 25 m in paese)</td></tr>
<tr><td>Cassa: «PIN sbagliato»</td><td>Ricontrolla; dopo 8 errori aspetta 15 min o metti un PIN nuovo</td></tr>
<tr><td>Cassa: «servizio sospeso»</td><td>Rimetti la spunta o cambia «Attivo fino al»</td></tr>
<tr><td>«Regalo già preso»</td><td>Biglietto attivato da un altro account: il negozio ne dà uno nuovo</td></tr>
<tr><td>Tappa chiede la risposta</td><td>Modifica → «Togli la password»</td></tr>
<tr><td>Codice non trovato</td><td>Carattere letto male (B/8, O/0): ricontrollare</td></tr>
<tr><td>Scheda admin incompleta</td><td>Manca un SQL: chiedimelo</td></tr></table></details>

<details><summary>10 · Materiale per vendere</summary>
<ul><li><a href="#/business">Pagina per le attività</a> (servizi, video, PDF, partner, contatti)</li>
<li><a href="pdf/Ubi-per-le-attivita.pdf" target="_blank" rel="noopener">PDF Ubi per le attività</a></li>
<li>Campagne regalo: <a href="pdf/Ubi-campagne-regalo.pdf" target="_blank" rel="noopener">PDF</a> · <a href="video/Ubi-tutorial-campagne-regalo.mp4" target="_blank" rel="noopener">video</a></li>
<li>Regala una consumazione: <a href="pdf/Ubi-regala-una-consumazione.pdf" target="_blank" rel="noopener">PDF</a> · <a href="video/Ubi-tutorial-regala-una-consumazione.mp4" target="_blank" rel="noopener">video</a></li>
<li>Caccia al tesoro: <a href="pdf/Ubi-caccia-al-tesoro.pdf" target="_blank" rel="noopener">PDF</a> · <a href="video/Ubi-tutorial-caccia-al-tesoro.mp4" target="_blank" rel="noopener">video</a></li>
<li>Capsula del tempo: <a href="pdf/Ubi-capsula-del-tempo.pdf" target="_blank" rel="noopener">PDF</a> · <a href="video/Ubi-tutorial-capsula-del-tempo.mp4" target="_blank" rel="noopener">video</a></li>
<li>Banner: <a href="pdf/Ubi-banner-pubblicitario.pdf" target="_blank" rel="noopener">PDF</a> · Come si apre un pin: <a href="video/Ubi-tutorial-come-si-apre-un-pin.mp4" target="_blank" rel="noopener">video</a></li>
<li><a href="#/faq/negozi">FAQ per i negozi</a> · App in inglese: ubipin.it/?lang=en</li></ul>
<p><b>Incontro tipo:</b> video della campagna adatta, PDF stampato, crei il negozio davanti al cliente e gli mandi il link della Cassa; il PIN a voce.</p></details>
</div>`;

// ======================= INVITA UN AMICO (card con QR) =======================
const INVITE_URL = 'https://ubipin.it';
const INVITE_IMG = 'invito-ubi.png';
const INVITE_TEXT = LANG === 'en' ? 'Meet Ubi: leave photos, videos and messages in a place, they only open when you get there. Try it:' : 'Ti presento Ubi: lascia foto, video e messaggi in un luogo, si aprono solo quando ci arrivi. Provala:';
// ---------- Pulsanti social con icona: WhatsApp, Facebook, TikTok, Telegram, Instagram (+ menu del telefono)
const SOCIAL_SVG = {
  tt: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#111"/><path d="M13.2 5.5h2.1c.2 1.6 1.2 2.7 2.8 2.9v2.1c-1.1 0-2-.3-2.8-.8v4.6a3.9 3.9 0 1 1-3.9-3.9h.3v2.2a1.8 1.8 0 1 0 1.5 1.7z" fill="#25F4EE" transform="translate(-.5 -.4)"/><path d="M13.2 5.5h2.1c.2 1.6 1.2 2.7 2.8 2.9v2.1c-1.1 0-2-.3-2.8-.8v4.6a3.9 3.9 0 1 1-3.9-3.9h.3v2.2a1.8 1.8 0 1 0 1.5 1.7z" fill="#FE2C55" transform="translate(.5 .4)"/><path d="M13.2 5.5h2.1c.2 1.6 1.2 2.7 2.8 2.9v2.1c-1.1 0-2-.3-2.8-.8v4.6a3.9 3.9 0 1 1-3.9-3.9h.3v2.2a1.8 1.8 0 1 0 1.5 1.7z" fill="#fff"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#25D366"/><path d="M12 5.2a6.8 6.8 0 0 0-5.9 10.2L5.2 18.8l3.5-.9A6.8 6.8 0 1 0 12 5.2z" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M9.6 8.6c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.5.9 1.2 1.6 2.1 2.1.1.1.3.1.4 0l.5-.5c.1-.2.3-.2.5-.1l1.4.6c.2.1.3.3.2.5l-.1.5c-.1.5-.8 1-1.4 1-1 .1-2.6-.4-3.9-1.7S8.6 11 8.7 10c0-.6.6-1.2.9-1.4z" fill="#fff"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path d="M13.4 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.2V6.3c-.2 0-1-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.8H9v2.4h2v6z" fill="#fff"/></svg>',
  x: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#000"/><path d="M7 6.5h3.1l2.5 3.4 2.9-3.4h1.3l-3.6 4.2 4.3 5.8h-3.1l-2.7-3.7-3.2 3.7H7.2l3.9-4.5z" fill="#fff"/></svg>',
  tg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#26A5E4"/><path d="M5.5 11.6l11.6-4.5c.5-.2 1 .1.8.9l-2 9.3c-.1.6-.5.8-1 .5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.3-.1L8.5 13.4l-3-.9c-.6-.2-.6-.6 0-.9z" fill="#fff"/></svg>',
  ig: '<svg viewBox="0 0 24 24"><defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".35" stop-color="#FA7E1E"/><stop offset=".6" stop-color="#D62976"/><stop offset=".85" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#igg)"/><rect x="6.5" y="6.5" width="11" height="11" rx="3.2" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="15.3" cy="8.7" r=".8" fill="#fff"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#687385"/><circle cx="7.5" cy="12" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><circle cx="16.5" cy="12" r="1.5" fill="#fff"/></svg>',
};
function socialButtons(url, text, card = { k: 'invite' }) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  const a = (k, href, label) => `<a class="soc" href="${href}" target="_blank" rel="noopener" aria-label="${label}" title="${label}">${SOCIAL_SVG[k]}<span>${label}</span></a>`;
  return `<div class="socials" data-url="${esc(url)}" data-text="${esc(text)}" data-card="${esc(JSON.stringify(card))}">
    ${a('wa', `https://wa.me/?text=${t}%20${u}`, 'WhatsApp')}
    ${a('fb', `https://www.facebook.com/sharer/sharer.php?u=${u}`, 'Facebook')}
    <button type="button" class="soc" data-soc="tt" aria-label="TikTok" title="TikTok">${SOCIAL_SVG.tt}<span>TikTok</span></button>
    ${a('tg', `https://t.me/share/url?url=${u}&text=${t}`, 'Telegram')}
    <button type="button" class="soc" data-soc="ig" aria-label="Instagram" title="Instagram">${SOCIAL_SVG.ig}<span>Instagram</span></button>
    <button type="button" class="soc" data-soc="more" aria-label="Altro" title="Altro">${SOCIAL_SVG.more}<span>Altro</span></button>
  </div><div class="socmsg"></div>`;
}
// TikTok e Instagram non permettono di precompilare un post con un link: sul telefono apriamo il menu Condividi
// con testo, link e immagine-card (TikTok/Instagram la accettano), e copiamo comunque il messaggio intero.
const isPhone = () => /iphone|ipad|android/i.test(navigator.userAgent);
function bindSocials(root = document) {
  root.querySelectorAll('.socials').forEach((box) => {
    const url = box.dataset.url, text = box.dataset.text, out = box.nextElementSibling;
    let card = { k: 'invite' }; try { card = JSON.parse(box.dataset.card || '{}'); } catch { /* invito */ }
    let filePromise = null;
    const getFile = () => (filePromise = filePromise || cardFile(card, url));
    if (isPhone() && navigator.share) getFile();          // la prepariamo subito, così il tocco apre il menu senza attese
    box.onclick = async (e) => {
      const b = e.target.closest('button[data-soc]'); if (!b) return;
      const full = `${text} ${url}`;
      navigator.clipboard?.writeText(full).catch(() => {});
      const app_ = b.dataset.soc === 'tt' ? 'TikTok' : b.dataset.soc === 'ig' ? 'Instagram' : '';
      if (navigator.share && (isPhone() || b.dataset.soc === 'more')) {
        try {
          const file = await getFile();
          let data = { title: 'Ubi', text, url };
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) data = { files: [file], text: `${text} ${url}` };   // vedi sopra: foto + link nel testo
          await navigator.share(data);
          if (app_) msg(out, `Messaggio e link copiati ✓ Su ${app_} incolla il testo nella descrizione o nel messaggio.`, 'ok');
          return;
        } catch (err) { if (err && err.name === 'AbortError') return; }
      }
      const where = b.dataset.soc === 'ig' ? `Su Instagram: crea una <b>storia</b> → sticker <b>Link</b> → incolla, oppure incolla nel messaggio.`
        : b.dataset.soc === 'tt' ? 'Su TikTok incollalo in un <b>messaggio</b>, nella <b>descrizione</b> del video o nella <b>bio</b>.'
        : 'Incollalo dove vuoi.';
      msg(out, `Messaggio e link copiati ✓ ${where}<br><span class="small">${esc(full)}</span>`, 'ok');
    };
  });
}
// Immagine da condividere: la card di Ubi per gli inviti, una card generata per i pin (titolo, indizio, QR del pin)
async function cardFile(card, url) {
  try {
    if (card && card.k === 'hunt') return await huntCardFile(card, url);
    if (!card || card.k !== 'pin') {
      const blob = await (await fetch(INVITE_IMG)).blob();
      return new File([blob], 'Ubi-card.png', { type: 'image/png' });
    }
    const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); const F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    g.fillStyle = '#1f3a5f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8743b'; g.beginPath(); g.arc(W / 2, 300, 70, Math.PI, 0); g.lineTo(W / 2, 440); g.closePath(); g.fill();
    g.beginPath(); g.arc(W / 2, 300, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f3a5f'; g.beginPath(); g.arc(W / 2, 300, 26, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.fillStyle = '#f0a27a'; g.font = `700 40px ${F}`;
    g.fillText(LANG === 'en' ? 'A MEMORY LEFT HERE' : 'UN RICORDO LASCIATO QUI', W / 2, 540);
    const wrap = (txt, font, maxW, maxLines) => {
      g.font = font; const words = String(txt).split(/\s+/); const lines = []; let cur = '';
      for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
      if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '…'; }
      return lines;
    };
    let y = 650; g.fillStyle = '#ffffff';
    for (const l of wrap(card.title, `800 84px ${F}`, 900, 3)) { g.font = `800 84px ${F}`; g.fillText(l, W / 2, y); y += 100; }
    if (card.hint) { g.fillStyle = '#d6dde8'; for (const l of wrap(card.hint, `italic 400 44px ${F}`, 880, 3)) { g.font = `italic 400 44px ${F}`; g.fillText(l, W / 2, y + 10); y += 60; } }
    const m = qrMatrix(url), n = m.length, box = 520, cell = Math.floor((box - 60) / n), qs = cell * n, bx = (W - box) / 2, by = 1080;
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect ? g.roundRect(bx, by, box, box, 36) : g.rect(bx, by, box, box); g.fill();
    g.fillStyle = '#1f3a5f'; const ox = bx + (box - qs) / 2, oy = by + (box - qs) / 2;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) g.fillRect(ox + c * cell, oy + r * cell, cell, cell);
    g.fillStyle = '#ffffff'; g.font = `700 46px ${F}`;
    g.fillText(LANG === 'en' ? 'It only opens when you get there' : 'Si apre solo quando ci arrivi', W / 2, 1700);
    g.fillStyle = '#f0a27a'; g.font = `800 56px ${F}`; g.fillText('ubipin.it', W / 2, 1790);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    return blob ? new File([blob], 'Ubi-pin.png', { type: 'image/png' }) : null;
  } catch { return null; }
}

// Immagine della caccia: forziere dorato, nome, premio e QR della tappa 1
async function huntCardFile(card, url) {
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); const F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1a05'); bg.addColorStop(1, '#5e3209'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // forziere
  const cx = W / 2, top = 170;
  const gold = g.createRadialGradient(cx - 60, top + 80, 20, cx, top + 140, 260); gold.addColorStop(0, '#ffe58a'); gold.addColorStop(1, '#c98a10');
  g.fillStyle = gold; g.beginPath(); g.arc(cx, top + 150, 175, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a4b12'; g.beginPath(); g.moveTo(cx - 120, top + 150); g.quadraticCurveTo(cx - 120, top + 60, cx - 50, top + 60); g.lineTo(cx + 50, top + 60);
  g.quadraticCurveTo(cx + 120, top + 60, cx + 120, top + 150); g.closePath(); g.fill();
  g.fillStyle = '#a85d1a'; g.fillRect(cx - 120, top + 150, 240, 110);
  g.fillStyle = '#5e3209'; g.fillRect(cx - 120, top + 150, 240, 22);
  g.fillStyle = '#ffd96a'; g.fillRect(cx - 78, top + 64, 16, 196); g.fillRect(cx + 62, top + 64, 16, 196);
  g.fillRect(cx - 22, top + 140, 44, 56); g.fillStyle = '#5e3209'; g.fillRect(cx - 5, top + 160, 10, 20);
  g.textAlign = 'center'; g.fillStyle = '#ffd96a'; g.font = `800 50px ${F}`;
  g.fillText(LANG === 'en' ? 'TREASURE HUNT' : 'CACCIA AL TESORO', W / 2, 610);
  const wrap = (txt, font, maxW, maxLines) => {
    g.font = font; const words = String(txt || '').split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '…'; } return lines;
  };
  let y = 720; g.fillStyle = '#ffffff';
  for (const l of wrap(card.title, `800 86px ${F}`, 940, 2)) { g.font = `800 86px ${F}`; g.fillText(l, W / 2, y); y += 100; }
  if (card.prize) {
    y += 10; g.fillStyle = '#ffe58a'; g.font = `700 44px ${F}`; g.fillText(LANG === 'en' ? '🏆 PRIZE' : '🏆 IN PALIO', W / 2, y); y += 62;
    g.fillStyle = '#ffffff'; for (const l of wrap(card.prize, `600 50px ${F}`, 900, 2)) { g.font = `600 50px ${F}`; g.fillText(l, W / 2, y); y += 62; }
  }
  const m = qrMatrix(url), n = m.length, box = 480, cell = Math.floor((box - 56) / n), qs = cell * n, bx = (W - box) / 2, by = y + 90;
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect ? g.roundRect(bx, by, box, box, 36) : g.rect(bx, by, box, box); g.fill();
  g.fillStyle = '#2a1a05'; const ox = bx + (box - qs) / 2, oy = by + (box - qs) / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) g.fillRect(ox + c * cell, oy + r * cell, cell, cell);
  g.fillStyle = '#ffffff'; g.font = `700 46px ${F}`;
  g.fillText(card.steps > 1 ? (LANG === 'en' ? `${card.steps} stages · start from stage 1` : `${card.steps} tappe · parti dalla tappa 1`) : (LANG === 'en' ? 'It opens when you get there' : 'Si apre quando ci arrivi'), W / 2, by + box + 90);
  g.fillStyle = '#ffd96a'; g.font = `800 56px ${F}`; g.fillText('ubipin.it', W / 2, Math.min(H - 60, by + box + 180));
  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  return blob ? new File([blob], 'Ubi-caccia.png', { type: 'image/png' }) : null;
}

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
      ${dating ? '' : '<a class="btn ghost" href="#/invita">🔳 Card con QR</a>'}
    </div><div class="invmsg"></div>${socialButtons(url, text)}</div>`;
}
// Collega i pulsanti "Condividi" presenti nella pagina
function bindInvite(root = document) {
  bindSocials(root);
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
    <div class="card" style="margin-top:12px">${socialButtons(INVITE_URL, INVITE_TEXT)}</div>
    <div class="card small" style="margin-top:16px"><b>Vuoi la card nel Wallet?</b> Salva l'immagine, poi con un'app gratuita come <i>Pass2U Wallet</i> crea una card con QR <code>${INVITE_URL}</code> e aggiungila al Wallet.</div>
    <p class="center"><a href="#/">Torna a Ubi</a></p>`;
  $('#share').onclick = () => shareInvite(false, $('#im'));
  bindSocials(app);
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
const fmtDate = (d) => new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'short' });

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
    <span>da ${prof ? `<a ${prof}><b translate="no">${esc(t.author)}</b></a>` : `<b translate="no">${esc(t.author)}</b>`}</span>
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
    ${topTools()}
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
  bindTopTools(app);
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
  let list = [], editing = null, q = '', gsel = null;
  const parseGroups = (v) => [...new Set(v.split(',').map((x) => x.trim().toLowerCase().replace(/[<>"]/g, '').slice(0, 30)).filter(Boolean))].slice(0, 10);
  app.innerHTML = `
    <h1>📒 La mia rubrica</h1>
    <p class="muted">I contatti a cui mandi i pin più spesso. Quando crei un pin con "Persone scelte" li trovi come pulsanti da toccare, e con i <b>gruppi</b> li selezioni tutti insieme. La rubrica la vedi solo tu.</p>
    <div class="card"><form id="f">
      <h2 id="ftitle">Nuovo contatto</h2>
      <label for="cname">Nome</label><input id="cname" maxlength="60" required placeholder="Es. Maria">
      <label for="cemail">Email</label><input id="cemail" type="email" required placeholder="maria@esempio.it">
      <p class="muted small">Usa l'email con cui la persona accede (o accederà) a Ubi.</p>
      <label for="cgroups">👥 Gruppi <span class="muted small">(facoltativi, separati da virgola)</span></label>
      <input id="cgroups" list="glist" maxlength="200" placeholder="Es. famiglia, calcetto, amici"><datalist id="glist"></datalist>
      <p class="muted small">Con i gruppi, quando crei un pin selezioni tutti i membri con un solo tocco.</p>
      <div id="m"></div>
      <div class="row"><button class="accent" type="submit" id="csave">Aggiungi</button><button class="ghost" type="button" id="ccancel" hidden>Annulla</button></div>
    </form></div>
    <div class="chips" id="gfilter"></div>
    <input id="q" type="search" placeholder="🔎 Cerca nella rubrica" style="margin:6px 0 4px">
    <div id="list"><p class="muted center">Carico…</p></div>
    <p class="center"><a href="#/">Torna alla mappa</a></p>`;
  const resetForm = () => { editing = null; $('#f').reset(); $('#ftitle').textContent = 'Nuovo contatto'; $('#csave').textContent = 'Aggiungi'; $('#ccancel').hidden = true; };
  const draw = () => {
    const all = [...new Set(list.flatMap((c) => c.groups || []))].sort();
    $('#glist').innerHTML = all.map((g) => `<option value="${esc(g)}">`).join('');
    $('#gfilter').innerHTML = all.length ? `<button type="button" class="chip ${gsel ? '' : 'on'}" data-g="">Tutti</button>` + all.map((g) => `<button type="button" class="chip ${gsel === g ? 'on' : ''}" data-g="${esc(g)}">👥 ${esc(g)} (${list.filter((c) => (c.groups || []).includes(g)).length})</button>`).join('') : '';
    const rows = list.filter((c) => (!q || c.name.toLowerCase().includes(q) || c.email.includes(q)) && (!gsel || (c.groups || []).includes(gsel)));
    $('#list').innerHTML = !list.length ? '<div class="card center muted">Nessun contatto. Aggiungi il primo qui sopra.</div>'
      : !rows.length ? '<p class="muted center">Nessun risultato.</p>'
      : `<p class="muted small">${list.length} contatt${list.length === 1 ? 'o' : 'i'}</p>` + rows.map((c) => `
        <div class="card item" data-id="${esc(c.id)}">${avatarHtml(null, c.name, 38)}
          <div style="flex:1;min-width:0"><div class="t">${esc(c.name)}</div><div class="meta ellipsis">${esc(c.email)}</div>${(c.groups || []).length ? `<div class="meta small">👥 ${c.groups.map(esc).join(', ')}</div>` : ''}</div>
          <button class="ghost" data-a="edit" style="min-height:38px;padding:6px 10px">✏️</button>
          <button class="danger" data-a="del" style="min-height:38px;padding:6px 10px">🗑</button></div>`).join('');
  };
  const load = async () => { try { list = await B.listContacts(); draw(); } catch (err) { msg($('#list'), errText(err)); } };
  $('#q').oninput = () => { q = $('#q').value.trim().toLowerCase(); draw(); };
  $('#gfilter').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; gsel = b.dataset.g || null; draw(); };
  $('#ccancel').onclick = () => { resetForm(); msg($('#m'), ''); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#cname').value.trim(), email = $('#cemail').value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return msg($('#m'), 'Email non valida.');
    try {
      await B.saveContact({ id: editing, name, email, groups: parseGroups($('#cgroups').value) });
      msg($('#m'), editing ? 'Contatto aggiornato ✓' : `${esc(name)} aggiunto ✓`, 'ok'); resetForm(); load();
    } catch (err) { msg($('#m'), authErr(err)); }
  };
  $('#list').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = list.find((x) => x.id === b.closest('.card').dataset.id); if (!c) return;
    if (b.dataset.a === 'edit') {
      editing = c.id; $('#cname').value = c.name; $('#cemail').value = c.email; $('#cgroups').value = (c.groups || []).join(', ');
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
      <span class="when">${new Date(m.created_at).toLocaleString(LOC, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>`).join('');
  app.innerHTML = `
    <div class="authorline"><a href="#/u/${esc(other)}">${avatarHtml(a.avatar_path, a.display_name, 40)}</a>
      <h1 style="margin:0"><a href="#/u/${esc(other)}" style="color:inherit;text-decoration:none">${esc(a.display_name || 'Utente')}</a></h1></div>
    ${t ? `<div class="msg info">A proposito di: <a href="#/c/${esc(slug)}"><b translate="no">${esc(t.title)}</b></a></div>` : ''}
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
  ['Cos’è Ubi?', `<p>Ubi ti permette di <b>lasciare un contenuto in un luogo</b>: una foto, un video (fino a 60 secondi), un audio, un testo o un link. Chi lo riceve lo vede sulla mappa, ma può <b>aprirlo solo quando arriva lì</b> con il telefono.</p>
    ${videoBtn('pin')}`],
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
    <li>Dopo il salvataggio trovi in cima il pulsante <b>📤 Condividi questo pin</b>. Lo stesso pulsante c'è nella pagina di ogni pin e nella lista <b>I miei contenuti</b>.</li>
    <li>Sul telefono si apre il menu Condividi con il <b>messaggio già scritto</b>, il link e un'<b>immagine del pin</b> con titolo, indizio e QR: perfetta per una storia su Instagram o TikTok.</li>
    <li>Il messaggio con il link viene anche <b>copiato</b>: puoi incollarlo dove vuoi. Oppure usa le icone WhatsApp, Facebook, TikTok, Telegram, Instagram.</li>
    <li>Anche chi riceve o trova un pin può condividerlo: così più persone scoprono il luogo e Ubi.</li>
    <li>Se il pin è riservato, chi non è tra i destinatari non vede nulla del contenuto: trova solo un invito a scoprire Ubi.</li>
    <li>Se hai scelto <i>Persone scelte</i>, chi riceve il link deve accedere a Ubi <b>con la stessa email</b> che hai indicato.</li>
    <li>Se c'è una password, comunicala a parte (o lasciala come indovinello!).</li></ol>`],
  ['5 · Sblocca un contenuto', `<ol>
    <li>Apri il link (o tocca il cerchio sulla mappa).</li>
    <li>Vedi il titolo, l'indizio, la mappa e <b>quanti metri mancano</b>. <b>Indicazioni per arrivarci</b> apre il navigatore.</li>
    <li>Quando la distanza diventa verde (<i>Sei arrivato</i>), tocca <b>🔓 Sblocca qui</b> e inserisci la password se richiesta.</li>
    <li>Una volta sbloccato, puoi <b>rivederlo ovunque</b>, anche da casa.</li>
    <li>Se dice <i>GPS impreciso</i>: spostati all'aperto, lontano da edifici alti, e riprova.</li></ol>`],
  ['6 · Gestisci i tuoi contenuti', `<ul>
    <li>Sotto la mappa trovi <b>I miei contenuti</b>, raggruppati per tipo: un pulsante per <b>Immagine</b>, <b>Video</b>, <b>Testo</b>, <b>Link</b>, <b>Audio</b> (e Monumenti, Scrittori, Dating se ne hai), con il numero di pin.</li>
    <li>Tocca un pulsante per aprire quei contenuti, toccalo di nuovo per chiuderli. Con la ricerca trovi un pin in tutte le categorie.</li>
    <li>Per ogni pin: <b>Condividi</b>, <b>Apri</b> (tu li vedi sempre), <b>Modifica</b> o <b>Elimina</b> (tocca due volte per confermare: il file viene cancellato).</li></ul>`],
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
  ['👥 Gruppi: mandare un pin a più persone insieme', `<ol>
    <li>Apri <b>📒 La mia rubrica</b> e, in ogni contatto, scrivi uno o più <b>gruppi</b> separati da virgola (es. <code>famiglia, calcetto</code>).</li>
    <li>Quando crei un pin con <b>Persone scelte</b>, sopra i contatti trovi i pulsanti <b>👥 famiglia (5)</b>: un tocco seleziona tutti i membri, un secondo tocco li toglie.</li>
    <li>Tutti ricevono l'email con il link e solo loro potranno sbloccarlo.</li></ol>`],
  ['⏳ Capsula del tempo', `<ol>
    <li>Da home tocca <b>⏳ Capsula del tempo</b> → <b>Crea una capsula</b> (oppure, in qualsiasi nuovo pin, spunta <i>Capsula del tempo</i>).</li>
    <li>Scegli <b>data e ora</b> di apertura: fino ad allora si vedono solo titolo, indizio e conto alla rovescia.</li>
    <li>Decidi se, arrivata la data, bisogna essere <b>sul posto</b> oppure si apre <b>anche da lontano</b>.</li>
    <li>Idee: una lettera per i 18 anni di tuo figlio, un video per il decimo anniversario, un messaggio da riaprire tra un anno nello stesso posto.</li></ol>
    ${videoBtn('capsula')}${pdfBtn('capsula')}`],
  ['🗺️ Caccia al tesoro (anche per locali e pub)', `<ol>
    <li>Da home tocca <b>🗺️ Caccia al tesoro</b>, dai un nome, scrivi il <b>premio</b> (es. «una birra media o una maglietta») e quanti vincitori al massimo.</li>
    <li>Aggiungi le <b>tappe</b> (es. 3). In ognuna: nel campo <i>Indizio</i> cosa si vede prima, nel contenuto l'indizio per la tappa successiva.</li>
    <li>La tappa 2 compare sulla mappa solo dopo aver trovato la 1, la 3 dopo la 2.</li>
    <li>Chi sblocca l'ultima riceve un <b>codice unico</b>. Il gestore lo scrive in <i>Verifica un codice premio</i>: se è valido viene segnato come ritirato e non si può riusare.</li>
    <li>Pubblicizza il link della tappa 1 sui social o con un QR nel locale.</li></ol>
    ${videoBtn('caccia')}${pdfBtn('caccia')}`],
  ['📤 Condividere su WhatsApp, Facebook, TikTok, Telegram e Instagram', `<ol>
    <li>Sotto ogni pin e nel riquadro <b>Invita un amico</b> trovi le icone dei social.</li>
    <li><b>WhatsApp, Facebook e Telegram</b> si aprono con il messaggio e il link già pronti.</li>
    <li><b>TikTok e Instagram</b> non permettono di precompilare un post: sul telefono si apre il menu Condividi con il messaggio, il link e l'immagine (la card di Ubi o l'immagine del pin con il QR). Scegli TikTok o Instagram e pubblicala.</li>
    <li>In ogni caso il <b>messaggio intero con il link</b> viene copiato: incollalo nella descrizione, in un messaggio o nella bio. Su Instagram puoi anche usare lo sticker <b>Link</b> nelle storie.</li>
    <li><b>Altro</b> apre il menu di condivisione del telefono (Messaggi, email, Signal…).</li></ol>`],
  ['🎁 Regali dei negozi: alberi di Natale, buoni e consumazioni', `<ol>
    <li>Alcuni negozi e locali regalano o vendono <b>regali da sbloccare</b>: ricevi un <b>biglietto con un QR</b> oppure un link su WhatsApp.</li>
    <li>Inquadra il QR con la fotocamera (o scrivi il codice in <b>🎁 I miei regali</b>): il regalo diventa <b>tuo</b>. Sulla mappa cadono gli alberi e il tuo si <b>illumina</b>.</li>
    <li>Tra le date scritte sul biglietto vai nel negozio, entra nell'area segnata e tocca <b>🔓 Sblocca qui</b>: scopri il premio, l'eventuale messaggio e un <b>codice da mostrare in cassa</b>.</li>
    <li>Vuoi farne un dono? Tocca <b>🎁 Regalalo a chi vuoi tu</b>, scrivi un pensiero (ci sono tracce e idee) e manda il link: <b>vale una volta sola</b> e quando la persona lo accetta il regalo passa a lei.</li>
    <li>Dopo la <b>data di scadenza</b> il regalo sparisce dalla mappa e il codice non vale più.</li></ol>
    ${videoBtn('campagne')}`],
  ['🏪 Per negozi, garden, bar e ristoranti: campagne regalo', `<ol>
    <li>Ubi crea per la tua attività una <b>campagna regalo</b>: per esempio a Natale tanti alberi sulla mappa del tuo negozio, uno per ogni cliente, con premi a sorpresa (una pianta, uno sconto, un caffè).</li>
    <li>Ricevi i <b>biglietti da stampare</b> con il QR da dare in cassa. Il cliente torna da te per aprirlo, nell'area che scegli tu (es. il reparto decorazioni).</li>
    <li>I clienti possono <b>regalarlo</b> ad amici e parenti con un pensiero: così ti portano <b>clienti nuovi</b>.</li>
    <li>Un pub o un bar può anche <b>vendere</b> consumazioni da regalare («regala una birra»): il cliente paga al banco e manda il regalo a chi vuole.</li>
    <li>Hai una <b>pagina Cassa</b> riservata, protetta da PIN, per controllare i codici e vedere i numeri: biglietti attivati, regalati, ritirati.</li>
    <li>Per informazioni scrivi a <a href="mailto:info@ubipin.it?subject=Campagna%20regalo%20su%20Ubi">info@ubipin.it</a>.</li></ol>
    ${videoBtn('campagne')}${videoBtn('consumazione')}${pdfBtn('campagne')}${pdfBtn('consumazione')}${pdfBtn('attivita')}
    ${bizContacts('una campagna regalo')}
    <a class="btn full ghost" href="#/business">⭐ Scopri la pagina per le attività e i nostri partner</a>
    <a class="btn full accent" href="mailto:info@ubipin.it?subject=Campagna%20regalo%20su%20Ubi">✉️ Voglio una campagna regalo</a>`],
  ['📣 Pubblicità su Ubi: fai conoscere la tua attività', `<ol>
    <li>Hai un'<b>attività</b>, un <b>negozio</b>, un <b>ristorante</b>, un <b>evento</b> o un <b>prodotto</b> da far conoscere? Su Ubi puoi comparire con un <b>banner</b> nella pagina principale, quella che tutti vedono quando aprono l'app.</li>
    <li>Il banner mostra il tuo <b>logo o una foto</b>, un titolo, una breve descrizione e porta al tuo sito, alla tua pagina social o al tuo negozio online. È segnato come <b>Sponsor</b>.</li>
    <li>I banner girano uno alla volta e si alternano tra i diversi inserzionisti, così ognuno ha il suo spazio.</li>
    <li>Puoi anche usare Ubi per portare gente da te: un <b>pin pubblico</b> davanti al locale, una <b>caccia al tesoro</b> con premio ritirabile in negozio, una <b>capsula del tempo</b> per un evento.</li>
    <li>Per informazioni e condizioni scrivi a <a href="mailto:info@ubipin.it?subject=Pubblicit%C3%A0%20su%20Ubi">info@ubipin.it</a>: indica il nome dell'attività, la città, cosa vuoi promuovere e per quanto tempo. Ti risponderemo con le proposte.</li></ol>
    ${pdfBtn('banner')}${pdfBtn('attivita')}
    ${bizContacts('la pubblicità su Ubi')}
    <a class="btn full accent" href="mailto:info@ubipin.it?subject=Pubblicit%C3%A0%20su%20Ubi">✉️ Contattaci per la pubblicità</a>`],
  ['📸 Mettere un post o un reel di Instagram in un pin', `<ol>
    <li>Su Instagram apri il post o il reel e tocca l'icona <b>Condividi</b> (l'aeroplanino ✈️) → <b>Copia link</b>. Per un profilo: ⋯ in alto → <b>Copia URL del profilo</b>.</li>
    <li>In Ubi crea un nuovo pin, scegli il tipo <b>Link</b> e <b>incolla</b> (va bene anche tutto il testo copiato: il link lo troviamo noi).</li>
    <li>Scegli il luogo e salva: chi sblocca il pin vedrà il pulsante <b>Apri il link</b>, che apre Instagram.</li>
    <li>Nota: i post di <b>profili privati</b> li vede solo chi ti segue, e Instagram può chiedere di accedere.</li></ol>`],
  ['💗 Ubi Dating', `<ol>
    <li>Riservato ai <b>maggiorenni</b>. Si entra da <b>💗 Ubi Dating</b> in home: indichi genere e data di nascita e accetti i consensi. Sei responsabile di ciò che pubblichi e degli incontri che fai.</li>
    <li>Lasci un <b>biglietto</b> in un luogo che ami (meglio un video dal vivo): sulla mappa appare con un pallino <b>rosa</b> (lei) o <b>azzurro</b> (lui), visibile a tutti.</li>
    <li>Lo può aprire e rispondere solo chi è iscritto e <b>arriva sul posto</b>: avrete già una passione in comune.</li>
    <li>Siete <b>anonimi</b>: vi scoprite solo se entrambi toccate <b>«Voglio conoscerti»</b>. Da lì vedete i nomi e potete scrivervi.</li>
    <li>In <b>Le mie foto</b> puoi caricare fino a <b>6 foto</b>: le vede solo chi ha fatto con te il doppio sì («📷 Le sue foto»).</li>
    <li>Incontratevi solo in luoghi pubblici e segnalate abusi a info@ubipin.it.</li></ol>`],
  ['7 · Account e accesso', `<ul>
    <li>Resti collegato finché non tocchi <b>Esci</b>: lo trovi in alto nella home, accanto alla lingua, e nella pagina del profilo.</li>
    <li><b>Lingua</b>: in alto nella home tocca <b>🌐 Lingua / Language</b> per passare dall'italiano all'inglese. Per mandare Ubi a chi parla inglese usa il link <b>ubipin.it/?lang=en</b>.</li>
    <li><b>Password dimenticata?</b> In <i>Accedi</i> scrivi l'email e tocca il pulsante: ti arriva un link per sceglierne una nuova. Aprilo con lo <b>stesso browser</b> in cui usi Ubi.</li>
    <li>Se usi Ubi dalla schermata Home su iPhone, la prima volta dovrai accedere anche lì.</li></ul>`],
  ['8 · Privacy e sicurezza', `<ul>
    <li>La posizione del telefono è usata <b>solo mentre usi l'app</b> e non viene salvata nel profilo.</li>
    <li>I file sono in un archivio privato: chi non è autorizzato <b>non può scaricarli</b>, neanche conoscendo il link.</li>
    <li>La distanza e la password sono <b>verificate dal server</b>, non solo dal telefono.</li>
    <li>Pubblica solo contenuti <b>tuoi</b> e con il permesso delle persone riprese.</li>
    <li>Il <b>pensiero</b> che scrivi quando regali un dono lo legge solo chi lo riceve, quando lo apre. Il negozio vede solo i numeri e il codice del premio.</li></ul>`],
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
// video tutorial in fondo alle voci della guida
{ const FV = { '3 · Lascia un contenuto': 'lascia', '4 · Condividi': 'condividi', '5 · Sblocca un contenuto': 'pin', '6 · Gestisci i tuoi contenuti': 'gestisci',
  '6c · Rispondere a un pin': 'rispondi', '👥 Gruppi: mandare un pin a più persone insieme': 'gruppi', '📤 Condividere su WhatsApp, Facebook, TikTok, Telegram e Instagram': 'whatsapp' };
  FAQ_GUIDE.forEach((x) => { const k = FV[x[0]]; if (k && Array.isArray(x) && x.length === 2) x[1] += videoBtn(k); }); }


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
    const id = q.startsWith('📍 La posizione') ? 'posizione' : q.startsWith('📣 Pubblicità') ? 'pubblicita' : q.startsWith('🏪 Per negozi') ? 'negozi' : q.startsWith('🎁 Regali') ? 'regali' : '';
    return `<details class="faq"${id ? ` id="faq-${id}"` : ''}${open || (id && arg === id) ? ' open' : ''}><summary>${q}</summary><div>${a}</div></details>`;
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
  if (arg && $(`#faq-${arg}`)) $(`#faq-${arg}`).scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
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
