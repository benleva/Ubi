-- v.140: conta quante volte viene aperto il link di un pin (solo numeri, nessun dato personale).
-- Serve a capire quante persone aprono un pin condiviso e quante poi si iscrivono.

create table if not exists public.pin_visits (
  slug text not null,
  day  date not null default current_date,
  n    integer not null default 0,
  primary key (slug, day)
);
alter table public.pin_visits enable row level security;   -- nessuna policy: si legge solo tramite le funzioni

create or replace function public.track_pin_visit(p_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_slug is null or p_slug !~ '^[A-Za-z0-9_-]{4,40}$' then return; end if;
  if not exists (select 1 from public.contents c where c.share_slug = p_slug) then return; end if;
  insert into public.pin_visits (slug, day, n) values (p_slug, current_date, 1)
  on conflict (slug, day) do update set n = public.pin_visits.n + 1;
end $$;
revoke all on function public.track_pin_visit(text) from public;
grant execute on function public.track_pin_visit(text) to anon, authenticated;

-- Statistiche per pin: aggiunge la colonna «aperture» (in fondo)
drop function if exists public.admin_pin_stats();
create function public.admin_pin_stats()
returns table (slug text, titolo text, autore text, autore_email text, visibilita text, caccia text, tappa int,
               creato_il timestamptz, sblocchi bigint, primo_sblocco timestamptz, ultimo_sblocco timestamptz,
               nuovi_iscritti bigint, codici_dati bigint, codici_ritirati bigint, aperture bigint)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query
    select c.share_slug, c.title, p.display_name, u.email::text, c.visibility::text, h.title, c.hunt_step,
           c.created_at,
           (select count(*) from public.unlocks x where x.content_id = c.id and x.user_id <> c.owner_id),
           (select min(x.unlocked_at) from public.unlocks x where x.content_id = c.id and x.user_id <> c.owner_id),
           (select max(x.unlocked_at) from public.unlocks x where x.content_id = c.id and x.user_id <> c.owner_id),
           (select count(*) from public.profiles q where q.signup_slug = c.share_slug),
           case when h.id is not null and c.hunt_step = (select max(s.hunt_step) from public.contents s where s.hunt_id = h.id)
                then (select count(*) from public.hunt_winners w where w.hunt_id = h.id) end,
           case when h.id is not null and c.hunt_step = (select max(s.hunt_step) from public.contents s where s.hunt_id = h.id)
                then (select count(*) from public.hunt_winners w where w.hunt_id = h.id and w.redeemed_at is not null) end,
           (select coalesce(sum(v.n), 0)::bigint from public.pin_visits v where v.slug = c.share_slug)
    from public.contents c
    left join public.profiles p on p.id = c.owner_id
    left join auth.users u on u.id = c.owner_id
    left join public.hunts h on h.id = c.hunt_id
    where c.visibility = 'public' or c.hunt_id is not null
       or exists (select 1 from public.unlocks x where x.content_id = c.id and x.user_id <> c.owner_id)
    order by 9 desc, c.created_at desc;
end $$;
revoke all on function public.admin_pin_stats() from public, anon;
grant execute on function public.admin_pin_stats() to authenticated;
