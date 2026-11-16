// Configurazione di Ubi.
// Lascia SUPABASE_URL vuoto per usare la MODALITÀ DEMO: tutto resta sul telefono,
// utile per provare le schermate prima di collegare il database.
// Per la versione vera: Supabase > Project Settings > API, copia "Project URL" e "anon public key".
export const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  PRIVACY_VERSION: '2026-11',   // cambiala quando aggiorni l'informativa: verrà richiesto un nuovo consenso
  MAX_VIDEO_SECONDS: 60,
  MAX_FILE_MB: 50,
  DEFAULT_RADIUS_M: 50,
};
