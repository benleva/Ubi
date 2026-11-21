import asyncio, sys, hashlib
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
H=lambda s: hashlib.sha256(s.encode()).hexdigest()
U='u_p'; O='u_o'
P1=(45.9200,9.9500); P2=(45.9214,9.9524); P3=(45.9226,9.9508)
def st(i,slug,p,pw,hint,body):
  return {'id':'h'+slug,'share_slug':slug,'owner_id':O,'title':f'Tappa {i}','hint':hint,'media_type':'text','media_path':None,'external_url':None,'lat':p[0],'lng':p[1],'unlock_radius_m':25,'visibility':'public','recipients':[],'password_hash':H(pw),'text_body':body,'tags':['caccia al tesoro'],'created_at':'2026-11-10T10:00:00Z','hunt_id':'H1','hunt_step':i,'hunt_title':'La merenda del campanile'}
db={'user':{'id':U,'email':'p@x.it'},'accounts':{},'unlocks':[],
 'profiles':{U:{'display_name':'Sara','privacy_version':'2026-11-16b'},O:{'display_name':'Bar del Sorriso','privacy_version':'2026-11-16b'}},
 'hunts':[{'id':'H1','owner_id':O,'title':'La merenda del campanile','prize':'Una merenda al Bar del Sorriso','max_winners':30}],
 'contents':[st(1,'t1',P1,'campanile','«Ho una voce ma non ho bocca, suono a festa e a mezzogiorno. Chi sono?»','Bravo! Prossimo indizio: «Dove si prega sulla collina, guardando la valle». La tappa 2 ti aspetta.'),
             st(2,'t2',P2,'santuario','«Dove si prega sulla collina, guardando la valle?»','Ultimo indizio: «Il bar che sorride». Vai alla tappa 3!'),
             st(3,'t3',P3,'sorriso','«Il bar del…? Indizio: ti fa sorridere»','Ce l\'hai fatta! 🎉')]}
async def main():
  R=Rec('/home/claude/video/caccia'); await R.start(db, P1)
  R.tl.append({'t':'title','title':'Caccia al tesoro','sub':'Come si gioca','dur':2.4,'icon':'🗺️'})
  R.caption(1,'Alla tappa 1 legge l\'indovinello')
  await R.go('#/c/t1', wait=1800)
  await R.still(2.2)
  R.caption(2,'Scrive la risposta e tocca «Sblocca»')
  await R.pg.evaluate("document.querySelector('#pwd').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.type('#pwd', 'campanile', chunks=3, dur=0.3)
  await R.tap('#unlock', after=700)
  R.caption(3,'Esatto! Si parte')
  await R.still(1.6)
  await R.tap('.hovbtn', after=900, scroll=False)
  R.caption(4,'Legge l\'indizio e scopre la tappa 2')
  await R.pg.evaluate("document.querySelector('#huntgo').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400)
  await R.tap('#huntgo', after=150)
  R.caption(5,'Sulla mappa cade il forziere della tappa 2')
  await R.seq(ms=2000, hold=1.6)
  await R.ctx.set_geolocation({'latitude':P2[0],'longitude':P2[1],'accuracy':8})
  R.caption(6,'Risposta sbagliata? Si riprova')
  await R.tap('.hnext', after=1600, scroll=False)
  await R.pg.evaluate("document.querySelector('#pwd').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.type('#pwd', 'chiesa', chunks=2, dur=0.3)
  await R.tap('#unlock', after=700)
  await R.still(1.4)
  await R.tap('.hovbtn', after=500, scroll=False)
  await R.pg.fill('#pwd','')
  await R.type('#pwd', 'santuario', chunks=3, dur=0.3)
  await R.tap('#unlock', after=700)
  await R.still(1.4)
  await R.ctx.set_geolocation({'latitude':P3[0],'longitude':P3[1],'accuracy':8})
  R.caption(7,'Ultima tappa: caccia completata!')
  await R.go('#/c/t3', wait=1800)
  await R.pg.evaluate("document.querySelector('#pwd').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
  await R.type('#pwd', 'sorriso', chunks=2, dur=0.3)
  await R.tap('#unlock', after=800)
  await R.still(1.6)
  R.caption(8,'Mostra il codice al locale e ritira il regalo')
  await R.tap('.hovbtn', after=1200, scroll=False)
  await R.still(2.6)
  R.tl.append({'t':'outro','dur':4.5})
  await R.stop()
asyncio.run(main())
