-- Limiti del piano gratuito e piano Pro (18/11/2026).
-- Gratis: 500 pin, 100 file (foto/video/audio), di cui 10 video. Pro e amministratori: senza limiti.
-- Il controllo è nel database: anche chi aggira l'app non può superarli.

-- 1) Piano dell'utente (solo l'amministratore può cambiarlo)
alter table public.profiles add column if not exists plan text not null default 'free';
do $$ begin
  alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'pro'));
exception when duplicate_object then null; end $$;

create or replace function public.protect_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then   -- un utente non può darsi il piano Pro da solo
    new.plan := case when tg_op = 'INSERT' then 'free' else old.plan end;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_plan on public.profiles;
create trigger trg_protect_plan before insert or update on public.profiles
  for each row execute function public.protect_plan();

-- 2) Limiti (in un solo posto, per cambiarli facilmente)
create or replace function public.quota_limits(out max_pins int, out max_files int, out max_videos int)
language sql immutable as $$ select 500, 100, 10 $$;

create or replace function public.is_unlimited(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = p_user)
      or coalesce((select plan = 'pro' from public.profiles where id = p_user), false)
$$;

-- 3) Quanto ho usato (per gli avvisi nell'app)
create or replace function public.my_quota()
returns table (pins int, files int, videos int, max_pins int, max_files int, max_videos int, unlimited boolean)
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.contents where owner_id = auth.uid())::int,
         (select count(*) from public.contents where owner_id = auth.uid() and media_path is not null)::int,
         (select count(*) from public.contents where owner_id = auth.uid() and media_type = 'video')::int,
         l.max_pins, l.max_files, l.max_videos,
         public.is_unlimited(auth.uid())
  from public.quota_limits() l
$$;
revoke all on function public.my_quota() from public, anon;
grant execute on function public.my_quota() to authenticated;

-- 4) Il blocco vero e proprio
create or replace function public.enforce_quota() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record; n int;
begin
  if public.is_unlimited(new.owner_id) then return new; end if;
  select * into l from public.quota_limits();
  if tg_op = 'INSERT' then
    select count(*) into n from public.contents where owner_id = new.owner_id;
    if n >= l.max_pins then raise exception 'UBI_LIMITE_PIN'; end if;
  end if;
  if new.media_path is not null and (tg_op = 'INSERT' or old.media_path is null) then
    select count(*) into n from public.contents where owner_id = new.owner_id and media_path is not null;
    if n >= l.max_files then raise exception 'UBI_LIMITE_FILE'; end if;
  end if;
  if new.media_type = 'video' and (tg_op = 'INSERT' or old.media_type is distinct from 'video') then
    select count(*) into n from public.contents where owner_id = new.owner_id and media_type = 'video';
    if n >= l.max_videos then raise exception 'UBI_LIMITE_VIDEO'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_quota on public.contents;
create trigger trg_quota before insert or update of media_path, media_type on public.contents
  for each row execute function public.enforce_quota();

-- 5) A chi scrivere per passare a Pro (l'id del primo amministratore, per la chat interna)
create or replace function public.ubi_admin_id() returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.app_admins limit 1
$$;
grant execute on function public.ubi_admin_id() to authenticated;

-- 6) Pannello iscritti: piano e interruttore Pro
drop function if exists public.admin_users();
create function public.admin_users()
returns table (id uuid, email text, nome text, iscritto_il timestamptz, ultimo_accesso timestamptz,
               email_confermata boolean, ubi_dating boolean, pin_creati bigint, file_caricati bigint, piano text)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query
    select u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at,
           u.email_confirmed_at is not null, p.dating_consent_version is not null,
           (select count(*) from public.contents c where c.owner_id = u.id),
           (select count(*) from public.contents c where c.owner_id = u.id and c.media_path is not null),
           coalesce(p.plan, 'free')
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

create or replace function public.admin_set_plan(p_user uuid, p_plan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  if p_plan not in ('free', 'pro') then raise exception 'Piano non valido'; end if;
  update public.profiles set plan = p_plan where id = p_user;
end $$;
revoke all on function public.admin_set_plan(uuid, text) from public, anon;
grant execute on function public.admin_set_plan(uuid, text) to authenticated;

-- 7) File più leggeri: dopo la riduzione automatica nell'app bastano 25 MB
update storage.buckets set file_size_limit = 26214400 where id = 'media';
