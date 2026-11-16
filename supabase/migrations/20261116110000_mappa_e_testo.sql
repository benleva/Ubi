-- =====================================================================
-- UBI — Aggiornamento 2: contenuti di tipo TESTO + mappa dei contenuti
-- Si può eseguire più volte senza danni.
-- =====================================================================

-- 1) Nuovo tipo di contenuto: testo
alter type public.media_kind add value if not exists 'text';

alter table public.contents add column if not exists text_body text;
alter table public.contents drop constraint if exists text_body_len;
alter table public.contents add constraint text_body_len check (text_body is null or char_length(text_body) <= 2000);

-- (si confronta come testo: il nuovo valore dell'enum non è ancora utilizzabile in questa transazione)
alter table public.contents drop constraint if exists media_or_link;
alter table public.contents add constraint media_or_link check (
  (media_type::text = 'link'  and external_url is not null and media_path is null) or
  (media_type::text = 'text'  and text_body is not null and char_length(text_body) > 0 and media_path is null) or
  (media_type::text in ('photo', 'video', 'audio') and media_path is not null)
);

-- 2) Lo sblocco ora restituisce anche il testo
drop function if exists public.unlock(text, double precision, double precision, double precision, text);
create function public.unlock(
  p_slug text, p_lat double precision, p_lng double precision,
  p_accuracy_m double precision, p_password text default null)
returns table (status text, distance_m int, media_path text, external_url text, text_body text)
language plpgsql volatile security definer
set search_path = public, extensions as $$
declare
  c        public.contents;
  uid      uuid := auth.uid();
  d        double precision;
  failures int;
begin
  if uid is null then
    return query select 'login_required', null::int, null::text, null::text, null::text; return;
  end if;

  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return query select 'not_found', null::int, null::text, null::text, null::text; return;
  end if;

  if c.owner_id = uid or exists (
       select 1 from public.unlocks u where u.content_id = c.id and u.user_id = uid) then
    return query select 'ok', null::int, c.media_path, c.external_url, c.text_body; return;
  end if;

  select count(*) into failures from public.unlock_attempts a
   where a.content_id = c.id and a.user_id = uid and not a.ok
     and a.at > now() - interval '15 minutes';
  if failures >= 5 then
    return query select 'rate_limited', null::int, null::text, null::text, null::text; return;
  end if;

  if p_lat is null or p_lng is null or p_accuracy_m is null or p_accuracy_m > 100 then
    insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, false, 'gps_inaccurate');
    return query select 'gps_inaccurate', null::int, null::text, null::text, null::text; return;
  end if;

  d := public.distance_m(c.lat, c.lng, p_lat, p_lng);
  if d > c.unlock_radius_m + least(p_accuracy_m, 30) then
    insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, false, 'too_far');
    return query select 'too_far', round(d)::int, null::text, null::text, null::text; return;
  end if;

  if c.password_hash is not null then
    if p_password is null or p_password = '' then
      return query select 'password_required', round(d)::int, null::text, null::text, null::text; return;
    end if;
    if crypt(p_password, c.password_hash) <> c.password_hash then
      insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, false, 'wrong_password');
      return query select 'wrong_password', round(d)::int, null::text, null::text, null::text; return;
    end if;
  end if;

  insert into public.unlocks(content_id, user_id, distance_m) values (c.id, uid, round(d)::int) on conflict do nothing;
  insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, true, 'ok');
  return query select 'ok', round(d)::int, c.media_path, c.external_url, c.text_body;
end $$;

revoke all on function public.unlock(text, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.unlock(text, double precision, double precision, double precision, text) to authenticated;

-- 3) Mappa: contenuti visibili all'utente nell'area inquadrata
--    (miei + pubblici + quelli di cui sono destinatario). Mai il file, solo il segnaposto.
create or replace function public.map_contents(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (share_slug text, title text, media_type public.media_kind,
               lat double precision, lng double precision, is_owner boolean, unlocked boolean)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng,
         c.owner_id = auth.uid(),
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid())
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
