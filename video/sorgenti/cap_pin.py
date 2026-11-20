import asyncio, sys, math
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
U='u_u'; O='u_o'
T=(45.9300,9.9600)
def pin(i,slug,dlat,dlng,title,hint,body,mt='text',tags=[]):
  return {'id':'p'+slug,'share_slug':slug,'owner_id':O,'title':title,'hint':hint,'media_type':mt,'media_path':None,'external_url':None,'lat':T[0]+dlat,'lng':T[1]+dlng,'unlock_radius_m':30,'visibility':'public','recipients':[],'password_hash':None,'text_body':body,'tags':tags,'created_at':'2026-11-10T10:00:00Z'}
db={'user':{'id':U,'email':'u@x.it'},'accounts':{},'unlocks':[],
 'profiles':{U:{'display_name':'Giorgio','privacy_version':'2026-11-16b'},O:{'display_name':'Elena','privacy_version':'2026-11-16b'}},
 'contents':[pin(1,'pa',0,0,'Il tramonto più bello della valle','Sulla panchina sotto il castagno, guarda verso ovest','Da qui, a fine ottobre, il sole scende proprio dietro il campanile. Siediti e aspetta: vale ogni minuto. 🌄',tags=['panorama']),
   pin(2,'pb',0.0022,0.0031,'La fontana dei desideri','x','x',tags=['storia']),pin(3,'pc',-0.0018,0.0026,'Il primo appuntamento','x','x',tags=['amore']),
   pin(4,'pd',0.0015,-0.0028,'Ricetta della nonna','x','x',tags=['famiglia']),pin(5,'pe',-0.0026,-0.0012,'Graffito del 1920','x','x',mt='photo',tags=['arte'])]}
def off(m): return (T[0]-m/111320, T[1])
async def main():
  R=Rec('/home/claude/video/pin'); await R.start(db, off(420))
  R.tl.append({'t':'title','title':'Come si apre un pin','sub':'Ricordi e sorprese nascosti nei luoghi','dur':2.4,'icon':'📍'})
  R.caption(1,'Sulla mappa vedi i pin vicino a te')
  await R.go('#/', wait=2200)
  await R.pg.evaluate("document.querySelector('#hmap').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
  await R.still(2.0)
  R.caption(2,'Ne tocchi uno: titolo e indizio')
  sel = '#hmap .mlm[title="Il tramonto più bello della valle"]'
  await R.tap(sel, after=1800, scroll=False)
  await R.still(2.2)
  R.caption(3,'Ci vai: la distanza scende')
  for m in (260, 120, 40):
    await R.ctx.set_geolocation({'latitude':off(m)[0],'longitude':off(m)[1],'accuracy':8}); await R.pg.wait_for_timeout(1300)
    await R.still(1.0)
  await R.ctx.set_geolocation({'latitude':T[0],'longitude':T[1],'accuracy':8}); await R.pg.wait_for_timeout(1500)
  R.caption(4,'Sei arrivato: tocca «Sblocca qui»')
  await R.pg.evaluate("document.querySelector('#unlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.tap('#unlock', after=1500)
  R.caption(5,'Ed ecco il contenuto: solo per chi arriva lì')
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
  await R.still(3.0)
  R.tl.append({'t':'outro','dur':4.0,'consumer':True,'title':'Lascia anche tu un ricordo','sub':'Foto, video e messaggi che si aprono solo arrivando lì.'})
  await R.stop()
asyncio.run(main())
