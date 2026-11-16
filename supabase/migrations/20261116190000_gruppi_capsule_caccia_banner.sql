-- =====================================================================
-- UBI — Aggiornamento 10: gruppi in rubrica, capsula del tempo, caccia al tesoro,
--                         banner pubblicitari, amministratore (lista iscritti)
-- Si può eseguire più volte senza danni. Richiede gli aggiornamenti 1-9.
--
-- DOPO averlo eseguito, per diventare amministratore esegui UNA volta (con la tua email):
--   insert into public.app_admins(user_id) select id from auth.users where email = 'LA-TUA-EMAIL' on conflict do nothing;
-- =====================================================================

-- ---------- 1) GRUPPI nella rubrica (es. "famiglia", "calcetto") ----------
alter table public.address_book add column if not exists groups text[] not null default '{}';
create or replace function public.groups_valid(g text[])
returns boolean language sql immutable as $$
  select coalesce(cardinality(g), 0) <= 10
     and coalesce(bool_and(char_length(x) between 1 and 30 and x !~ '[<>"]'), true)
  from unnest(coalesce(g, '{}')) as x
$$;
alter table public.address_book drop constraint if exists address_book_groups_ok;
alter table public.address_book add constraint address_book_groups_ok check (public.groups_valid(groups));

-- ---------- 2) CAPSULA DEL TEMPO ----------
alter table public.contents add column if not exists unlock_at timestamptz;              -- si apre da questa data/ora
alter table public.contents add column if not exists open_anywhere boolean not null default false;  -- dopo la data, apribile anche da lontano
alter table public.contents drop constraint if exists anywhere_needs_date;
alter table public.contents add constraint anywhere_needs_date check (not open_anywhere or unlock_at is not null);

-- ---------- 3) CACCIA AL TESORO ----------
create table if not exists public.hunts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  prize       text not null check (char_length(prize) between 1 and 200),   -- es. "Una birra media o una maglietta"
  max_winners int  not null default 30 check (max_winners between 1 and 10000),
  created_at  timestamptz not null default now()
);
alter table public.hunts enable row level security;
drop policy if exists "cacce: le mie" on public.hunts;
create policy "cacce: le mie" on public.hunts for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.contents add column if not exists hunt_id uuid references public.hunts(id) on delete set null;
alter table public.contents add column if not exists hunt_step int check (hunt_step is null or hunt_step between 1 and 20);
alter table public.contents drop constraint if exists hunt_step_needed;
alter table public.contents add constraint hunt_step_needed check ((hunt_id is null) = (hunt_step is null));
create unique index if not exists contents_hunt_step_uq on public.contents(hunt_id, hunt_step) where hunt_id is not null;

-- Una tappa si può aggiungere solo a una propria caccia
create or replace function public.contents_hunt_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.hunt_id is not null and not exists (select 1 from public.hunts h where h.id = new.hunt_id and h.owner_id = new.owner_id) then
    raise exception 'Caccia al tesoro non trovata.';
  end if;
  return new;
end $$;
drop trigger if exists contents_hunt_guard on public.contents;
create trigger contents_hunt_guard before insert or update on public.contents
  for each row execute function public.contents_hunt_guard();

create table if not exists public.hunt_winners (
  hunt_id     uuid not null references public.hunts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  won_at      timestamptz not null default now(),
  redeemed_at timestamptz,
  primary key (hunt_id, user_id),
  unique (hunt_id, code)
);
alter table public.hunt_winners enable row level security;
revoke all on public.hunt_winners from anon, authenticated;   -- solo tramite le funzioni qui sotto

-- Tappa precedente sbloccata? (la tappa 1 è sempre libera)
create or replace function public.hunt_prev_ok(c public.contents, p_user uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select c.hunt_id is null or c.hunt_step <= 1 or c.owner_id = p_user or exists (
    select 1 from public.contents p join public.unlocks u on u.content_id = p.id and u.user_id = p_user
    where p.hunt_id = c.hunt_id and p.hunt_step = c.hunt_step - 1)
$$;

-- Dopo lo sblocco dell'ultima tappa: assegna il codice premio (se ce ne sono ancora)
create or replace function public.hunt_check_win(c public.contents, p_user uuid)
returns void language plpgsql volatile security definer
set search_path = public, extensions as $$
declare h public.hunts; k text; tries int := 0;
begin
  if c.hunt_id is null or c.owner_id = p_user then return; end if;
  if c.hunt_step < (select max(hunt_step) from public.contents where hunt_id = c.hunt_id) then return; end if;
  select * into h from public.hunts where id = c.hunt_id for update;
  if exists (select 1 from public.hunt_winners where hunt_id = h.id and user_id = p_user) then return; end if;
  if (select count(*) from public.hunt_winners where hunt_id = h.id) >= h.max_winners then return; end if;
  loop
    k := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into public.hunt_winners(hunt_id, user_id, code) values (h.id, p_user, k);
      exit;
    exception when unique_violation then
      tries := tries + 1; if tries > 5 then raise; end if;
    end;
  end loop;
end $$;

-- Il mio premio per la caccia di questo pin (se ho finito il percorso)
create or replace function public.my_hunt_prize(p_slug text)
returns table (hunt_title text, prize text, code text, won_at timestamptz, redeemed_at timestamptz,
               is_last boolean, sold_out boolean, steps int)
language sql stable security definer
set search_path = public as $$
  select h.title, h.prize, w.code, w.won_at, w.redeemed_at,
         c.hunt_step = (select max(hunt_step) from public.contents where hunt_id = h.id),
         w.code is null and (select count(*) from public.hunt_winners x where x.hunt_id = h.id) >= h.max_winners,
         (select max(hunt_step) from public.contents where hunt_id = h.id)
  from public.contents c
  join public.hunts h on h.id = c.hunt_id
  left join public.hunt_winners w on w.hunt_id = h.id and w.user_id = auth.uid()
  where c.share_slug = p_slug and auth.uid() is not null
$$;
revoke all on function public.my_hunt_prize(text) from public, anon;
grant execute on function public.my_hunt_prize(text) to authenticated;

-- Il gestore (chi ha creato la caccia) vede i vincitori e segna i premi ritirati
create or replace function public.hunt_winners_list(p_hunt uuid)
returns table (code text, name text, won_at timestamptz, redeemed_at timestamptz)
language sql stable security definer
set search_path = public as $$
  select w.code, p.display_name, w.won_at, w.redeemed_at
  from public.hunt_winners w join public.hunts h on h.id = w.hunt_id
  left join public.profiles p on p.id = w.user_id
  where w.hunt_id = p_hunt and h.owner_id = auth.uid()
  order by w.won_at
$$;
revoke all on function public.hunt_winners_list(uuid) from public, anon;
grant execute on function public.hunt_winners_list(uuid) to authenticated;

create or replace function public.hunt_redeem(p_hunt uuid, p_code text)
returns table (status text, name text, prize text, redeemed_at timestamptz)
language plpgsql volatile security definer
set search_path = public as $$
declare h public.hunts; w public.hunt_winners;
begin
  select * into h from public.hunts where id = p_hunt and owner_id = auth.uid();
  if not found then raise exception 'Non autorizzato'; end if;
  select * into w from public.hunt_winners where hunt_id = p_hunt and code = upper(trim(p_code));
  if not found then return query select 'not_found', null::text, h.prize, null::timestamptz; return; end if;
  if w.redeemed_at is not null then
    return query select 'already', (select display_name from public.profiles where id = w.user_id), h.prize, w.redeemed_at; return;
  end if;
  update public.hunt_winners set redeemed_at = now() where hunt_id = p_hunt and code = w.code returning * into w;
  return query select 'ok', (select display_name from public.profiles where id = w.user_id), h.prize, w.redeemed_at;
end $$;
revoke all on function public.hunt_redeem(uuid, text) from public, anon;
grant execute on function public.hunt_redeem(uuid, text) to authenticated;

-- ---------- 4) AMMINISTRATORE e BANNER ----------
create table if not exists public.app_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.ads (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 60),
  body       text check (body is null or char_length(body) <= 120),
  link_url   text check (link_url is null or link_url ~* '^https?://'),
  image_url  text check (image_url is null or image_url ~* '^https://'),
  color      text not null default '#1f3a5f' check (color ~* '^#[0-9a-f]{6}$'),
  active     boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ads enable row level security;
drop policy if exists "banner: tutti vedono quelli attivi" on public.ads;
create policy "banner: tutti vedono quelli attivi" on public.ads for select to anon, authenticated
  using (active or public.is_admin());
drop policy if exists "banner: li gestisce l'amministratore" on public.ads;
create policy "banner: li gestisce l'amministratore" on public.ads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lista iscritti (solo amministratore)
create or replace function public.admin_users()
returns table (email text, nome text, iscritto_il timestamptz, ultimo_accesso timestamptz,
               email_confermata boolean, ubi_dating boolean, pin_creati bigint)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query
    select u.email::text, p.display_name, u.created_at, u.last_sign_in_at,
           u.email_confirmed_at is not null, p.dating_consent_version is not null,
           (select count(*) from public.contents c where c.owner_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

-- ---------- 5) Anteprima, mappa e sblocco aggiornati ----------
drop function if exists public.get_teaser(text);
create function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type public.media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text, tags text[], author_id uuid, author_avatar text,
  is_dating boolean, gender text, replies_enabled boolean, i_am_dating boolean, i_replied boolean,
  unlock_at timestamptz, open_anywhere boolean, hunt_id uuid, hunt_step int, hunt_steps int, hunt_title text, hunt_locked boolean)
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents; hide boolean; locked boolean;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;
  end if;
  hide := c.is_dating and c.owner_id is distinct from auth.uid();
  locked := not public.hunt_prev_ok(c, auth.uid());
  return query select
    c.id, c.title, case when locked then null else c.hint end, c.media_type,
    case when locked then null else c.lat end, case when locked then null else c.lng end, c.unlock_radius_m,
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
    exists (select 1 from public.pin_replies r where r.content_id = c.id and r.author_id = auth.uid()),
    c.unlock_at, c.open_anywhere,
    c.hunt_id, c.hunt_step,
    case when c.hunt_id is not null then (select max(x.hunt_step) from public.contents x where x.hunt_id = c.hunt_id) end,
    (select h.title from public.hunts h where h.id = c.hunt_id),
    locked;
end $$;
grant execute on function public.get_teaser(text) to anon, authenticated;

drop function if exists public.map_contents(double precision, double precision, double precision, double precision);
create function public.map_contents(
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
    and public.hunt_prev_ok(c, auth.uid())      -- le tappe successive compaiono solo dopo aver trovato la precedente
  order by c.created_at desc
  limit 500
$$;
revoke all on function public.map_contents(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.map_contents(double precision, double precision, double precision, double precision) to authenticated;

create or replace function public.unlock(
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
  anywhere boolean;
begin
  if uid is null then
    return query select 'login_required', null::int, null::text, null::text, null::text; return;
  end if;

  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return query select 'not_found', null::int, null::text, null::text, null::text; return;
  end if;

  if c.is_dating and c.owner_id <> uid and not public.is_dating_user(uid) then
    return query select 'dating_required', null::int, null::text, null::text, null::text; return;
  end if;

  if c.owner_id = uid or exists (
       select 1 from public.unlocks u where u.content_id = c.id and u.user_id = uid) then
    return query select 'ok', null::int, c.media_path, c.external_url, c.text_body; return;
  end if;

  -- capsula del tempo: non prima della data
  if c.unlock_at is not null and now() < c.unlock_at then
    return query select 'too_early', null::int, null::text, null::text, null::text; return;
  end if;

  -- caccia al tesoro: serve la tappa precedente
  if not public.hunt_prev_ok(c, uid) then
    return query select 'hunt_locked', null::int, null::text, null::text, null::text; return;
  end if;

  select count(*) into failures from public.unlock_attempts a
   where a.content_id = c.id and a.user_id = uid and not a.ok
     and a.at > now() - interval '15 minutes';
  if failures >= 5 then
    return query select 'rate_limited', null::int, null::text, null::text, null::text; return;
  end if;

  anywhere := c.open_anywhere and c.unlock_at is not null and now() >= c.unlock_at;

  if not anywhere then
    if p_lat is null or p_lng is null or p_accuracy_m is null or p_accuracy_m > 100 then
      insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, false, 'gps_inaccurate');
      return query select 'gps_inaccurate', null::int, null::text, null::text, null::text; return;
    end if;
    d := public.distance_m(c.lat, c.lng, p_lat, p_lng);
    if d > c.unlock_radius_m + least(p_accuracy_m, 30) then
      insert into public.unlock_attempts(content_id, user_id, ok, reason) values (c.id, uid, false, 'too_far');
      return query select 'too_far', round(d)::int, null::text, null::text, null::text; return;
    end if;
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
  perform public.hunt_check_win(c, uid);
  return query select 'ok', round(d)::int, c.media_path, c.external_url, c.text_body;
end $$;
revoke all on function public.unlock(text, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.unlock(text, double precision, double precision, double precision, text) to authenticated;

notify pgrst, 'reload schema';
