import asyncio, sys
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
C=(45.9205,9.9512); M='u_m'; L='u_l'
db={'user':{'id':M,'email':'marco@x.it'},'accounts':{},'unlocks':[],'contents':[],
 'profiles':{M:{'display_name':'Marco','privacy_version':'2026-11-16b'},L:{'display_name':'Luca','privacy_version':'2026-11-16b'}},
 'biz':[{'id':'b1','name':'Bar del Sorriso','address':'Valfiorita','enabled':True,'hide_campaigns':False,'cashier_token':'CASSA2','pin':'1357','lat':C[0],'lng':C[1]}],
 'items':[{'id':'i1','business_id':'b1','name':'Caffè','value_label':'1,20 €','active':True},{'id':'i2','business_id':'b1','name':'Birra media','value_label':'5 €','active':True},
          {'id':'i3','business_id':'b1','name':'Hamburger e patatine','value_label':'12 €','active':True},{'id':'i4','business_id':'b1','name':'Aperitivo per due','value_label':'15 €','active':True}],
 'camps':[],'gifts':[]}
async def main():
  R=Rec('/home/claude/video/consumazione'); await R.start(db, C)
  R.tl.append({'t':'title','title':'Regala una consumazione','sub':'Come funziona al bar','dur':2.4,'icon':'🍺'})
  R.caption(1,'Il cliente paga al banco: tu tocchi «Birra»')
  await R.go('#/cassa/CASSA2', wait=700)
  await R.pg.fill('#cpin','1357'); await R.pg.click('#cgo'); await R.pg.wait_for_timeout(800)
  await R.tap('[data-item="i2"]', after=300, double=True, dur=1.4)
  await R.pg.evaluate("document.querySelector('#cissue').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
  await R.still(2.2)
  d = await R.pg.evaluate("JSON.parse(localStorage.getItem('ubi_demo'))")
  tok = d['gifts'][0]['claim_token']
  R.caption(2,'Inquadra il QR: il regalo è suo')
  await R.go(f'#/dono/{tok}', wait=250)
  await R.seq(ms=1600, hold=1.4)
  R.caption(3,'Scrive un pensiero per un amico')
  await R.tap('#gopen', after=700)
  await R.pg.evaluate("document.querySelector('#gsend').scrollIntoView({block:'start'})"); await R.pg.wait_for_timeout(300)
  await R.pg.click('.gideas summary'); await R.pg.wait_for_timeout(300)
  await R.pg.evaluate("document.querySelector('.gideas').scrollIntoView({block:'start'})"); await R.pg.wait_for_timeout(300)
  await R.tap('.gidea >> text=Questa birra ti aspetta', after=700)
  await R.still(1.4)
  await R.pg.evaluate("document.querySelector('#gmake').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.tap('#gmake', after=900)
  R.caption(4,'…e lo manda su WhatsApp')
  await R.pg.evaluate("document.querySelectorAll('.linkbox').forEach(e=>{e.textContent=e.textContent.replace(/^https?:\\/\\/[^#]+/,'https://ubipin.it/')})")
  await R.pg.evaluate("window.scrollTo(0, document.querySelector('#gsend').getBoundingClientRect().top + scrollY - 120)"); await R.pg.wait_for_timeout(300)
  await R.tap('#gsend a.btn', after=300)
  d = await R.pg.evaluate("JSON.parse(localStorage.getItem('ubi_demo'))")
  tt = [g for g in d['gifts'] if g.get('transfer_token')][0]['transfer_token']
  await R.pg.evaluate("(()=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));d.user={id:'u_l',email:'luca@x.it'};localStorage.setItem('ubi_demo',JSON.stringify(d));})()")
  R.caption(5,'Luca riceve la birra e la accetta')
  await R.go(f'#/regalo/{tt}', reload=True, wait=1500)
  await R.still(1.6)
  await R.tap('#acc', after=1600)
  R.caption(6,'Al bar tocca «Sblocca qui»')
  await R.pg.evaluate("document.querySelector('#gunlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(1500)
  await R.tap('#gunlock', after=900)
  await R.still(1.4)
  R.caption(7,'Legge il messaggio e mostra il codice')
  await R.tap('.hovbtn', after=900, scroll=False)
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
  await R.still(2.2)
  code_ = (await R.pg.inner_text('.gcode')).strip()
  R.caption(8,'Al banco: codice verificato, alla salute!')
  await R.go('#/cassa/CASSA2', wait=800)
  await R.type('#ccode', code_, chunks=3, dur=0.3)
  await R.tap('#cchk', after=600)
  await R.tap('#cred', after=300, double=True, dur=1.4)
  await R.still(2.2)
  R.tl.append({'t':'outro','dur':4.5})
  await R.stop()
asyncio.run(main())
