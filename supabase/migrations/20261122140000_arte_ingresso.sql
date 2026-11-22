-- Ubi Arte: l'«ingresso» di ogni mostra sulla mappa. Un segnaposto ben visibile 20 m prima dell'opera 1,
-- nella direzione da cui si arriva, che porta alla presentazione della mostra. Rieseguibile.
drop function if exists public.exhibitions_in_box(double precision, double precision, double precision, double precision);
create or replace function public.exhibitions_in_box(p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision)
returns table (id uuid, title text, place_name text, artist text, steps int, published boolean, lat double precision, lng double precision, s_lat double precision, s_lng double precision)
language sql stable security definer set search_path = public as $$
  with x as (
    select e.id, e.title, e.place_name, a.name as artist, e.published and a.active as published,
           (select count(*)::int from public.contents c where c.exhibition_id = e.id) as steps,
           (select c.lat from public.contents c where c.exhibition_id = e.id order by c.exhibition_step limit 1) as lat1,
           (select c.lng from public.contents c where c.exhibition_id = e.id order by c.exhibition_step limit 1) as lng1,
           (select c.lat from public.contents c where c.exhibition_id = e.id order by c.exhibition_step offset 1 limit 1) as lat2,
           (select c.lng from public.contents c where c.exhibition_id = e.id order by c.exhibition_step offset 1 limit 1) as lng2
      from public.exhibitions e join public.artists a on a.id = e.artist_id
     where (e.published and a.active) or public.is_artist_of(e.artist_id) or (auth.uid() is not null and e.owner_id = auth.uid())
  ), y as (
    select x.*, sqrt(power((x.lat1 - x.lat2) * 111320, 2) + power((x.lng1 - x.lng2) * 111320 * cos(radians(x.lat1)), 2)) as d from x where x.lat1 is not null
  )
  select y.id, y.title, y.place_name, y.artist, y.steps, y.published,
         case when coalesce(y.d, 0) > 0.5 then y.lat1 + (y.lat1 - y.lat2) * 20 / y.d else y.lat1 + 20 / 111320.0 end,
         case when coalesce(y.d, 0) > 0.5 then y.lng1 + (y.lng1 - y.lng2) * 20 / y.d else y.lng1 end,
         y.lat1, y.lng1
    from y
   where y.lat1 between p_min_lat - 0.01 and p_max_lat + 0.01 and y.lng1 between p_min_lng - 0.01 and p_max_lng + 0.01
   limit 300
$$;
grant execute on function public.exhibitions_in_box(double precision, double precision, double precision, double precision) to anon, authenticated;
notify pgrst, 'reload schema';
