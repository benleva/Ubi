import { qrMatrix } from './qr.js';
const TREE = '<svg viewBox="0 0 24 24"><path d="M12 1.2l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2z" fill="#ffd54a"/><polygon points="12,4 16.5,9.5 14.3,9.5 18.6,14.5 16,14.5 20.5,19.6 3.5,19.6 8,14.5 5.4,14.5 9.7,9.5 7.5,9.5" fill="#1e7d45"/><rect x="10.6" y="19.6" width="2.8" height="3" fill="#8a4b12"/><circle cx="11" cy="9" r="1" fill="#ffd54a"/><circle cx="14.2" cy="12.6" r="1" fill="#ff5252"/><circle cx="9.3" cy="13.4" r="1" fill="#4fc3f7"/><circle cx="15.6" cy="17.4" r="1" fill="#ffd54a"/><circle cx="8" cy="17.6" r="1" fill="#ff5252"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg>';
const BOX = '<svg viewBox="0 0 64 64"><rect x="9" y="27" width="46" height="31" rx="3" fill="#c0392b"/><rect x="6" y="19" width="52" height="11" rx="3" fill="#e74c3c"/><rect x="29" y="19" width="6" height="39" fill="#ffd54a"/><path d="M32 19c-5-11-18-10-14-2 2 3 8 3 14 2zm0 0c5-11 18-10 14-2-2 3-8 3-14 2z" fill="#ffd54a"/></svg>';
document.querySelectorAll('[data-tree]').forEach((e) => { e.innerHTML = TREE; });
document.querySelectorAll('[data-box]').forEach((e) => { e.innerHTML = BOX; });
// mappa illustrata: strade, edifici, area tratteggiata, alberi sparsi, il mio che brilla
document.querySelectorAll('[data-map]').forEach((e) => {
  const n = +e.dataset.map || 14; let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let trees = '';
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = 26 * Math.sqrt(rnd()); trees += `<g transform="translate(${50 + r * Math.cos(a) - 4},${50 + r * Math.sin(a) * 0.8 - 5}) scale(.36)" opacity=".85">${TREE.replace(/<\/?svg[^>]*>/g, '')}</g>`; }
  const mine = `<circle cx="62" cy="44" r="9" fill="#ffd54a" opacity=".45"/><g transform="translate(55,35) scale(.6)">${TREE.replace(/<\/?svg[^>]*>/g, '')}</g>`;
  e.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
    <rect width="100" height="100" fill="#eef1e4"/><rect x="0" y="0" width="38" height="30" fill="#e3e8d6"/><rect x="70" y="66" width="30" height="34" fill="#dfe8d2"/>
    <path d="M-5 78 L105 58" stroke="#fff" stroke-width="7"/><path d="M28 -5 L40 105" stroke="#fff" stroke-width="5"/><path d="M-5 78 L105 58" stroke="#f6d38a" stroke-width="1.2"/>
    <rect x="62" y="8" width="18" height="12" fill="#d9cfc0"/><rect x="8" y="40" width="14" height="16" fill="#d9cfc0"/><rect x="80" y="30" width="14" height="10" fill="#d9cfc0"/>
    <circle cx="50" cy="50" r="30" fill="#1e7d45" fill-opacity=".07" stroke="#1e7d45" stroke-width=".7" stroke-dasharray="2 2"/>
    ${trees}${mine}<circle cx="36" cy="66" r="2.6" fill="#1f3a5f" stroke="#fff" stroke-width="1"/></svg>`;
});
document.querySelectorAll('[data-qr]').forEach((e) => {
  const m = qrMatrix(e.dataset.qr), n = m.length, q = 2; let d = '';
  m.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + q} ${y + q}h1v1h-1z`; }));
  e.innerHTML = `<svg viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
});
document.body.dataset.ready = '1';
