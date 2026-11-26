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
| v.133 | 26/11/2026 | *vedi tag* | Sicurezza: i testi su S.O.S. Montagna mettono per primo «chiama subito il 112» |
| v.134 | 26/11/2026 | *vedi tag* | Matrimonio: gli ospiti ricevono davvero l'email di invito (prima la pagina lo prometteva ma non la inviava) |
| v.135 | 26/11/2026 | *vedi tag* | Radioamatori e Matrimonio: se il GPS non funziona compare il campo per le coordinate; conferma GPS sempre visibile |
| v.136 | 26/11/2026 | *vedi tag* | 5 video tutorial rifatti e verificati fotogramma per fotogramma; durate corrette nei pulsanti |

Nota: da v.121 a v.132 `APP_VERSION` è rimasto per errore a `v.120` e il numero di cache non è stato aggiornato, quindi alcuni telefoni possono aver continuato a usare la v.120. Da v.133 il numero di cache torna ad aggiornarsi a ogni versione.
