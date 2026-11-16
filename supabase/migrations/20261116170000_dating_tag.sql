-- =====================================================================
-- UBI — Aggiornamento 8: tag del dating
-- Si può eseguire più volte senza danni. Richiede l'aggiornamento 7.
--  - fino a 12 tag per contenuto (servono per orientamento, cosa cerchi, valori, passioni)
--  - i tag dei biglietti dating (es. orientamento, tipo di relazione) li vedono solo
--    gli iscritti a Ubi Dating (maggiorenni) e l'autore; per gli altri il biglietto non ha tag.
-- =====================================================================

create or replace function public.tags_valid(t text[])
returns boolean language sql immutable as $$
  select coalesce(cardinality(t), 0) <= 12
     and coalesce(bool_and(char_length(x) between 1 and 24 and x = lower(x) and x !~ '[,;#<>"]'), true)
  from unnest(coalesce(t, '{}')) as x
$$;

-- 5) Anteprima: dati dating, autore nascosto nei pin dating
create or replace function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type public.media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text, tags text[], author_id uuid, author_avatar text,
  is_dating boolean, gender text, replies_enabled boolean, i_am_dating boolean, i_replied boolean)
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents; hide boolean;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;
  end if;
  hide := c.is_dating and c.owner_id is distinct from auth.uid();
  return query select
    c.id, c.title, c.hint, c.media_type, c.lat, c.lng, c.unlock_radius_m,
    c.password_hash is not null,
    exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
    c.owner_id = auth.uid(),
    case when hide then null else (select p.display_name from public.profiles p where p.id = c.owner_id) end,
    case when hide and not (auth.uid() is not null and public.is_dating_user(auth.uid())) then '{}'::text[] else c.tags end,
    case when hide then null else c.owner_id end,
    case when hide then null else (select p.avatar_path from public.profiles p where p.id = c.owner_id) end,
    c.is_dating,
    case when c.is_dating then (select p.dating_gender from public.profiles p where p.id = c.owner_id) end,
    c.replies_enabled,
    auth.uid() is not null and public.is_dating_user(auth.uid()),
    exists (select 1 from public.pin_replies r where r.content_id = c.id and r.author_id = auth.uid());
end $$;
grant execute on function public.get_teaser(text) to anon, authenticated;

-- 6) Mappa: anche tipo dating e genere (pallino rosa / azzurro)
create or replace function public.map_contents(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (share_slug text, title text, media_type public.media_kind,
               lat double precision, lng double precision, is_owner boolean, unlocked boolean, tags text[],
               is_dating boolean, gender text)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng,
         c.owner_id = auth.uid(),
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
         case when c.is_dating and c.owner_id <> auth.uid() and not public.is_dating_user(auth.uid()) then '{}'::text[] else c.tags end,
         c.is_dating,
         case when c.is_dating then (select p.dating_gender from public.profiles p where p.id = c.owner_id) end
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
