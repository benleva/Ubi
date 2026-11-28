-- v.152: link facoltativo nelle segnalazioni (per i pin il link usa la colonna external_url già esistente)
alter table public.reports add column if not exists link_url text;
alter table public.reports drop constraint if exists reports_link_https;
alter table public.reports add constraint reports_link_https check (link_url is null or link_url ~* '^https://');

drop function if exists public.report_create(text, text, uuid, text);
create or replace function public.report_create(p_kind text, p_slug text, p_user uuid, p_reason text, p_link text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); tu uuid := p_user; lk text := nullif(trim(coalesce(p_link,'')), '');
begin
  if me is null then raise exception 'Accedi'; end if;
  if p_kind not in ('pin','user') then raise exception 'Tipo non valido'; end if;
  if lk is not null and lk !~* '^https://' then raise exception 'Il link deve iniziare con https://'; end if;
  if p_kind = 'pin' then
    select owner_id into tu from public.contents where share_slug = p_slug;
    if tu is null then raise exception 'Pin non trovato'; end if;
  elsif tu is null or not exists (select 1 from public.profiles where id = tu) then raise exception 'Profilo non trovato'; end if;
  if (select count(*) from public.reports where reporter = me and created_at > now() - interval '1 day') >= 20 then raise exception 'Troppe segnalazioni oggi'; end if;
  insert into public.reports(reporter, kind, target_slug, target_user, reason, link_url)
  values (me, p_kind, case when p_kind='pin' then p_slug end, tu, left(trim(p_reason), 500), left(lk, 500));
end $$;

drop function if exists public.admin_reports(text);
create or replace function public.admin_reports(p_status text default 'open')
returns table(id uuid, kind text, target_slug text, target_user uuid, target_name text, reason text, created_at timestamptz, reporter_name text, n_target bigint, link_url text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query select r.id, r.kind, r.target_slug, r.target_user,
    coalesce(nullif(trim(t.display_name),''),'Utente'), r.reason, r.created_at,
    coalesce(nullif(trim(p.display_name),''),'Utente'),
    (select count(*) from public.reports x where x.target_user = r.target_user and x.status = 'open'),
    r.link_url
  from public.reports r left join public.profiles t on t.id = r.target_user left join public.profiles p on p.id = r.reporter
  where r.status = p_status order by r.created_at desc limit 200;
end $$;
