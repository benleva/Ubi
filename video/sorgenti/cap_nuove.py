import asyncio, sys, copy, time
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
import cap_garden as G0
import json as _j
def gdb(user=True, owner=False, cat='garden'):
  # negozio inventato: niente nomi o loghi di attività reali nei video pubblici
  raw=_j.dumps(G0.db, ensure_ascii=False)
  for a,b in [('Garden Carrara Clusone','Garden dei Fiori'),('Garden Carrara','Garden dei Fiori'),('Via Brescia, Clusone','Via dei Prati 1'),('freddo di Clusone',"freddo d'inverno")]: raw=raw.replace(a,b)
  db=_j.loads(raw); db['biz'][0]['logo_url']='logo-fiori.png'; db['biz'][0]['category']=cat
  for c in db['contents']: c['business_id']='b1'
  if owner:
    for c in db['contents']: c['owner_id']='u_cli'; c['business_id']=None
  if not user: db['user']=None
  return db
OUTRO={'t':'outro','dur':3.4,'plain':True,'icon':'✅','title':'Tutto qui!','sub':'Dubbi? Scrivici su WhatsApp: 351 666 1495'}
async def icona():
  R=Rec('/home/claude/video/icona'); await R.start(gdb(owner=True),(45.877447,9.964995))
  R.tl.append({'t':'title','title':"Scegli l'icona del pin",'sub':'Stella di Natale, albero, birra e tante altre','dur':2.4,'icon':'🎨'})
  R.caption(1,'Apri il tuo pin e tocca «Modifica»')
  await R.go('#/c/p2', wait=1800); await R.still(1.2)
  await R.pg.evaluate("document.querySelector('#unlock')&&document.querySelector('#unlock').click()"); await R.pg.wait_for_timeout(1200)
  await R.tap('a[href="#/edit/p2"]', after=1800)
  R.caption(2,'Sotto i tag: «Icona sulla mappa»')
  await R.pg.evaluate("document.querySelector('#icopick').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400); await R.still(1.6)
  R.caption(3,'Tocca la Stella di Natale')
  await R.tap('#icopick [data-ico="stella-natale"]', after=500, scroll=False); await R.still(1.2)
  R.caption(4,'Salva le modifiche')
  await R.tap('#save', after=2000)
  R.caption(5,'Ecco la tua icona, anche sulla mappa')
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300); await R.still(2.2)
  R.tl.append(OUTRO); await R.stop()
async def cliente():
  R=Rec('/home/claude/video/cliente'); await R.start(gdb(user=False),(45.877447,9.964995))
  R.tl.append({'t':'title','title':'I pin dei negozi','sub':'Logo, colori e una domanda sola','dur':2.4,'icon':'🌿'})
  R.caption(1,'Il pin di un negozio: logo e colori suoi')
  await R.go('#/c/p2', wait=2000); await R.still(2.0)
  R.caption(2,'Non sei iscritto? «Accedi per sbloccare»')
  await R.tap('#login', after=900)
  await R.tap('#tabs [data-t="signup"]', after=700, scroll=False)
  R.caption(3,"L'iscrizione con il logo del negozio")
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300); await R.still(2.0)
  R.caption(4,'«Sei già cliente?»: rispondi se vuoi')
  await R.tap('#cq [data-cq="nuovo"]', after=600); await R.still(1.6)
  # già iscritto: la domanda arriva dopo lo sblocco
  await R.pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));d.user={id:'u_cli',email:'cliente@x.it'};localStorage.setItem('ubi_demo',JSON.stringify(d));localStorage.removeItem('ubi_cust_pending');})()")
  R.caption(5,'Già iscritto? La domanda arriva dopo lo sblocco')
  await R.go('#/c/p2', reload=True, wait=1800)
  await R.tap('#unlock', after=1600)
  await R.pg.evaluate("document.querySelector('#custbox').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400); await R.still(1.8)
  R.caption(6,'Una volta sola: al negozio solo numeri, mai il tuo nome')
  await R.tap('#custbox [data-cq="abituale"]', after=800, scroll=False); await R.still(1.8)
  R.tl.append(OUTRO); await R.stop()
async def a_clienti():
  db=gdb(); db['admin']=True; db['user']={'id':'u_admin','email':'a@x.it'}; db['profiles']['u_admin']={'display_name':'Andrea','privacy_version':'2026-11-16b'}
  for c in db['contents']: c['business_id']=None
  ans=['abituale']*41+['occasionale']*22+['nuovo']*20+['nd']*3; db['cust']={f'x{i}':{'b1':a} for i,a in enumerate(ans)}
  db['unlocks']=[{'c':'pp2','u':f'x{i}'} for i in range(52)]
  for i in range(9): db['profiles'][f'n{i}']={'display_name':'n','signup_slug':'p2'}
  R=Rec('/home/claude/video/a_clienti'); await R.start(db,(45.877447,9.964995))
  R.tl.append({'t':'title','title':'Pin dei negozi e clienti','sub':'Guida per l\'amministratore','dur':2.4,'icon':'🏪'})
  R.caption(1,'Admin → Negozi → apri il negozio')
  await R.go('#/admin/negozi', wait=1800); await R.still(1.4)
  R.caption(2,'In «Partner»: categoria e logo, poi Salva')
  await R.pg.evaluate("[...document.querySelectorAll('.shop details summary')].find(s=>/Partner/.test(s.textContent)).click()"); await R.pg.wait_for_timeout(400)
  await R.pg.evaluate("[...document.querySelectorAll('.shop details summary')].find(s=>/Partner/.test(s.textContent)).scrollIntoView({block:'start'})"); await R.pg.evaluate("window.scrollBy(0,-80)"); await R.pg.wait_for_timeout(300)
  await R.still(2.2)
  R.caption(3,'«📍 Pin del negozio e clienti»: incolla il link del pin')
  await R.pg.click('[data-a="pinsbox"] summary'); await R.pg.wait_for_timeout(700)
  await R.pg.evaluate("document.querySelector('[data-a=\"pinsbox\"]').scrollIntoView({block:'start'})"); await R.pg.evaluate("window.scrollBy(0,-80)"); await R.pg.wait_for_timeout(300)
  await R.type('[data-a="pinslug"]','https://ubipin.it/#/c/p2', chunks=3, dur=0.3)
  R.caption(4,'Tocca «Collega»: il pin prende logo e colori')
  await R.tap('[data-a="pinlink"]', after=900, scroll=False); await R.still(2.0)
  R.caption(5,'Il negozio vede i suoi numeri nella Cassa')
  await R.go('#/cassa/CASSA1', wait=1200); await R.pg.fill('#cpin','2468'); await R.pg.click('#cgo'); await R.pg.wait_for_timeout(1000)
  if await R.pg.query_selector('#clinkno'): await R.pg.click('#clinkno'); await R.pg.wait_for_timeout(600)
  await R.pg.wait_for_timeout(500); await R.pg.evaluate("document.querySelector('#cstats').scrollIntoView({block:'start'})"); await R.pg.evaluate("window.scrollBy(0,-70)"); await R.pg.wait_for_timeout(300)
  await R.still(2.6)
  R.tl.append(OUTRO); await R.stop()
if __name__=='__main__': asyncio.run(globals()[sys.argv[1]]())
