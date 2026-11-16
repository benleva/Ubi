\set ON_ERROR_STOP 1
-- (eseguire dopo 10_tests.sql: usa gli stessi utenti A, B, C)
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"andrea@example.com"}',false);
insert into contents(owner_id, share_slug, title, media_type, text_body, lat, lng, visibility)
values (auth.uid(),'testo1','Guida Colosseo','text','Entra dal varco 3 e guarda a sinistra.',41.8902,12.4922,'public');
insert into contents(owner_id, share_slug, title, media_type, text_body, lat, lng, visibility)
values (auth.uid(),'nascosto1','Solo mio','text','privato',41.8903,12.4923,'hidden');
do $$ begin
  insert into contents(owner_id,title,media_type,lat,lng) values (auth.uid(),'vuoto','text',41,12);
  raise exception 'NON doveva passare';
exception when check_violation then raise notice 'T19 testo vuoto rifiutato: OK'; end $$;
select 'T20 A vede in mappa i suoi 4 (anche nascosto)' t, count(*) = 4 as pass from map_contents(41,12,42,13);
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003","email":"altro@example.com"}',false);
select 'T21 C vede solo i pubblici' t, string_agg(share_slug, ',' order by share_slug) = 'caccia1,testo1' as pass from map_contents(41,12,42,13);
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"moglie@example.com"}',false);
select 'T22 B vede pubblici + quello per lei' t, string_agg(share_slug, ',' order by share_slug) = 'anniv01,caccia1,testo1' as pass from map_contents(41,12,42,13);
select 'T23 area fuori: niente' t, count(*) = 0 as pass from map_contents(45,9,46,10);
select 'T24 B lontana: testo bloccato' t, status = 'too_far' and text_body is null as pass from unlock('testo1',41.8960,12.4823,10);
select 'T25 B vicina: legge il testo' t, status = 'ok' and text_body like 'Entra dal varco%' as pass from unlock('testo1',41.8903,12.4923,10);
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin perform * from map_contents(41,12,42,13); raise exception 'NON doveva passare';
exception when insufficient_privilege then raise notice 'T26 anonimo non usa la mappa: OK'; end $$;
