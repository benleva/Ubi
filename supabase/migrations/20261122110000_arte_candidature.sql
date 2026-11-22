-- Ubi Arte: candidature degli artisti che vogliono la loro mostra (scheda, contatti, ritratto, foto delle opere). Rieseguibile.
-- Prima eseguire 20261122100000_arte.sql.
create table if not exists public.artist_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  stage_name    text check (stage_name is null or char_length(stage_name) <= 80),
  kind          text not null default 'pittore' check (kind in ('pittore', 'scultore', 'fotografo', 'illustratore', 'artista')),
  city          text check (city is null or char_length(city) <= 80),
  email         text check (email is null or char_length(email) <= 120),
  phone         text not null check (char_length(phone) between 6 and 30),
  website       text check (website is null or char_length(website) <= 200),
  socials       jsonb not null default '{}',
  shop_url      text check (shop_url is null or char_length(shop_url) <= 200),
  bio           text not null check (char_length(bio) between 20 and 1500),
  portrait_path text,
  works         jsonb not null default '[]',   -- [{ "path": "<uid>/candidatura/…", "title": "…" }] fino a 8
  consent       boolean not null check (consent),
  status        text not null default 'nuova' check (status in ('nuova', 'contattato', 'accettata', 'rifiutata')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists artist_requests_status on public.artist_requests(status, created_at desc);
alter table public.artist_requests enable row level security;

drop policy if exists "candidature: invio la mia" on public.artist_requests;
create policy "candidature: invio la mia" on public.artist_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'nuova' and notes is null);
drop policy if exists "candidature: leggo la mia" on public.artist_requests;
create policy "candidature: leggo la mia" on public.artist_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "candidature: admin aggiorna" on public.artist_requests;
create policy "candidature: admin aggiorna" on public.artist_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "candidature: admin elimina" on public.artist_requests;
create policy "candidature: admin elimina" on public.artist_requests for delete to authenticated
  using (public.is_admin());

-- Le foto della candidatura (cartella <utente>/candidatura/) le legge anche l'amministratore
drop policy if exists "media: candidature per l'admin" on storage.objects;
create policy "media: candidature per l'admin" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[2] = 'candidatura' and public.is_admin());

notify pgrst, 'reload schema';
