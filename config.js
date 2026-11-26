// Configurazione di Ubi.
// Lascia SUPABASE_URL vuoto per usare la MODALITÀ DEMO: tutto resta sul telefono,
// utile per provare le schermate prima di collegare il database.
// Per la versione vera: Supabase > Project Settings > API, copia "Project URL" e "anon public key".
export const CONFIG = {
  SUPABASE_URL: 'https://fghbhdmcnhskrmduroes.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaGJoZG1jbmhza3JtZHVyb2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MTA5NDMsImV4cCI6MjExMDM4Njk0M30.KiRRueB-6jiXGhO2CiOcDbXpToYE4cZFgmKZw4auip0',  // chiave pubblica: la sicurezza è nelle regole del database
  NOTIFY_FUNCTION: 'quick-action',  // indirizzo (slug) della funzione notify-recipients su Supabase
  EMAIL_AUTO: true,             // true dopo aver configurato Brevo + la funzione notify-recipients su Supabase
  PRIVACY_VERSION: '2026-11-16b',   // cambiala quando aggiorni l'informativa: verrà richiesto un nuovo consenso
  DATING_CONSENT_VERSION: '1',  // cambiala quando aggiorni i consensi dating: verranno richiesti di nuovo
  REPLY_FUNCTION: 'notify-reply',  // nome (slug) della funzione che avvisa il creatore quando riceve una risposta
  OAUTH_LOGIN: false,           // true solo dopo aver attivato Google e Facebook in Supabase > Authentication > Providers
  MAX_VIDEO_SECONDS: 60,
  MAX_FILE_MB: 25,
  DEFAULT_RADIUS_M: 50,
};
