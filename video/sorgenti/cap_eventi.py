"""Video tutorial: sezione Eventi di Ubi (hub matrimoni e altri eventi)."""
import asyncio, sys
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base, T, ME

VILLA = (45.9850, 9.2600)

async def eventi():
    R = Rec('/home/claude/video/eventi')
    await R.start(base(), VILLA)
    R.tl.append({'t': 'title', 'title': 'Ubi Eventi', 'sub': 'Pin privati per i tuoi momenti speciali', 'dur': 2.6, 'icon': '🎉'})

    R.caption(1, 'Dalla home tocca «Eventi»')
    await R.go('#/', wait=2000)
    await R.pg.evaluate("document.querySelector('a[href=\"#/eventi\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('a[href="#/eventi"]', after=1400)

    R.caption(2, 'Gli ospiti lasciano foto, video, messaggi geo-localizzati')
    await R.still(2.4)

    R.caption(3, 'Tocca «Matrimonio» per creare il pin')
    await R.tap('a[href="#/wedding"]', after=1600)

    R.caption(4, 'Compila titolo, luogo e data del matrimonio')
    await R.pg.evaluate("document.querySelector('#w-title').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.type('#w-title', 'Matrimonio Luca & Sara', chunks=3, dur=0.3)
    await R.pg.fill('#w-date', '2027-06-14')
    await R.type('#w-venue', 'Villa Olmo', chunks=2, dur=0.3)
    await R.still(1.2)

    R.caption(5, 'Scrivi le email degli ospiti: ricevono il link')
    await R.pg.evaluate("document.querySelector('#w-emails').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.type('#w-emails', 'mario@esempio.it\ngiulia@esempio.it', chunks=2, dur=0.35)
    await R.still(1.4)

    R.caption(6, 'Prossimamente: compleanni, lauree, eventi aziendali')
    await R.go('#/eventi', wait=1800)
    await R.pg.evaluate("document.querySelector('p.small.muted').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.still(2.4)

    R.tl.append({'t': 'outro', 'dur': 3.8, 'consumer': True,
                 'title': 'I ricordi restano dove è successo', 'sub': 'Ubi Eventi · ubipin.it'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(eventi())
