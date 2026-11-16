\set ON_ERROR_STOP 1
-- Aggiornamento 10: gruppi, capsula del tempo, caccia al tesoro, banner, admin
reset role;
insert into auth.users(id, email) values
 ('f1f1f1f1-0000-0000-0000-000000000001','pub@example.com'),
 ('f2f2f2f2-0000-0000-0000-000000000002','giocatore@example.com'),
 ('f3f3f3f3-0000-0000-0000-000000000003','secondo@example.com');
set role authenticated;

-- Gruppi in rubrica
select set_config('request.jwt.claims','{"sub":"f1f1f1f1-0000-0000-0000-000000000001","email":"pub@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Pub Kymera','2026-11-16b');
insert into address_book(name, email, groups) values ('Luca','luca@example.com','{calcetto,amici}'), ('Sara','sara@example.com','{amici}');
select 'G1 gruppi salvati' t, count(*) = 2 as pass from address_book where 'amici' = any(groups);

-- Capsula del tempo
insert into contents(owner_id, share_slug, title, media_type, text_body, lat, lng, visibility, unlock_at)
values (auth.uid(), 'capsula1', 'Apri nel 2030', 'text', 'Ciao futuro', 45, 9, 'public', now() + interval '3 years');
insert into contents(owner_id, share_slug, title, media_type, text_body, lat, lng, visibility, unlock_at, open_anywhere)
values (auth.uid(), 'capsula2', 'Gia aperta, da ovunque', 'text', 'Eccomi', 45, 9, 'public', now() - interval '1 minute', true);
do $$ begin
  insert into contents(owner_id, title, media_type, text_body, lat, lng, visibility, open_anywhere) values (auth.uid(), 'x', 'text', 'x', 45, 9, 'public', true);
  raise exception 'NON doveva passare';
exception when check_violation then raise notice 'G2 da ovunque solo con data: OK'; end $$;

-- Caccia al tesoro: 3 tappe, 1 premio
insert into hunts(id, title, prize, max_winners) values ('b0b0b0b0-0000-0000-0000-000000000001', 'Caccia al Kymera', 'Una birra o una maglietta', 1);
insert into contents(owner_id, share_slug, title, hint, media_type, text_body, lat, lng, visibility, hunt_id, hunt_step) values
 (auth.uid(), 'tappa1', 'Tappa 1', 'Dove si ferma il tram', 'text', 'Indizio 2: la fontana', 45.0, 9.0, 'public', 'b0b0b0b0-0000-0000-0000-000000000001', 1),
 (auth.uid(), 'tappa2', 'Tappa 2', 'La fontana', 'text', 'Indizio 3: il bancone', 45.01, 9.01, 'public', 'b0b0b0b0-0000-0000-0000-000000000001', 2),
 (auth.uid(), 'tappa3', 'Tappa 3', 'Il bancone', 'text', 'Hai vinto!', 45.02, 9.02, 'public', 'b0b0b0b0-0000-0000-0000-000000000001', 3);

select set_config('request.jwt.claims','{"sub":"f2f2f2f2-0000-0000-0000-000000000002","email":"giocatore@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Giocatore','2026-11-16b');
select 'G3 capsula chiusa prima della data' t, status = 'too_early' as pass from unlock('capsula1', 45, 9, 5);
select 'G4 capsula aperta da lontano' t, status = 'ok' as pass from unlock('capsula2', 10, 10, 5000);
select 'G5 tappa 2 non sulla mappa' t, count(*) = 1 as pass from map_contents(44, 8, 46, 10) where share_slug like 'tappa%';
select 'G6 tappa 2 bloccata' t, (hunt_locked and lat is null and hint is null) as pass from get_teaser('tappa2');
select 'G7 sblocco tappa 2 negato' t, status = 'hunt_locked' as pass from unlock('tappa2', 45.01, 9.01, 5);
select 'G8 tappa 1' t, status = 'ok' as pass from unlock('tappa1', 45.0, 9.0, 5);
select 'G9 ora tappa 2 visibile' t, count(*) = 2 as pass from map_contents(44, 8, 46, 10) where share_slug like 'tappa%';
select 'G10 tappa 2' t, status = 'ok' as pass from unlock('tappa2', 45.01, 9.01, 5);
select 'G11 nessun premio prima della fine' t, code is null as pass from my_hunt_prize('tappa2');
select 'G12 tappa 3' t, status = 'ok' as pass from unlock('tappa3', 45.02, 9.02, 5);
select 'G13 premio con codice' t, (code ~ '^[0-9A-F]{6}$' and is_last and steps = 3) as pass from my_hunt_prize('tappa3');
do $$ begin
  perform * from hunt_winners;
  raise exception 'NON doveva passare';
exception when insufficient_privilege then raise notice 'G14 codici non leggibili direttamente: OK'; end $$;

-- Secondo giocatore: premi finiti
select set_config('request.jwt.claims','{"sub":"f3f3f3f3-0000-0000-0000-000000000003","email":"secondo@example.com"}',false);
select 'G15' t, status = 'ok' as pass from unlock('tappa1', 45.0, 9.0, 5);
select 'G16' t, status = 'ok' as pass from unlock('tappa2', 45.01, 9.01, 5);
select 'G17' t, status = 'ok' as pass from unlock('tappa3', 45.02, 9.02, 5);
select 'G18 premi esauriti' t, (code is null and sold_out) as pass from my_hunt_prize('tappa3');
do $$ begin
  perform * from hunt_redeem('b0b0b0b0-0000-0000-0000-000000000001', 'ABCDEF');
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%autorizzato%' then raise notice 'G19 solo il pub verifica i codici: OK'; else raise; end if;
end $$;

-- Il pub verifica e segna il premio
select set_config('request.jwt.claims','{"sub":"f1f1f1f1-0000-0000-0000-000000000001","email":"pub@example.com"}',false);
select 'G20 vincitori visibili al pub' t, count(*) = 1 as pass from hunt_winners_list('b0b0b0b0-0000-0000-0000-000000000001');
select 'G21 codice sbagliato' t, status = 'not_found' as pass from hunt_redeem('b0b0b0b0-0000-0000-0000-000000000001', 'ZZZZZZ');
select 'G22 codice giusto' t, (r.status = 'ok' and r.name = 'Giocatore') as pass
  from hunt_redeem('b0b0b0b0-0000-0000-0000-000000000001', (select lower(code) from hunt_winners_list('b0b0b0b0-0000-0000-0000-000000000001'))) r;
select 'G23 non due volte' t, status = 'already' as pass
  from hunt_redeem('b0b0b0b0-0000-0000-0000-000000000001', (select code from hunt_winners_list('b0b0b0b0-0000-0000-0000-000000000001')));

-- Banner e amministratore
do $$ begin
  insert into ads(title) values ('Non admin');
  raise exception 'NON doveva passare';
exception when insufficient_privilege then raise notice 'G24 solo admin crea banner: OK'; end $$;
do $$ begin
  perform * from admin_users();
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%autorizzato%' then raise notice 'G25 lista iscritti solo admin: OK'; else raise; end if;
end $$;
reset role;
insert into app_admins(user_id) values ('f1f1f1f1-0000-0000-0000-000000000001');
set role authenticated;
insert into ads(title, body, link_url, color) values ('Kymera', 'Birre artigianali', 'https://example.com', '#7b3fa0'), ('Chiara', 'Spenta', null, '#1f3a5f');
update ads set active = false where title = 'Chiara';
select 'G26 admin vede gli iscritti' t, count(*) >= 3 as pass from admin_users();
select set_config('request.jwt.claims','{"sub":"f2f2f2f2-0000-0000-0000-000000000002","email":"giocatore@example.com"}',false);
select 'G27 utenti vedono solo banner attivi' t, (count(*) = 1 and min(title) = 'Kymera') as pass from ads;
set role anon;
select set_config('request.jwt.claims','{}',false);
select 'G28 anche senza accesso' t, count(*) = 1 as pass from ads;
reset role;
