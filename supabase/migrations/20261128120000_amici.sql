-- v.143: Amici con link di invito. Amicizia reciproca: chi apre il link di invito di una persona e si iscrive
-- diventa suo amico (l'invito condiviso è il consenso di chi invita). Nessuna tabella è leggibile direttamente:
-- tutto passa da funzioni che restituiscono solo il nome (mai email, telefono o posizione).

create table if not exists public.friendships (
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_b_idx on public.friendships(user_b);
alter table public.friendships enable row level security;    -- nessuna policy

alter table public.profiles add column if not exists friend_code text;
create unique index if not exists profiles_friend_code_idx on public.profiles(friend_code) where friend_code is not null;

-- Il mio codice di invito (lo crea al primo uso)
create or replace function public.friend_my_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Accedi per continuare'; end if;
  select friend_code into c from public.profiles where id = auth.uid();
  if c is null then
    c := encode(extensions.gen_random_bytes(6), 'hex');
    update public.profiles set friend_code = c where id = auth.uid() and friend_code is null;
    select friend_code into c from public.profiles where id = auth.uid();
  end if;
  return c;
end $$;

-- Chi mi ha invitato: solo il nome, visibile anche prima di iscriversi
create or replace function public.friend_invite_info(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(p.display_name), ''), 'Un amico')
  from public.profiles p where p_code ~ '^[a-f0-9]{12}$' and p.friend_code = p_code
$$;

-- Accetto l'invito: nasce l'amicizia (una sola volta, mai con me stesso)
create or replace function public.friend_accept(p_code text) returns table (status text, name text)
language plpgsql security definer set search_path = public as $$
declare inviter uuid; nm text; me uuid := auth.uid();
begin
  if me is null then raise exception 'Accedi per continuare'; end if;
  if p_code is null or p_code !~ '^[a-f0-9]{12}$' then return query select 'not_found'::text, null::text; return; end if;
  select p.id, coalesce(nullif(trim(p.display_name), ''), 'Un amico') into inviter, nm from public.profiles p where p.friend_code = p_code;
  if inviter is null then return query select 'not_found'::text, null::text; return; end if;
  if inviter = me then return query select 'self'::text, nm; return; end if;
  if (select count(*) from public.friendships f where f.user_a = me or f.user_b = me) >= 500 then
    return query select 'full'::text, nm; return;
  end if;
  if exists (select 1 from public.friendships f where f.user_a = least(me, inviter) and f.user_b = greatest(me, inviter)) then
    return query select 'already'::text, nm; return;
  end if;
  insert into public.friendships (user_a, user_b) values (least(me, inviter), greatest(me, inviter));
  return query select 'ok'::text, nm;
end $$;

-- I miei amici: solo nome e data
create or replace function public.friend_list() returns table (user_id uuid, name text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select case when f.user_a = auth.uid() then f.user_b else f.user_a end,
         coalesce(nullif(trim(p.display_name), ''), 'Utente'), f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end
  where auth.uid() is not null and (f.user_a = auth.uid() or f.user_b = auth.uid())
  order by f.created_at desc
$$;

-- Tolgo un amico (vale per entrambi)
create or replace function public.friend_remove(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Accedi per continuare'; end if;
  delete from public.friendships where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user);
end $$;

revoke all on function public.friend_my_code() from public, anon;
revoke all on function public.friend_accept(text) from public, anon;
revoke all on function public.friend_list() from public, anon;
revoke all on function public.friend_remove(uuid) from public, anon;
revoke all on function public.friend_invite_info(text) from public;
grant execute on function public.friend_my_code() to authenticated;
grant execute on function public.friend_accept(text) to authenticated;
grant execute on function public.friend_list() to authenticated;
grant execute on function public.friend_remove(uuid) to authenticated;
grant execute on function public.friend_invite_info(text) to anon, authenticated;
