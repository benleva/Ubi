-- =====================================================================
-- UBI — Aggiornamento 9: foto del profilo dating (fino a 6)
-- Si può eseguire più volte senza danni. Richiede gli aggiornamenti 7 e 8.
-- Le foto le vede solo chi le ha caricate e chi ha fatto il "doppio sì" con lui/lei:
-- prima della scelta reciproca l'anonimato resta intatto.
-- =====================================================================

create table if not exists public.dating_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  path       text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists dating_photos_user_idx on public.dating_photos(user_id, created_at);

alter table public.dating_photos enable row level security;
drop policy if exists "foto dating: solo le mie" on public.dating_photos;
create policy "foto dating: solo le mie" on public.dating_photos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and split_part(path, '/', 1) = auth.uid()::text and split_part(path, '/', 2) = 'dating');

-- Massimo 6 foto, solo per gli iscritti a Ubi Dating
create or replace function public.dating_photos_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_dating_user(new.user_id) then
    raise exception 'Le foto dating sono per gli iscritti a Ubi Dating.';
  end if;
  if (select count(*) from public.dating_photos where user_id = new.user_id) >= 6 then
    raise exception 'Puoi caricare al massimo 6 foto.';
  end if;
  return new;
end $$;
drop trigger if exists dating_photos_guard on public.dating_photos;
create trigger dating_photos_guard before insert on public.dating_photos
  for each row execute function public.dating_photos_guard();

-- Due persone si sono scelte a vicenda (doppio sì su un biglietto dating)?
create or replace function public.dating_matched(p_a uuid, p_b uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.pin_replies r join public.contents c on c.id = r.content_id
    where c.is_dating and r.owner_wants and r.author_wants
      and ((r.author_id = p_a and c.owner_id = p_b) or (r.author_id = p_b and c.owner_id = p_a)))
$$;
revoke all on function public.dating_matched(uuid, uuid) from public, anon;

-- Foto di una persona: le mie, o di chi mi ha scelto e ho scelto
create or replace function public.dating_photos_of(p_user uuid)
returns table (id uuid, path text, created_at timestamptz, name text)
language sql stable security definer
set search_path = public as $$
  select f.id, f.path, f.created_at, p.display_name
  from public.dating_photos f left join public.profiles p on p.id = f.user_id
  where f.user_id = p_user
    and (p_user = auth.uid() or public.dating_matched(auth.uid(), p_user))
  order by f.created_at
$$;
revoke all on function public.dating_photos_of(uuid) from public, anon;
grant execute on function public.dating_photos_of(uuid) to authenticated;

-- File: leggibili da chi ha fatto il doppio sì con il proprietario
create or replace function public.can_read_dating_photo(p_name text)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (select 1 from public.dating_photos f
                 where f.path = p_name and public.dating_matched(auth.uid(), f.user_id))
$$;
revoke all on function public.can_read_dating_photo(text) from public, anon;
grant execute on function public.can_read_dating_photo(text) to authenticated;
drop policy if exists "media: foto dating per chi si è scelto" on storage.objects;
create policy "media: foto dating per chi si è scelto" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.can_read_dating_photo(name));

notify pgrst, 'reload schema';
