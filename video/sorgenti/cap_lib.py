# Libreria comune: cattura schermate dell'app demo e registra la «sceneggiatura» (timeline.json)
import asyncio, subprocess, sys, json, time, os
from playwright.async_api import async_playwright
ML=open('/tmp/seedtest/minileaflet.js').read()
HIDE = "#mode{display:none!important} .ver{display:none!important}"
class Rec:
  def __init__(self, out):
    self.out=out; os.makedirs(out, exist_ok=True); self.tl=[]; self.n=0; self.cap=None
  async def start(self, db, geo, lang='it'):
    self.srv = subprocess.Popen([sys.executable,'-m','http.server','8799','-d','/tmp/seedtest/site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    self.p = await async_playwright().start()
    self.b = await self.p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    self.ctx = await self.b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, locale='it-IT',
      geolocation={'latitude':geo[0],'longitude':geo[1],'accuracy':8}, permissions=['geolocation','clipboard-read','clipboard-write'])
    await self.ctx.add_init_script("if(!localStorage.getItem('ubi_demo'))localStorage.setItem('ubi_demo', %s); localStorage.setItem('ubi_lang','%s');" % (json.dumps(json.dumps(db)), lang))
    await self.ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.appendChild(s);});" % json.dumps(HIDE))
    self.pg = await self.ctx.new_page(); self.errs=[]; self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
    async def route(r):
      u=r.request.url
      if 'localhost' in u: return await r.continue_()
      if 'unpkg.com/leaflet' in u and u.endswith('.js'): return await r.fulfill(status=200, content_type='application/javascript', body=ML if 'markercluster' not in u else '')
      return await r.abort()
    await self.pg.route('**/*', route)
  async def go(self, hash, wait=1500, reload=False):
    await self.pg.goto('http://localhost:8799/index.html'+hash)
    if reload: await self.pg.reload()
    await self.pg.wait_for_timeout(wait)
  async def shot(self):
    await self.pg.evaluate("""(()=>{document.querySelectorAll('.linkbox').forEach(e=>{e.textContent=e.textContent.replace(/https?:\\/\\/localhost:8799\\/index\\.html/g,'https://ubipin.it/')});
      document.querySelectorAll('p.muted.small').forEach(e=>{if(/^Demo:/.test(e.textContent))e.remove()});
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.nodeValue.includes('localhost:8799'))n.nodeValue=n.nodeValue.replace(/https?:\\/\\/localhost:8799\\/index\\.html/g,'https://ubipin.it/')}
      document.querySelectorAll('input,textarea').forEach(e=>{if(e.value&&e.value.includes('localhost:8799'))e.value=e.value.replace(/https?:\\/\\/localhost:8799\\/index\\.html/g,'https://ubipin.it/')});})()""")
    self.n+=1; f=f'{self.out}/s{self.n:03d}.jpg'
    await self.pg.screenshot(path=f, type='jpeg', quality=92); return f
  def caption(self, num, text): self.cap=[num, text]
  async def still(self, dur=1.6):
    f=await self.shot(); self.tl.append({'t':'still','img':f,'dur':dur,'cap':self.cap}); return f
  async def tap(self, sel, after=900, double=False, dur=1.2, scroll=True):
    loc=self.pg.locator(sel).first
    if scroll: await loc.scroll_into_view_if_needed(); await self.pg.wait_for_timeout(250)
    bb=await loc.bounding_box(); f=await self.shot()
    self.tl.append({'t':'tap','img':f,'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'dur':dur,'cap':self.cap,'double':double})
    await loc.click()
    if double: await self.pg.wait_for_timeout(200); await loc.click()
    await self.pg.wait_for_timeout(after)
  async def seq(self, ms=1800, hold=1.2):
    # anima: tante schermate di seguito, ognuna con il suo tempo reale
    t0=time.time(); frames=[]
    while (time.time()-t0)*1000 < ms:
      f=await self.shot(); frames.append([f, time.time()-t0])
    self.tl.append({'t':'seq','frames':frames,'hold':hold,'cap':self.cap})
  async def type(self, sel, text, chunks=5, dur=0.35):
    loc=self.pg.locator(sel).first; base=await loc.input_value()
    step=max(1,len(text)//chunks)
    for i in range(step, len(text)+step, step):
      await loc.fill(base+text[:i]); f=await self.shot(); self.tl.append({'t':'still','img':f,'dur':dur,'cap':self.cap})
  def title(self, title, sub, dur=2.4): self.tl.append({'t':'title','title':title,'sub':sub,'dur':dur})
  def card(self, kind, dur, **kw): self.tl.append({'t':kind,'dur':dur, **kw})
  async def stop(self):
    json.dump(self.tl, open(f'{self.out}/timeline.json','w'), ensure_ascii=False, indent=1)
    print('errs', self.errs); await self.b.close(); await self.p.stop(); self.srv.terminate()
