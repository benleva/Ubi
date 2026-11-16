// Ubi — web app (Fase 1). Nessun build: file statici, librerie da CDN.
import { CONFIG } from './config.js';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const ICON = { photo: '📷', video: '🎬', audio: '🎧', link: '🔗' };
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
      return must(await sb.from('contents').select('id,share_slug,title,media_type,media_path,visibility,created_at,password_hash')
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
      };
      const res = await sb.from('contents').insert(row).select('share_slug').single();
      if (res.error) { if (media_path) await sb.storage.from('media').remove([media_path]); throw res.error; }
      if (d.recipients.length) must(await sb.from('content_recipients').insert(d.recipients.map((email) => ({ content_id: id, email }))));
      return res.data.share_slug;
    },
    async remove(c) {
      if (c.media_path) await sb.storage.from('media').remove([c.media_path]);
      must(await sb.from('contents').delete().eq('id', c.id));
    },
    async teaser(slug) { return (must(await sb.rpc('get_teaser', { p_slug: slug })) || [])[0] || null; },
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
        created_at: new Date().toISOString(),
      });
      save(); return slug;
    },
    async remove(c) { db.contents = db.contents.filter((x) => x.id !== c.id); save(); },
    async teaser(slug) {
      const u = db.user; const c = db.contents.find((x) => x.share_slug === slug);
      if (!c || !canAccess(c, u)) return null;
      return {
        id: c.id, title: c.title, hint: c.hint, media_type: c.media_type, lat: c.lat, lng: c.lng, unlock_radius_m: c.unlock_radius_m,
        requires_password: !!c.password_hash, is_owner: !!u && c.owner_id === u.id,
        already_unlocked: !!u && db.unlocks.some((x) => x.c === c.id && x.u === u.id),
        author: db.profiles[c.owner_id]?.display_name || null,
      };
    },
    async unlock(slug, pos, password) {
      const u = db.user; if (!u) return { status: 'login_required' };
      const c = db.contents.find((x) => x.share_slug === slug);
      if (!c || !canAccess(c, u)) return { status: 'not_found' };
      const ok = async (d) => ({ status: 'ok', distance_m: d, external_url: c.external_url, url: c.media_path ? URL.createObjectURL(await getBlob(c.media_path) || new Blob()) : null });
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
  stopWatch();
  if (B.recovery) return viewNewPassword();
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
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
    try { await B.signInPassword(email(), $('#pwd').value); route(); } catch (err) { msg($('#m'), authErr(err)); btn.disabled = false; }
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
      const r = await B.signUp(email, $('#pwd').value);
      if (!r.needsConfirm) return route();
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

async function viewHome(user, prof) {
  app.innerHTML = `
    <h1>Ciao ${esc(prof.display_name || '')}</h1>
    <a href="#/new" class="btn accent full" style="background:var(--accent)">＋ Lascia un contenuto in un luogo</a>
    <div id="list"><p class="muted center">Carico i tuoi contenuti…</p></div>
    <p class="center small"><a href="#" id="out">Esci (${esc(user.email)})</a></p>`;
  $('#out').onclick = async (e) => { e.preventDefault(); await B.signOut(); location.hash = '#/'; route(); };
  let items;
  try { items = await B.listMine(); } catch (err) { msg($('#list'), errText(err)); return; }
  if (!items.length) { $('#list').innerHTML = '<div class="card center muted">Non hai ancora lasciato nulla.<br>Inizia da un luogo che conta per te.</div>'; return; }
  $('#list').innerHTML = items.map((c, i) => `
    <div class="card" data-i="${i}">
      <div class="item"><div class="ico">${ICON[c.media_type]}</div>
        <div><div class="t">${esc(c.title)}</div>
        <div class="meta">${VIS[c.visibility]}${c.password_hash ? ' · 🔒 password' : ''} · ${new Date(c.created_at).toLocaleDateString('it-IT')}</div></div></div>
      <div class="actions">
        <button class="ghost" data-a="share">Condividi</button>
        <a class="btn ghost" href="#/c/${esc(c.share_slug)}">Apri</a>
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

async function viewNew() {
  const s = { kind: 'file', file: null, media_type: null, duration: null, lat: null, lng: null, source: null, radius: CONFIG.DEFAULT_RADIUS_M, vis: 'restricted' };
  app.innerHTML = `
    <h1>Nuovo contenuto</h1>
    <div class="card"><h2>1 · Cosa vuoi lasciare</h2>
      <div class="seg" id="kind"><button class="on" data-k="file">Dalla galleria</button><button data-k="link">Link (YouTube…)</button></div>
      <div id="k-file"><label for="file">Foto, video (max ${CONFIG.MAX_VIDEO_SECONDS} s) o audio</label>
        <input id="file" type="file" accept="image/*,video/*,audio/*"></div>
      <div id="k-link" hidden><label for="url">Indirizzo del video</label>
        <input id="url" type="url" inputmode="url" placeholder="https://youtu.be/…">
        <p class="muted small">Per i video più lunghi di ${CONFIG.MAX_VIDEO_SECONDS} secondi: caricali su YouTube (anche "non in elenco") e incolla qui il link.</p></div>
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
    </div>
    <div class="card"><h2>4 · Chi può aprirlo</h2>
      <div class="seg" id="vis"><button data-v="restricted" class="on">Persone scelte</button><button data-v="public">Tutti</button><button data-v="hidden">Solo io</button></div>
      <div id="v-restricted"><label for="emails">Email dei destinatari</label>
        <textarea id="emails" placeholder="maria@esempio.it, luca@esempio.it"></textarea>
        <p class="muted small">Solo chi accede con queste email potrà vederlo. Il link lo mandi tu (WhatsApp, SMS…).</p></div>
      <label for="pwd">Password (facoltativa)</label>
      <input id="pwd" type="text" autocomplete="off" maxlength="64" placeholder="Lascia vuoto per nessuna password">
    </div>
    <div id="sm"></div>
    <button class="full accent" id="save">Fissa nel luogo</button>
    <p class="center"><a href="#/">Annulla</a></p>`;

  // --- tipo contenuto
  $('#kind').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    s.kind = b.dataset.k;
    [...$('#kind').children].forEach((x) => x.classList.toggle('on', x === b));
    $('#k-file').hidden = s.kind !== 'file'; $('#k-link').hidden = s.kind !== 'link';
    $('#preview').innerHTML = ''; msg($('#pm'), '');
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

  // --- salvataggio
  $('#save').onclick = async () => {
    const err = (t) => msg($('#sm'), t);
    let external_url = null;
    if (s.kind === 'link') {
      external_url = $('#url').value.trim();
      if (!/^https:\/\/\S+\.\S+/.test(external_url)) return err('Inserisci un link valido che inizi con https://');
    } else if (!s.file) return err('Scegli una foto, un video o un audio.');
    if (s.lat == null) return err('Indica il luogo: GPS, coordinate o tocco sulla mappa.');
    const title = $('#title').value.trim(); if (!title) return err('Dai un titolo al contenuto.');
    const recipients = s.vis === 'restricted' ? [...new Set($('#emails').value.toLowerCase().split(/[\s,;]+/).filter(Boolean))] : [];
    const bad = recipients.filter((x) => !EMAIL_RE.test(x));
    if (bad.length) return err(`Email non valide: ${esc(bad.join(', '))}`);
    if (s.vis === 'restricted' && !recipients.length) return err('Aggiungi almeno un destinatario, oppure scegli "Tutti" o "Solo io".');
    const btn = $('#save'); btn.disabled = true; btn.textContent = s.file ? 'Carico il file…' : 'Salvo…';
    try {
      const slug = await B.create({
        file: s.kind === 'file' ? s.file : null, media_type: s.kind === 'link' ? 'link' : s.media_type, duration: s.kind === 'file' ? s.duration : null,
        external_url, lat: s.lat, lng: s.lng, radius: s.radius, source: s.source, title, hint: $('#hint').value.trim(),
        visibility: s.vis, recipients, password: $('#pwd').value,
      });
      viewCreated(title, slug);
    } catch (e) { err(errText(e)); btn.disabled = false; btn.textContent = 'Fissa nel luogo'; }
  };
}

function viewCreated(title, slug) {
  app.innerHTML = `
    <div class="hero"><span class="pin"></span><h1>Fissato!</h1>
      <p class="muted">«${esc(title)}» ora vive in quel luogo. Manda il link: si aprirà solo sul posto.</p></div>
    <div class="card" id="sh"></div>
    <a class="btn ghost full" href="#/">Torna ai miei contenuti</a>`;
  shareSheet(title, slug, $('#sh'));
}

function renderMedia(type, r) {
  if (type === 'link' || (!r.url && r.external_url)) {
    const id = youTubeId(r.external_url);
    return `${id ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Video"></iframe>` : ''}
      <a class="btn full" style="margin-top:10px" href="${esc(r.external_url)}" target="_blank" rel="noopener">Apri il contenuto ↗</a>`;
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
  const header = `<h1>${ICON[t.media_type]} ${esc(t.title)}</h1>${t.author ? `<p class="muted">da ${esc(t.author)}</p>` : ''}${t.hint ? `<div class="msg info">${esc(t.hint)}</div>` : ''}`;
  const showUnlocked = (r, d) => {
    stopWatch();
    app.innerHTML = `${header}<div class="msg ok">Sbloccato${d != null ? ` a ${d} m dal punto` : ''} ✓</div>
      <div class="card media">${renderMedia(t.media_type, r)}</div>
      <a class="btn ghost full" href="#/">${user ? 'I miei contenuti' : 'Scopri Ubi'}</a>`;
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
