-- UBI — Gruppi: comunità con nome e tag, pagina manifesto, iscritti, ban, icona dedicata,
-- pin pubblici o riservati ai soli iscritti, sblocco sul posto o a distanza.
-- Si può eseguire più volte. Tutto passa da funzioni sul server: nessuna tabella è leggibile direttamente.

-- ---------- 1) Tabelle ----------
create table if not exists public.ugroups (
  id          uuid primary key default gen_random_uuid(),
  tag         text not null unique check (tag ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  name        text not null check (char_length(name) between 3 and 60),
  category    text not null default 'altro'
              check (category in ('sociale','ludico','tecnico','culturale','sport','natura','cucina','altro')),
  privacy     text not null default 'public' check (privacy in ('public','private')),
  icon        text not null default 'g1' check (icon ~ '^g[1-5]$'),
  logo_url    text check (logo_url is null or (char_length(logo_url) <= 400 and logo_url ~ '^https://')),
  city        text check (char_length(city) <= 60),
  bio         text check (char_length(bio) <= 600),
  goal        text check (char_length(goal) <= 300),
  rules       text check (char_length(rules) <= 500),
  contacts    jsonb not null default '{}'::jsonb check (char_length(contacts::text) <= 800),
  invite_code text not null default encode(extensions.gen_random_bytes(6), 'hex'),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  verified    boolean not null default false,
  suspended   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ugroups_owner_idx on public.ugroups(owner_id);

create table if not exists public.ugroup_members (
  group_id   uuid not null references public.ugroups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','mod','member')),
  status     text not null default 'active' check (status in ('active','pending','banned')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists ugroup_members_user_idx on public.ugroup_members(user_id);

create table if not exists public.ugroup_reports (
  group_id   uuid not null references public.ugroups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  reason     text check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.ugroups enable row level security;
alter table public.ugroup_members enable row level security;
alter table public.ugroup_reports enable row level security;
-- nessuna policy: i client non leggono né scrivono le tabelle direttamente

-- ---------- 2) Aiuti ----------
create or replace function public.ug_is_member(g uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (select 1 from public.ugroup_members m join public.ugroups x on x.id = m.group_id
    where m.group_id = g and m.user_id = u and m.status = 'active' and not x.suspended), false)
$$;
create or replace function public.ug_can_manage(g uuid, u uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (select 1 from public.ugroup_members m
    where m.group_id = g and m.user_id = u and m.status = 'active' and m.role in ('owner','mod')), false)
$$;
-- Un pin di gruppo si vede se il gruppo non è sospeso e, quando è riservato, se sei un iscritto attivo.
create or replace function public.ug_pin_ok(g uuid, only_members boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (select 1 from public.ugroups x where x.id = g and not x.suspended)
    and (not only_members or public.ug_is_member(g, auth.uid())), false)
$$;
revoke all on function public.ug_is_member(uuid, uuid), public.ug_can_manage(uuid, uuid), public.ug_pin_ok(uuid, boolean) from public, anon, authenticated;

-- ---------- 3) Pin di gruppo ----------
alter table public.contents add column if not exists expires_at timestamptz;
alter table public.contents add column if not exists group_id uuid references public.ugroups(id) on delete set null;
alter table public.contents add column if not exists group_only boolean not null default false;
create index if not exists contents_group_idx on public.contents(group_id) where group_id is not null;
alter table public.contents drop constraint if exists anywhere_needs_date;
alter table public.contents add constraint anywhere_needs_date check (not open_anywhere or unlock_at is not null or group_id is not null);

-- Il server decide la visibilità: riservato = nascosto a tutti tranne gli iscritti, pubblico = visibile a tutti.
create or replace function public.contents_group_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is null then
    new.group_only := false;
    if new.unlock_at is null then new.open_anywhere := false; end if;   -- «a distanza» vale solo nei gruppi o con la capsula
    return new;
  end if;
  if tg_op = 'INSERT' or new.group_id is distinct from old.group_id then
    if not public.ug_is_member(new.group_id, new.owner_id) then
      raise exception 'Non fai parte di questo gruppo';
    end if;
  end if;
  if new.is_dating then raise exception 'I pin dating non possono stare in un gruppo'; end if;
  new.visibility := case when new.group_only then 'hidden' else 'public' end;
  return new;
end $$;
drop trigger if exists contents_group_guard_t on public.contents;
create trigger contents_group_guard_t before insert or update on public.contents
  for each row execute function public.contents_group_guard();

-- Chi può vedere un pin: i pin di gruppo seguono solo le regole del gruppo.
create or replace function public.can_access(c public.contents)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce(
    c.owner_id = auth.uid()
    or (c.group_id is not null and public.ug_pin_ok(c.group_id, c.group_only))
    or (c.group_id is null and (
         c.visibility = 'public'
         or (c.visibility = 'restricted' and auth.uid() is not null and exists (
              select 1 from public.content_recipients r
              where r.content_id = c.id
                and ( (r.email is not null and r.email = lower(auth.jwt() ->> 'email'))
                   or (r.phone is not null and r.phone = '+' || ltrim(auth.jwt() ->> 'phone', '+')) )))
       )),
    false)
$$;
revoke all on function public.can_access(public.contents) from public, anon, authenticated;

-- ---------- 4) Sblocco: anche a distanza per i pin di gruppo ----------
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

  anywhere := c.open_anywhere and (c.group_id is not null or (c.unlock_at is not null and now() >= c.unlock_at));

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



-- ---------- 5) Logo del gruppo (archivio pubblico, una cartella per utente) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-logos', 'group-logos', true, 307200, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 307200,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists "logo gruppo: carico nella mia cartella" on storage.objects;
create policy "logo gruppo: carico nella mia cartella" on storage.objects for insert to authenticated
  with check (bucket_id = 'group-logos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "logo gruppo: cancello i miei file" on storage.objects;
create policy "logo gruppo: cancello i miei file" on storage.objects for delete to authenticated
  using (bucket_id = 'group-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 6) Funzioni ----------
create or replace function public.group_create(p jsonb)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; t text := lower(btrim(coalesce(p->>'tag', '')));
begin
  if uid is null then raise exception 'Accedi per creare un gruppo'; end if;
  if t !~ '^[a-z0-9][a-z0-9-]{2,29}$' then raise exception 'Il tag deve avere da 3 a 30 caratteri: lettere, numeri e trattini'; end if;
  if t ~ '^(admin|ubi|ufficiale|comune|polizia|carabinieri|soccorso|protezione|vigili|regione|governo|ministero|112|sos)' and not public.is_admin() then
    raise exception 'Questo tag è riservato: scegline un altro';
  end if;
  if exists (select 1 from public.ugroups where tag = t) then raise exception 'Questo tag è già usato: scegline un altro'; end if;
  if (select count(*) from public.ugroups where owner_id = uid) >= 5 and not public.is_admin() then
    raise exception 'Puoi creare al massimo 5 gruppi';
  end if;
  insert into public.ugroups (tag, name, category, privacy, icon, logo_url, city, bio, goal, rules, contacts, owner_id)
  values (t, btrim(p->>'name'), coalesce(nullif(p->>'category', ''), 'altro'), coalesce(nullif(p->>'privacy', ''), 'public'),
          coalesce(nullif(p->>'icon', ''), 'g1'), nullif(p->>'logo_url', ''), nullif(btrim(coalesce(p->>'city', '')), ''),
          nullif(btrim(coalesce(p->>'bio', '')), ''), nullif(btrim(coalesce(p->>'goal', '')), ''),
          nullif(btrim(coalesce(p->>'rules', '')), ''), coalesce(p->'contacts', '{}'::jsonb), uid)
  returning id into gid;
  insert into public.ugroup_members (group_id, user_id, role, status) values (gid, uid, 'owner', 'active');
  return gid;
end $$;

create or replace function public.group_update(p_id uuid, p jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare g public.ugroups;
begin
  select * into g from public.ugroups where id = p_id;
  if not found or not (g.owner_id = auth.uid() or public.is_admin()) then raise exception 'Solo il proprietario può modificare il gruppo'; end if;
  update public.ugroups set
    name = coalesce(nullif(btrim(p->>'name'), ''), name),
    category = coalesce(nullif(p->>'category', ''), category),
    privacy = coalesce(nullif(p->>'privacy', ''), privacy),
    icon = coalesce(nullif(p->>'icon', ''), icon),
    logo_url = case when p ? 'logo_url' then nullif(p->>'logo_url', '') else logo_url end,
    city = case when p ? 'city' then nullif(btrim(p->>'city'), '') else city end,
    bio = case when p ? 'bio' then nullif(btrim(p->>'bio'), '') else bio end,
    goal = case when p ? 'goal' then nullif(btrim(p->>'goal'), '') else goal end,
    rules = case when p ? 'rules' then nullif(btrim(p->>'rules'), '') else rules end,
    contacts = case when p ? 'contacts' then coalesce(p->'contacts', '{}'::jsonb) else contacts end
  where id = p_id;
end $$;

create or replace function public.group_delete(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from public.ugroups where id = p_id and (owner_id = auth.uid() or public.is_admin())) then
    raise exception 'Solo il proprietario può eliminare il gruppo';
  end if;
  -- i pin del gruppo non si perdono: tornano privati ai loro autori
  update public.contents set group_id = null, group_only = false, visibility = 'hidden' where group_id = p_id;
  delete from public.ugroups where id = p_id;
end $$;

create or replace function public.group_regen_invite(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare c text := encode(extensions.gen_random_bytes(6), 'hex');
begin
  if not public.ug_can_manage(p_id, auth.uid()) then raise exception 'Non autorizzato'; end if;
  update public.ugroups set invite_code = c where id = p_id;
  return c;
end $$;

-- Elenco pubblico (anche i gruppi privati: si vede solo il manifesto, mai i contenuti riservati)
create or replace function public.groups_list(p_q text default null, p_cat text default null)
returns table (id uuid, tag text, name text, category text, privacy text, icon text, logo_url text,
               city text, bio text, verified boolean, members bigint, my_status text, my_role text)
language sql stable security definer set search_path = public as $$
  select g.id, g.tag, g.name, g.category, g.privacy, g.icon, g.logo_url, g.city, left(g.bio, 140), g.verified,
         (select count(*) from public.ugroup_members m where m.group_id = g.id and m.status = 'active'),
         me.status, me.role
  from public.ugroups g
  left join public.ugroup_members me on me.group_id = g.id and me.user_id = auth.uid()
  where auth.uid() is not null and not g.suspended
    and (p_cat is null or p_cat = '' or g.category = p_cat)
    and (p_q is null or btrim(p_q) = '' or g.name ilike '%' || btrim(p_q) || '%' or g.tag ilike '%' || lower(btrim(p_q)) || '%' or g.city ilike '%' || btrim(p_q) || '%')
  order by g.verified desc, 11 desc, g.created_at desc
  limit 100
$$;

create or replace function public.my_groups()
returns table (id uuid, tag text, name text, category text, privacy text, icon text, logo_url text,
               my_status text, my_role text, pending bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.tag, g.name, g.category, g.privacy, g.icon, g.logo_url, m.status, m.role,
         case when m.role in ('owner','mod') and m.status = 'active'
              then (select count(*) from public.ugroup_members x where x.group_id = g.id and x.status = 'pending') else 0 end
  from public.ugroup_members m join public.ugroups g on g.id = m.group_id
  where m.user_id = auth.uid() and m.status in ('active','pending') and not g.suspended
  order by (m.status = 'active') desc, g.name
$$;

create or replace function public.group_page(p_tag text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g public.ugroups; me public.ugroup_members; mgr boolean;
begin
  if auth.uid() is null then return null; end if;
  select * into g from public.ugroups where tag = lower(p_tag);
  if not found or (g.suspended and not public.is_admin()) then return null; end if;
  select * into me from public.ugroup_members where group_id = g.id and user_id = auth.uid();
  mgr := coalesce(me.status = 'active' and me.role in ('owner','mod'), false);
  return jsonb_build_object(
    'id', g.id, 'tag', g.tag, 'name', g.name, 'category', g.category, 'privacy', g.privacy, 'icon', g.icon,
    'logo_url', g.logo_url, 'city', g.city, 'bio', g.bio, 'goal', g.goal, 'rules', g.rules, 'contacts', g.contacts,
    'verified', g.verified, 'suspended', g.suspended, 'created_at', g.created_at,
    'members', (select count(*) from public.ugroup_members m where m.group_id = g.id and m.status = 'active'),
    'my_status', me.status, 'my_role', me.role, 'is_owner', g.owner_id = auth.uid(),
    'invite_code', case when mgr then g.invite_code end,
    'pending', case when mgr then (select count(*) from public.ugroup_members m where m.group_id = g.id and m.status = 'pending') else 0 end);
end $$;

create or replace function public.group_join(p_tag text, p_code text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.ugroups; me public.ugroup_members; st text;
begin
  if uid is null then raise exception 'Accedi per entrare in un gruppo'; end if;
  select * into g from public.ugroups where tag = lower(p_tag) and not suspended;
  if not found then raise exception 'Gruppo non trovato'; end if;
  select * into me from public.ugroup_members where group_id = g.id and user_id = uid;
  if found then
    if me.status = 'banned' then raise exception 'Sei stato escluso da questo gruppo'; end if;
    return me.status;
  end if;
  if (select count(*) from public.ugroup_members where user_id = uid and status in ('active','pending')) >= 50 then
    raise exception 'Puoi far parte di al massimo 50 gruppi';
  end if;
  st := case when g.privacy = 'public' or (p_code is not null and p_code = g.invite_code) then 'active' else 'pending' end;
  insert into public.ugroup_members (group_id, user_id, role, status) values (g.id, uid, 'member', st);
  return st;
end $$;

-- Esce dal gruppo (o annulla la richiesta). I suoi pin di gruppo tornano privati.
create or replace function public.group_leave(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if exists (select 1 from public.ugroups where id = p_id and owner_id = uid) then
    raise exception 'Il proprietario non può uscire: elimina il gruppo o passa la proprietà';
  end if;
  update public.contents set group_id = null, group_only = false, visibility = 'hidden' where group_id = p_id and owner_id = uid;
  delete from public.ugroup_members where group_id = p_id and user_id = uid and status <> 'banned';
end $$;

create or replace function public.group_members(p_id uuid)
returns table (user_id uuid, name text, role text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.display_name, 'Utente'), m.role, m.status, m.created_at
  from public.ugroup_members m left join public.profiles p on p.id = m.user_id
  where m.group_id = p_id and public.ug_can_manage(p_id, auth.uid())
  order by (m.status = 'pending') desc, (m.role = 'owner') desc, (m.role = 'mod') desc, p.display_name
$$;

-- Azioni dei gestori: approve | reject | remove | ban | unban | promote | demote
create or replace function public.group_member_set(p_id uuid, p_user uuid, p_action text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); mine public.ugroup_members; tgt public.ugroup_members;
begin
  select * into mine from public.ugroup_members where group_id = p_id and user_id = uid and status = 'active';
  if not found or mine.role not in ('owner','mod') then raise exception 'Non autorizzato'; end if;
  select * into tgt from public.ugroup_members where group_id = p_id and user_id = p_user;
  if not found then raise exception 'Persona non trovata'; end if;
  if p_user = uid then raise exception 'Non puoi farlo su te stesso'; end if;
  if tgt.role = 'owner' then raise exception 'Il proprietario non si tocca'; end if;
  if tgt.role = 'mod' and mine.role <> 'owner' then raise exception 'Solo il proprietario gestisce i moderatori'; end if;
  case p_action
    when 'approve' then update public.ugroup_members set status = 'active' where group_id = p_id and user_id = p_user and status = 'pending';
    when 'reject'  then delete from public.ugroup_members where group_id = p_id and user_id = p_user and status = 'pending';
    when 'unban'   then delete from public.ugroup_members where group_id = p_id and user_id = p_user and status = 'banned';
    when 'promote' then
      if mine.role <> 'owner' then raise exception 'Solo il proprietario nomina i moderatori'; end if;
      update public.ugroup_members set role = 'mod' where group_id = p_id and user_id = p_user and status = 'active';
    when 'demote'  then
      if mine.role <> 'owner' then raise exception 'Solo il proprietario gestisce i moderatori'; end if;
      update public.ugroup_members set role = 'member' where group_id = p_id and user_id = p_user;
    when 'remove', 'ban' then
      update public.contents set group_id = null, group_only = false, visibility = 'hidden' where group_id = p_id and owner_id = p_user;
      if p_action = 'ban' then update public.ugroup_members set status = 'banned', role = 'member' where group_id = p_id and user_id = p_user;
      else delete from public.ugroup_members where group_id = p_id and user_id = p_user; end if;
    else raise exception 'Azione non valida';
  end case;
end $$;

-- Pin di un gruppo che posso vedere (i riservati solo se sono iscritto)
create or replace function public.group_pins(p_id uuid)
returns table (share_slug text, title text, media_type public.media_kind, lat double precision, lng double precision,
               group_only boolean, created_at timestamptz, unlocked boolean)
language sql stable security definer set search_path = public as $$
  select c.share_slug, c.title, c.media_type, c.lat, c.lng, c.group_only, c.created_at,
         exists (select 1 from public.unlocks u where u.content_id = c.id and u.user_id = auth.uid())
  from public.contents c
  where auth.uid() is not null and c.group_id = p_id and public.can_access(c)
    and (c.expires_at is null or c.expires_at > now())
  order by c.created_at desc limit 200
$$;

-- Gruppo, icona e logo dei pin (mappa e pagina del pin)
create or replace function public.pin_groups(p_slugs text[])
returns table (slug text, group_id uuid, tag text, name text, icon text, logo_url text, only_members boolean)
language sql stable security definer set search_path = public as $$
  select c.share_slug, g.id, g.tag, g.name, g.icon, g.logo_url, c.group_only
  from public.contents c join public.ugroups g on g.id = c.group_id
  where auth.uid() is not null and c.share_slug = any (p_slugs[1:300]) and public.can_access(c)
$$;

create or replace function public.group_report(p_id uuid, p_reason text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Accedi per segnalare'; end if;
  insert into public.ugroup_reports (group_id, user_id, reason) values (p_id, auth.uid(), left(p_reason, 300))
  on conflict (group_id, user_id) do update set reason = excluded.reason, created_at = now();
end $$;

-- Amministratore
create or replace function public.admin_groups()
returns table (id uuid, tag text, name text, category text, privacy text, verified boolean, suspended boolean,
               members bigint, pins bigint, reports bigint, owner_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  return query select g.id, g.tag, g.name, g.category, g.privacy, g.verified, g.suspended,
    (select count(*) from public.ugroup_members m where m.group_id = g.id and m.status = 'active'),
    (select count(*) from public.contents c where c.group_id = g.id),
    (select count(*) from public.ugroup_reports r where r.group_id = g.id),
    (select p.display_name from public.profiles p where p.id = g.owner_id), g.created_at
  from public.ugroups g order by (select count(*) from public.ugroup_reports r where r.group_id = g.id) desc, g.created_at desc;
end $$;
create or replace function public.admin_group_set(p_id uuid, p_verified boolean, p_suspended boolean)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorizzato'; end if;
  update public.ugroups set verified = p_verified, suspended = p_suspended where id = p_id;
end $$;

do $$ declare f text; begin
  foreach f in array array['group_create(jsonb)','group_update(uuid,jsonb)','group_delete(uuid)','group_regen_invite(uuid)',
    'groups_list(text,text)','my_groups()','group_page(text)','group_join(text,text)','group_leave(uuid)','group_members(uuid)',
    'group_member_set(uuid,uuid,text)','group_pins(uuid)','pin_groups(text[])','group_report(uuid,text)','admin_groups()','admin_group_set(uuid,boolean,boolean)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
