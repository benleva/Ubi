create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pin','user')),
  target_slug text, target_user uuid references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now());
create index if not exists reports_status_idx on public.reports(status, created_at desc);
alter table public.reports enable row level security;

create or replace function public.report_create(p_kind text, p_slug text, p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tu uuid := p_user;
begin
  if me is null then raise exception 'Accedi'; end if;
  if p_kind not in ('pin','user') then raise exception 'Tipo non valido'; end if;
  if p_kind = 'pin' then
    select owner_id into tu from public.contents where share_slug = p_slug;
    if tu is null then raise exception 'Pin non trovato'; end if;
  elsif tu is null or not exists (select 1 from public.profiles where id = tu) then raise exception 'Profilo non trovato'; end if;
  if (select count(*) from public.reports where reporter = me and created_at > now() - interval '1 day') >= 20 then raise exception 'Troppe segnalazioni oggi'; end if;
  insert into public.reports(reporter, kind, target_slug, target_user, reason)
  values (me, p_kind, case when p_kind='pin' then p_slug end, tu, left(trim(p_reason), 500));
end $$;
revoke all on function public.report_create(text,text,uuid,text) from public, anon;
grant execute on function public.report_create(text,text,uuid,text) to authenticated;

create or replace function public.admin_reports(p_status text default 'open')
returns table (id uuid, kind text, target_slug text, target_user uuid, target_name text, reason text, created_at timestamptz, reporter_name text, n_target bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query select r.id, r.kind, r.target_slug, r.target_user,
    coalesce(nullif(trim(t.display_name),''),'Utente'), r.reason, r.created_at,
    coalesce(nullif(trim(p.display_name),''),'Utente'),
    (select count(*) from public.reports x where x.target_user = r.target_user and x.status = 'open')
  from public.reports r left join public.profiles t on t.id = r.target_user left join public.profiles p on p.id = r.reporter
  where r.status = p_status order by r.created_at desc limit 200;
end $$;
revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;

create or replace function public.admin_report_done(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  update public.reports set status = 'done' where id = p_id;
end $$;
revoke all on function public.admin_report_done(uuid) from public, anon;
grant execute on function public.admin_report_done(uuid) to authenticated;

-- Novità da chi seguo: pin pubblici recenti (solo quelli che posso già vedere)
create or replace function public.follow_feed() returns table (share_slug text, title text, media_type text, created_at timestamptz, owner_id uuid, owner_name text, lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.created_at, c.owner_id,
         coalesce(nullif(trim(p.display_name),''),'Utente'), c.lat, c.lng
  from public.follows f
  join public.contents c on c.owner_id = f.followee
  left join public.profiles p on p.id = c.owner_id
  where f.follower = auth.uid() and public.can_access(c)
    and not c.is_dating and c.group_id is null and c.exhibition_id is null and c.hunt_id is null
    and (c.expires_at is null or c.expires_at > now())
    and c.created_at > now() - interval '30 days'
  order by c.created_at desc limit 40 $$;
revoke all on function public.follow_feed() from public, anon;
grant execute on function public.follow_feed() to authenticated;
