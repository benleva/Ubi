-- Mappa: con molte curiosità/scrittori i pin degli utenti sparivano (si caricavano solo i 500 più recenti).
-- Ora prima i propri pin, poi quelli normali degli utenti, poi monumenti e scrittori; fino a 1500.
create or replace function public.map_contents(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (share_slug text, title text, media_type public.media_kind,
               lat double precision, lng double precision, is_owner boolean, unlocked boolean, tags text[],
               is_dating boolean, gender text, unlock_at timestamptz, hunt_step int)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng,
         c.owner_id = auth.uid(),
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
         case when c.is_dating and c.owner_id <> auth.uid() and not public.is_dating_user(auth.uid()) then '{}'::text[] else c.tags end,
         c.is_dating,
         case when c.is_dating then (select p.dating_gender from public.profiles p where p.id = c.owner_id) end,
         c.unlock_at, c.hunt_step
  from public.contents c
  where auth.uid() is not null
    and c.lat between p_min_lat and p_max_lat
    and c.lng between p_min_lng and p_max_lng
    and public.can_access(c)
    and public.hunt_prev_ok(c, auth.uid())
  order by (c.owner_id = auth.uid() and not (c.tags && array['curiosità','letteratura'])) desc,
           (c.tags && array['curiosità','letteratura']) asc,
           c.created_at desc
  limit 1500
$$;
revoke all on function public.map_contents(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.map_contents(double precision, double precision, double precision, double precision) to authenticated;
