import asyncio, sys, time
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_admin import base, END, A
G = (45.6905, 9.8012); O = 'u_pub'
VET = {'id': 'v1', 'share_slug': 'vet123', 'owner_id': O, 'title': 'La birretta del Kymera', 'hint': 'Al bancone del Pub Kymera', 'media_type': 'text', 'media_path': None,
       'external_url': None, 'lat': G[0], 'lng': G[1], 'unlock_radius_m': 30, 'visibility': 'public', 'recipients': [], 'password_hash': None,
       'text_body': '🍺 Mostra questo pin al banco: la birretta te la offriamo noi!\n\nBenvenuto al Pub Kymera. Ci vediamo al bancone 😉', 'tags': ['vetrina'], 'created_at': '2026-11-20T10:00:00Z'}
def nfcmap(hits=False):
    now = int(time.time() * 1000); m = {}
    for i in range(1, 61): m[f'P{i:02d}'] = {'label': f'Adesivo {i}'}
    for i in range(1, 21): m[f'C{i:02d}'] = {'label': f'Card gestore {i}'}
    m['P01'] = {'label': 'Pub Kymera · bancone', 'target': '#/c/vet123', 'business_id': 'b1', 'hits': [now - k * 3600_000 for k in range(47)] if hits else []}
    return m
BIZ = [{'id': 'b1', 'name': 'Pub Kymera', 'address': 'Clusone', 'lat': G[0], 'lng': G[1], 'enabled': True, 'pin': '1234', 'cashier_token': 'KYM001'}]

async def nfc():
    d = {'user': {'id': 'u_cli', 'email': 'luca@esempio.it'}, 'accounts': {}, 'unlocks': [], 'contents': [VET], 'book': {},
         'profiles': {'u_cli': {'display_name': 'Luca', 'privacy_version': '2026-11-16b'}, O: {'display_name': 'Pub Kymera', 'privacy_version': '2026-11-16b'}},
         'nfc': nfcmap(), 'biz': BIZ}
    R = Rec('/home/claude/video/nfc'); await R.start(d, G)
    R.tl.append({'t': 'title', 'title': 'Avvicina il telefono', 'sub': 'Gli NFC di Ubi nei locali', 'dur': 2.4, 'icon': '📱'})
    R.card('nfc', 3.2, cap=[1, 'Al bancone: avvicina il telefono al cerchio'])
    R.caption(2, 'Si apre subito la vetrina del locale')
    await R.go('#/nfc/P01', wait=2200)
    await R.still(1.8)
    R.caption(3, 'Sei già lì: tocca «Sblocca qui»')
    await R.pg.evaluate("document.querySelector('#unlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('#unlock', after=1500)
    R.caption(4, 'Ecco l\'offerta: mostrala al banco')
    await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
    await R.still(2.6)
    R.tl.append({'t': 'outro', 'dur': 4.0, 'consumer': True, 'title': 'Avvicina il telefono, scopri la sorpresa', 'sub': 'iPhone: schermo sbloccato, parte alta del telefono.'})
    await R.stop()

async def a_nfc():
    R = Rec('/home/claude/video/a_nfc'); await R.start(base({'nfc': nfcmap(True), 'biz': BIZ, 'contents': [VET]}), G)
    R.tl.append({'t': 'title', 'title': 'Gli NFC', 'sub': 'Guida dell\'amministratore', 'dur': 2.2, 'icon': '🏷️'})
    R.caption(1, 'Admin → 🏷️ NFC: adesivi e card')
    await R.go('#/admin/nfc', wait=1500)
    await R.still(1.8)
    R.caption(2, 'Ogni adesivo: tocchi degli ultimi 30 giorni')
    await R.pg.evaluate("document.querySelector('.nfcrow[data-code=\"P01\"]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.still(1.8)
    R.caption(3, '«Destinazione»: nome, negozio e dove porta')
    await R.tap('.nfcrow[data-code="P02"] [data-a="edit"]', after=700)
    await R.pg.fill('.nfcrow[data-code="P02"] [data-k="label"]', '')
    await R.type('.nfcrow[data-code="P02"] [data-k="label"]', 'Garden Bonfanti · cassa', chunks=3, dur=0.3)
    await R.pg.select_option('.nfcrow[data-code="P02"] [data-k="biz"]', 'b1')
    R.caption(4, 'Adesivo → la vetrina del negozio')
    await R.pg.evaluate("document.querySelector('.nfcrow[data-code=\"P02\"] [data-k=\"pin\"]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.type('.nfcrow[data-code="P02"] [data-k="pin"]', 'https://ubipin.it/#/c/vet123', chunks=3, dur=0.3)
    await R.tap('.nfcrow[data-code="P02"] [data-k="save"]', after=1200)
    R.caption(5, 'Card del gestore → la sua Cassa')
    await R.pg.evaluate("document.querySelectorAll('details').forEach(x=>x.open=true)")
    await R.pg.evaluate("document.querySelector('.nfcrow[data-code=\"C01\"]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('.nfcrow[data-code="C01"] [data-a="edit"]', after=700)
    await R.pg.evaluate("document.querySelector('.nfcrow[data-code=\"C01\"] [data-k=\"save\"]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('.nfcrow[data-code="C01"] [data-k="save"]', after=1200)
    R.caption(6, '«Copia link»: è quello da scrivere con NFC Tools')
    await R.pg.evaluate("document.querySelector('.nfcrow[data-code=\"P03\"]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('.nfcrow[data-code="P03"] [data-a="copy"]', after=900)
    await R.still(1.2)
    R.caption(7, 'Cambi destinazione quando vuoi, senza riscriverlo')
    await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
    await R.still(2.0)
    R.tl.append(END); await R.stop()

if __name__ == '__main__':
    asyncio.run(globals()[sys.argv[1]]())
