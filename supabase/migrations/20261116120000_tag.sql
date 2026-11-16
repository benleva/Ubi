-- =====================================================================
-- UBI — Aggiornamento 3: tag sui contenuti
-- Si può eseguire più volte senza danni. Richiede gli aggiornamenti 1 e 2.
-- =====================================================================

-- Regole: massimo 8 tag, ognuno 1–24 caratteri, minuscolo, senza simboli strani.
create or replace function public.tags_valid(t text[])
returns boolean language sql immutable as $$
  select coalesce(cardinality(t), 0) <= 8
     and coalesce(bool_and(char_length(x) between 1 and 24 and x = lower(x) and x !~ '[,;#<>"]'), true)
  from unnest(coalesce(t, '{}')) as x
$$;

alter table public.contents add column if not exists tags text[] not null default '{}';
alter table public.contents drop constraint if exists tags_ok;
alter table public.contents add constraint tags_ok check (public.tags_valid(tags));
create index if not exists contents_tags_idx on public.contents using gin (tags);

-- Anteprima: ora restituisce anche i tag
drop function if exists public.get_teaser(text);
create function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type public.media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text, tags text[])
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;
  end if;
  return query select
    c.id, c.title, c.hint, c.media_type, c.lat, c.lng, c.unlock_radius_m,
    c.password_hash is not null,
    exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
    c.owner_id = auth.uid(),
    (select p.display_name from public.profiles p where p.id = c.owner_id),
    c.tags;
end $$;
grant execute on function public.get_teaser(text) to anon, authenticated;

-- Mappa: ora restituisce anche i tag (il filtro per tag lo fa l'app)
drop function if exists public.map_contents(double precision, double precision, double precision, double precision);
create function public.map_contents(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (share_slug text, title text, media_type public.media_kind,
               lat double precision, lng double precision, is_owner boolean, unlocked boolean, tags text[])
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng,
         c.owner_id = auth.uid(),
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
         c.tags
  from public.contents c
  where auth.uid() is not null
    and c.lat between p_min_lat and p_max_lat
    and c.lng between p_min_lng and p_max_lng
    and public.can_access(c)
  order by c.created_at desc
  limit 500
$$;
revoke all on function public.map_contents(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.map_contents(double precision, double precision, double precision, double precision) to authenticated;

notify pgrst, 'reload schema';
