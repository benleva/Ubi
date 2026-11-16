# Ubi — lascia un ricordo dove è nato

Web app (PWA) per fissare foto, video (max 60 s) e audio in un luogo. Il contenuto si sblocca solo quando ci si avvicina con il telefono.

## Struttura
```
supabase/migrations/20261116090000_ubi_schema.sql   database, regole di sicurezza, funzioni di sblocco (eseguire una volta)
index.html, app.js, …    sito statico nella cartella principale (pubblicato da GitHub Pages)
  config.js              unico file da modificare (chiavi Supabase)
  app.js                 logica dell'app
  privacy.html           informativa privacy (titolare: Andrea Pernarcic)
test/                    test del database (Postgres locale)
```

## 1. Provarla subito (modalità demo)
Con `SUPABASE_URL` vuoto in `config.js` l'app funziona in modalità DEMO: i dati restano sul telefono.
Basta pubblicare la cartella principale (punto 3) e aprirla. Nella demo si può toccare la mappa per simulare la propria posizione.

## 2. Collegare il database (gratis)
1. Su supabase.com: New project, regione **Europa**.
2. SQL Editor: incollare `supabase/migrations/20261116090000_ubi_schema.sql` ed eseguire.
3. Authentication > Sign In / Providers > **Email**: attivo, con **Confirm email** acceso e lunghezza minima password **8**. Gli utenti si registrano una volta con email e password e restano collegati sul telefono; il link via email resta come alternativa e serve per recuperare la password.
4. Authentication > URL Configuration: **Site URL** = indirizzo del sito, e aggiungerlo anche in **Redirect URLs**.
5. Project Settings > API: copiare *Project URL* e *anon public key* in `config.js`.

Nota: l'invio email incluso in Supabase ha limiti bassi, va bene per i test. Per il lancio va collegato un servizio SMTP (ci sono piani gratuiti).

## 3. Pubblicare il sito (gratis, serve HTTPS per il GPS)
Una qualsiasi di queste opzioni:
- **Netlify Drop** (app.netlify.com/drop): trascinare la cartella principale (da computer).
- **Cloudflare Pages**: Create project > Upload assets > cartella principale.
- **GitHub Pages**: già configurato: Settings > Pages > Deploy from a branch > `main` / `/ (root)`.

Sul telefono: aprire il sito > menu del browser > "Aggiungi a schermata Home".

## 4. Ubi Dating e risposte ai pin (aggiornamento 7)
1. SQL Editor: eseguire `supabase/migrations/20261116160000_dating_risposte.sql` poi `supabase/migrations/20261116170000_dating_tag.sql` e `supabase/migrations/20261116180000_dating_foto.sql`.
2. Edge Functions > Deploy a new function > **Via Editor**: nome `notify-reply`, incollare `supabase/functions/notify-reply/index.ts`, Deploy (lasciare "Verify JWT" acceso). Usa gli stessi segreti di notify-recipients.
3. Il nome della funzione va in `config.js` > `REPLY_FUNCTION`.

- Dating: solo maggiorenni (controllo sul server), biglietti pubblici con pallino rosa/azzurro, sblocco e risposta solo per gli iscritti, anonimato finché entrambi non scelgono «Voglio conoscerti».
- Risposte: chi ha sbloccato un pin può lasciare al creatore testo, foto, video (max 60 s) o audio; il creatore riceve un'email.

## Come funziona la sicurezza
- La tabella dei contenuti è leggibile solo dal proprietario (Row Level Security).
- Gli altri usano due funzioni: `get_teaser` (titolo, indizio, punto sulla mappa) e `unlock`, che controlla **sul server** permessi, distanza, precisione GPS, password (bcrypt) e blocca dopo 5 errori in 15 minuti.
- I file stanno in un bucket privato e sono scaricabili solo dopo uno sblocco registrato (link firmato valido 1 ora).
- Limite noto: chi falsifica il GPS del telefono può aggirare la distanza. Rischio accettato per l'MVP.

## Prossimi passi
- Fase 2: catene "stesso luogo, altro tempo" (`parent_id` già nel database).
- Fase 3: replica dello scatto (dati EXIF).
- **Ubi Night** (clone): contenuti con scadenza, conferma maggiore età, consenso reciproco prima di rivelare l'identità, accesso legato a un locale e a una serata.
