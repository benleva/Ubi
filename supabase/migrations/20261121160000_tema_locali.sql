-- Il negozio di un pin restituisce anche la categoria (bar, pub, ristorante…):
-- serve all'app per colorare in giallo e nero i pin dei locali. Si può eseguire più volte.
drop function if exists public.pin_business(text);
create function public.pin_business(p_slug text)
returns table (business_id uuid, name text, logo_url text, category text)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.logo_url, b.category
  from public.contents c join public.businesses b on b.id = c.business_id
  where c.share_slug = p_slug and b.enabled
$$;
revoke all on function public.pin_business(text) from public;
grant execute on function public.pin_business(text) to anon, authenticated;
