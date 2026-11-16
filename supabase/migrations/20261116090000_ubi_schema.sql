-- =====================================================================
-- UBI — Fase 1 (MVP) — Schema database per Supabase (Postgres)
-- Applicato in automatico dall integrazione GitHub di Supabase (oppure incollalo nell SQL Editor).
--
-- Principio di sicurezza: nessuno legge direttamente la tabella dei
-- contenuti, tranne il proprietario. Gli altri passano da due funzioni:
--   get_teaser(slug)   -> cosa mostrare prima dello sblocco (titolo, punto)
--   unlock(slug, ...)  -> verifica distanza/permessi/password sul SERVER
-- Il file multimediale è in un bucket privato: si può scaricare solo
-- dopo uno sblocco valido registrato in "unlocks".
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tipi ----------
do $$ begin
  create type media_kind as enum ('photo', 'video', 'audio', 'link');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility_kind as enum ('public', 'hidden', 'restricted');
exception when duplicate_object then null; end $$;

-- ---------- Profili utente ----------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text check (char_length(display_name) <= 60),
  privacy_version      text not null,          -- versione informativa accettata
  privacy_accepted_at  timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

-- ---------- Contenuti geolocalizzati ----------
create table if not exists public.contents (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  share_slug       text not null unique
                   default encode(extensions.gen_random_bytes(6), 'hex'),
  title            text not null check (char_length(title) between 1 and 120),
  hint             text check (char_length(hint) <= 500),  -- visibile prima dello sblocco
  media_type       media_kind not null,
  media_path       text,          -- percorso nel bucket "media"
  external_url     text,          -- YouTube o altro per video > 60 s
  duration_seconds int,
  -- posizione (WGS84) e raggio di sblocco
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  unlock_radius_m  int not null default 50 check (unlock_radius_m between 10 and 500),
  location_source  text not null default 'gps'
                   check (location_source in ('gps', 'coordinates', 'map')),
  visibility       visibility_kind not null default 'restricted',
  password_hash    text,          -- bcrypt; mai in chiaro
  parent_id        uuid references public.contents(id) on delete set null, -- catene "stesso luogo, altro tempo" (Fase 3)
  created_at       timestamptz not null default now(),

  constraint media_or_link check (
    (media_type = 'link' and external_url is not null and media_path is null) or
    (media_type <> 'link' and media_path is not null)
  ),
  constraint video_max_60s check (
    media_type <> 'video' or (duration_seconds is not null and duration_seconds <= 60)
  ),
  constraint link_is_http check (
    external_url is null or external_url ~* '^https://'
  )
);
create index if not exists contents_owner_idx on public.contents(owner_id);
create index if not exists contents_latlng_idx on public.contents(lat, lng);

-- La password scritta in chiaro dal client viene cifrata subito (bcrypt).
create or replace function public.hash_content_password()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  if new.password_hash is not null
     and new.password_hash !~ '^\$2[aby]\$' then
    new.password_hash := crypt(new.password_hash, gen_salt('bf', 10));
  end if;
  if new.password_hash = '' then new.password_hash := null; end if;
  return new;
end $$;

drop trigger if exists contents_hash_pwd on public.contents;
create trigger contents_hash_pwd before insert or update of password_hash
  on public.contents for each row execute function public.hash_content_password();

-- ---------- Destinatari autorizzati (visibilità "restricted") ----------
create table if not exists public.content_recipients (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.contents(id) on delete cascade,
  email       text check (email is null or email = lower(email)),
  phone       text check (phone is null or phone ~ '^\+[0-9]{8,15}$'), -- formato E.164
  constraint one_contact check ((email is null) <> (phone is null))
);
create unique index if not exists recipients_email_uq
  on public.content_recipients(content_id, email) where email is not null;
create unique index if not exists recipients_phone_uq
  on public.content_recipients(content_id, phone) where phone is not null;

-- ---------- Registro sblocchi e tentativi ----------
create table if not exists public.unlocks (
  content_id   uuid not null references public.contents(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  unlocked_at  timestamptz not null default now(),
  distance_m   int,
  primary key (content_id, user_id)
);

create table if not exists public.unlock_attempts (
  id          bigint generated always as identity primary key,
  content_id  uuid not null references public.contents(id) on delete cascade,
  user_id     uuid not null,
  ok          boolean not null,
  reason      text,
  at          timestamptz not null default now()
);
create index if not exists attempts_lookup_idx
  on public.unlock_attempts(content_id, user_id, at desc);

-- ---------- Funzioni di supporto ----------
-- Distanza in metri tra due punti (formula di Haversine).
create or replace function public.distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- L'utente corrente può vedere il contenuto (indipendentemente dalla distanza)?
create or replace function public.can_access(c public.contents)
returns boolean language sql stable security definer
set search_path = public as $$
  -- coalesce: per un utente anonimo auth.uid() è NULL, e NULL non deve mai valere "sì"
  select coalesce(
    c.owner_id = auth.uid()
    or c.visibility = 'public'
    or (c.visibility = 'restricted' and auth.uid() is not null and exists (
          select 1 from public.content_recipients r
          where r.content_id = c.id
            and ( (r.email is not null and r.email = lower(auth.jwt() ->> 'email'))
               -- il telefono vale solo se verificato da Supabase Auth (OTP)
               or (r.phone is not null and r.phone = '+' || ltrim(auth.jwt() ->> 'phone', '+')) ))),
    false)
$$;

-- ---------- API 1: anteprima prima dello sblocco ----------
-- Restituisce SOLO ciò che serve per arrivare sul posto. Mai il file.
create or replace function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text)
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;   -- stessa risposta per "non esiste" e "non autorizzato"
  end if;
  return query select
    c.id, c.title, c.hint, c.media_type, c.lat, c.lng, c.unlock_radius_m,
    c.password_hash is not null,
    exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
    c.owner_id = auth.uid(),
    (select p.display_name from public.profiles p where p.id = c.owner_id);
end $$;

-- ---------- API 2: sblocco con verifica sul server ----------
-- Esito in "status": ok | login_required | not_found | too_far |
--                    gps_inaccurate | password_required | wrong_password | rate_limited
create or replace function public.unlock(
  p_slug text, p_lat double precision, p_lng double precision,
  p_accuracy_m double precision, p_password text default null)
returns table (status text, distance_m int, media_path text, external_url text)
language plpgsql volatile security definer
set search_path = public, extensions as $$
declare
  c        public.contents;
  uid      uuid := auth.uid();
  d        double precision;
  failures int;
begin
  if uid is null then
    return query select 'login_required', null::int, null::text, null::text; return;
  end if;

  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return query select 'not_found', null::int, null::text, null::text; return;
  end if;

  -- Il proprietario o chi ha già sbloccato rivede il contenuto ovunque.
  if c.owner_id = uid or exists (
       select 1 from public.unlocks u where u.content_id = c.id and u.user_id = uid) then
    return query select 'ok', null::int, c.media_path, c.external_url; return;
  end if;

  -- Max 5 tentativi falliti in 15 minuti (protegge le password).
  select count(*) into failures from public.unlock_attempts a
   where a.content_id = c.id and a.user_id = uid and not a.ok
     and a.at > now() - interval '15 minutes';
  if failures >= 5 then
    return query select 'rate_limited', null::int, null::text, null::text; return;
  end if;

  if p_lat is null or p_lng is null or p_accuracy_m is null or p_accuracy_m > 100 then
    insert into public.unlock_attempts(content_id, user_id, ok, reason)
      values (c.id, uid, false, 'gps_inaccurate');
    return query select 'gps_inaccurate', null::int, null::text, null::text; return;
  end if;

  d := public.distance_m(c.lat, c.lng, p_lat, p_lng);
  -- tolleranza: raggio + incertezza GPS (max 30 m extra)
  if d > c.unlock_radius_m + least(p_accuracy_m, 30) then
    insert into public.unlock_attempts(content_id, user_id, ok, reason)
      values (c.id, uid, false, 'too_far');
    return query select 'too_far', round(d)::int, null::text, null::text; return;
  end if;

  if c.password_hash is not null then
    if p_password is null or p_password = '' then
      return query select 'password_required', round(d)::int, null::text, null::text; return;
    end if;
    if crypt(p_password, c.password_hash) <> c.password_hash then
      insert into public.unlock_attempts(content_id, user_id, ok, reason)
        values (c.id, uid, false, 'wrong_password');
      return query select 'wrong_password', round(d)::int, null::text, null::text; return;
    end if;
  end if;

  insert into public.unlocks(content_id, user_id, distance_m)
    values (c.id, uid, round(d)::int) on conflict do nothing;
  insert into public.unlock_attempts(content_id, user_id, ok, reason)
    values (c.id, uid, true, 'ok');
  return query select 'ok', round(d)::int, c.media_path, c.external_url;
end $$;

-- Supabase concede EXECUTE ad anon di default: lo togliamo esplicitamente.
revoke all on function public.unlock(text, double precision, double precision, double precision, text) from public, anon;
revoke all on function public.can_access(public.contents) from public, anon, authenticated;
revoke all on function public.hash_content_password() from public, anon, authenticated;
grant execute on function public.unlock(text, double precision, double precision, double precision, text) to authenticated;
grant execute on function public.get_teaser(text) to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles            enable row level security;
alter table public.contents            enable row level security;
alter table public.content_recipients  enable row level security;
alter table public.unlocks             enable row level security;
alter table public.unlock_attempts     enable row level security;

drop policy if exists "profilo: solo il proprietario" on public.profiles;
create policy "profilo: solo il proprietario" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "contenuti: solo il proprietario" on public.contents;
create policy "contenuti: solo il proprietario" on public.contents
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "destinatari: solo il proprietario del contenuto" on public.content_recipients;
create policy "destinatari: solo il proprietario del contenuto" on public.content_recipients
  for all to authenticated
  using (exists (select 1 from public.contents c where c.id = content_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.contents c where c.id = content_id and c.owner_id = auth.uid()));

drop policy if exists "sblocchi: i miei" on public.unlocks;
create policy "sblocchi: i miei" on public.unlocks
  for select to authenticated using (user_id = auth.uid());
-- unlock_attempts: nessuna policy => accessibile solo tramite le funzioni.

-- ---------- Storage: bucket privato "media" ----------
-- Percorso dei file: {owner_id}/{content_id}/{nome_file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800,   -- 50 MB
        array['image/jpeg','image/png','image/webp','image/heic',
              'video/mp4','video/quicktime','video/webm',
              'audio/mpeg','audio/mp4','audio/aac','audio/webm','audio/ogg'])
on conflict (id) do nothing;

drop policy if exists "media: carico nella mia cartella" on storage.objects;
create policy "media: carico nella mia cartella" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media: cancello i miei file" on storage.objects;
create policy "media: cancello i miei file" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lettura: proprietario, oppure chi ha uno sblocco valido per quel contenuto.
drop policy if exists "media: leggo se proprietario o sbloccato" on storage.objects;
create policy "media: leggo se proprietario o sbloccato" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.unlocks u
      where u.user_id = auth.uid()
        and u.content_id::text = (storage.foldername(name))[2])));

-- Aggiorna subito l API di Supabase con le nuove tabelle
notify pgrst, 'reload schema';
