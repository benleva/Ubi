-- Pin collegati a un negozio + domanda «Sei già nostro cliente?»
-- La risposta resta legata all'account (una per negozio); ai negozi arrivano solo conteggi anonimi.
-- Si può eseguire più volte senza danni.

-- 1) Un pin può appartenere a un negozio (lo decide l'amministratore)
alter table public.contents add column if not exists business_id uuid references public.businesses(id) on delete set null;
create index if not exists contents_business_idx on public.contents(business_id);

-- 2) Le risposte
create table if not exists public.customer_answers (
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  answer      text not null check (answer in ('abituale', 'occasionale', 'nuovo', 'nd')),
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);
alter table public.customer_answers enable row level security;
revoke all on public.customer_answers from anon, authenticated;

-- 3) Il negozio di un pin (solo nome e logo: dati pubblici del negozio)
create or replace function public.pin_business(p_slug text)
returns table (business_id uuid, name text, logo_url text)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.logo_url
  from public.contents c join public.businesses b on b.id = c.business_id
  where c.share_slug = p_slug and b.enabled
$$;
revoke all on function public.pin_business(text) from public;
grant execute on function public.pin_business(text) to anon, authenticated;

-- 4) La mia risposta (null = non ho ancora risposto)
create or replace function public.my_customer_answer(p_business uuid)
returns text language sql stable security definer set search_path = public as $$
  select answer from public.customer_answers where user_id = auth.uid() and business_id = p_business
$$;
revoke all on function public.my_customer_answer(uuid) from public, anon;
grant execute on function public.my_customer_answer(uuid) to authenticated;

-- 5) Rispondo (una volta sola per negozio)
create or replace function public.set_customer_answer(p_business uuid, p_answer text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if p_answer not in ('abituale', 'occasionale', 'nuovo', 'nd') then raise exception 'Risposta non valida'; end if;
  if not exists (select 1 from public.businesses where id = p_business and enabled) then raise exception 'Negozio non disponibile'; end if;
  insert into public.customer_answers(user_id, business_id, answer) values (auth.uid(), p_business, p_answer)
  on conflict (user_id, business_id) do nothing;
end $$;
revoke all on function public.set_customer_answer(uuid, text) from public, anon;
grant execute on function public.set_customer_answer(uuid, text) to authenticated;

-- 6) Amministratore: collega o scollega un pin a un negozio
create or replace function public.admin_set_pin_business(p_slug text, p_business uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Solo amministratori'; end if;
  update public.contents set business_id = p_business where share_slug = p_slug;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Pin non trovato'; end if;
  return n;
end $$;
revoke all on function public.admin_set_pin_business(text, uuid) from public, anon;
grant execute on function public.admin_set_pin_business(text, uuid) to authenticated;

-- 7) Amministratore: pin collegati e conteggi anonimi per negozio
create or replace function public.admin_business_pins(p_business uuid)
returns table (slug text, titolo text, sblocchi bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratori'; end if;
  return query select c.share_slug, c.title, (select count(*) from public.unlocks u where u.content_id = c.id)
    from public.contents c where c.business_id = p_business order by c.created_at;
end $$;
revoke all on function public.admin_business_pins(uuid) from public, anon;
grant execute on function public.admin_business_pins(uuid) to authenticated;

create or replace function public.admin_customer_stats()
returns table (business_id uuid, abituali bigint, occasionali bigint, nuovi bigint, non_detto bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratori'; end if;
  return query select a.business_id,
    count(*) filter (where a.answer = 'abituale'), count(*) filter (where a.answer = 'occasionale'),
    count(*) filter (where a.answer = 'nuovo'), count(*) filter (where a.answer = 'nd')
  from public.customer_answers a group by a.business_id;
end $$;
revoke all on function public.admin_customer_stats() from public, anon;
grant execute on function public.admin_customer_stats() to authenticated;
