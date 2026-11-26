"""Video tutorial: Radioamatori – firma sulla cima con Ubi."""
import asyncio, sys, json
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base, pin, T, ME, EL

# Coordinate cima alpina
CIMA = (45.9237, 7.8650)   # vicino al Monte Rosa

def db():
    existing = pin('pa', 0.001, 0.002, '📡 IZ1ABC · Monte Rosa 4634m', 'SOTA I/LO-001',
                   '📡 IZ1ABC — Monte Rosa (4634 m s.l.m.)\nSOTA: I/LO-001\nBanda / Modo: 2m FM · 10 QSO\nAttivazione: 15 novembre 2026 09:42',
                   owner=EL, tags=['radio', 'ico-antenna', 'sota'])
    return base(contents=[existing])

async def radioamatori():
    R = Rec('/home/claude/video/radioamatori')
    await R.start(db(), CIMA)
    R.tl.append({'t': 'title', 'title': 'Radioamatori su Ubi', 'sub': 'Firma le cime con callsign e SOTA', 'dur': 2.6, 'icon': '📡'})

    R.caption(1, 'Dalla home tocca «Montagna»')
    await R.go('#/', wait=1800)
    await R.pg.evaluate("document.querySelector('a[href=\"#/montagna\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('a[href="#/montagna"]', after=1400)

    R.caption(2, 'Poi «Radioamatori · firma sulla cima»')
    await R.tap('a[href="#/radio"]', after=1400, dur=1.8)

    R.caption(3, 'Sei in cima: inserisci il tuo callsign')
    await R.pg.evaluate("document.querySelector('#r-call').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.type('#r-call', 'IZ1ABC', chunks=3, dur=0.3)

    R.caption(4, 'Nome della cima e quota')
    await R.type('#r-cima', 'Monte Rosa', chunks=3, dur=0.3)
    await R.pg.fill('#r-quota', '4634')
    await R.pg.wait_for_timeout(400)

    R.caption(5, 'Riferimento SOTA (facoltativo)')
    await R.type('#r-sota', 'I/LO-001', chunks=3, dur=0.3)
    await R.still(1.4)

    R.caption(6, 'La posizione arriva dal GPS: tocca «Lascia la firma»')
    await R.pg.evaluate("document.querySelector('#r-save').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.still(1.6)
    await R.tap('#r-save', after=2200)

    R.caption(7, 'Firma lasciata: chi arriva in cima la vedrà')
    await R.pg.evaluate("window.scrollTo(0,0)")
    await R.pg.wait_for_timeout(400)
    await R.still(2.4)

    R.tl.append({'t': 'outro', 'dur': 3.8, 'consumer': True,
                 'title': 'La tua firma è in cima', 'sub': 'Radioamatori su Ubi · ubipin.it'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(radioamatori())
