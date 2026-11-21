import asyncio, sys, math, random, copy, time, shutil, os
sys.path.insert(0,'/home/claude/video')
from cap_lib import Rec
random.seed(11)
C=(45.70000,9.67000); B0=(45.69990,9.67000); U='u_cli'; O='u_sm'
NAME='La Bottega'; OUT='/home/claude/pdfs/negozio/img'
def pin(slug,lat,lng,title,hint,body,tags):
  return {'id':'p'+slug,'share_slug':slug,'owner_id':O,'title':title,'hint':hint,'media_type':'text','media_path':None,'external_url':None,'lat':lat,'lng':lng,'unlock_radius_m':15,'visibility':'public','recipients':[],'password_hash':None,'text_body':body,'tags':tags,'created_at':'2026-11-21T10:00:00Z','replies_enabled':True,'business_id':'b1'}
P=[('s1',45.70000,9.67000,'Benvenuti alla Bottega',"Entra: c'è un messaggio per te.",'x',['vetrina','ico-negozio']),
 ('s2',45.69990,9.67000,'Il regalo giusto','Non sai cosa regalare? Ecco cinque idee per non sbagliare.','Pensa a chi lo riceve, decidi il budget prima, scegli qualcosa di bello e utile, cura il pacchetto e chiedi se si può cambiare. Per un consiglio, chiedi a noi! 🎁',['regalo','guida','ico-regalo']),
 ('s3',45.69995,9.67006,'Le novità di stagione','Cosa è appena arrivato in vetrina?','x',['ico-stella']),
 ('s4',45.69985,9.66994,"Il consiglio dell'esperto",'Come si sceglie bene?','x',['guida','ico-info']),
 ('s5',45.70004,9.66996,"L'idea sotto i 20 €",'Un pensiero bello che non pesa sul portafoglio.','x',['regalo','ico-cuore']),
 ('s7',45.69993,9.67008,'Regala un buono','Non sai la taglia o il gusto?','x',['regalo','ico-regalo']),
 ('s9',45.70008,9.67010,'Lascia la tua recensione',"Sei passato dalla Bottega? Raccontaci com'è andata.",'Rispondi a questo pin con un video, una foto o due righe. Le recensioni le può lasciare solo chi è stato davvero qui. 😊',['recensioni','ico-stella'])]
def code(n): return ''.join(random.choice('ACDEFGHJKMNPQRTUVWXY34679') for _ in range(n))
gifts=[]
for i in range(14):
  r=70*math.sqrt(random.random()); a=random.random()*6.283
  gifts.append({'id':f'g{i}','campaign_id':'c1','prize_label':'Confezione regalo in omaggio','prize_meaning':None,'card_code':code(8),
    'claim_token':'TOKEN'+str(i).zfill(11) if i else 'BOTT9QXAMPLE0000','lat':C[0]+r*math.cos(a)/111320,'lng':C[1]+r*math.sin(a)/(111320*math.cos(math.radians(C[0]))),'holder_id':None,'expires_at':None,'created_at':'2026-11-21T10:00:00Z'})
db0={'user':{'id':U,'email':'cliente@x.it'},'admin':False,'accounts':{},'unlocks':[],'book':{},
 'profiles':{U:{'display_name':'Luca','privacy_version':'2026-11-16b'},O:{'display_name':NAME,'privacy_version':'2026-11-16b'}},
 'contents':[pin(*p) for p in P],
 'biz':[{'id':'b1','name':NAME,'address':'Via Roma 10','enabled':True,'hide_campaigns':False,'cashier_token':'CASSA1','pin':'2468','lat':B0[0],'lng':B0[1],'logo_url':'logo-bottega.png','category':'negozio'}],
 'items':[{'id':'i1','business_id':'b1','name':'Buono regalo 20 €','value_label':'','active':True,'sort':0},{'id':'i2','business_id':'b1','name':'Buono regalo 50 €','value_label':'','active':True,'sort':1},{'id':'i3','business_id':'b1','name':'Confezione regalo','value_label':'','active':True,'sort':2}],
 'camps':[{'id':'c1','business_id':'b1','title':'Natale alla Bottega','theme':'natale','kind':'omaggio','opens_at':'2026-11-01T00:00:00Z','expires_at':'2027-01-06T22:59:00Z','lat':C[0],'lng':C[1],'radius_m':90,'intro':'Cerca gli alberelli nelle vie del centro','created_at':'2026-11-01T00:00:00Z'}],
 'gifts':gifts,'members':[]}
async def snap(R,name):
  f=await R.shot(); shutil.copy(f,f'{OUT}/{name}.jpg'); print(name)
async def run(db, geo, steps):
  R=Rec('/tmp/sm_raw'); await R.start(db, geo)
  try: await steps(R)
  finally:
    print('errs',R.errs); await R.b.close(); await R.p.stop(); R.srv.terminate()
async def s_main(R):
  await R.go('#/c/s2', wait=1800); await snap(R,'pin_teaser')
  await R.pg.evaluate("document.querySelector('#unlock').scrollIntoView({block:'center'})"); await R.pg.click('#unlock'); await R.pg.wait_for_timeout(1600)
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300); await snap(R,'pin_aperto')
  await R.pg.evaluate("document.querySelector('#custbox').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300); await snap(R,'cli_domanda')
  await R.ctx.set_geolocation({'latitude':C[0],'longitude':C[1],'accuracy':8})
  await R.go('#/dono/BOTT9QXAMPLE0000', wait=2000); await snap(R,'regalo_mappa')
  await R.pg.evaluate("document.querySelector('#gunlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(1500)
  await R.pg.click('#gunlock'); await R.pg.wait_for_timeout(1000)
  try: await R.pg.click('.hovbtn'); await R.pg.wait_for_timeout(900)
  except Exception as e: print('hov',e)
  await R.pg.evaluate("document.querySelector('.gcodebox').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(400); await snap(R,'regalo_codice')
  code_=(await R.pg.inner_text('.gcode')).strip()
  await R.go('#/cassa/CASSA1', wait=1200); await R.pg.fill('#cpin','2468'); await R.pg.click('#cgo'); await R.pg.wait_for_timeout(1000)
  if await R.pg.query_selector('#clinkno'): await R.pg.click('#clinkno'); await R.pg.wait_for_timeout(600)
  await R.pg.fill('#ccode',code_); await R.pg.click('#cchk'); await R.pg.wait_for_timeout(900)
  await R.pg.click('#cred'); await R.pg.wait_for_timeout(400); await R.pg.click('#cred'); await R.pg.wait_for_timeout(1200)
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300); await snap(R,'cassa')
  await R.ctx.set_geolocation({'latitude':45.70008,'longitude':9.67010,'accuracy':8})
  await R.go('#/c/s9', wait=1800); await R.pg.evaluate("document.querySelector('#unlock').scrollIntoView({block:'center'})"); await R.pg.click('#unlock'); await R.pg.wait_for_timeout(1500)
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300); await snap(R,'recensione')
async def s_guest(R):
  await R.go('#/c/s2', wait=2000); await R.pg.click('#login'); await R.pg.wait_for_timeout(800)
  await R.pg.click('#tabs [data-t="signup"]'); await R.pg.wait_for_timeout(600); await R.pg.click('#cq [data-cq="nuovo"]')
  await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(400); await snap(R,'cli_iscrizione')
async def s_stats(R):
  await R.go('#/cassa/CASSA1', wait=1200); await R.pg.fill('#cpin','2468'); await R.pg.click('#cgo'); await R.pg.wait_for_timeout(1000)
  if await R.pg.query_selector('#clinkno'): await R.pg.click('#clinkno'); await R.pg.wait_for_timeout(600)
  await R.pg.wait_for_timeout(600); await R.pg.evaluate("document.querySelector('#cstats').scrollIntoView({block:'start'})"); await R.pg.evaluate("window.scrollBy(0,-70)"); await R.pg.wait_for_timeout(300)
  await snap(R,'cassa_numeri')
async def main():
  os.makedirs(OUT,exist_ok=True)
  await run(copy.deepcopy(db0),B0,s_main)
  g=copy.deepcopy(db0); g['user']=None; await run(g,B0,s_guest)
  st=copy.deepcopy(db0); st['user']={'id':'u_tit','email':'t@x.it'}; st['profiles']['u_tit']={'display_name':'Titolare','privacy_version':'2026-11-16b'}
  ans=['abituale']*38+['occasionale']*19+['nuovo']*24+['nd']*2; st['cust']={f'x{i}':{'b1':a} for i,a in enumerate(ans)}
  st['unlocks']=[{'c':'p'+s,'u':f'x{i}'} for s,n in [('s1',64),('s2',51),('s3',38),('s4',24),('s5',33),('s7',21),('s9',29)] for i in range(n)]
  for i in range(18): st['profiles'][f'n{i}']={'display_name':'n','signup_slug':['s1','s2','s5','s9'][i%4]}
  now=int(time.time()*1000); st['nfc']={'P02':{'label':'Cassa Bottega','business_id':'b1','hits':[now-i*3_000_000 for i in range(94)]}}
  await run(st,B0,s_stats)
if __name__=="__main__": asyncio.run(main())
