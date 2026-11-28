-- v.145: Segui. Si seguono i profili che si possono vedere; si vede solo il numero di follower, mai chi sono.
create table if not exists public.follows (
  follower uuid not null references auth.users(id) on delete cascade,
  followee uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee), check (follower <> followee));
create index if not exists follows_followee_idx on public.follows(followee);
alter table public.follows enable row level security;

create or replace function public.follow_info(p_user uuid) returns table (followers int, following boolean)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from public.follows where followee = p_user),
         exists (select 1 from public.follows where follower = auth.uid() and followee = p_user) $$;
revoke all on function public.follow_info(uuid) from public;
grant execute on function public.follow_info(uuid) to authenticated;

create or replace function public.follow_set(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accedi'; end if;
  if p_user = me then raise exception 'Non puoi seguire te stesso'; end if;
  if p_on then
    if (select count(*) from public.follows where follower = me) >= 1000 then raise exception 'Troppi profili seguiti'; end if;
    if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Profilo non trovato'; end if;
    insert into public.follows(follower, followee) values (me, p_user) on conflict do nothing;
  else
    delete from public.follows where follower = me and followee = p_user;
  end if;
end $$;
revoke all on function public.follow_set(uuid, boolean) from public, anon;
grant execute on function public.follow_set(uuid, boolean) to authenticated;

create or replace function public.follow_list() returns table (user_id uuid, name text, followers int)
language sql stable security definer set search_path = public as $$
  select f.followee, coalesce(nullif(trim(p.display_name),''),'Utente'),
         (select count(*)::int from public.follows x where x.followee = f.followee)
  from public.follows f left join public.profiles p on p.id = f.followee
  where f.follower = auth.uid() order by f.created_at desc limit 200 $$;
revoke all on function public.follow_list() from public, anon;
grant execute on function public.follow_list() to authenticated;
