-- Cassa collegata all'account: chi entra con il PIN può collegare la Cassa al suo account Ubi.
-- Da quel momento, da quell'account, la Cassa si apre senza PIN (la protegge la password dell'account).
-- L'amministratore vede chi è collegato e può scollegarlo; se il negozio è sospeso la Cassa non si apre.

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
alter table public.business_members enable row level security;
revoke all on public.business_members from anon, authenticated;

-- Il controllo di sempre, con una scorciatoia: l'account collegato entra senza PIN
create or replace function public.cashier_auth(p_token text, p_pin text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare b public.businesses;
begin
  select * into b from public.businesses where cashier_token = upper(coalesce(p_token, ''));
  if not found then return 'Cassa non trovata: controlla il link.'; end if;
  if auth.uid() is not null and exists (select 1 from public.business_members m where m.business_id = b.id and m.user_id = auth.uid()) then
    if not public.business_is_active(b) then return 'Il servizio per questo negozio è sospeso.'; end if;
    return 'ok';
  end if;
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

-- Collega la Cassa al mio account (serve il PIN giusto)
create or replace function public.cashier_link(p_token text, p_pin text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare e text; b public.businesses;
begin
  if auth.uid() is null then return jsonb_build_object('status', 'login'); end if;
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  insert into public.business_members(business_id, user_id) values (b.id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('status', 'ok', 'business', b.name);
end $$;
grant execute on function public.cashier_link(text, text) to authenticated;

-- Le mie casse (solo quelle dei negozi attivi): per il pulsante in home
create or replace function public.my_cashiers()
returns jsonb language sql stable security definer
set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'token', b.cashier_token) order by b.name), '[]'::jsonb)
  from public.business_members m join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid() and public.business_is_active(b)
$$;
grant execute on function public.my_cashiers() to authenticated;

-- Scollego la Cassa dal mio account
create or replace function public.cashier_unlink(p_token text)
returns void language sql security definer
set search_path = public as $$
  delete from public.business_members m using public.businesses b
  where b.id = m.business_id and b.cashier_token = upper(coalesce(p_token, '')) and m.user_id = auth.uid()
$$;
grant execute on function public.cashier_unlink(text) to authenticated;

-- Amministratore: chi è collegato a ogni negozio, e scollega
create or replace function public.admin_cashier_members()
returns jsonb language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('business_id', m.business_id, 'user_id', m.user_id, 'email', u.email,
      'name', p.display_name, 'since', m.created_at) order by m.created_at)
    from public.business_members m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id), '[]'::jsonb);
end $$;
grant execute on function public.admin_cashier_members() to authenticated;

create or replace function public.admin_cashier_unlink(p_business uuid, p_user uuid)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo amministratore.'; end if;
  delete from public.business_members where business_id = p_business and user_id = p_user;
end $$;
grant execute on function public.admin_cashier_unlink(uuid, uuid) to authenticated;
