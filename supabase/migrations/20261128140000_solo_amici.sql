-- v.144: pin "Solo amici" + richiesta di amicizia da un pin
alter table public.contents add column if not exists friends_only boolean not null default false;

create or replace function public.can_access(c public.contents)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(
    c.owner_id = auth.uid()
    or (c.group_id is not null and public.ug_pin_ok(c.group_id, c.group_only))
    or (c.group_id is null and (
         c.visibility = 'public'
         or (c.friends_only and auth.uid() is not null and exists (
              select 1 from public.friendships f
              where f.user_a = least(c.owner_id, auth.uid()) and f.user_b = greatest(c.owner_id, auth.uid())))
         or (c.visibility = 'restricted' and auth.uid() is not null and exists (
              select 1 from public.content_recipients r
              where r.content_id = c.id
                and ( (r.email is not null and r.email = lower(auth.jwt() ->> 'email'))
                   or (r.phone is not null and r.phone = '+' || ltrim(auth.jwt() ->> 'phone', '+')) )))
       )),
    false)
$$;
revoke all on function public.can_access(public.contents) from public, anon, authenticated;

-- Chiedi l'amicizia all'autore di un pin che hai sbloccato: diventate amici subito solo se l'autore ha già te tra gli amici; altrimenti resta una richiesta
create table if not exists public.friend_requests (
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user), check (from_user <> to_user));
alter table public.friend_requests enable row level security;

create or replace function public.friend_request_from_pin(p_slug text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.contents;
begin
  if me is null then raise exception 'Accedi'; end if;
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then return 'none'; end if;
  if c.owner_id = me or c.is_dating then return 'none'; end if;
  if exists (select 1 from public.friendships f where f.user_a = least(me,c.owner_id) and f.user_b = greatest(me,c.owner_id)) then return 'already'; end if;
  if exists (select 1 from public.friend_requests r where r.from_user = c.owner_id and r.to_user = me) then
    insert into public.friendships(user_a,user_b) values (least(me,c.owner_id), greatest(me,c.owner_id)) on conflict do nothing;
    delete from public.friend_requests where (from_user,to_user) in ((c.owner_id,me),(me,c.owner_id));
    return 'friends';
  end if;
  insert into public.friend_requests(from_user,to_user) values (me,c.owner_id) on conflict do nothing;
  return 'sent';
end $$;
revoke all on function public.friend_request_from_pin(text) from public, anon;
grant execute on function public.friend_request_from_pin(text) to authenticated;

-- Richieste ricevute (solo nome)
create or replace function public.friend_requests_in() returns table (user_id uuid, name text)
language sql stable security definer set search_path = public as $$
  select r.from_user, coalesce(nullif(trim(p.display_name),''),'Utente')
  from public.friend_requests r left join public.profiles p on p.id = r.from_user
  where r.to_user = auth.uid() order by r.created_at desc limit 50 $$;
revoke all on function public.friend_requests_in() from public, anon;
grant execute on function public.friend_requests_in() to authenticated;

create or replace function public.friend_request_answer(p_user uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accedi'; end if;
  if p_ok and exists (select 1 from public.friend_requests where from_user = p_user and to_user = me) then
    insert into public.friendships(user_a,user_b) values (least(me,p_user), greatest(me,p_user)) on conflict do nothing;
  end if;
  delete from public.friend_requests where from_user = p_user and to_user = me;
end $$;
revoke all on function public.friend_request_answer(uuid,boolean) from public, anon;
grant execute on function public.friend_request_answer(uuid,boolean) to authenticated;
