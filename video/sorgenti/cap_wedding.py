"""Video tutorial: Wedding – pin privato per gli ospiti del matrimonio."""
import asyncio, sys, json
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base, pin, T, ME, EL

PHOTO = '/home/claude/video/assets/tramonto.jpg'
# Location: Villa sul lago di Como
VILLA = (45.9850, 9.2600)

def db():
    wedding_pin = pin('w1', 0, 0, '💍 Matrimonio Luca & Sara', 'Villa Olmo, sala ricevimenti',
                      'Siamo così felici di condividere questo giorno con voi! 💕',
                      owner=ME, tags=['wedding', 'ico-event'], vis='restricted')
    wedding_pin['recipients'] = ['ospite1@esempio.it', 'ospite2@esempio.it']
    return base(contents=[wedding_pin])

async def wedding():
    R = Rec('/home/claude/video/wedding')
    await R.start(base(), VILLA)
    R.tl.append({'t': 'title', 'title': 'Pin Matrimonio', 'sub': 'Foto e video geo-localizzati per gli ospiti', 'dur': 2.6, 'icon': '💍'})

    R.caption(1, 'Dalla home: «🎉 Eventi» poi «💍 Matrimonio»')
    await R.go('#/', wait=1800)
    await R.pg.evaluate("document.querySelector('a[href=\"#/eventi\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('a[href="#/eventi"]', after=1200)
    await R.tap('a[href="#/wedding"]', after=1400)

    R.caption(2, 'Titolo del pin: nome degli sposi')
    await R.pg.evaluate("document.querySelector('#w-title').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.type('#w-title', 'Matrimonio Luca & Sara', chunks=3, dur=0.3)
    await R.type('#w-venue', 'Villa Olmo, sala ricevimenti', chunks=3, dur=0.3)

    R.caption(3, 'Data del matrimonio')
    await R.pg.fill('#w-date', '2027-06-14')
    await R.pg.wait_for_timeout(400)
    await R.still(1.4)

    R.caption(4, 'Lista email degli ospiti (una per riga)')
    await R.pg.evaluate("document.querySelector('#w-emails').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.type('#w-emails', 'mario@esempio.it\ngiulia@esempio.it\nluigi@esempio.it', chunks=3, dur=0.35)
    await R.still(1.6)

    R.caption(5, 'Posizione: tocca «Usa la mia posizione»')
    await R.pg.evaluate("document.querySelector('#w-gps').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.pg.evaluate("""
        const pi = document.querySelector('#w-posinfo');
        if(pi) pi.textContent = '✓ GPS: 45.98500, 9.26000 (±4 m)';
    """)
    await R.still(1.8)

    R.caption(6, 'Crea il pin: il link viene copiato automaticamente')
    await R.pg.evaluate("document.querySelector('#w-save').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('#w-save', after=2500)

    R.caption(7, 'Incolla il link nell\'invito: gli ospiti lasciano foto e video')
    await R.pg.evaluate("window.scrollTo(0,0)")
    await R.pg.wait_for_timeout(400)
    await R.still(2.4)

    R.tl.append({'t': 'outro', 'dur': 3.8, 'consumer': True,
                 'title': 'I ricordi rimangono sul luogo', 'sub': 'Pin matrimonio · ubipin.it'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(wedding())
