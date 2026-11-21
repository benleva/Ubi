-- NFC «intelligenti»: sull'adesivo c'è solo https://ubipin.it/#/nfc/<CODICE>.
-- Dove porta il codice lo decide l'amministratore (e lo cambia quando vuole); ogni tocco viene contato.

create table if not exists public.nfc_tags (
  code        text primary key check (code ~ '^[A-Z0-9]{2,8}$'),
  label       text,
  target      text check (target is null or target ~ '^(#/|https://)'),
  business_id uuid references public.businesses(id) on delete set null,
  created_at  timestamptz not null default now()
);
create table if not exists public.nfc_taps (
  id   bigserial primary key,
  code text not null references public.nfc_tags(code) on delete cascade,
  at   timestamptz not null default now()
);
create index if not exists nfc_taps_code_at on public.nfc_taps(code, at);
alter table public.nfc_tags enable row level security;
alter table public.nfc_taps enable row level security;
revoke all on public.nfc_tags, public.nfc_taps from anon, authenticated;

-- I codici già pronti: P01–P60 (adesivi) e C01–C20 (card dei gestori)
insert into public.nfc_tags(code, label)
select 'P' || lpad(i::text, 2, '0'), 'Adesivo ' || i from generate_series(1, 60) i
on conflict do nothing;
insert into public.nfc_tags(code, label)
select 'C' || lpad(i::text, 2, '0'), 'Card gestore ' || i from generate_series(1, 20) i
on conflict do nothing;

-- Chi tocca l'NFC: conta il tocco e restituisce la destinazione (null se non ancora attivo)
create or replace function public.nfc_resolve(p_code text)
returns text language plpgsql security definer
set search_path = public as $$
declare t public.nfc_tags;
begin
  select * into t from public.nfc_tags where code = upper(coalesce(p_code, ''));
  if not found then return null; end if;
  -- al massimo un tocco contato ogni 10 secondi per codice (evita doppi conteggi dello stesso telefono)
  if not exists (select 1 from public.nfc_taps where code = t.code and at > now() - interval '10 seconds') then
    insert into public.nfc_taps(code) values (t.code);
  end if;
  return t.target;
end $$;
grant execute on function public.nfc_resolve(text) to anon, authenticated;

-- Amministratore: elenco con i tocchi (totali e ultimi 30 giorni)
create or replace function public.admin_nfc_list()
returns jsonb language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'code', t.code, 'label', t.label, 'target', t.target, 'business_id', t.business_id,
      'taps', (select count(*) from public.nfc_taps x where x.code = t.code),
      'taps30', (select count(*) from public.nfc_taps x where x.code = t.code and x.at > now() - interval '30 days'),
      'last_tap', (select max(at) from public.nfc_taps x where x.code = t.code)) order by t.code)
    from public.nfc_tags t), '[]'::jsonb);
end $$;
grant execute on function public.admin_nfc_list() to authenticated;

create or replace function public.admin_nfc_save(p jsonb)
returns void language plpgsql security definer
set search_path = public as $$
declare c text := upper(coalesce(p->>'code', ''));
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  if c !~ '^[A-Z0-9]{2,8}$' then raise exception 'Codice non valido: da 2 a 8 lettere o numeri.'; end if;
  insert into public.nfc_tags(code, label, target, business_id)
  values (c, nullif(p->>'label', ''), nullif(p->>'target', ''), nullif(p->>'business_id', '')::uuid)
  on conflict (code) do update set label = excluded.label, target = excluded.target, business_id = excluded.business_id;
end $$;
grant execute on function public.admin_nfc_save(jsonb) to authenticated;

create or replace function public.admin_nfc_delete(p_code text)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  delete from public.nfc_tags where code = upper(p_code);
end $$;
grant execute on function public.admin_nfc_delete(text) to authenticated;
