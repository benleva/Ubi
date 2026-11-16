-- =====================================================================
-- UBI — Aggiornamento 6: avvisi email ai destinatari (registro + disiscrizioni)
-- Tabelle usate SOLO dalle funzioni sul server (nessun accesso dall'app).
-- Si può eseguire più volte senza danni.
-- =====================================================================
create table if not exists public.content_notifications (
  content_id uuid not null references public.contents(id) on delete cascade,
  email      text not null,
  sent_at    timestamptz not null default now(),
  primary key (content_id, email)          -- ogni persona viene avvisata una sola volta per pin
);
create index if not exists content_notifications_sent_idx on public.content_notifications(sent_at);

create table if not exists public.email_optout (
  email text primary key,                  -- chi ha chiesto di non ricevere più avvisi
  at    timestamptz not null default now()
);

alter table public.content_notifications enable row level security;
alter table public.email_optout enable row level security;
-- nessuna policy: solo il server (service role) può leggerle e scriverle
revoke all on public.content_notifications, public.email_optout from anon, authenticated;

notify pgrst, 'reload schema';
