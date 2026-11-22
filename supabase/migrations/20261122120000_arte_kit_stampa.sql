-- Ubi Arte: conta anche i clic sul «Kit stampa» dell'artista. Rieseguibile.
alter table public.art_clicks drop constraint if exists art_clicks_kind_check;
alter table public.art_clicks add constraint art_clicks_kind_check
  check (kind in ('instagram', 'facebook', 'tiktok', 'youtube', 'sito', 'linkedin', 'shop', 'stampa'));
