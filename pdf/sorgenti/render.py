import asyncio, subprocess, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8811','-d','/home/claude/pdfs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=await b.new_page()
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    for src,out in [('attivita','Ubi-per-le-attivita'),('campagne','Ubi-campagne-regalo')]:
      await pg.goto(f'http://localhost:8811/{src}.html'); await pg.wait_for_selector('body[data-ready="1"]', timeout=10000); await pg.wait_for_timeout(300)
      # controllo: niente pagina che trabocca
      ov = await pg.evaluate("[...document.querySelectorAll('.pg')].map((p,i)=>{const f=p.querySelector('.foot');const kids=[...p.children].filter(c=>c!==f&&c.tagName!=='SCRIPT');const b=Math.max(...kids.map(c=>c.getBoundingClientRect().bottom));return [i+1, Math.round(f.getBoundingClientRect().top - b)]})")
      print(src, ov)
      await pg.pdf(path=f'/home/claude/pdfs/{out}.pdf', format='A4', print_background=True, margin={'top':'0','bottom':'0','left':'0','right':'0'})
    print('errs', errs); await b.close()
asyncio.run(m()); srv.terminate()
