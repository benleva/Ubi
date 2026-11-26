"""Video tutorial: S.O.S. Montagna – richiesta di soccorso via Meshtastic/LoRa.

REGOLE DI SICUREZZA (non modificare senza revisione):
- Il 112 va sempre presentato come PRIMA scelta, con frase all'imperativo positivo
  («Chiama subito il 112»). MAI frasi che, lette da sole, suonano come «non chiamare il 112».
- Ogni schermata deve mostrare esattamente ciò che la didascalia descrive (qui: la PWA vera,
  servita in locale da /tmp/seedtest/site/sos-montagna/ a partire dallo ZIP ufficiale).
- Non presentarla come sistema di soccorso certificato; l'invio Android non è collaudato.
"""
import asyncio, sys
sys.path.insert(0, '/home/claude/video')
from cap_lib import Rec
from cap_utenti import base

CIMA = (45.9000, 9.9000)
PWA = 'http://localhost:8799/sos-montagna/'
NFC = '#punto=VAL-001&latitudine=45.90000&longitudine=9.90000&quota=1000&sentiero=Sentiero%201'
PUBLIC = 'https://spiffy-starship-67ef5a.netlify.app/'

async def fix_url(R):
    # il campo del tag NFC mostra l'indirizzo pubblico, non quello di prova
    await R.pg.evaluate(f"""(()=>{{const r=document.querySelector('#raw'); if(r) r.value=r.value.replace('{PWA}','{PUBLIC}');}})()""")

async def scroll_to(R, sel):
    await R.pg.evaluate(f"document.querySelector({sel!r}).scrollIntoView({{block:'center'}})")
    await R.pg.wait_for_timeout(350)

async def show_tap(R, sel, dur=1.6):
    # mostra il dito sul pulsante senza eseguirlo (aprirebbe un'app esterna)
    await scroll_to(R, sel)
    bb = await R.pg.locator(sel).first.bounding_box(); f = await R.shot()
    R.tl.append({'t': 'tap', 'img': f, 'x': bb['x'] + bb['width'] / 2, 'y': bb['y'] + bb['height'] / 2, 'dur': dur, 'cap': R.cap, 'double': False})

async def sosmontagna():
    R = Rec('/home/claude/video/sosmontagna')
    await R.start(base(), CIMA)
    R.tl.append({'t': 'title', 'title': 'S.O.S. Montagna', 'sub': 'Richiesta di soccorso via radio LoRa con Meshtastic', 'dur': 2.6, 'icon': '🏔️'})
    R.tl.append({'t': 'title', 'title': 'Hai campo? Chiama subito il 112', 'sub': 'S.O.S. Montagna serve quando il telefono non prende', 'dur': 3.2, 'icon': '📞'})

    R.caption(1, 'Dalla home tocca «Montagna»')
    await R.go('#/', wait=2000)
    await scroll_to(R, 'a[href="#/montagna"]')
    await R.tap('a[href="#/montagna"]', after=1400)

    R.caption(2, 'Apri «S.O.S. Montagna · emergenza LoRa»')
    await show_tap(R, 'a[href*="netlify"]', dur=2.4)

    R.caption(3, 'Al punto di soccorso leggi il tag NFC con il telefono')
    await R.pg.goto(PWA + NFC)
    await R.pg.wait_for_timeout(1500)
    await fix_url(R)
    await scroll_to(R, '#raw')
    await R.still(2.4)

    R.caption(4, 'Posizione, quota e sentiero vengono acquisiti')
    await R.pg.locator('button', has_text='Acquisisci dati').first.scroll_into_view_if_needed()
    await R.tap('button:has-text("Acquisisci dati")', after=900)
    await fix_url(R)
    await R.still(2.2)

    R.caption(5, 'Scegli il tipo di emergenza e quante persone')
    await scroll_to(R, '#kind')
    await R.pg.select_option('#kind', 'Infortunio')
    await R.pg.fill('#persone', '1')
    await R.still(2.2)

    R.caption(6, 'Aggiungi una nota breve')
    await R.type('#notes', 'sospetta frattura alla gamba', chunks=4, dur=0.35)
    await R.still(1.2)

    R.caption(7, 'Controlla il messaggio e tocca «Invia con Meshtastic»')
    await scroll_to(R, '#message')
    await R.still(1.8)
    await show_tap(R, '#send', dur=1.8)

    R.caption(8, 'La radio LoRa lo trasmette sul canale SOSMONTAGNA')
    await scroll_to(R, '#send')
    await R.still(2.4)

    R.tl.append({'t': 'outro', 'dur': 4.2, 'plain': True, 'icon': '📞',
                 'title': 'Pericolo immediato? Chiama subito il 112',
                 'sub': 'S.O.S. Montagna non sostituisce il 112 e non è un sistema di soccorso certificato'})
    await R.stop()

if __name__ == '__main__':
    asyncio.run(sosmontagna())
