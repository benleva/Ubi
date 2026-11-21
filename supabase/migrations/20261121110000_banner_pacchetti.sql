-- Banner: pacchetti Base / Plus / Top, tempo a schermo, copie nel giro, immagine o video grande,
-- pin vetrina collegato e scadenza automatica. Archivio "ads" per loghi, foto e video dei banner.

alter table public.ads add column if not exists plan text not null default 'base';
alter table public.ads add column if not exists copies int not null default 1;
alter table public.ads add column if not exists seconds int not null default 9;
alter table public.ads add column if not exists media_url text;
alter table public.ads add column if not exists vetrina_slug text;
alter table public.ads add column if not exists ends_on date;

alter table public.ads drop constraint if exists ads_plan_chk;
alter table public.ads add constraint ads_plan_chk check (plan in ('base', 'plus', 'top'));
alter table public.ads drop constraint if exists ads_copies_chk;
alter table public.ads add constraint ads_copies_chk check (copies between 1 and 5);
alter table public.ads drop constraint if exists ads_seconds_chk;
alter table public.ads add constraint ads_seconds_chk check (seconds between 5 and 30);
alter table public.ads drop constraint if exists ads_media_chk;
alter table public.ads add constraint ads_media_chk check (media_url is null or media_url ~* '^https://');
alter table public.ads drop constraint if exists ads_vetrina_chk;
alter table public.ads add constraint ads_vetrina_chk check (vetrina_slug is null or vetrina_slug ~ '^[A-Za-z0-9_-]{4,40}$');

-- Il banner scaduto sparisce da solo (resta visibile all'amministratore)
drop policy if exists "banner: tutti vedono quelli attivi" on public.ads;
create policy "banner: tutti vedono quelli attivi" on public.ads for select to anon, authenticated
  using ((active and (ends_on is null or ends_on >= current_date)) or public.is_admin());

-- Archivio pubblico dei banner: foto (jpg, png, webp) e video brevi (mp4, webm), max 5 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

drop policy if exists "banner file: carica l'amministratore" on storage.objects;
create policy "banner file: carica l'amministratore" on storage.objects for insert to authenticated
  with check (bucket_id = 'ads' and public.is_admin());
drop policy if exists "banner file: modifica l'amministratore" on storage.objects;
create policy "banner file: modifica l'amministratore" on storage.objects for update to authenticated
  using (bucket_id = 'ads' and public.is_admin());
drop policy if exists "banner file: elimina l'amministratore" on storage.objects;
create policy "banner file: elimina l'amministratore" on storage.objects for delete to authenticated
  using (bucket_id = 'ads' and public.is_admin());
