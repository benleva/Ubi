"""Video tutorial: S.O.S. Montagna – dalla sezione Montagna di Ubi alla PWA LoRa."""
import asyncio, sys
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base, T, ME

CIMA = (45.9237, 7.8650)

async def sosmontagna():
    R = Rec('/home/claude/video/sosmontagna')
    await R.start(base(), CIMA)
    R.tl.append({'t': 'title', 'title': 'S.O.S. Montagna', 'sub': 'Emergenza LoRa con Meshtastic', 'dur': 2.6, 'icon': '🏔️'})

    R.caption(1, 'Dalla home tocca «🏔️ Montagna»')
    await R.go('#/', wait=2000)
    await R.pg.evaluate("document.querySelector('a[href=\"#/montagna\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.tap('a[href="#/montagna"]', after=1400)

    R.caption(2, 'Tocca «🏔️ S.O.S. Montagna · emergenza LoRa»')
    await R.pg.evaluate("document.querySelector('a[href*=\"netlify\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(400)
    await R.still(2.4)

    R.caption(3, 'Si apre la PWA: scegli il tipo di emergenza')
    # Non possiamo aprire il sito esterno: mostriamo la schermata SOS di Ubi
    # che spiega il concetto in modo simile
    await R.go('#/sos', wait=2000)
    await R.still(2.2)

    R.caption(4, 'Il pin SOS segna la tua posizione GPS sulla mappa')
    await R.pg.evaluate("document.querySelector('#sosbtn').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.still(2.0)

    R.caption(5, 'La PWA LoRa passa il messaggio a Meshtastic')
    await R.go('#/montagna', wait=1800)
    await R.pg.evaluate("document.querySelector('a[href*=\"netlify\"]').scrollIntoView({block:'center'})")
    await R.pg.wait_for_timeout(300)
    await R.still(2.4)

    R.tl.append({'t': 'outro', 'dur': 3.8, 'plain': True, 'icon': '⚠️',
                 'title': 'Non chiama il 112',
                 'sub': 'In emergenza chiama sempre il numero ufficiale'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(sosmontagna())
