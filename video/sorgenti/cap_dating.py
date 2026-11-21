import asyncio, sys, json
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import T, ME, EL, pin
PHOTO = '/home/claude/video/assets/tramonto.jpg'
LU, SA = 'u_lu', 'u_sa'
SWITCH = "(u=>{const d=JSON.parse(localStorage.getItem('ubi_demo'));d.user=u;localStorage.setItem('ubi_demo',JSON.stringify(d));})(%s)"
def P(name, g=None):
    p = {'display_name': name, 'privacy_version': '2026-11-16b'}
    if g: p.update({'dating_gender': g, 'dating_birth_date': '1990-05-10', 'dating_consent_version': '1'})
    return p
def dpin(slug, dlat, dlng, title, hint, body, owner):
    return {**pin(slug, dlat, dlng, title, hint, body, owner=owner), 'is_dating': True}
PINS = [dpin('el1', 0, 0, 'Il mio posto per le albe', 'Sulla panchina di legno in cima al sentiero', 'Salgo qui quasi ogni domenica, prima che arrivi il sole. Se ci sei arrivato anche tu, forse ci capiamo già. 🌄 Mi piacciono i rifugi, il pane caldo e le camminate senza fretta.', EL),
        dpin('sa1', .0022, -.0026, 'Caffè e montagne', 'x', 'x', SA), dpin('lu1', -.0018, .0031, 'Il lago al tramonto', 'x', 'x', LU),
        dpin('sa2', .0035, .002, 'Il faggio gigante', 'x', 'x', SA), pin('pb', -.003, -.002, 'La fontana dei desideri', 'x', 'x')]
def db(me_dating):
    return {'user': {'id': ME, 'email': 'giorgio@esempio.it'}, 'accounts': {}, 'unlocks': [], 'contents': PINS, 'book': {},
            'profiles': {ME: P('Giorgio', 'm' if me_dating else None), EL: P('Elena', 'f'), SA: P('Sara', 'f'), LU: P('Luca', 'm')}}
async def center(R, sel): await R.pg.evaluate("(s=>{const e=document.querySelector(s);e&&e.scrollIntoView({block:'center'})})(%s)" % json.dumps(sel)); await R.pg.wait_for_timeout(350)

async def dating_entra():
    R = Rec('/home/claude/video/dating_entra'); await R.start(db(False), T)
    R.tl.append({'t': 'title', 'title': 'Ubi Dating', 'sub': 'Incontra chi ama i tuoi stessi luoghi', 'dur': 2.6, 'icon': '💗'})
    R.caption(1, 'Dalla home tocca «Ubi Dating»')
    await R.go('#/', wait=1800)
    await center(R, 'a[href="#/dating"]')
    await R.tap('a[href="#/dating"]', after=1300)
    R.caption(2, 'Solo maggiorenni: chi sei e la data di nascita')
    await center(R, '#gen')
    await R.tap('#gen [data-g="m"]', after=500)
    await R.pg.fill('#birth', '1991-03-14'); await R.pg.wait_for_timeout(300)
    await R.still(1.6)
    R.caption(3, 'Leggi e accetta i consensi')
    for i in range(6): await R.pg.check(f'#dc{i}')
    await center(R, '#dc3'); await R.still(2.0)
    await center(R, '#f button[type=submit]')
    await R.tap('#f button[type=submit]', after=2200)
    R.caption(4, 'La mappa dei biglietti: rosa lei, azzurro lui')
    await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(500)
    await R.still(2.4)
    R.caption(5, 'Lascia un biglietto in un luogo che ami')
    await center(R, 'a[href="#/new/dating"]')
    await R.tap('a[href="#/new/dating"]', after=1400)
    await R.still(2.0)
    R.caption(6, 'Meglio un video dal vivo, o una foto')
    await R.pg.set_input_files('#file', PHOTO); await R.pg.wait_for_timeout(1200)
    await center(R, '#preview'); await R.still(1.8)
    R.caption(7, 'Il luogo e due parole su di te')
    await R.tap('#gps', after=1500)
    await center(R, '#title')
    await R.type('#title', 'Il lago all\'alba', chunks=3, dur=0.3)
    await R.type('#hint', 'Sul pontile, accanto alle barche', chunks=3, dur=0.3)
    await center(R, '#save')
    await R.tap('#save', after=2400)
    R.caption(8, 'Resti anonimo finché non vi scegliete entrambi')
    await R.go('#/dating', reload=True, wait=2000)
    await R.pg.evaluate("(()=>{const h=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('I miei biglietti'));window.scrollTo(0,h.getBoundingClientRect().top+scrollY-90)})()"); await R.pg.wait_for_timeout(400)
    await R.still(2.2)
    R.tl.append({'t': 'outro', 'dur': 4.0, 'consumer': True, 'title': 'Hai già una passione in comune', 'sub': 'Ubi Dating · solo maggiorenni'})
    await R.stop()

async def dating_conosci():
    R = Rec('/home/claude/video/dating_conosci'); await R.start(db(True), T)
    R.tl.append({'t': 'title', 'title': 'Ubi Dating: conoscersi', 'sub': 'Anonimi finché non vi scegliete entrambi', 'dur': 2.6, 'icon': '💌'})
    R.caption(1, 'Sei arrivato al biglietto di lei: sbloccalo')
    await R.go('#/c/el1', wait=1800)
    await center(R, '#unlock')
    await R.tap('#unlock', after=1600)
    await R.pg.evaluate("window.scrollTo(0,0)"); await R.pg.wait_for_timeout(300)
    await R.still(2.2)
    R.caption(2, 'Rispondi: lei non sa chi sei')
    await center(R, '#rtxt'); await R.still(1.4)
    await R.type('#rtxt', 'Anch\'io salgo all\'alba! Oggi c\'era la nebbia sotto di noi, spettacolo. Il pane caldo del rifugio lo conosco bene 😄', chunks=4, dur=0.35)
    await R.tap('#rsend', after=2200)
    await R.still(1.4)
    R.caption(3, 'Lei vede «Anonimo» e sceglie «Voglio conoscerti»')
    await R.pg.evaluate(SWITCH % json.dumps({'id': EL, 'email': 'elena@esempio.it'}))
    await R.go('#/c/el1', reload=True, wait=2000)
    await center(R, '#replies button[data-a="want"], .reply button[data-a="want"]')
    await R.tap('.reply button[data-a="want"]', after=1200)
    await center(R, '.reply'); await R.still(1.6)
    R.caption(4, 'Ti arriva la notizia: tocca anche tu 💗')
    await R.pg.evaluate(SWITCH % json.dumps({'id': ME, 'email': 'giorgio@esempio.it'}))
    await R.go('#/dating', reload=True, wait=2000)
    await center(R, '#myrep .reply'); await R.still(1.8)
    await R.tap('#myrep button[data-a="want"]', after=1500)
    R.caption(5, 'Vi siete scelti: ora vedete i vostri nomi')
    await center(R, '#myrep .reply'); await R.still(2.4)
    R.caption(6, 'Scrivetevi e decidete voi dove incontrarvi')
    await R.tap('#myrep a[href^="#/messaggi/"]', after=1500)
    await R.type('#body', 'Ciao Elena! Sono Giorgio, quello della nebbia 😊 Domenica prossima un caffè al rifugio?', chunks=4, dur=0.35)
    await R.tap('#f button[type=submit], #f button', after=1500)
    await R.still(2.2)
    R.tl.append({'t': 'outro', 'dur': 4.0, 'consumer': True, 'title': 'Prima il luogo, poi la persona', 'sub': 'Incontratevi in luoghi pubblici. Ubi Dating · 18+'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(globals()[sys.argv[1]]())
