-- =====================================================================
-- Ubi · DONI e NEGOZI (clienti business)
-- Un "dono" è un regalo riscattabile in un negozio, in un'area e entro una data.
-- Appartiene a una persona alla volta e si può regalare (il link vale una volta).
-- Nasce in blocco da una campagna (garden: alberi di Natale) o uno alla volta
-- dalla Cassa del negozio (pub: "regala una birra").
-- Solo aggiunte: nessuna tabella o funzione esistente viene modificata.
-- Le tabelle non sono leggibili direttamente: tutto passa dalle funzioni qui sotto.
-- =====================================================================

-- Alfabeto senza caratteri che si confondono (0/O, 1/I/L, 8/B, 5/S, 2/Z)
create or replace function public.ubi_code(n int)
returns text language plpgsql volatile
set search_path = public, extensions as $$
declare
  a text := 'ACDEFGHJKMNPQRTUVWXY34679';
  b bytea := gen_random_bytes(n);
  s text := '';
begin
  for i in 0..n - 1 loop
    s := s || substr(a, 1 + (get_byte(b, i) % length(a)), 1);
  end loop;
  return s;
end $$;
revoke all on function public.ubi_code(int) from public, anon, authenticated;

-- ---------- NEGOZI ----------
create table if not exists public.businesses (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 80),
  owner_id       uuid references auth.users(id) on delete set null,   -- per il futuro pannello del negozio
  address        text check (address is null or char_length(address) <= 200),
  lat            double precision check (lat is null or lat between -90 and 90),
  lng            double precision check (lng is null or lng between -180 and 180),
  phone          text check (phone is null or char_length(phone) <= 40),
  buy_url        text check (buy_url is null or buy_url ~* '^https?://'),     -- "Come acquistare" (rete negozi, più avanti)
  enabled        boolean not null default true,       -- la spunta: area riservata attiva
  active_until   date,                                -- facoltativo: dopo questa data si sospende da solo
  hide_campaigns boolean not null default false,      -- casi gravi: nasconde anche i doni dalla mappa
  cashier_token  text not null unique default public.ubi_code(14),   -- link della pagina Cassa
  cashier_pin    text,                                -- PIN della Cassa (cifrato)
  notes          text check (notes is null or char_length(notes) <= 1000),
  created_at     timestamptz not null default now()
);
alter table public.businesses enable row level security;
revoke all on public.businesses from anon, authenticated;

-- Il PIN si salva sempre cifrato
create or replace function public.businesses_pin_hash()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  if new.cashier_pin is not null and new.cashier_pin !~ '^\$2[aby]\$' then
    new.cashier_pin := crypt(new.cashier_pin, gen_salt('bf', 8));
  end if;
  return new;
end $$;
drop trigger if exists businesses_pin_hash on public.businesses;
create trigger businesses_pin_hash before insert or update on public.businesses
  for each row execute function public.businesses_pin_hash();

create or replace function public.business_is_active(b public.businesses)
returns boolean language sql stable as $$
  select b.enabled and (b.active_until is null or b.active_until >= current_date)
$$;

-- ---------- CATALOGO del negozio (birra, hamburger, stella di Natale mignon…) ----------
create table if not exists public.catalog_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  meaning     text check (meaning is null or char_length(meaning) <= 200),   -- es. il significato del fiore
  value_label text check (value_label is null or char_length(value_label) <= 30),
  image_url   text check (image_url is null or image_url ~* '^https://'),
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.catalog_items enable row level security;
revoke all on public.catalog_items from anon, authenticated;

-- ---------- CAMPAGNE ----------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  theme       text not null default 'regalo'
              check (theme in ('natale','capodanno','sanvalentino','pasqua','festamamma','compleanno','regalo')),
  kind        text not null default 'omaggio' check (kind in ('omaggio','vendita')),
  opens_at    timestamptz not null default now(),       -- da quando si può aprire
  expires_at  timestamptz not null,                     -- dopo: sparisce e il codice scade
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  radius_m    int not null default 50 check (radius_m between 10 and 2000),   -- area dove si sblocca
  intro       text check (intro is null or char_length(intro) <= 300),          -- es. "Vieni a sbloccare il tuo regalo…"
  created_at  timestamptz not null default now(),
  check (expires_at > opens_at)
);
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon, authenticated;
create index if not exists campaigns_business_idx on public.campaigns(business_id);

-- ---------- DONI ----------
create table if not exists public.gifts (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  item_id         uuid references public.catalog_items(id) on delete set null,
  prize_label     text not null check (char_length(prize_label) between 1 and 120),
  prize_image     text check (prize_image is null or prize_image ~* '^https://'),
  prize_meaning   text check (prize_meaning is null or char_length(prize_meaning) <= 200),
  card_code       text not null unique,                 -- codice stampato sul biglietto (8 caratteri)
  claim_token     text not null unique,                 -- nel QR del biglietto
  lat             double precision not null,            -- posizione dell'albero sulla mappa
  lng             double precision not null,
  holder_id       uuid references auth.users(id) on delete set null,   -- di chi è adesso
  claimed_at      timestamptz,
  transfer_token  text unique,                          -- link "Regalalo": vale una volta
  transfer_at     timestamptz,
  giver_id        uuid references auth.users(id) on delete set null,   -- chi l'ha regalato all'attuale proprietario
  giver_name      text check (giver_name is null or char_length(giver_name) <= 60),
  message         text check (message is null or char_length(message) <= 500),
  gifted_at       timestamptz,
  unlocked_at     timestamptz,
  redeem_code     text unique,                          -- da mostrare in cassa, nasce allo sblocco
  redeemed_at     timestamptz,
  expires_at      timestamptz,                          -- proroga dal negozio (se vuota vale quella della campagna)
  created_at      timestamptz not null default now()
);
alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;
create index if not exists gifts_campaign_idx on public.gifts(campaign_id);
create index if not exists gifts_holder_idx on public.gifts(holder_id);

-- Tentativi alla Cassa (contro chi prova i PIN a caso)
create table if not exists public.cashier_attempts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  ok          boolean not null,
  at          timestamptz not null default now()
);
alter table public.cashier_attempts enable row level security;
revoke all on public.cashier_attempts from anon, authenticated;
create index if not exists cashier_attempts_idx on public.cashier_attempts(business_id, at desc);

-- Stato di un dono, calcolato
create or replace function public.gift_state(g public.gifts, c public.campaigns, b public.businesses)
returns text language sql stable as $$
  select case
    when g.redeemed_at is not null then 'redeemed'
    when b.hide_campaigns then 'hidden'
    when now() > coalesce(g.expires_at, c.expires_at) then 'expired'
    when g.unlocked_at is not null then 'unlocked'
    when now() < c.opens_at then 'not_yet'
    else 'open' end
$$;

-- Riga JSON di un dono, per chi lo possiede. Premio e messaggio solo dopo lo sblocco
-- (per una consumazione acquistata il premio si vede subito: «Una birra ti aspetta»).
create or replace function public.gift_json(g public.gifts)
returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'state', public.gift_state(g, c, b),
    'mine', g.holder_id = auth.uid(),
    'business', b.name, 'address', b.address,
    'campaign', c.title, 'theme', c.theme, 'kind', c.kind, 'intro', c.intro,
    'opens_at', c.opens_at, 'expires_at', coalesce(g.expires_at, c.expires_at),
    'lat', g.lat, 'lng', g.lng, 'area_lat', c.lat, 'area_lng', c.lng, 'radius_m', c.radius_m,
    'card_code', case when g.holder_id = auth.uid() and g.giver_id is null then g.card_code end,
    'has_message', g.message is not null,
    'from', case when g.giver_id is not null then coalesce(g.giver_name, '') end,
    'gifted', g.transfer_token is not null,
    'prize', case when g.unlocked_at is not null or c.kind = 'vendita' then g.prize_label end,
    'prize_image', case when g.unlocked_at is not null then g.prize_image end,
    'prize_meaning', case when g.unlocked_at is not null then g.prize_meaning end,
    'message', case when g.unlocked_at is not null then g.message end,
    'redeem_code', case when g.unlocked_at is not null then g.redeem_code end,
    'redeemed_at', g.redeemed_at, 'unlocked_at', g.unlocked_at)
  from public.campaigns c join public.businesses b on b.id = c.business_id
  where c.id = g.campaign_id
$$;
revoke all on function public.gift_json(public.gifts) from public, anon, authenticated;

-- =====================================================================
-- CLIENTE
-- =====================================================================

-- Scansione del biglietto (QR) o codice scritto a mano: il dono diventa mio.
-- Se è già di un altro: 'taken'. Se era mio: lo rivedo.
create or replace function public.gift_claim(p_token text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare g public.gifts; t text := upper(regexp_replace(coalesce(p_token, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then return jsonb_build_object('status', 'login'); end if;
  select * into g from public.gifts where claim_token = t or card_code = t for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if g.holder_id is null then
    update public.gifts set holder_id = auth.uid(), claimed_at = now() where id = g.id returning * into g;
  elsif g.holder_id <> auth.uid() then
    return jsonb_build_object('status', 'taken');
  end if;
  return jsonb_build_object('status', 'ok', 'gift', public.gift_json(g));
end $$;
revoke all on function public.gift_claim(text) from public, anon;
grant execute on function public.gift_claim(text) to authenticated;

-- I miei doni (per la mappa e il profilo); i nascosti non compaiono
create or replace function public.my_gifts()
returns setof jsonb language sql stable security definer
set search_path = public as $$
  select public.gift_json(g) from public.gifts g
  join public.campaigns c on c.id = g.campaign_id join public.businesses b on b.id = c.business_id
  where g.holder_id = auth.uid() and not b.hide_campaigns
    and (g.redeemed_at is null or g.redeemed_at > now() - interval '30 days')
    and now() <= coalesce(g.expires_at, c.expires_at) + interval '30 days'
  order by coalesce(g.expires_at, c.expires_at)
$$;
revoke all on function public.my_gifts() from public, anon;
grant execute on function public.my_gifts() to authenticated;

create or replace function public.gift_get(p_id uuid)
returns jsonb language sql stable security definer
set search_path = public as $$
  select public.gift_json(g) from public.gifts g where g.id = p_id and g.holder_id = auth.uid()
$$;
revoke all on function public.gift_get(uuid) from public, anon;
grant execute on function public.gift_get(uuid) to authenticated;

-- Gli alberi di tutte le campagne attive nella zona (solo posizione e tema: niente dati personali)
create or replace function public.map_gift_trees(s double precision, w double precision, n double precision, e double precision)
returns table(lat double precision, lng double precision, theme text, mine boolean, gift_id uuid)
language sql stable security definer
set search_path = public as $$
  select g.lat, g.lng, c.theme, coalesce(g.holder_id = auth.uid(), false),
         case when g.holder_id = auth.uid() then g.id end
  from public.gifts g
  join public.campaigns c on c.id = g.campaign_id join public.businesses b on b.id = c.business_id
  where not b.hide_campaigns and c.kind = 'omaggio'
    and now() <= coalesce(g.expires_at, c.expires_at) and g.redeemed_at is null
    and g.lat between s and n and g.lng between w and e
  union all   -- le consumazioni regalate: compaiono solo a chi le possiede
  select g.lat, g.lng, c.theme, true, g.id
  from public.gifts g
  join public.campaigns c on c.id = g.campaign_id join public.businesses b on b.id = c.business_id
  where not b.hide_campaigns and c.kind = 'vendita' and g.holder_id = auth.uid()
    and now() <= coalesce(g.expires_at, c.expires_at) and g.redeemed_at is null
  limit 3000
$$;
grant execute on function public.map_gift_trees(double precision, double precision, double precision, double precision) to anon, authenticated;

-- Sblocco sul posto
create or replace function public.gift_unlock(p_id uuid, p_lat double precision, p_lng double precision)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare g public.gifts; c public.campaigns; b public.businesses; d double precision; st text;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'login'); end if;
  select * into g from public.gifts where id = p_id and holder_id = auth.uid() for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  select * into c from public.campaigns where id = g.campaign_id;
  select * into b from public.businesses where id = c.business_id;
  st := public.gift_state(g, c, b);
  if st in ('unlocked', 'redeemed') then return jsonb_build_object('status', 'ok', 'gift', public.gift_json(g)); end if;
  if st <> 'open' then return jsonb_build_object('status', st, 'gift', public.gift_json(g)); end if;
  if g.transfer_token is not null then return jsonb_build_object('status', 'gifting'); end if;
  if p_lat is null or p_lng is null then return jsonb_build_object('status', 'no_position'); end if;
  d := public.distance_m(p_lat, p_lng, c.lat, c.lng);
  if d > c.radius_m then
    return jsonb_build_object('status', 'too_far', 'distance_m', round(d), 'radius_m', c.radius_m);
  end if;
  loop
    begin
      update public.gifts set unlocked_at = now(), redeem_code = public.ubi_code(6) where id = g.id returning * into g;
      exit;
    exception when unique_violation then -- codice già usato: ne genero un altro
    end;
  end loop;
  return jsonb_build_object('status', 'ok', 'gift', public.gift_json(g));
end $$;
revoke all on function public.gift_unlock(uuid, double precision, double precision) from public, anon;
grant execute on function public.gift_unlock(uuid, double precision, double precision) to authenticated;

-- "Regalalo": crea (o rinnova) il link di consegna, con il pensiero per chi lo riceve.
create or replace function public.gift_send(p_id uuid, p_message text, p_from text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare g public.gifts; c public.campaigns; b public.businesses; t text;
begin
  select * into g from public.gifts where id = p_id and holder_id = auth.uid() for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  select * into c from public.campaigns where id = g.campaign_id;
  select * into b from public.businesses where id = c.business_id;
  if public.gift_state(g, c, b) not in ('open', 'not_yet') then
    return jsonb_build_object('status', public.gift_state(g, c, b));
  end if;
  t := public.ubi_code(16);
  update public.gifts set transfer_token = t, transfer_at = now(),
    message = nullif(left(trim(coalesce(p_message, '')), 500), ''),
    giver_name = nullif(left(trim(coalesce(p_from, '')), 60), '')
  where id = g.id;
  return jsonb_build_object('status', 'ok', 'token', t);
end $$;
revoke all on function public.gift_send(uuid, text, text) from public, anon;
grant execute on function public.gift_send(uuid, text, text) to authenticated;

-- Ci ho ripensato: annullo il link (il dono resta mio)
create or replace function public.gift_send_cancel(p_id uuid)
returns void language sql security definer
set search_path = public as $$
  update public.gifts set transfer_token = null, transfer_at = null
  where id = p_id and holder_id = auth.uid() and unlocked_at is null
$$;
revoke all on function public.gift_send_cancel(uuid) from public, anon;
grant execute on function public.gift_send_cancel(uuid) to authenticated;

-- Chi riceve il link: vede il pacco (senza aprirlo) anche prima di registrarsi
create or replace function public.gift_peek(p_token text)
returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object('business', b.name, 'address', b.address, 'theme', c.theme, 'kind', c.kind,
    'campaign', c.title, 'opens_at', c.opens_at, 'expires_at', coalesce(g.expires_at, c.expires_at),
    'from', g.giver_name, 'prize', case when c.kind = 'vendita' then g.prize_label end,
    'has_message', g.message is not null)
  from public.gifts g join public.campaigns c on c.id = g.campaign_id join public.businesses b on b.id = c.business_id
  where g.transfer_token = upper(p_token) and not b.hide_campaigns
    and g.unlocked_at is null and now() <= coalesce(g.expires_at, c.expires_at)
$$;
grant execute on function public.gift_peek(text) to anon, authenticated;

-- Accetto il regalo: passa a me, il link non vale più
create or replace function public.gift_accept(p_token text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare g public.gifts; c public.campaigns; b public.businesses;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'login'); end if;
  select * into g from public.gifts where transfer_token = upper(p_token) for update;
  if not found then return jsonb_build_object('status', 'used'); end if;
  select * into c from public.campaigns where id = g.campaign_id;
  select * into b from public.businesses where id = c.business_id;
  if public.gift_state(g, c, b) not in ('open', 'not_yet') then return jsonb_build_object('status', 'expired'); end if;
  if g.holder_id = auth.uid() then return jsonb_build_object('status', 'own'); end if;
  update public.gifts set giver_id = holder_id, holder_id = auth.uid(), claimed_at = now(),
    gifted_at = now(), transfer_token = null, transfer_at = null
  where id = g.id returning * into g;
  return jsonb_build_object('status', 'ok', 'gift', public.gift_json(g));
end $$;
revoke all on function public.gift_accept(text) from public, anon;
grant execute on function public.gift_accept(text) to authenticated;

-- =====================================================================
-- CASSA del negozio (link riservato + PIN, senza account)
-- =====================================================================
-- Controlla link e PIN. Non solleva errori (così il tentativo sbagliato resta registrato):
-- restituisce 'ok' oppure il messaggio da mostrare.
create or replace function public.cashier_auth(p_token text, p_pin text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare b public.businesses;
begin
  select * into b from public.businesses where cashier_token = upper(coalesce(p_token, ''));
  if not found then return 'Cassa non trovata: controlla il link.'; end if;
  if (select count(*) from public.cashier_attempts where business_id = b.id and not ok and at > now() - interval '15 minutes') >= 8 then
    return 'Troppi PIN sbagliati: riprova tra 15 minuti.';
  end if;
  if b.cashier_pin is null or crypt(coalesce(p_pin, ''), b.cashier_pin) <> b.cashier_pin then
    insert into public.cashier_attempts(business_id, ok) values (b.id, false);
    return 'PIN sbagliato.';
  end if;
  if not public.business_is_active(b) then return 'Il servizio per questo negozio è sospeso.'; end if;
  return 'ok';
end $$;
revoke all on function public.cashier_auth(text, text) from public, anon, authenticated;

create or replace function public.cashier_info(p_token text, p_pin text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare b public.businesses; e text;
begin
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  return jsonb_build_object('business', b.name,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'value', i.value_label) order by i.sort, i.name)
                       from public.catalog_items i where i.business_id = b.id and i.active), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'kind', c.kind, 'theme', c.theme,
        'expires_at', c.expires_at,
        'total', (select count(*) from public.gifts g where g.campaign_id = c.id),
        'claimed', (select count(*) from public.gifts g where g.campaign_id = c.id and g.holder_id is not null),
        'gifted', (select count(*) from public.gifts g where g.campaign_id = c.id and g.gifted_at is not null),
        'unlocked', (select count(*) from public.gifts g where g.campaign_id = c.id and g.unlocked_at is not null),
        'redeemed', (select count(*) from public.gifts g where g.campaign_id = c.id and g.redeemed_at is not null),
        'redeemed_gifted', (select count(*) from public.gifts g where g.campaign_id = c.id and g.redeemed_at is not null and g.gifted_at is not null))
      order by c.created_at desc) from public.campaigns c where c.business_id = b.id), '[]'::jsonb));
end $$;
grant execute on function public.cashier_info(text, text) to anon, authenticated;

-- Controllo un codice (quello mostrato dal cliente dopo lo sblocco)
create or replace function public.cashier_check(p_token text, p_pin text, p_code text, p_redeem boolean default false)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare e text; b public.businesses; g public.gifts; c public.campaigns; k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  select g2.* into g from public.gifts g2 join public.campaigns c2 on c2.id = g2.campaign_id
   where c2.business_id = b.id and (g2.redeem_code = k or g2.card_code = k) for update of g2;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  select * into c from public.campaigns where id = g.campaign_id;
  if g.redeemed_at is not null then
    return jsonb_build_object('status', 'already', 'prize', g.prize_label, 'redeemed_at', g.redeemed_at);
  end if;
  if g.unlocked_at is null then
    return jsonb_build_object('status', 'locked', 'prize', g.prize_label, 'expires_at', coalesce(g.expires_at, c.expires_at));
  end if;
  if now() > coalesce(g.expires_at, c.expires_at) then
    return jsonb_build_object('status', 'expired', 'prize', g.prize_label, 'expires_at', coalesce(g.expires_at, c.expires_at));
  end if;
  if p_redeem then
    update public.gifts set redeemed_at = now() where id = g.id;
    return jsonb_build_object('status', 'redeemed', 'prize', g.prize_label, 'gifted', g.gifted_at is not null);
  end if;
  return jsonb_build_object('status', 'valid', 'prize', g.prize_label, 'gifted', g.gifted_at is not null,
    'expires_at', coalesce(g.expires_at, c.expires_at));
end $$;
grant execute on function public.cashier_check(text, text, text, boolean) to anon, authenticated;

-- Proroga di un dono (cliente arrivato in ritardo)
create or replace function public.cashier_extend(p_token text, p_pin text, p_code text, p_days int)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare e text; b public.businesses; g public.gifts; c public.campaigns; k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  if p_days not between 1 and 365 then raise exception 'Giorni non validi.'; end if;
  select g2.* into g from public.gifts g2 join public.campaigns c2 on c2.id = g2.campaign_id
   where c2.business_id = b.id and (g2.redeem_code = k or g2.card_code = k) for update of g2;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if g.redeemed_at is not null then return jsonb_build_object('status', 'already'); end if;
  select * into c from public.campaigns where id = g.campaign_id;
  update public.gifts set expires_at = greatest(now(), coalesce(g.expires_at, c.expires_at)) + make_interval(days => p_days)
   where id = g.id returning * into g;
  return jsonb_build_object('status', 'ok', 'expires_at', g.expires_at);
end $$;
grant execute on function public.cashier_extend(text, text, text, int) to anon, authenticated;

-- Il pub vende una consumazione: nasce un dono, il QR va al cliente che lo regala
create or replace function public.cashier_issue(p_token text, p_pin text, p_item uuid, p_days int default 180)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare e text; b public.businesses; i public.catalog_items; c public.campaigns; g public.gifts;
begin
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  select * into i from public.catalog_items where id = p_item and business_id = b.id and active;
  if not found then raise exception 'Articolo non trovato.'; end if;
  if b.lat is null or b.lng is null then raise exception 'Manca la posizione del negozio: chiedi ad Ubi di inserirla.'; end if;
  if (select count(*) from public.gifts g2 join public.campaigns c2 on c2.id = g2.campaign_id
       where c2.business_id = b.id and g2.created_at > now() - interval '1 day') >= 500 then
    raise exception 'Limite giornaliero raggiunto.';
  end if;
  -- una campagna «vendita» per negozio, sempre aperta
  select * into c from public.campaigns where business_id = b.id and kind = 'vendita' and expires_at > now() + interval '400 days' limit 1;
  if not found then
    insert into public.campaigns(business_id, title, theme, kind, opens_at, expires_at, lat, lng, radius_m)
    values (b.id, b.name, 'regalo', 'vendita', now(), now() + interval '20 years', b.lat, b.lng, 60) returning * into c;
  end if;
  loop
    begin
      insert into public.gifts(campaign_id, item_id, prize_label, prize_image, prize_meaning, card_code, claim_token, lat, lng, expires_at)
      values (c.id, i.id, i.name, i.image_url, i.meaning, public.ubi_code(8), public.ubi_code(16), b.lat, b.lng,
              now() + make_interval(days => greatest(1, least(coalesce(p_days, 180), 730))))
      returning * into g;
      exit;
    exception when unique_violation then
    end;
  end loop;
  return jsonb_build_object('status', 'ok', 'token', g.claim_token, 'code', g.card_code, 'prize', g.prize_label, 'expires_at', g.expires_at);
end $$;
grant execute on function public.cashier_issue(text, text, uuid, int) to anon, authenticated;

-- =====================================================================
-- AMMINISTRATORE (solo tu)
-- =====================================================================
create or replace function public.admin_businesses()
returns setof jsonb language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  return query select jsonb_build_object('id', b.id, 'name', b.name, 'address', b.address, 'lat', b.lat, 'lng', b.lng,
    'phone', b.phone, 'buy_url', b.buy_url, 'enabled', b.enabled, 'active_until', b.active_until,
    'hide_campaigns', b.hide_campaigns, 'active', public.business_is_active(b), 'cashier_token', b.cashier_token,
    'has_pin', b.cashier_pin is not null, 'notes', b.notes,
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort, i.name) from public.catalog_items i where i.business_id = b.id), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'theme', c.theme, 'kind', c.kind,
        'opens_at', c.opens_at, 'expires_at', c.expires_at, 'lat', c.lat, 'lng', c.lng, 'radius_m', c.radius_m,
        'total', (select count(*) from public.gifts g where g.campaign_id = c.id),
        'claimed', (select count(*) from public.gifts g where g.campaign_id = c.id and g.holder_id is not null),
        'gifted', (select count(*) from public.gifts g where g.campaign_id = c.id and g.gifted_at is not null),
        'unlocked', (select count(*) from public.gifts g where g.campaign_id = c.id and g.unlocked_at is not null),
        'redeemed', (select count(*) from public.gifts g where g.campaign_id = c.id and g.redeemed_at is not null))
      order by c.created_at desc) from public.campaigns c where c.business_id = b.id), '[]'::jsonb))
  from public.businesses b order by b.created_at desc;
end $$;
grant execute on function public.admin_businesses() to authenticated;

-- Crea o modifica un negozio (p->>'id' vuoto = nuovo). Il PIN si cambia solo se passato.
create or replace function public.admin_business_save(p jsonb)
returns uuid language plpgsql security definer
set search_path = public as $$
declare v uuid := nullif(p->>'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  if v is null then
    insert into public.businesses(name) values (p->>'name') returning id into v;
  end if;
  update public.businesses set
    name = coalesce(nullif(p->>'name', ''), name),
    address = nullif(p->>'address', ''),
    lat = nullif(p->>'lat', '')::double precision, lng = nullif(p->>'lng', '')::double precision,
    phone = nullif(p->>'phone', ''), buy_url = nullif(p->>'buy_url', ''),
    enabled = coalesce((p->>'enabled')::boolean, enabled),
    active_until = nullif(p->>'active_until', '')::date,
    hide_campaigns = coalesce((p->>'hide_campaigns')::boolean, hide_campaigns),
    notes = nullif(p->>'notes', ''),
    cashier_pin = case when coalesce(p->>'pin', '') ~ '^[0-9]{4,8}$' then p->>'pin' else cashier_pin end
  where id = v;
  return v;
end $$;
grant execute on function public.admin_business_save(jsonb) to authenticated;

-- La spunta: attiva / sospendi (e nascondi i doni nei casi gravi). Niente si cancella.
create or replace function public.admin_business_toggle(p_id uuid, p_enabled boolean, p_hide boolean)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  update public.businesses set enabled = p_enabled, hide_campaigns = coalesce(p_hide, hide_campaigns) where id = p_id;
end $$;
grant execute on function public.admin_business_toggle(uuid, boolean, boolean) to authenticated;

-- Catalogo: salva un articolo (id vuoto = nuovo; active=false per toglierlo dalla Cassa)
create or replace function public.admin_item_save(p jsonb)
returns uuid language plpgsql security definer
set search_path = public as $$
declare v uuid := nullif(p->>'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  if v is null then
    insert into public.catalog_items(business_id, name) values ((p->>'business_id')::uuid, p->>'name') returning id into v;
  end if;
  update public.catalog_items set name = coalesce(nullif(p->>'name', ''), name), meaning = nullif(p->>'meaning', ''),
    value_label = nullif(p->>'value_label', ''), image_url = nullif(p->>'image_url', ''),
    active = coalesce((p->>'active')::boolean, active), sort = coalesce((p->>'sort')::int, sort)
  where id = v;
  return v;
end $$;
grant execute on function public.admin_item_save(jsonb) to authenticated;

-- Crea una campagna e tutti i suoi doni, sparsi a caso nell'area (spread_m) con premi mescolati.
-- p_prizes: [{"label":"Stella di Natale mignon","qty":40,"image":"https://…","meaning":"…"}, …]
create or replace function public.admin_campaign_create(
  p_business uuid, p_title text, p_theme text, p_opens timestamptz, p_expires timestamptz,
  p_lat double precision, p_lng double precision, p_radius int, p_spread int, p_intro text, p_prizes jsonb)
returns uuid language plpgsql security definer
set search_path = public as $$
declare c uuid; pr jsonb; k int; tot int := 0; r double precision; a double precision; sp int := greatest(5, least(coalesce(p_spread, 40), 2000));
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  select coalesce(sum(greatest(0, (x->>'qty')::int)), 0) into tot from jsonb_array_elements(p_prizes) x;
  if tot < 1 or tot > 2000 then raise exception 'Da 1 a 2000 doni per campagna.'; end if;
  insert into public.campaigns(business_id, title, theme, kind, opens_at, expires_at, lat, lng, radius_m, intro)
  values (p_business, p_title, p_theme, 'omaggio', p_opens, p_expires, p_lat, p_lng, p_radius, nullif(p_intro, ''))
  returning id into c;
  for pr in select * from jsonb_array_elements(p_prizes) loop
    for k in 1..greatest(0, (pr->>'qty')::int) loop
      r := sp * sqrt(random()); a := 2 * pi() * random();
      loop
        begin
          insert into public.gifts(campaign_id, item_id, prize_label, prize_image, prize_meaning, card_code, claim_token, lat, lng)
          values (c, nullif(pr->>'item_id', '')::uuid, pr->>'label', nullif(pr->>'image', ''), nullif(pr->>'meaning', ''),
                  public.ubi_code(8), public.ubi_code(16),
                  p_lat + r * cos(a) / 111320.0, p_lng + r * sin(a) / (111320.0 * cos(radians(p_lat))));
          exit;
        exception when unique_violation then
        end;
      end loop;
    end loop;
  end loop;
  return c;
end $$;
grant execute on function public.admin_campaign_create(uuid, text, text, timestamptz, timestamptz, double precision, double precision, int, int, text, jsonb) to authenticated;

-- Biglietti da stampare (QR + codice). Il premio NON compare: è una sorpresa.
create or replace function public.admin_campaign_cards(p_campaign uuid)
returns table(card_code text, claim_token text, claimed boolean)
language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  return query select g.card_code, g.claim_token, g.holder_id is not null from public.gifts g
    where g.campaign_id = p_campaign order by g.created_at, g.card_code;
end $$;
grant execute on function public.admin_campaign_cards(uuid) to authenticated;

-- Modifica date di una campagna (es. proroga per tutti)
create or replace function public.admin_campaign_dates(p_campaign uuid, p_opens timestamptz, p_expires timestamptz)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  update public.campaigns set opens_at = coalesce(p_opens, opens_at), expires_at = coalesce(p_expires, expires_at) where id = p_campaign;
end $$;
grant execute on function public.admin_campaign_dates(uuid, timestamptz, timestamptz) to authenticated;
