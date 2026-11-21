-- Icona «Logo del negozio»: la mappa chiede i loghi dei pin collegati a un negozio.
-- Solo dati pubblici del negozio (il logo). Si può eseguire più volte.
create or replace function public.pin_logos(p_slugs text[])
returns table (slug text, logo_url text)
language sql stable security definer set search_path = public as $$
  select c.share_slug, b.logo_url
  from public.contents c join public.businesses b on b.id = c.business_id
  where c.share_slug = any (p_slugs[1:300]) and b.enabled and b.logo_url is not null
$$;
revoke all on function public.pin_logos(text[]) from public;
grant execute on function public.pin_logos(text[]) to anon, authenticated;
