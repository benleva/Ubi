-- =====================================================================
-- UBI — Aggiornamento 4: profilo autore con contatti facoltativi + messaggi
-- Si può eseguire più volte senza danni. Richiede gli aggiornamenti 1, 2 e 3.
-- =====================================================================

-- 1) Profilo: presentazione e contatti PUBBLICI scelti dall'utente (tutti facoltativi)
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists contact_website text;
alter table public.profiles add column if not exists contact_instagram text;
alter table public.profiles add column if not exists contact_whatsapp text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists avatar_path text;   -- foto profilo nel bucket pubblico "avatars"

-- Foto profilo: bucket pubblico (sono foto pensate per essere viste), max 2 MB, solo immagini.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "avatar: carico nella mia cartella" on storage.objects;
create policy "avatar: carico nella mia cartella" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar: cancello i miei" on storage.objects;
create policy "avatar: cancello i miei" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar: leggo i miei" on storage.objects;
create policy "avatar: leggo i miei" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
alter table public.profiles drop constraint if exists profile_fields_ok;
alter table public.profiles add constraint profile_fields_ok check (
  (bio is null or char_length(bio) <= 300) and
  (contact_website is null or contact_website ~* '^https://[^\s<>"]+$') and
  (contact_instagram is null or contact_instagram ~ '^[A-Za-z0-9._]{1,30}$') and
  (contact_whatsapp is null or contact_whatsapp ~ '^\+[0-9]{8,15}$') and
  (contact_email is null or contact_email ~* '^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$')
);

-- 2) Messaggi privati tra utenti
create table if not exists public.messages (
  id           bigint generated always as identity primary key,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content_id   uuid references public.contents(id) on delete set null,   -- il pin da cui è partito il contatto
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  constraint not_to_self check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists messages_inbox_idx on public.messages(recipient_id, read_at);

-- Posso contattare un utente se: ha almeno un pin che io posso vedere, oppure mi ha già scritto.
create or replace function public.can_contact(p_user uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select auth.uid() is not null and p_user is not null and p_user <> auth.uid() and (
    exists (select 1 from public.contents c where c.owner_id = p_user and public.can_access(c))
    or exists (select 1 from public.messages m where m.sender_id = p_user and m.recipient_id = auth.uid()))
$$;
revoke all on function public.can_contact(uuid) from public, anon;
grant execute on function public.can_contact(uuid) to authenticated;

-- Il mittente è sempre chi è collegato; max 30 messaggi all'ora per utente (anti-spam).
create or replace function public.messages_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  new.sender_id := auth.uid();
  new.created_at := now();
  new.read_at := null;
  if new.sender_id is null then raise exception 'Accesso richiesto'; end if;
  if (select count(*) from public.messages
       where sender_id = new.sender_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Troppi messaggi inviati: riprova tra un po''.';
  end if;
  return new;
end $$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages
  for each row execute function public.messages_guard();

alter table public.messages enable row level security;
drop policy if exists "messaggi: leggo i miei" on public.messages;
create policy "messaggi: leggo i miei" on public.messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "messaggi: scrivo a chi posso contattare" on public.messages;
create policy "messaggi: scrivo a chi posso contattare" on public.messages
  for insert to authenticated with check (public.can_contact(recipient_id));
-- niente modifiche o cancellazioni dirette: la lettura si segna con mark_read()
revoke update, delete on public.messages from authenticated, anon;

create or replace function public.mark_read(p_other uuid)
returns void language sql volatile security definer
set search_path = public as $$
  update public.messages set read_at = now()
   where recipient_id = auth.uid() and sender_id = p_other and read_at is null
$$;
revoke all on function public.mark_read(uuid) from public, anon;
grant execute on function public.mark_read(uuid) to authenticated;

-- Elenco conversazioni con nome, ultimo messaggio e non letti
create or replace function public.my_conversations()
returns table (other_id uuid, other_name text, last_body text, last_at timestamptz, last_from_me boolean, unread int)
language sql stable security definer
set search_path = public as $$
  with m as (
    select case when sender_id = auth.uid() then recipient_id else sender_id end as other, *
    from public.messages where sender_id = auth.uid() or recipient_id = auth.uid())
  select m.other,
         (select p.display_name from public.profiles p where p.id = m.other),
         (array_agg(m.body order by m.created_at desc))[1],
         max(m.created_at),
         (array_agg(m.sender_id = auth.uid() order by m.created_at desc))[1],
         (count(*) filter (where m.recipient_id = auth.uid() and m.read_at is null))::int
  from m group by m.other order by max(m.created_at) desc
$$;
revoke all on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

create or replace function public.unread_count()
returns int language sql stable security definer
set search_path = public as $$
  select count(*)::int from public.messages where recipient_id = auth.uid() and read_at is null
$$;
revoke all on function public.unread_count() from public, anon;
grant execute on function public.unread_count() to authenticated;

-- 3) Profilo pubblico dell'autore: visibile solo se posso contattarlo (o se sono io)
drop function if exists public.get_author(uuid);
create function public.get_author(p_user uuid)
returns table (id uuid, display_name text, bio text, website text, instagram text, whatsapp text, email text, can_message boolean, is_me boolean, avatar_path text)
language sql stable security definer
set search_path = public as $$
  select p.id, p.display_name, p.bio, p.contact_website, p.contact_instagram, p.contact_whatsapp, p.contact_email,
         public.can_contact(p.id), p.id = auth.uid(), p.avatar_path
  from public.profiles p
  where p.id = p_user and auth.uid() is not null and (p.id = auth.uid() or public.can_contact(p.id))
$$;
revoke all on function public.get_author(uuid) from public, anon;
grant execute on function public.get_author(uuid) to authenticated;

-- Pin dell'autore che io posso vedere (mai quelli nascosti o riservati ad altri)
create or replace function public.author_pins(p_user uuid)
returns table (share_slug text, title text, media_type public.media_kind, tags text[], created_at timestamptz)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.tags, c.created_at
  from public.contents c
  where auth.uid() is not null and c.owner_id = p_user and public.can_access(c)
  order by c.created_at desc limit 100
$$;
revoke all on function public.author_pins(uuid) from public, anon;
grant execute on function public.author_pins(uuid) to authenticated;

-- 4) L'anteprima ora restituisce anche l'id dell'autore (per aprirne il profilo)
drop function if exists public.get_teaser(text);
create function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type public.media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text, tags text[], author_id uuid, author_avatar text)
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;
  end if;
  return query select
    c.id, c.title, c.hint, c.media_type, c.lat, c.lng, c.unlock_radius_m,
    c.password_hash is not null,
    exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
    c.owner_id = auth.uid(),
    (select p.display_name from public.profiles p where p.id = c.owner_id),
    c.tags, c.owner_id,
    (select p.avatar_path from public.profiles p where p.id = c.owner_id);
end $$;
grant execute on function public.get_teaser(text) to anon, authenticated;

notify pgrst, 'reload schema';
