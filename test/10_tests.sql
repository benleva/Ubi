\set ON_ERROR_STOP 1
-- utenti: A = autore, B = destinataria (email), C = estraneo
insert into auth.users values
 ('aaaaaaaa-0000-0000-0000-000000000001','andrea@example.com',null),
 ('bbbbbbbb-0000-0000-0000-000000000002','moglie@example.com',null),
 ('cccccccc-0000-0000-0000-000000000003','altro@example.com',null);

-- === l'autore crea un video di auguri al Colosseo, con password ===
set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"andrea@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Andrea','2026-11');
insert into contents(id, owner_id, share_slug, title, hint, media_type, media_path, duration_seconds,
                     lat, lng, unlock_radius_m, visibility, password_hash)
values ('11111111-0000-0000-0000-000000000001', auth.uid(), 'anniv01', 'Buon anniversario',
        'Dove ci siamo detti sì', 'video',
        'aaaaaaaa-0000-0000-0000-000000000001/11111111-0000-0000-0000-000000000001/auguri.mp4',
        45, 41.8902, 12.4922, 50, 'restricted', 'segreto');
insert into content_recipients(content_id, email) values ('11111111-0000-0000-0000-000000000001','moglie@example.com');
insert into storage.objects(bucket_id, name) values ('media','aaaaaaaa-0000-0000-0000-000000000001/11111111-0000-0000-0000-000000000001/auguri.mp4');
select 'T1 password cifrata' t, password_hash like '$2%' as pass from contents;

-- video > 60 s rifiutato
do $$ begin
  insert into contents(owner_id,title,media_type,media_path,duration_seconds,lat,lng)
  values (auth.uid(),'lungo','video','x/y/z.mp4',90,41,12);
  raise exception 'NON doveva passare';
exception when check_violation then raise notice 'T2 video 90s rifiutato: OK'; end $$;

-- === estraneo C ===
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003","email":"altro@example.com"}',false);
select 'T3 estraneo: teaser vuoto' t, count(*) = 0 as pass from get_teaser('anniv01');
select 'T4 estraneo: unlock' t, status = 'not_found' as pass from unlock('anniv01',41.8902,12.4922,10);
select 'T5 estraneo non vede tabella' t, count(*) = 0 as pass from contents;
select 'T6 estraneo non vede file' t, count(*) = 0 as pass from storage.objects;

-- === destinataria B ===
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"moglie@example.com"}',false);
select 'T7 B vede teaser' t, (title = 'Buon anniversario' and requires_password and author = 'Andrea') as pass from get_teaser('anniv01');
select 'T8 B lontana (Piazza Venezia)' t, status = 'too_far' and distance_m > 900 as pass, distance_m from unlock('anniv01',41.8960,12.4823,10);
select 'T9 B GPS impreciso' t, status = 'gps_inaccurate' as pass from unlock('anniv01',41.8902,12.4922,250);
select 'T10 B vicina senza pwd' t, status = 'password_required' as pass from unlock('anniv01',41.8904,12.4924,15);
select 'T11 B pwd errata' t, status = 'wrong_password' as pass from unlock('anniv01',41.8904,12.4924,15,'boh');
select 'T12 B file ancora bloccato' t, count(*) = 0 as pass from storage.objects;
select 'T13 B sblocca' t, status = 'ok' and media_path like '%auguri.mp4' as pass, distance_m from unlock('anniv01',41.8904,12.4924,15,'segreto');
select 'T14 B ora legge il file' t, count(*) = 1 as pass from storage.objects;
select 'T15 B riapre da casa' t, status = 'ok' as pass from unlock('anniv01',45.46,9.19,10);

-- === rate limit: C su contenuto pubblico con password ===
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}',false);
insert into contents(owner_id, share_slug, title, media_type, external_url, lat, lng, visibility, password_hash)
values (auth.uid(),'caccia1','Indizio 3','link','https://www.youtube.com/watch?v=x',41.9029,12.4534,'public','tesoro');
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003"}',false);
select status from unlock('caccia1',41.9029,12.4534,10,'a');
select status from unlock('caccia1',41.9029,12.4534,10,'b');
select status from unlock('caccia1',41.9029,12.4534,10,'c');
select status from unlock('caccia1',41.9029,12.4534,10,'d');
select status from unlock('caccia1',41.9029,12.4534,10,'e');
select 'T16 blocco dopo 5 errori' t, status = 'rate_limited' as pass from unlock('caccia1',41.9029,12.4534,10,'tesoro');

-- === anonimo ===
reset role; set role anon;
select set_config('request.jwt.claims','{}',false);
select 'T17 anonimo vede teaser pubblico' t, count(*) = 1 as pass from get_teaser('caccia1');
select 'T18 anonimo teaser privato vuoto' t, count(*) = 0 as pass from get_teaser('anniv01');
