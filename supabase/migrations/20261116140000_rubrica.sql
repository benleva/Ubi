-- =====================================================================
-- UBI — Aggiornamento 5: rubrica personale dei contatti
-- Si può eseguire più volte senza danni.
-- =====================================================================
create table if not exists public.address_book (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  email      text not null check (email = lower(email) and email ~* '^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$'),
  created_at timestamptz not null default now(),
  unique (owner_id, email)
);
create index if not exists address_book_owner_idx on public.address_book(owner_id, name);

alter table public.address_book enable row level security;
drop policy if exists "rubrica: solo la mia" on public.address_book;
create policy "rubrica: solo la mia" on public.address_book
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- massimo 1000 contatti a testa
create or replace function public.address_book_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.address_book where owner_id = new.owner_id) >= 1000 then
    raise exception 'Rubrica piena (massimo 1000 contatti).';
  end if;
  return new;
end $$;
drop trigger if exists address_book_limit on public.address_book;
create trigger address_book_limit before insert on public.address_book
  for each row execute function public.address_book_limit();

notify pgrst, 'reload schema';
