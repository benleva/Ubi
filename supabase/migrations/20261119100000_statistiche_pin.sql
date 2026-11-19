-- Statistiche dei pin per il marketing: solo numeri e solo per l'amministratore
-- (e, in forma di conteggi anonimi, per chi ha creato la caccia). Nessun dato personale passa ai locali.

-- 1) Da quale pin è arrivato chi si iscrive (link aperto prima della registrazione)
alter table public.profiles add column if not exists signup_slug text;

create or replace function public.set_signup_source(p_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_slug is null or p_slug !~ '^[A-Za-z0-9_-]{4,40}$' then return; end if;
  -- solo per un account appena creato e una volta sola
  update public.profiles p set signup_slug = p_slug
   where p.id = auth.uid() and p.signup_slug is null
     and exists (select 1 from auth.users u where u.id = auth.uid() and u.created_at > now() - interval '2 days')
     and exists (select 1 from public.contents c where c.share_slug = p_slug);
end $$;
revoke all on function public.set_signup_source(text) from public, anon;
grant execute on function public.set_signup_source(text) to authenticated;

-- 2) Lista iscritti per l'amministratore: aggiunge il pin di provenienza
drop function if exists public.admin_users();
create function public.admin_users()
returns table (id uuid, email text, nome text, iscritto_il timestamptz, ultimo_accesso timestamptz,
               email_confermata boolean, ubi_dating boolean, pin_creati bigint, file_caricati bigint, piano text,
               arrivato_da_pin text, pin_sbloccati bigint)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query
    select u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at,
           u.email_confirmed_at is not null, p.dating_consent_version is not null,
           (select count(*) from public.contents c where c.owner_id = u.id),
           (select count(*) from public.contents c where c.owner_id = u.id and c.media_path is not null),
           coalesce(p.plan, 'free'),
           (select c.title from public.contents c where c.share_slug = p.signup_slug),
           (select count(*) from public.unlocks x where x.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- 3) Statistiche per pin (solo amministratore): sblocchi, nuovi iscritti, codici premio
create or replace function public.admin_pin_stats()
returns table (slug text, titolo text, autore text, autore_email text, visibilita text, caccia text, tappa int,
               creato_il timestamptz, sblocchi bigint, primo_sblocco timestamptz, ultimo_sblocco timestamptz,
               nuovi_iscritti bigint, codici_dati bigint, codici_ritirati bigint)
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
                then (select count(*) from public.hunt_winners w where w.hunt_id = h.id and w.redeemed_at is not null) end
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

-- 4) Per chi ha creato la caccia: solo conteggi anonimi per tappa
create or replace function public.hunt_stats(p_hunt uuid)
returns table (tappa int, titolo text, sblocchi bigint, nuovi_iscritti bigint)
language sql stable security definer
set search_path = public as $$
  select c.hunt_step, c.title,
         (select count(*) from public.unlocks x where x.content_id = c.id and x.user_id <> c.owner_id),
         (select count(*) from public.profiles q where q.signup_slug = c.share_slug)
  from public.contents c join public.hunts h on h.id = c.hunt_id
  where c.hunt_id = p_hunt and h.owner_id = auth.uid()
  order by c.hunt_step
$$;
revoke all on function public.hunt_stats(uuid) from public, anon;
grant execute on function public.hunt_stats(uuid) to authenticated;
