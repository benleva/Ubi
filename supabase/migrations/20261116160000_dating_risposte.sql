-- =====================================================================
-- UBI — Aggiornamento 7: sezione DATING (solo maggiorenni) + RISPOSTE ai pin
-- Si può eseguire più volte senza danni. Richiede gli aggiornamenti 1-6.
--
-- Dating:   chi si iscrive (18+, consensi) può creare "biglietti" dating, pubblici sulla mappa
--           con pallino rosa (lei) o azzurro (lui). Solo gli iscritti possono sbloccarli e rispondere.
--           Autore e chi risponde restano ANONIMI finché entrambi non scelgono "Voglio conoscerti".
-- Risposte: chi ha sbloccato un pin può lasciare al creatore un testo, una foto, un video o un audio.
--           Il creatore riceve un'email (funzione notify-reply).
-- =====================================================================

-- 1) Profilo: iscrizione alla sezione dating
alter table public.profiles add column if not exists dating_gender text;
alter table public.profiles add column if not exists dating_birth_date date;
alter table public.profiles add column if not exists dating_consent_version text;
alter table public.profiles add column if not exists dating_consent_at timestamptz;
alter table public.profiles drop constraint if exists dating_gender_ok;
alter table public.profiles add constraint dating_gender_ok check (dating_gender is null or dating_gender in ('f', 'm'));

-- Controllo sul server: niente iscrizione dating senza data di nascita e almeno 18 anni.
create or replace function public.profiles_dating_guard()
returns trigger language plpgsql as $$
begin
  if new.dating_consent_version is not null then
    if new.dating_birth_date is null or new.dating_gender is null then
      raise exception 'Per la sezione dating servono data di nascita e genere.';
    end if;
    if new.dating_birth_date > (current_date - interval '18 years')::date then
      raise exception 'La sezione dating è riservata ai maggiorenni (18+).';
    end if;
    if new.dating_birth_date < date '1900-01-01' then
      raise exception 'Data di nascita non valida.';
    end if;
    if tg_op = 'INSERT' or old.dating_consent_version is distinct from new.dating_consent_version then
      new.dating_consent_at := now();
    end if;
  else
    new.dating_consent_at := null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_dating_guard on public.profiles;
create trigger profiles_dating_guard before insert or update on public.profiles
  for each row execute function public.profiles_dating_guard();

-- L'utente è iscritto alla sezione dating (e maggiorenne oggi)?
create or replace function public.is_dating_user(p_user uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((
    select p.dating_consent_version is not null
       and p.dating_birth_date <= (current_date - interval '18 years')::date
    from public.profiles p where p.id = p_user), false)
$$;
revoke all on function public.is_dating_user(uuid) from public, anon;
grant execute on function public.is_dating_user(uuid) to authenticated;

-- 2) Contenuti: pin dating e risposte attive
alter table public.contents add column if not exists is_dating boolean not null default false;
alter table public.contents add column if not exists replies_enabled boolean not null default true;
alter table public.contents drop constraint if exists dating_is_public;
alter table public.contents add constraint dating_is_public check (not is_dating or visibility = 'public');

create or replace function public.contents_dating_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.is_dating and not public.is_dating_user(new.owner_id) then
    raise exception 'Per creare un biglietto dating iscriviti prima alla sezione dating.';
  end if;
  if new.is_dating then new.replies_enabled := true; end if;   -- nel dating si risponde sempre
  return new;
end $$;
drop trigger if exists contents_dating_guard on public.contents;
create trigger contents_dating_guard before insert or update on public.contents
  for each row execute function public.contents_dating_guard();

-- 3) Risposte ai pin
create table if not exists public.pin_replies (
  id               uuid primary key default gen_random_uuid(),
  content_id       uuid not null references public.contents(id) on delete cascade,
  author_id        uuid not null references auth.users(id) on delete cascade,
  media_type       text not null check (media_type in ('text', 'photo', 'video', 'audio')),
  media_path       text,
  text_body        text check (text_body is null or char_length(text_body) <= 1000),
  duration_seconds int,
  created_at       timestamptz not null default now(),
  owner_wants      boolean not null default false,   -- il creatore del pin vuole conoscere chi ha risposto
  author_wants     boolean not null default false,   -- chi ha risposto vuole conoscere il creatore
  notified_at      timestamptz,                      -- email al creatore già inviata
  constraint reply_body_ok check (
    (media_type = 'text' and text_body is not null and char_length(text_body) > 0 and media_path is null) or
    (media_type <> 'text' and media_path is not null)),
  constraint reply_video_60s check (media_type <> 'video' or (duration_seconds is not null and duration_seconds <= 60)),
  unique (content_id, author_id)                     -- una risposta a persona per pin (poi si continua in chat)
);
create index if not exists pin_replies_content_idx on public.pin_replies(content_id, created_at desc);
create index if not exists pin_replies_author_idx on public.pin_replies(author_id, created_at desc);

alter table public.pin_replies enable row level security;
-- Nessun accesso diretto: si passa dalle funzioni qui sotto (così l'anonimato non può essere aggirato).
revoke all on public.pin_replies from anon, authenticated;

-- Due persone si sono "scelte" (o il pin non è dating): da quel momento possono vedersi e scriversi.
create or replace function public.reply_revealed(r public.pin_replies)
returns boolean language sql stable security definer
set search_path = public as $$
  select (r.owner_wants and r.author_wants)
      or not coalesce((select c.is_dating from public.contents c where c.id = r.content_id), false)
$$;

-- Lascia una risposta (solo chi ha sbloccato il pin; nel dating solo iscritti)
create or replace function public.add_reply(
  p_id uuid, p_slug text, p_media_type text, p_media_path text, p_text text, p_duration int)
returns uuid language plpgsql volatile security definer
set search_path = public as $$
declare c public.contents; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Accesso richiesto'; end if;
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then raise exception 'Contenuto non disponibile'; end if;
  if c.owner_id = uid then raise exception 'Non puoi rispondere al tuo stesso pin.'; end if;
  if not c.replies_enabled then raise exception 'Il creatore ha disattivato le risposte a questo pin.'; end if;
  if c.is_dating and not public.is_dating_user(uid) then raise exception 'Iscriviti alla sezione dating per rispondere.'; end if;
  if not exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = uid) then
    raise exception 'Puoi rispondere solo dopo aver sbloccato il pin sul posto.';
  end if;
  if p_media_path is not null and split_part(p_media_path, '/', 1) <> uid::text then
    raise exception 'File non valido';
  end if;
  if (select count(*) from public.pin_replies where author_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Troppe risposte inviate: riprova tra un po''.';
  end if;
  insert into public.pin_replies(id, content_id, author_id, media_type, media_path, text_body, duration_seconds)
  values (coalesce(p_id, gen_random_uuid()), c.id, uid, p_media_type, p_media_path, nullif(trim(p_text), ''), p_duration);
  return coalesce(p_id, (select id from public.pin_replies where content_id = c.id and author_id = uid));
end $$;
revoke all on function public.add_reply(uuid, text, text, text, text, int) from public, anon;
grant execute on function public.add_reply(uuid, text, text, text, text, int) to authenticated;

-- Risposte ricevute su un mio pin (autore nascosto finché non vi siete scelti, nei pin dating)
create or replace function public.pin_replies_for(p_slug text)
returns table (id uuid, media_type text, media_path text, text_body text, created_at timestamptz,
               owner_wants boolean, author_wants boolean, revealed boolean,
               author_id uuid, author_name text, author_avatar text, author_gender text)
language sql stable security definer
set search_path = public as $$
  select r.id, r.media_type, r.media_path, r.text_body, r.created_at,
         r.owner_wants, r.author_wants, public.reply_revealed(r),
         case when public.reply_revealed(r) then r.author_id end,
         case when public.reply_revealed(r) then p.display_name end,
         case when public.reply_revealed(r) then p.avatar_path end,
         case when c.is_dating then p.dating_gender end
  from public.pin_replies r
  join public.contents c on c.id = r.content_id
  left join public.profiles p on p.id = r.author_id
  where c.share_slug = p_slug and c.owner_id = auth.uid()
  order by r.created_at desc
$$;
revoke all on function public.pin_replies_for(text) from public, anon;
grant execute on function public.pin_replies_for(text) to authenticated;

-- Le risposte che ho lasciato io (il creatore resta nascosto finché non vi siete scelti, nei pin dating)
create or replace function public.my_replies()
returns table (id uuid, share_slug text, title text, is_dating boolean, media_type text, text_body text,
               created_at timestamptz, owner_wants boolean, author_wants boolean, revealed boolean,
               owner_id uuid, owner_name text)
language sql stable security definer
set search_path = public as $$
  select r.id, c.share_slug, c.title, c.is_dating, r.media_type, r.text_body, r.created_at,
         r.owner_wants, r.author_wants, public.reply_revealed(r),
         case when public.reply_revealed(r) then c.owner_id end,
         case when public.reply_revealed(r) then p.display_name end
  from public.pin_replies r
  join public.contents c on c.id = r.content_id
  left join public.profiles p on p.id = c.owner_id
  where r.author_id = auth.uid()
  order by r.created_at desc
$$;
revoke all on function public.my_replies() from public, anon;
grant execute on function public.my_replies() to authenticated;

-- "Voglio conoscerti": lo può premere il creatore del pin o chi ha risposto. Restituisce true se ora vi siete scelti.
create or replace function public.reply_want(p_id uuid)
returns boolean language plpgsql volatile security definer
set search_path = public as $$
declare r public.pin_replies; uid uuid := auth.uid();
begin
  select * into r from public.pin_replies where id = p_id;
  if not found then raise exception 'Risposta non trovata'; end if;
  if r.author_id = uid then
    update public.pin_replies set author_wants = true where id = p_id returning * into r;
  elsif exists (select 1 from public.contents c where c.id = r.content_id and c.owner_id = uid) then
    update public.pin_replies set owner_wants = true where id = p_id returning * into r;
  else
    raise exception 'Non autorizzato';
  end if;
  return public.reply_revealed(r);
end $$;
revoke all on function public.reply_want(uuid) from public, anon;
grant execute on function public.reply_want(uuid) to authenticated;

-- Elimina una risposta (chi l'ha scritta o il creatore del pin). Restituisce il file da cancellare.
create or replace function public.reply_remove(p_id uuid)
returns text language plpgsql volatile security definer
set search_path = public as $$
declare r public.pin_replies; uid uuid := auth.uid();
begin
  select * into r from public.pin_replies where id = p_id;
  if not found then return null; end if;
  if r.author_id <> uid and not exists (select 1 from public.contents c where c.id = r.content_id and c.owner_id = uid) then
    raise exception 'Non autorizzato';
  end if;
  delete from public.pin_replies where id = p_id;
  return case when r.author_id = uid then r.media_path end;   -- solo l'autore può cancellare il proprio file
end $$;
revoke all on function public.reply_remove(uuid) from public, anon;
grant execute on function public.reply_remove(uuid) to authenticated;

-- File delle risposte: il creatore del pin può leggerli (l'autore li legge già: sono nella sua cartella)
create or replace function public.can_read_reply_media(p_name text)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.pin_replies r join public.contents c on c.id = r.content_id
                 where r.media_path = p_name and c.owner_id = auth.uid())
$$;
revoke all on function public.can_read_reply_media(text) from public, anon;
grant execute on function public.can_read_reply_media(text) to authenticated;
drop policy if exists "media: il creatore del pin legge le risposte" on storage.objects;
create policy "media: il creatore del pin legge le risposte" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_read_reply_media(name));

-- 4) Contatti e profili: i pin dating NON rendono contattabile l'autore; una risposta sì (dopo il doppio sì nel dating)
create or replace function public.can_contact(p_user uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select auth.uid() is not null and p_user is not null and p_user <> auth.uid() and (
    exists (select 1 from public.contents c where c.owner_id = p_user and not c.is_dating and public.can_access(c))
    or exists (select 1 from public.messages m where m.sender_id = p_user and m.recipient_id = auth.uid())
    or exists (select 1 from public.pin_replies r join public.contents c on c.id = r.content_id
               where ((r.author_id = p_user and c.owner_id = auth.uid()) or (r.author_id = auth.uid() and c.owner_id = p_user))
                 and public.reply_revealed(r)))
$$;

create or replace function public.author_pins(p_user uuid)
returns table (share_slug text, title text, media_type public.media_kind, tags text[], created_at timestamptz)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.tags, c.created_at
  from public.contents c
  where auth.uid() is not null and c.owner_id = p_user and public.can_access(c)
    and (not c.is_dating or c.owner_id = auth.uid())
  order by c.created_at desc limit 100
$$;

-- 5) Anteprima: dati dating, autore nascosto nei pin dating
drop function if exists public.get_teaser(text);
create function public.get_teaser(p_slug text)
returns table (
  id uuid, title text, hint text, media_type public.media_kind,
  lat double precision, lng double precision, unlock_radius_m int,
  requires_password boolean, already_unlocked boolean, is_owner boolean,
  author text, tags text[], author_id uuid, author_avatar text,
  is_dating boolean, gender text, replies_enabled boolean, i_am_dating boolean, i_replied boolean)
language plpgsql stable security definer
set search_path = public as $$
declare c public.contents; hide boolean;
begin
  select * into c from public.contents where share_slug = p_slug;
  if not found or not public.can_access(c) then
    return;
  end if;
  hide := c.is_dating and c.owner_id is distinct from auth.uid();
  return query select
    c.id, c.title, c.hint, c.media_type, c.lat, c.lng, c.unlock_radius_m,
    c.password_hash is not null,
    exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
    c.owner_id = auth.uid(),
    case when hide then null else (select p.display_name from public.profiles p where p.id = c.owner_id) end,
    c.tags,
    case when hide then null else c.owner_id end,
    case when hide then null else (select p.avatar_path from public.profiles p where p.id = c.owner_id) end,
    c.is_dating,
    case when c.is_dating then (select p.dating_gender from public.profiles p where p.id = c.owner_id) end,
    c.replies_enabled,
    auth.uid() is not null and public.is_dating_user(auth.uid()),
    exists (select 1 from public.pin_replies r where r.content_id = c.id and r.author_id = auth.uid());
end $$;
grant execute on function public.get_teaser(text) to anon, authenticated;

-- 6) Mappa: anche tipo dating e genere (pallino rosa / azzurro)
drop function if exists public.map_contents(double precision, double precision, double precision, double precision);
create function public.map_contents(
  p_min_lat double precision, p_min_lng double precision,
  p_max_lat double precision, p_max_lng double precision)
returns table (share_slug text, title text, media_type public.media_kind,
               lat double precision, lng double precision, is_owner boolean, unlocked boolean, tags text[],
               is_dating boolean, gender text)
language sql stable security definer
set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng,
         c.owner_id = auth.uid(),
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid()),
         c.tags, c.is_dating,
         case when c.is_dating then (select p.dating_gender from public.profiles p where p.id = c.owner_id) end
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

-- 7) Sblocco: i pin dating si sbloccano solo se iscritti alla sezione dating
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

notify pgrst, 'reload schema';
