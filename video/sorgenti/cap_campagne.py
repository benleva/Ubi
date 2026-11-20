import asyncio, json, math, random, sys
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
random.seed(4)
C=(45.6905,9.8012); A='u_a'; G='u_g'
def code(n): return ''.join(random.choice('ACDEFGHJKMNPQRTUVWXY34679') for _ in range(n))
gifts=[]
for i in range(18):
  r=75*math.sqrt(random.random()); a=random.random()*6.283
  gifts.append({'id':f'g{i}','campaign_id':'c1','prize_label':'Stella di Natale mignon' if i==0 else 'Sconto 10% sulle decorazioni','prize_meaning':'Auguri di gioia e di un anno luminoso' if i==0 else None,
    'card_code':code(8),'claim_token':'TOKEN'+str(i).zfill(11) if i else 'K7RD9QXAMPLE0000','lat':C[0]+r*math.cos(a)/111320,'lng':C[1]+r*math.sin(a)/(111320*math.cos(math.radians(C[0]))),'holder_id':None,'expires_at':None,'created_at':'2026-11-20T10:00:00Z'})
db={'user':{'id':A,'email':'andrea@x.it'},'accounts':{},'unlocks':[],'contents':[],
 'profiles':{A:{'display_name':'Andrea','privacy_version':'2026-11-16b'},G:{'display_name':'Giulia','privacy_version':'2026-11-16b'}},
 'biz':[{'id':'b1','name':'Garden Bonfanti','address':"San Paolo d'Argon",'enabled':True,'hide_campaigns':False,'cashier_token':'CASSA1','pin':'2468','lat':C[0],'lng':C[1]}],
 'camps':[{'id':'c1','business_id':'b1','title':'Natale 2026','theme':'natale','kind':'omaggio','opens_at':'2026-11-01T00:00:00Z','expires_at':'2027-01-08T22:59:00Z','lat':C[0],'lng':C[1],'radius_m':50,'intro':'Vieni a sbloccare il tuo regalo di Natale','created_at':'2026-11-01T00:00:00Z'}],
 'gifts':gifts,'items':[]}
async def main():
  R=Rec('/home/claude/video/campagne'); await R.start(db, C)
  R.title('Campagne regalo', 'Come funziona per i tuoi clienti')
  R.card('ticket', 3.2, cap=[1,'In cassa il cliente riceve un biglietto'], code='K7RD-9QXA', shop='Garden Bonfanti')
  R.caption(2,'Inquadra il QR: il regalo è suo')
  await R.go('#/dono/K7RD9QXAMPLE0000', wait=250)
  await R.seq(ms=2000, hold=1.6)
  R.caption(3,'Sulla mappa il suo albero si illumina')
  await R.pg.evaluate("document.querySelector('#gmap').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
  await R.still(2.4)
  R.caption(4,'Vuole regalarlo? Scrive un pensiero')
  await R.tap('#gopen', after=700)
  await R.pg.evaluate("document.querySelector('#gsend').scrollIntoView({block:'start'})"); await R.pg.wait_for_timeout(300)
  await R.tap('#gst .chip >> nth=0', after=400)
  await R.type('#gtxt', 'mi hai insegnato ad amare le piante. Buon Natale! 🎄', chunks=6)
  await R.pg.evaluate("document.querySelector('#gmake').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.tap('#gmake', after=900)
  R.caption(5,'…e lo manda su WhatsApp')
  await R.pg.evaluate("document.querySelectorAll('.linkbox').forEach(e=>{e.textContent=e.textContent.replace(/^https?:\\/\\/[^#]+/,'https://ubipin.it/')})")
  await R.pg.evaluate("window.scrollTo(0, document.querySelector('#gsend').getBoundingClientRect().top + scrollY - 120)"); await R.pg.wait_for_timeout(300)
  await R.tap('#gsend a.btn', after=300)
  # passa a Giulia
  d = await R.pg.evaluate("JSON.parse(localStorage.getItem('ubi_demo'))")
  tt = [g for g in d['gifts'] if g.get('transfer_token')][0]['transfer_token']
  await R.pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));d.user={id:'u_g',email:'giulia@x.it'};localStorage.setItem('ubi_demo',JSON.stringify(d));})()")
  R.caption(6,'Giulia riceve il regalo e lo accetta')
  await R.go(f'#/regalo/{tt}', reload=True, wait=1500)
  await R.still(1.6)
  await R.tap('#acc', after=1600)
  R.caption(7,'Nel garden tocca «Sblocca qui»')
  await R.pg.evaluate("document.querySelector('#gunlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(1500)
  await R.tap('#gunlock', after=900)
  await R.still(1.6)
  R.caption(8,'Scopre il premio e il messaggio')
  await R.tap('.hovbtn', after=900, scroll=False)
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
  await R.still(1.8)
  await R.pg.evaluate("document.querySelector('.gcodebox').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
  await R.still(2.0)
  code_ = (await R.pg.inner_text('.gcode')).strip()
  R.caption(9,'In cassa: codice verificato, ritirato!')
  await R.go('#/cassa/CASSA1', wait=800)
  await R.pg.fill('#cpin','2468'); await R.pg.click('#cgo'); await R.pg.wait_for_timeout(800)
  await R.type('#ccode', code_, chunks=3, dur=0.3)
  await R.tap('#cchk', after=600)
  await R.tap('#cred', after=300, double=True, dur=1.4)
  await R.still(2.2)
  R.card('outro', 4.5)
  await R.stop()
asyncio.run(main())
