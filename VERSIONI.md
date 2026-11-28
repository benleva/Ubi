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
| v.141 | 28/11/2026 | e872c83 | Clona un pin: dal proprio pin aperto, «Clona questo pin» copia contenuto, indizio, raggio e visibilità in un altro punto scelto sulla mappa (o con la propria posizione), e si può ripetere quante volte si vuole. Le cacce restavano già duplicabili con «Duplica caccia». |
| v.142 | 28/11/2026 | 910237d | «I miei contenuti»: l'elenco di tutti i propri pin si vede subito (categoria «Tutto» già aperta), con ricerca e conteggio, e ogni pin clonabile ha il pulsante «Clona» accanto a Condividi, Apri, Modifica, Elimina. |
| v.143 | 28/11/2026 | 88e2801 | Amici con link di invito: ogni iscritto ha un proprio link; chi lo apre e si iscrive diventa suo amico (amicizia reciproca). Pagina «I miei amici» con invito (WhatsApp, copia, condividi), elenco e «Togli». Gli amici vedono solo il nome: mai email, telefono o posizione. Pulsanti «Amici» in home, profilo e dopo lo sblocco di un pin. Database: tabella friendships e funzioni friend_*. |
| v.144 | 28/11/2026 | fb05aae | Pin «Solo amici»: lo apre solo chi è amico dell'autore (anche chi lo diventa dopo). Richiesta di amicizia dall'autore di un pin sbloccato, con richieste da accettare o rifiutare in «I miei amici». Database: colonna friends_only, can_access aggiornata, friend_requests. |
| v.145 | 28/11/2026 | 9d96e5a | Segui: pulsante «Segui» e contatore follower sul profilo di chi ha pin visibili; elenco «Chi seguo» in «I miei amici». Si vede solo il numero dei follower, mai chi sono. Il nome visibile diventa «Soprannome». Database: tabella follows e funzioni follow_*. |
| v.146 | 28/11/2026 | 1c3c45c | Social sicuro: iscrizione con dichiarazione «almeno 14 anni, genitore d'accordo se minorenne»; pulsante «Segnala» su pin e profili con coda «Segnalazioni» in admin; pagina «Novità» con i pin recenti di chi segui, ordinabili per distanza. Informativa privacy aggiornata. Database: reports, report_create, admin_reports, follow_feed. |
| v.147 | 28/11/2026 | 443a346 | Avviso delle richieste di amicizia: sul pulsante «Amici» della home compare il numero di richieste da accettare. |
| v.148 | 28/11/2026 | 5052835 | Avvisi agli amici: dopo aver creato un pin, o dalla sua pagina, «Avvisa i miei amici via email» (una email per amico, max 100 al giorno, mai due volte per lo stesso pin). Interruttore «Ricevi un'email quando un amico lascia un pin» in «I miei amici». «Novità» ora mostra anche i pin degli amici, con numero rosso sul pulsante. Funzione email aggiornata (quick-action v.13). |
| v.149 | 28/11/2026 | 082306d | FAQ e guida admin aggiornate: Amici, Solo amici, Segui, Novità, avviso agli amici, Segnala, età minima 14 anni; scheda Segnalazioni e aperture nella guida admin. README con le funzioni social. |
| v.150 | 28/11/2026 | af0db88 | Dall'elenco amici si apre il profilo dell'amico (prima il nome non era un link e il profilo risultava non disponibile se l'amico non aveva pin visibili). Gli amici possono anche scriversi con i messaggi di Ubi. Database: can_contact include le amicizie. |
| v.151 | 28/11/2026 | a1f01e3 | Nuova icona pin «Chef / Ristorante stellato» 👨‍🍳 per i pin dei ristoranti Michelin. |
| v.152 | 28/11/2026 | f48512e | Link facoltativo «Apri il link» in tutti i pin (foto, video, audio, testo) e nelle segnalazioni (migrazione link_segnalazioni, solo https). |

## Rilascio in blocco v.121–v.136 (26/11/2026)

Le versioni v.121–v.132 sono state sviluppate e caricate sul server il 25/11/2026, senza attivare l'aggiornamento per i telefoni già in uso (numero di cache e `APP_VERSION` rimasti a v.120). Prima di attivarlo è stata fatta una revisione completa di contenuti, testi, messaggi e grafica, con particolare attenzione alla sicurezza: Ubi include funzioni di emergenza (pin SOS, S.O.S. Montagna) e un messaggio sbagliato può mettere in pericolo una persona.

La revisione ha portato a quattro correzioni, pubblicate come versioni separate:
- v.133: nei testi su S.O.S. Montagna il 112 compare per primo, all'imperativo positivo;
- v.134: la pagina Matrimonio invia davvero l'email agli ospiti, come prometteva;
- v.135: inserimento manuale delle coordinate quando il GPS non è disponibile;
- v.136: i 5 video tutorial di v.132 sono stati ritirati e rifatti. Il finale del video S.O.S. Montagna, letto da solo, poteva sembrare un invito a non chiamare il 112.

L'aggiornamento verso tutti i telefoni è stato quindi distribuito in blocco con la v.136, dopo il collaudo di tutte le pagine coinvolte (incluso il caso di GPS non disponibile) e il controllo di ogni fotogramma dei video.

Le modifiche al solo registro (questo file) non cambiano l'app e non ricevono un numero di versione.
