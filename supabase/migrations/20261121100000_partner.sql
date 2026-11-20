-- =====================================================================
-- Ubi · PARTNER: i negozi che lavorano con Ubi, mostrati nella pagina «Per le attività»
-- Solo aggiunte. Un negozio compare solo se lo decidi tu (spunta) e se è attivo:
-- se lo sospendi sparisce anche dai partner.
-- =====================================================================
alter table public.businesses add column if not exists show_as_partner boolean not null default false;
alter table public.businesses add column if not exists category text
  check (category is null or category in ('garden','fiorista','bar','pub','ristorante','pasticceria','negozio','altro'));
alter table public.businesses add column if not exists city text check (city is null or char_length(city) <= 60);
alter table public.businesses add column if not exists logo_url text check (logo_url is null or logo_url ~* '^https://');
alter table public.businesses add column if not exists blurb text check (blurb is null or char_length(blurb) <= 200);
alter table public.businesses add column if not exists website text check (website is null or website ~* '^https?://');
alter table public.businesses add column if not exists partner_since date;

-- Elenco pubblico (anche per chi non è iscritto): solo dati che il negozio ha accettato di mostrare
create or replace function public.public_partners()
returns table(name text, category text, city text, logo_url text, blurb text, website text,
              lat double precision, lng double precision, partner_since date)
language sql stable security definer
set search_path = public as $$
  select b.name, b.category, b.city, b.logo_url, b.blurb, b.website, b.lat, b.lng, b.partner_since
  from public.businesses b
  where b.show_as_partner and public.business_is_active(b)
  order by b.partner_since nulls last, b.created_at
$$;
grant execute on function public.public_partners() to anon, authenticated;

-- Salvataggio dei dati partner (dall'admin)
create or replace function public.admin_partner_save(p_id uuid, p jsonb)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  update public.businesses set
    show_as_partner = coalesce((p->>'show_as_partner')::boolean, show_as_partner),
    category = nullif(p->>'category', ''), city = nullif(p->>'city', ''),
    logo_url = nullif(p->>'logo_url', ''), blurb = nullif(p->>'blurb', ''), website = nullif(p->>'website', ''),
    partner_since = coalesce(partner_since, case when (p->>'show_as_partner')::boolean then current_date end)
  where id = p_id;
end $$;
grant execute on function public.admin_partner_save(uuid, jsonb) to authenticated;

-- L'elenco admin ora include anche i dati partner
create or replace function public.admin_partner_data()
returns table(id uuid, show_as_partner boolean, category text, city text, logo_url text, blurb text, website text, partner_since date)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  return query select b.id, b.show_as_partner, b.category, b.city, b.logo_url, b.blurb, b.website, b.partner_since from public.businesses b;
end $$;
grant execute on function public.admin_partner_data() to authenticated;
