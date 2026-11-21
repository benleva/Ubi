# Video per i NEGOZI (titolare e dipendenti): niente schermate di amministrazione
import asyncio, sys
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
G = (45.6905, 9.8012); TIT = 'u_tit'
def db():
    return {'user': {'id': TIT, 'email': 'marco@esempio.it'}, 'admin': False, 'accounts': {}, 'unlocks': [], 'contents': [], 'book': {},
            'profiles': {TIT: {'display_name': 'Marco', 'privacy_version': '2026-11-16b'}},
            'biz': [{'id': 'b1', 'name': 'Garden dei Fiori', 'address': "Valfiorita", 'enabled': True, 'hide_campaigns': False, 'cashier_token': 'CASSA1', 'pin': '2468', 'lat': G[0], 'lng': G[1]}],
            'items': [{'id': 'i1', 'business_id': 'b1', 'name': 'Stella di Natale mignon', 'value_label': '6 €', 'active': True, 'sort': 0},
                      {'id': 'i2', 'business_id': 'b1', 'name': 'Mazzo di tulipani', 'value_label': '12 €', 'active': True, 'sort': 1}],
            'camps': [], 'gifts': [], 'members': []}
async def cassa():
    R = Rec('/home/claude/video/cassa'); await R.start(db(), G)
    R.tl.append({'t': 'title', 'title': 'La Cassa del tuo negozio', 'sub': 'Per titolari e dipendenti', 'dur': 2.4, 'icon': '🧾'})
    R.caption(1, 'Apri il link della Cassa che ti abbiamo mandato')
    await R.go('#/cassa/CASSA1', wait=1500)
    await R.still(1.4)
    R.caption(2, 'Scrivi il PIN che ti abbiamo detto a voce')
    await R.type('#cpin', '2468', chunks=2, dur=0.3)
    await R.tap('#cgo', after=1300)
    R.caption(3, '«Collega»: la Cassa entra nel tuo account Ubi')
    await R.tap('#clinkok', after=900)
    await R.still(1.4)
    R.caption(4, 'Da ora la trovi nella tua home, senza PIN')
    await R.go('#/', reload=True, wait=1800)
    await R.pg.evaluate("document.querySelector('#cashrow').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
    await R.tap('.cashbtn', after=1400)
    R.caption(5, 'Il cliente paga: tocca l\'articolo due volte')
    await R.pg.evaluate("document.querySelector('[data-item]').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('[data-item]', after=400)
    await R.tap('[data-item]', after=1400)
    R.caption(6, 'Il cliente inquadra il QR, o lo mandi su WhatsApp')
    await R.pg.evaluate("document.querySelector('#cissue').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
    await R.still(2.4)
    # il regalo viene aperto dal cliente sul posto (fuori scena): ha il suo codice
    await R.pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));const g=d.gifts[0];g.holder_id='u_cli';g.unlocked_at=new Date().toISOString();g.redeem_code='K7RM4P';localStorage.setItem('ubi_demo',JSON.stringify(d));})()")
    R.caption(7, 'Il cliente torna: scrivi il codice e «Verifica»')
    await R.go('#/cassa/CASSA1', reload=True, wait=1500)
    await R.type('#ccode', 'K7RM4P', chunks=3, dur=0.3)
    await R.tap('#cchk', after=1200)
    R.caption(8, 'Valido: consegna e «Segna come ritirato»')
    await R.tap('#cred', after=500)
    await R.tap('#cred', after=1300)
    await R.still(1.8)
    R.tl.append({'t': 'outro', 'dur': 3.2, 'plain': True, 'icon': '✅', 'title': 'Tutto qui!', 'sub': 'Dubbi? Scrivici su WhatsApp: 351 666 1495'})
    await R.stop()
if __name__ == '__main__':
    asyncio.run(globals()[sys.argv[1]]())
