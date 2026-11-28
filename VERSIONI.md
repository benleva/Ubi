# Registro versioni di Ubi

Una riga per ogni versione pubblicata. Serve per il manuale tecnico e per ricostruire la storia del progetto.

**Regola**: ogni pubblicazione (push su GitHub → ubipin.it) è una versione nuova. Prima del push:
1. aumentare `APP_VERSION` in `app.js` di 1 (es. `v.136` → `v.137`);
2. lanciare `./aggiorna-versione.sh` (cambia il numero di cache di `app.js` e `style.css`, così i telefoni scaricano subito la versione nuova e compare la barra «Aggiorna»);
3. aggiungere la riga qui sotto e mettere «v.NNN:» all'inizio del messaggio di commit.

Ogni versione ha anche un'etichetta Git con lo stesso nome (`git tag`).

| Versione | Data | Commit | Contenuto |
|---|---|---|---|
| v.120 | 22/11/2026 | 3b1c12e | FAQ e guida admin di Ubi Arte aggiornate |
| v.121 | 25/11/2026 | 727eb9f | Accesso e registrazione con Google e Facebook |
| v.122 | 25/11/2026 | 09098c2 | FAQ: il pulsante «Torna indietro» ricorda la pagina di provenienza |
| v.123 | 25/11/2026 | 3021e98 | Data di creazione e di scadenza dei pin (expires_at) |
| v.124 | 25/11/2026 | 3c620f2 | Contatore totale dei pin e dei nuovi nell'ultima ora |
| v.125 | 25/11/2026 | 9f3cbe0 | Icone allerta/sicurezza e radio nella scelta delle icone |
| v.126 | 25/11/2026 | 0482620 | Pannello admin: blocco utenti e cancellazione pin |
| v.127 | 25/11/2026 | b9d21ec | Pagina Emergenza: pin SOS geo-localizzato e numeri utili |
| v.128 | 25/11/2026 | fde9f97 | Radioamatori: firma sulla cima (callsign, quota, SOTA) |
| v.129 | 25/11/2026 | 96755bb | Matrimonio: pin privato per gli ospiti |
| v.130 | 25/11/2026 | 38743c8 | Home riorganizzata: sezioni Montagna ed Eventi |
| v.131 | 25/11/2026 | a4ad1ae | FAQ e pulsanti video per Montagna, Radioamatori, S.O.S. LoRa, Matrimonio |
| v.132 | 26/11/2026 | 36f69a6 | Primi 5 video tutorial (ritirati in v.136: messaggio sul 112 ambiguo e schermate non corrispondenti) |
| v.133 | 26/11/2026 | 27d7997 | Sicurezza: i testi su S.O.S. Montagna mettono per primo «chiama subito il 112» |
| v.134 | 26/11/2026 | aa55299 | Matrimonio: gli ospiti ricevono davvero l'email di invito (prima la pagina lo prometteva ma non la inviava) |
| v.135 | 26/11/2026 | 209724f | Radioamatori e Matrimonio: se il GPS non funziona compare il campo per le coordinate; conferma GPS sempre visibile |
| v.136 | 26/11/2026 | 003a825 | 5 video tutorial rifatti e verificati fotogramma per fotogramma; durate corrette nei pulsanti |
| v.137 | 26/11/2026 | a055e72 | Lettore video dentro Ubi: a fine video compare il pulsante galleggiante «← Torna indietro» (anche il tasto indietro del telefono chiude il video) |
| v.138 | 26/11/2026 | 596495e | Tolti i pulsanti «Continua con Google/Facebook»: i due accessi non sono attivati in Supabase («provider is not enabled»). Si riattivano con OAUTH_LOGIN in config.js |
| v.139 | 26/11/2026 | 709c472 | Gruppi: pulsante «Gruppi» in home; gruppi pubblici o privati con nome, tag, categoria e pagina manifesto (obiettivo, bio, contatti, regole); iscrizione libera, su richiesta o con link di invito; ruoli proprietario/moderatore, ban e rimozione; icona dei pin = logo caricato o 1 di 5 icone; pin pubblici o riservati agli iscritti, apribili sul posto o da lontano; segnalazione e verifica/sospensione da parte dell'amministratore. Database: migrazione 20261126100000_gruppi |
| v.140 | 28/11/2026 | 6d11585 | Conversione dei pin condivisi: contatore delle aperture del link (solo numeri, nessun dato personale), colonna «Aperture» e percentuale di iscritti nelle statistiche admin, pulsante «Crea il tuo pin» dopo lo sblocco, testo più chiaro per chi non è ancora iscritto («Registrati gratis e sblocca»). Database: tabella pin_visits e funzione track_pin_visit. |

## Rilascio in blocco v.121–v.136 (26/11/2026)

Le versioni v.121–v.132 sono state sviluppate e caricate sul server il 25/11/2026, senza attivare l'aggiornamento per i telefoni già in uso (numero di cache e `APP_VERSION` rimasti a v.120). Prima di attivarlo è stata fatta una revisione completa di contenuti, testi, messaggi e grafica, con particolare attenzione alla sicurezza: Ubi include funzioni di emergenza (pin SOS, S.O.S. Montagna) e un messaggio sbagliato può mettere in pericolo una persona.

La revisione ha portato a quattro correzioni, pubblicate come versioni separate:
- v.133: nei testi su S.O.S. Montagna il 112 compare per primo, all'imperativo positivo;
- v.134: la pagina Matrimonio invia davvero l'email agli ospiti, come prometteva;
- v.135: inserimento manuale delle coordinate quando il GPS non è disponibile;
- v.136: i 5 video tutorial di v.132 sono stati ritirati e rifatti. Il finale del video S.O.S. Montagna, letto da solo, poteva sembrare un invito a non chiamare il 112.

L'aggiornamento verso tutti i telefoni è stato quindi distribuito in blocco con la v.136, dopo il collaudo di tutte le pagine coinvolte (incluso il caso di GPS non disponibile) e il controllo di ogni fotogramma dei video.

Le modifiche al solo registro (questo file) non cambiano l'app e non ricevono un numero di versione.
