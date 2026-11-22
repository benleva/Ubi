-- Ubi Arte: link di anteprima privata di una mostra. Chi ha il link vede tutte le opere da qualsiasi luogo,
-- senza iscriversi, mentre la mostra resta non pubblicata. Il link si può disattivare o rigenerare. Rieseguibile.
-- Il codice sta in una tabella a parte, senza regole di lettura: non lo legge nessuno tranne le funzioni qui sotto.
create table if not exists public.exhibition_previews (
  exhibition_id uuid primary key references public.exhibitions(id) on delete cascade,
  token         text not null unique,
  created_at    timestamptz not null default now()
);
alter table public.exhibition_previews enable row level security;
revoke all on public.exhibition_previews from anon, authenticated;

create or replace function public.can_manage_exhibition(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exhibitions e where e.id = p_id and auth.uid() is not null
                  and (e.owner_id = auth.uid() or public.is_artist_of(e.artist_id)))
$$;

-- Il link attuale (null se non c'è): proprietario della mostra, artista o amministratore
create or replace function public.exhibition_preview_get(p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_manage_exhibition(p_id) then raise exception 'not_allowed'; end if;
  return (select token from public.exhibition_previews where exhibition_id = p_id);
end $$;
revoke all on function public.exhibition_preview_get(uuid) from public, anon;
grant execute on function public.exhibition_preview_get(uuid) to authenticated;

-- Crea un link nuovo (quello vecchio smette di funzionare) o lo disattiva
create or replace function public.exhibition_preview_set(p_id uuid, p_on boolean)
returns text language plpgsql volatile security definer set search_path = public, extensions as $$
declare t text;
begin
  if not public.can_manage_exhibition(p_id) then raise exception 'not_allowed'; end if;
  delete from public.exhibition_previews where exhibition_id = p_id;
  if not p_on then return null; end if;
  t := encode(gen_random_bytes(12), 'hex');
  insert into public.exhibition_previews(exhibition_id, token) values (p_id, t);
  return t;
end $$;
revoke all on function public.exhibition_preview_set(uuid, boolean) from public, anon;
grant execute on function public.exhibition_preview_set(uuid, boolean) to authenticated;

-- I dati dell'anteprima: li chiede solo la funzione art-preview, che firma le foto per un'ora
create or replace function public.exhibition_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exhibition', jsonb_build_object('id', e.id, 'title', e.title, 'subtitle', e.subtitle, 'intro', e.intro, 'place_name', e.place_name, 'published', e.published),
    'artist', jsonb_build_object('name', a.name, 'slug', a.slug, 'kind', a.kind, 'tagline', a.tagline, 'bio', a.bio, 'photo_url', a.photo_url,
                                 'works', a.works, 'socials', a.socials, 'shop_url', a.shop_url, 'active', a.active),
    'stops', coalesce((select jsonb_agg(jsonb_build_object('step', c.exhibition_step, 'title', c.title, 'text', c.text_body, 'art', c.art,
        'media_type', c.media_type, 'media_path', c.media_path, 'lat', c.lat, 'lng', c.lng) order by c.exhibition_step)
      from public.contents c where c.exhibition_id = e.id), '[]'::jsonb))
  from public.exhibition_previews p join public.exhibitions e on e.id = p.exhibition_id join public.artists a on a.id = e.artist_id
  where p.token = p_token
$$;
revoke all on function public.exhibition_by_token(text) from public, anon, authenticated;
grant execute on function public.exhibition_by_token(text) to service_role;

notify pgrst, 'reload schema';
