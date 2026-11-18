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

## 5. Gruppi, capsula del tempo, caccia al tesoro, banner (aggiornamento 10)
1. SQL Editor: eseguire `supabase/migrations/20261116190000_gruppi_capsule_caccia_banner.sql`.
2. Per diventare amministratore (banner e lista iscritti) eseguire una volta, con la propria email:
   `insert into public.app_admins(user_id) select id from auth.users where email = 'LA-TUA-EMAIL' on conflict do nothing;`

## Come funziona la sicurezza
- La tabella dei contenuti è leggibile solo dal proprietario (Row Level Security).
- Gli altri usano due funzioni: `get_teaser` (titolo, indizio, punto sulla mappa) e `unlock`, che controlla **sul server** permessi, distanza, precisione GPS, password (bcrypt) e blocca dopo 5 errori in 15 minuti.
- I file stanno in un bucket privato e sono scaricabili solo dopo uno sblocco registrato (link firmato valido 1 ora).
- Limite noto: chi falsifica il GPS del telefono può aggirare la distanza. Rischio accettato per l'MVP.

## Curiosità pronte (admin)

In Amministrazione › 🗺️ Curiosità trovi i pin di `seed/curiosita.json` (testi scritti per Ubi).
Il pulsante «⚡ Fai tutto in automatico» crea tutte le curiosità mancanti e aggiunge una foto a quelle già create senza, scegliendo da solo la foto il cui nome somiglia di più al luogo (se nessuna somiglia, resta solo testo). Si può fermare e riprendere.
In alternativa scegli un comune: l'app cerca su Wikipedia la posizione e propone fino a 6 foto con licenza libera da Wikimedia Commons (pagina Wikipedia, ricerca per nome del luogo, foto geotaggate entro 300 m). Tocchi quella giusta, l'app mette il credito sotto il testo e crea i pin pubblici a tuo nome.
Le curiosità già create come solo testo compaiono con «già creato, senza foto»: scegli una foto e premi il pulsante, la foto viene aggiunta al pin esistente.
Per aggiungere altri paesi basta aggiungere voci al file (title, hint, text, wiki, lat, lng).

## Prossimi passi
- **DA FARE (risparmio spazio, richiesto il 16/11/2026):** ridurre in automatico le foto dei pin prima del caricamento (lato lungo ~2000 px, JPEG, ~400 KB) e abbassare il limite video da 50 a 25 MB con un suggerimento a registrare in qualità più bassa. Serve per restare nel piano gratuito di Supabase (1 GB file, 5 GB traffico/mese).
- Fase 2: catene "stesso luogo, altro tempo" (`parent_id` già nel database).
- Fase 3: replica dello scatto (dati EXIF).
- **Ubi Night** (clone): contenuti con scadenza, conferma maggiore età, consenso reciproco prima di rivelare l'identità, accesso legato a un locale e a una serata.
