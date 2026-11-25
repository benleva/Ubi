"""Video tutorial: sezione Montagna di Ubi (panoramica hub)."""
import asyncio, sys
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base, pin, T, ME, EL

CIMA = (45.9237, 7.8650)

def db():
    p1 = pin('ra1', 0.001, 0.002, '📡 IZ1ABC · Monte Rosa 4634m', 'SOTA I/LO-001',
             '📡 IZ1ABC — Monte Rosa (4634 m s.l.m.)\nSOTA: I/LO-001\nBanda: 2m FM',
             owner=EL, tags=['radio', 'ico-antenna', 'sota'])
    p2 = pin('ra2', -0.002, 0.003, '📡 IW2XYZ · Pizzo Badile 3308m', 'SOTA I/LO-042',
             '📡 IW2XYZ — Pizzo Badile (3308 m)\nSOTA: I/LO-042',
             owner=EL, tags=['radio', 'ico-antenna', 'sota'])
    return base(contents=[p1, p2])

async def montagna():
    R = Rec('/home/claude/video/montagna')
    await R.start(db(), CIMA)
    R.tl.append({'t': 'title', 'title': 'Ubi Montagna', 'sub': 'Radioamatori e S.O.S. LoRa', 'dur': 2.6, 'icon': '🏔️'})

    R.caption(1, 'Dalla home tocca «🏔️ Montagna»')
    await R.go('#/', wait=1800)
    await R.pg.evaluate("document.querySelector('a[href=\"#/montagna\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('a[href="#/montagna"]', after=1400)

    R.caption(2, 'Due strumenti: radioamatori e S.O.S. LoRa')
    await R.still(2.4)

    R.caption(3, '📡 Firma la cima con callsign e SOTA')
    await R.tap('a[href="#/radio"]', after=1400)
    await R.still(2.0)

    R.caption(4, "Torna alla home: l'altro strumento e' S.O.S.")
    await R.tap('a[href="#/"]', after=1200)
    await R.go('#/montagna', wait=1500)
    await R.still(1.6)

    R.caption(5, '🏔️ S.O.S. Montagna: emergenza via rete LoRa')
    await R.pg.evaluate("document.querySelector('a[href*=\"netlify\"], a[href*=\"sos\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.still(2.2)

    R.tl.append({'t': 'outro', 'dur': 3.8, 'consumer': True,
                 'title': 'Ubi Montagna', 'sub': 'Firma la cima · emergenza LoRa'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(montagna())
