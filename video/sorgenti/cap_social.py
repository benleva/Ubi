import asyncio, sys, json
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import T, ME, EL, base, pin
IG = 'https://www.instagram.com/reel/DBx7tRaMq2K/?igsh=bXl0ZXN0'
SWITCH = "(u=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));d.user=u;localStorage.setItem('ubi_demo',JSON.stringify(d));})(%s)"

async def social():
    R = Rec('/home/claude/video/social'); await R.start(base(contents=[pin('pb', .002, .003, 'La fontana dei desideri', 'x', 'x')]), T)
    R.tl.append({'t': 'title', 'title': 'Un post social in un pin', 'sub': 'Un reel, un post o un video, nel luogo giusto', 'dur': 2.4, 'icon': '📸'})
    R.card('social', 3.0, cap=[1, 'Sul social: Condividi → «Copia link»'])
    R.caption(2, 'In Ubi: «Lascia un contenuto» → «Link»')
    await R.go('#/', wait=1800)
    await R.tap('a[href="#/new"]', after=1200)
    await R.pg.evaluate("document.querySelector('#kind').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('#kind [data-k="link"]', after=600)
    R.caption(3, 'Incolla: il link lo riconosce da solo')
    await R.pg.evaluate("document.querySelector('#url').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.pg.fill('#url', 'Guarda questo reel! ' + IG); await R.pg.dispatch_event('#url', 'input'); await R.pg.wait_for_timeout(500)
    await R.still(2.4)
    R.caption(4, 'Il luogo, un titolo e un indizio')
    await R.tap('#gps', after=1500)
    await R.pg.evaluate("document.querySelector('#title').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.type('#title', 'Il reel del tramonto', chunks=3, dur=0.3)
    await R.type('#hint', 'Al belvedere, sotto la croce', chunks=3, dur=0.3)
    await R.pg.evaluate("document.querySelector('#vis').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.pg.click('#vis [data-v="public"]'); await R.pg.wait_for_timeout(300)
    await R.pg.evaluate("document.querySelector('#save').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('#save', after=2200)
    await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
    await R.still(1.6)
    R.caption(5, 'Chi arriva lì lo sblocca e tocca «Apri il link»')
    slug = await R.pg.evaluate("JSON.parse(localStorage.getItem('ubi_demo')).contents.find(c=>c.media_type==='link').share_slug")
    await R.pg.evaluate(SWITCH % json.dumps({'id': EL, 'email': 'elena@esempio.it'}))
    await R.go('#/c/' + slug, reload=True, wait=1800)
    await R.pg.evaluate("document.querySelector('#unlock').scrollIntoView({block:'center'})"); await R.pg.wait_for_timeout(300)
    await R.tap('#unlock', after=1600)
    await R.pg.evaluate("(()=>{const a=[...document.querySelectorAll('a')].find(x=>/Apri il link/.test(x.textContent));a&&a.scrollIntoView({block:'center'})})()"); await R.pg.wait_for_timeout(300)
    await R.still(2.6)
    R.tl.append({'t': 'outro', 'dur': 4.0, 'consumer': True, 'title': 'I tuoi post, nei luoghi dove sono nati', 'sub': 'Si aprono solo per chi arriva lì.'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(globals()[sys.argv[1]]())
