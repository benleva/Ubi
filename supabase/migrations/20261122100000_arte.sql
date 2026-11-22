-- Ubi Arte: artisti, mostre a cielo aperto (percorsi di opere da sbloccare sul posto), opere esposte dal vivo,
-- recensioni pubbliche, clic sui social e numeri per l'artista. Rieseguibile.

-- 1) Artisti
create table if not exists public.artists (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name       text not null check (char_length(name) between 2 and 80),
  kind       text not null default 'pittore' check (kind in ('pittore', 'scultore', 'fotografo', 'illustratore', 'artista')),
  tagline    text check (tagline is null or char_length(tagline) <= 140),
  bio        text check (bio is null or char_length(bio) <= 3000),
  photo_url  text,
  works      jsonb not null default '[]',      -- [{ "url": "...", "title": "..." }] fino a 3 opere in vetrina
  socials    jsonb not null default '{}',      -- { "instagram": "...", "facebook": "...", "youtube": "...", "tiktok": "...", "sito": "...", "linkedin": "..." }
  shop_url   text check (shop_url is null or shop_url ~ '^https://'),
  user_id    uuid references auth.users(id) on delete set null,   -- l'account dell'artista: anteprima e numeri
  active     boolean not null default false,  -- visibile al pubblico solo dopo il consenso dell'artista
  created_at timestamptz not null default now()
);

-- 2) Mostre: un percorso di opere in un luogo; le copie in altri luoghi hanno source_id
create table if not exists public.exhibitions (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.artists(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 120),
  subtitle   text check (subtitle is null or char_length(subtitle) <= 200),
  intro      text check (intro is null or char_length(intro) <= 3000),
  place_name text check (place_name is null or char_length(place_name) <= 120),
  source_id  uuid references public.exhibitions(id) on delete set null,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists exhibitions_artist on public.exhibitions(artist_id);

-- 3) Le opere sono pin normali: in più la mostra, il numero della postazione e la scheda dell'opera
alter table public.contents add column if not exists exhibition_id   uuid references public.exhibitions(id) on delete set null;
alter table public.contents add column if not exists exhibition_step int check (exhibition_step is null or exhibition_step between 1 and 99);
alter table public.contents add column if not exists art jsonb;   -- { year, technique, size, video, comment, critic, critic_by, sold_to, live }
create index if not exists contents_exhibition on public.contents(exhibition_id, exhibition_step);

-- 4) Dove vedere le opere dal vivo (musei, fondazioni, gallerie), con le date
create table if not exists public.artist_places (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.artists(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 120),
  address    text,
  lat        double precision, lng double precision,
  works      text check (works is null or char_length(works) <= 500),
  from_date  date, to_date date,
  link       text check (link is null or link ~ '^https://'),
  created_at timestamptz not null default now()
);

-- 5) Clic sui social e sullo shop dell'artista (solo conteggi, nessun dato personale)
create table if not exists public.art_clicks (
  id        bigserial primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  kind      text not null check (kind in ('instagram', 'facebook', 'tiktok', 'youtube', 'sito', 'linkedin', 'shop')),
  slug      text,
  at        timestamptz not null default now()
);
create index if not exists art_clicks_artist on public.art_clicks(artist_id, kind);

-- 6) Recensioni pubbliche: chi risponde a un'opera può scegliere di mostrarla nella pagina dell'artista
alter table public.pin_replies add column if not exists is_public boolean not null default false;

-- ---------- Permessi
create or replace function public.is_artist_of(p_artist uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.artists a where a.id = p_artist and a.user_id = auth.uid() and auth.uid() is not null)
$$;
grant execute on function public.is_artist_of(uuid) to anon, authenticated;

alter table public.artists enable row level security;
alter table public.exhibitions enable row level security;
alter table public.artist_places enable row level security;
alter table public.art_clicks enable row level security;
revoke all on public.art_clicks from anon, authenticated;

drop policy if exists "artisti: lettura" on public.artists;
create policy "artisti: lettura" on public.artists for select using (active or public.is_artist_of(id));
drop policy if exists "artisti: admin scrive" on public.artists;
create policy "artisti: admin scrive" on public.artists for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "mostre: lettura" on public.exhibitions;
create policy "mostre: lettura" on public.exhibitions for select
  using ((published and exists (select 1 from public.artists a where a.id = artist_id and a.active)) or public.is_artist_of(artist_id) or owner_id = auth.uid());
drop policy if exists "mostre: chi le gestisce scrive" on public.exhibitions;
create policy "mostre: chi le gestisce scrive" on public.exhibitions for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check ((owner_id = auth.uid() and public.is_artist_of(artist_id)) or public.is_admin());

drop policy if exists "luoghi: lettura" on public.artist_places;
create policy "luoghi: lettura" on public.artist_places for select
  using (exists (select 1 from public.artists a where a.id = artist_id and a.active) or public.is_artist_of(artist_id));
drop policy if exists "luoghi: artista e admin scrivono" on public.artist_places;
create policy "luoghi: artista e admin scrivono" on public.artist_places for all to authenticated
  using (public.is_artist_of(artist_id)) with check (public.is_artist_of(artist_id));

-- ---------- Funzioni pubbliche

-- Scheda di un'opera: il pubblico vede titolo, anno, tecnica e misure; il resto solo dopo lo sblocco
-- (o se sei il proprietario, l'artista o l'amministratore).
create or replace function public.art_info(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.contents; e public.exhibitions; a public.artists; full_ok boolean; prev boolean; n int; nx jsonb;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or c.exhibition_id is null then return null; end if;
  select * into e from public.exhibitions where id = c.exhibition_id;
  select * into a from public.artists where id = e.artist_id;
  prev := public.is_artist_of(a.id);
  if not (public.can_access(c) or prev) then return null; end if;
  full_ok := prev or c.owner_id = auth.uid() or exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid());
  select count(*) into n from public.contents x where x.exhibition_id = e.id;
  select jsonb_build_object('slug', x.share_slug, 'title', x.title, 'step', x.exhibition_step, 'lat', x.lat, 'lng', x.lng) into nx
    from public.contents x where x.exhibition_id = e.id and x.exhibition_step > c.exhibition_step
     and (public.can_access(x) or prev) order by x.exhibition_step limit 1;
  return jsonb_build_object(
    'exhibition', jsonb_build_object('id', e.id, 'title', e.title, 'place_name', e.place_name),
    'step', c.exhibition_step, 'steps', n, 'next', nx, 'can_preview', prev, 'full', full_ok,
    'artist', jsonb_build_object('id', a.id, 'slug', a.slug, 'name', a.name, 'kind', a.kind, 'photo_url', a.photo_url,
                                 'socials', a.socials, 'shop_url', a.shop_url, 'active', a.active),
    'art', case when full_ok then coalesce(c.art, '{}'::jsonb)
                else jsonb_strip_nulls(jsonb_build_object('year', c.art->>'year', 'technique', c.art->>'technique', 'size', c.art->>'size')) end);
end $$;
grant execute on function public.art_info(text) to anon, authenticated;

-- Anteprima dell'artista: apre l'opera da qualsiasi luogo, senza contare come sblocco
create or replace function public.art_preview(p_slug text)
returns table (status text, media_path text, external_url text, text_body text)
language plpgsql stable security definer set search_path = public as $$
declare c public.contents; ok boolean;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or c.exhibition_id is null then return query select 'not_found', null::text, null::text, null::text; return; end if;
  select public.is_artist_of(e.artist_id) into ok from public.exhibitions e where e.id = c.exhibition_id;
  if not coalesce(ok, false) then return query select 'not_allowed', null::text, null::text, null::text; return; end if;
  return query select 'ok', c.media_path, c.external_url, c.text_body;
end $$;
revoke all on function public.art_preview(text) from public, anon;
grant execute on function public.art_preview(text) to authenticated;

-- I file delle opere li legge anche l'artista (per l'anteprima)
create or replace function public.can_preview_art(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contents c join public.exhibitions e on e.id = c.exhibition_id
                  where c.id::text = (storage.foldername(p_name))[2] and public.is_artist_of(e.artist_id))
$$;
drop policy if exists "media: anteprima dell'artista" on storage.objects;
create policy "media: anteprima dell'artista" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.can_preview_art(name));

-- Pagina pubblica dell'artista: dati, mostre pubblicate (con il punto di partenza) e opere dal vivo
create or replace function public.artist_page(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.artists;
begin
  select * into a from public.artists where slug = p_slug;
  if not found or not (a.active or public.is_artist_of(a.id)) then return null; end if;
  return jsonb_build_object(
    'artist', to_jsonb(a) - 'user_id',
    'is_me', public.is_artist_of(a.id),
    'exhibitions', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'subtitle', e.subtitle, 'place_name', e.place_name,
         'published', e.published, 'steps', (select count(*) from public.contents x where x.exhibition_id = e.id),
         'lat', s.lat, 'lng', s.lng) order by e.created_at)
       from public.exhibitions e
       left join lateral (select x.lat, x.lng from public.contents x where x.exhibition_id = e.id order by x.exhibition_step limit 1) s on true
       where e.artist_id = a.id and (e.published or public.is_artist_of(a.id))), '[]'::jsonb),
    'places', coalesce((select jsonb_agg(to_jsonb(p) order by p.from_date nulls last) from public.artist_places p
       where p.artist_id = a.id and (p.to_date is null or p.to_date >= current_date)), '[]'::jsonb),
    'reviews', (select count(*) from public.pin_replies r join public.contents c on c.id = r.content_id
                  join public.exhibitions e on e.id = c.exhibition_id where e.artist_id = a.id and r.is_public));
end $$;
grant execute on function public.artist_page(text) to anon, authenticated;

-- Elenco pubblico degli artisti (sezione Arte)
create or replace function public.artists_list()
returns table (slug text, name text, kind text, tagline text, photo_url text, exhibitions bigint)
language sql stable security definer set search_path = public as $$
  select a.slug, a.name, a.kind, a.tagline, a.photo_url,
         (select count(*) from public.exhibitions e where e.artist_id = a.id and e.published)
    from public.artists a where a.active or public.is_artist_of(a.id) order by a.name
$$;
grant execute on function public.artists_list() to anon, authenticated;

-- Una mostra: dati e postazioni (titolo e posizione; il contenuto si apre solo sul posto)
create or replace function public.exhibition_view(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e public.exhibitions; a public.artists; mine boolean;
begin
  select * into e from public.exhibitions where id = p_id;
  if not found then return null; end if;
  select * into a from public.artists where id = e.artist_id;
  mine := public.is_artist_of(a.id) or coalesce(e.owner_id = auth.uid(), false);
  if not ((e.published and a.active) or mine) then return null; end if;
  return jsonb_build_object('exhibition', to_jsonb(e), 'mine', mine,
    'artist', jsonb_build_object('slug', a.slug, 'name', a.name, 'photo_url', a.photo_url, 'socials', a.socials, 'shop_url', a.shop_url),
    'stops', coalesce((select jsonb_agg(jsonb_build_object('slug', c.share_slug, 'title', c.title, 'step', c.exhibition_step, 'lat', c.lat, 'lng', c.lng,
         'ready', c.media_path is not null, 'visibility', c.visibility,
         'unlocked', exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid())) order by c.exhibition_step)
       from public.contents c where c.exhibition_id = e.id and (public.can_access(c) or mine)), '[]'::jsonb));
end $$;
grant execute on function public.exhibition_view(uuid) to anon, authenticated;

-- Clic su social e shop
create or replace function public.art_click(p_artist uuid, p_kind text, p_slug text default null)
returns void language sql volatile security definer set search_path = public as $$
  insert into public.art_clicks(artist_id, kind, slug)
  select p_artist, p_kind, left(p_slug, 40) where exists (select 1 from public.artists where id = p_artist)
$$;
grant execute on function public.art_click(uuid, text, text) to anon, authenticated;

-- Chi ha risposto sceglie se mostrare la sua risposta come recensione pubblica
create or replace function public.reply_set_public(p_id uuid, p_public boolean)
returns void language sql volatile security definer set search_path = public as $$
  update public.pin_replies set is_public = p_public where id = p_id and author_id = auth.uid()
$$;
revoke all on function public.reply_set_public(uuid, boolean) from public, anon;
grant execute on function public.reply_set_public(uuid, boolean) to authenticated;

-- Recensioni pubbliche di un artista (testo; per foto, video e audio si indica solo il tipo)
create or replace function public.artist_reviews(p_slug text)
returns table (author text, media_type text, text_body text, created_at timestamptz, title text, place_name text)
language sql stable security definer set search_path = public as $$
  select coalesce(p.display_name, 'Utente Ubi'), r.media_type, r.text_body, r.created_at, c.title, e.place_name
    from public.pin_replies r
    join public.contents c on c.id = r.content_id
    join public.exhibitions e on e.id = c.exhibition_id
    join public.artists a on a.id = e.artist_id
    left join public.profiles p on p.id = r.author_id
   where a.slug = p_slug and r.is_public and (a.active or public.is_artist_of(a.id))
   order by r.created_at desc limit 300
$$;
grant execute on function public.artist_reviews(text) to anon, authenticated;

-- Numeri per l'artista: per ogni opera di ogni mostra (escluse le aperture del proprietario e dell'artista)
create or replace function public.art_stats(p_artist uuid)
returns table (exhibition_id uuid, exhibition text, place_name text, step int, slug text, title text,
               unlocks bigint, replies bigint, public_reviews bigint, signups bigint)
language plpgsql stable security definer set search_path = public as $$
declare me uuid;
begin
  if not public.is_artist_of(p_artist) then raise exception 'not_allowed'; end if;
  select user_id into me from public.artists where id = p_artist;
  return query
  select e.id, e.title, e.place_name, c.exhibition_step, c.share_slug, c.title,
         (select count(*) from public.unlocks u where u.content_id = c.id and u.user_id <> c.owner_id and u.user_id is distinct from me),
         (select count(*) from public.pin_replies r where r.content_id = c.id),
         (select count(*) from public.pin_replies r where r.content_id = c.id and r.is_public),
         (select count(*) from public.profiles q where q.signup_slug = c.share_slug)
    from public.exhibitions e join public.contents c on c.exhibition_id = e.id
   where e.artist_id = p_artist
   order by e.created_at, c.exhibition_step;
end $$;
revoke all on function public.art_stats(uuid) from public, anon;
grant execute on function public.art_stats(uuid) to authenticated;

create or replace function public.art_click_stats(p_artist uuid)
returns table (kind text, clicks bigint, last_30_days bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_artist_of(p_artist) then raise exception 'not_allowed'; end if;
  return query select k.kind, count(*), count(*) filter (where k.at > now() - interval '30 days')
    from public.art_clicks k where k.artist_id = p_artist group by k.kind;
end $$;
revoke all on function public.art_click_stats(uuid) from public, anon;
grant execute on function public.art_click_stats(uuid) to authenticated;

-- Iscritti arrivati dalla pagina dell'artista (signup_slug = 'artista:<slug>')
create or replace function public.art_page_signups(p_artist uuid)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  if not public.is_artist_of(p_artist) then raise exception 'not_allowed'; end if;
  select slug into s from public.artists where id = p_artist;
  return (select count(*) from public.profiles where signup_slug = 'artista:' || s);
end $$;
revoke all on function public.art_page_signups(uuid) from public, anon;
grant execute on function public.art_page_signups(uuid) to authenticated;

-- L'artista con il suo account (per il pulsante «La mia arte» in home)
create or replace function public.my_artists()
returns table (id uuid, slug text, name text)
language sql stable security definer set search_path = public as $$
  select a.id, a.slug, a.name from public.artists a where auth.uid() is not null and (a.user_id = auth.uid() or public.is_admin()) order by a.name
$$;
grant execute on function public.my_artists() to authenticated;

-- L'amministratore collega l'account dell'artista con la sua email
create or replace function public.admin_artist_set_user(p_artist uuid, p_email text)
returns boolean language plpgsql volatile security definer set search_path = public, auth as $$
declare u uuid;
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  if p_email is null or p_email = '' then update public.artists set user_id = null where id = p_artist; return true; end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then return false; end if;
  update public.artists set user_id = u where id = p_artist;
  return true;
end $$;
revoke all on function public.admin_artist_set_user(uuid, text) from public, anon;
grant execute on function public.admin_artist_set_user(uuid, text) to authenticated;

notify pgrst, 'reload schema';
