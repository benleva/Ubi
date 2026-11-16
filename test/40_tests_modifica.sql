\set ON_ERROR_STOP 1
-- (dopo 10_, 20_, 30_) Modifica: solo il proprietario
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003","email":"altro@example.com"}',false);
update contents set lat = 0, title = 'HACK' where share_slug = 'testo1';
delete from content_recipients where content_id = (select id from contents where share_slug='anniv01');
reset role;
select 'T34 estraneo non modifica' t, title <> 'HACK' and lat <> 0 as pass from contents where share_slug='testo1';
select 'T35 estraneo non tocca i destinatari' t, count(*) = 1 as pass from content_recipients r join contents c on c.id=r.content_id where c.share_slug='anniv01';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"andrea@example.com"}',false);
update contents set lat = 41.9009, lng = 12.4833, title = 'Fontana di Trevi', unlock_radius_m = 30 where share_slug = 'anniv01';
update contents set password_hash = 'nuova' where share_slug = 'anniv01';
select 'T36 proprietario sposta il punto' t, lat = 41.9009 and title = 'Fontana di Trevi' as pass from contents where share_slug='anniv01';
select 'T37 nuova password cifrata' t, password_hash like '$2%' and extensions.crypt('nuova', password_hash) = password_hash as pass from contents where share_slug='anniv01';
update contents set password_hash = null where share_slug = 'anniv01';
select 'T38 password tolta' t, password_hash is null as pass from contents where share_slug='anniv01';
delete from content_recipients where content_id = (select id from contents where share_slug='anniv01');
insert into content_recipients(content_id, email) select id, 'luca@example.com' from contents where share_slug='anniv01';
select 'T39 destinatari sostituiti' t, string_agg(email, ',') = 'luca@example.com' as pass from content_recipients r join contents c on c.id=r.content_id where c.share_slug='anniv01';
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","email":"moglie@example.com"}',false);
-- B l'aveva già sbloccato: anche se non è più destinataria, non lo vede più (permessi aggiornati)
select 'T40 ex destinataria non lo vede più' t, count(*) = 0 as pass from get_teaser('anniv01');
