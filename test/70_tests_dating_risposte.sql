\set ON_ERROR_STOP 1
-- Dating (solo 18+, anonimato fino al doppio sì) e risposte ai pin
reset role;
insert into auth.users values
 ('e1e1e1e1-0000-0000-0000-000000000001','lei@example.com',null),
 ('e2e2e2e2-0000-0000-0000-000000000002','minore@example.com',null),
 ('e3e3e3e3-0000-0000-0000-000000000003','lui@example.com',null),
 ('e4e4e4e4-0000-0000-0000-000000000004','curioso@example.com',null);
set role authenticated;

-- Lei (adulta) si iscrive al dating
select set_config('request.jwt.claims','{"sub":"e1e1e1e1-0000-0000-0000-000000000001","email":"lei@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Giulia','2026-11-16');
update profiles set dating_gender='f', dating_birth_date='1990-05-01', dating_consent_version='1' where id = auth.uid();
select 'D1 adulta iscritta' t, is_dating_user(auth.uid()) as pass;
insert into contents(id, owner_id, share_slug, title, hint, media_type, text_body, lat, lng, unlock_radius_m, visibility, is_dating)
values ('d1d1d1d1-0000-0000-0000-000000000001', auth.uid(), 'vetta01', 'Ami la montagna?', 'In cima', 'text', 'Ciao, amo il trekking', 45.0, 7.0, 50, 'public', true);
do $$ begin
  insert into contents(owner_id, title, media_type, text_body, lat, lng, visibility, is_dating)
  values (auth.uid(), 'x', 'text', 'x', 45, 7, 'restricted', true);
  raise exception 'NON doveva passare';
exception when check_violation then raise notice 'D2 dating solo pubblico: OK'; end $$;

-- Minorenne: non può iscriversi, non sblocca
select set_config('request.jwt.claims','{"sub":"e2e2e2e2-0000-0000-0000-000000000002","email":"minore@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Teen','2026-11-16');
do $$ begin
  update profiles set dating_gender='m', dating_birth_date = (current_date - interval '16 years')::date, dating_consent_version='1' where id = auth.uid();
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%maggiorenni%' then raise notice 'D3 minorenne rifiutato: OK'; else raise; end if;
end $$;
do $$ begin
  insert into contents(owner_id, title, media_type, text_body, lat, lng, visibility, is_dating)
  values (auth.uid(), 'x', 'text', 'x', 45, 7, 'public', true);
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%iscriviti%' then raise notice 'D4 non iscritto non crea dating: OK'; else raise; end if;
end $$;
select 'D5 teaser: autore nascosto, genere visibile' t, (author is null and author_id is null and gender = 'f' and is_dating and not i_am_dating) as pass from get_teaser('vetta01');
select 'D6 minorenne: sblocco negato' t, status = 'dating_required' as pass from unlock('vetta01', 45.0, 7.0, 5);
select 'D7 pin dating sulla mappa (rosa)' t, (is_dating and gender = 'f') as pass from map_contents(44, 6, 46, 8) where share_slug = 'vetta01';
select 'D8 non contattabile dal pin dating' t, not can_contact('e1e1e1e1-0000-0000-0000-000000000001') as pass;

-- Lui (adulto, iscritto) sblocca e risponde
select set_config('request.jwt.claims','{"sub":"e3e3e3e3-0000-0000-0000-000000000003","email":"lui@example.com"}',false);
insert into profiles(id, display_name, privacy_version, dating_gender, dating_birth_date, dating_consent_version)
values (auth.uid(),'Marco','2026-11-16','m','1988-01-01','1');
do $$ begin
  perform add_reply(null, 'vetta01', 'text', null, 'Prima di sbloccare', null);
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%sbloccato%' then raise notice 'D9 risposta senza sblocco rifiutata: OK'; else raise; end if;
end $$;
select 'D10 iscritto sblocca' t, status = 'ok' as pass from unlock('vetta01', 45.0, 7.0, 5);
select 'D11 risposta con video' t, add_reply('a0a0a0a0-0000-0000-0000-000000000001', 'vetta01', 'video',
  'e3e3e3e3-0000-0000-0000-000000000003/r-a0a0a0a0-0000-0000-0000-000000000001/video.mp4', null, 20) is not null as pass;
reset role;
insert into storage.objects(bucket_id, name) values ('media','e3e3e3e3-0000-0000-0000-000000000003/r-a0a0a0a0-0000-0000-0000-000000000001/video.mp4');
set role authenticated;
do $$ begin
  perform * from pin_replies;
  raise exception 'NON doveva passare';
exception when insufficient_privilege then raise notice 'D12 tabella risposte non leggibile direttamente: OK'; end $$;
select 'D13 mie risposte: creatore nascosto' t, (owner_id is null and owner_name is null and not revealed) as pass from my_replies();

-- Lei vede la risposta anonima e il file
select set_config('request.jwt.claims','{"sub":"e1e1e1e1-0000-0000-0000-000000000001","email":"lei@example.com"}',false);
select 'D14 risposta anonima con genere' t, (author_id is null and author_name is null and author_gender = 'm' and media_type = 'video') as pass from pin_replies_for('vetta01');
select 'D15 lei legge il video' t, count(*) = 1 as pass from storage.objects where name like '%/r-a0a0a0a0-%';
select 'D16 lei sceglie (ancora non rivelato)' t, reply_want('a0a0a0a0-0000-0000-0000-000000000001') = false as pass;
select 'D17 ancora anonimo' t, author_id is null as pass from pin_replies_for('vetta01');

-- Lui sceglie: doppio sì
select set_config('request.jwt.claims','{"sub":"e3e3e3e3-0000-0000-0000-000000000003","email":"lui@example.com"}',false);
select 'D18 doppio sì' t, reply_want('a0a0a0a0-0000-0000-0000-000000000001') as pass;
select 'D19 ora vede chi è lei' t, (owner_name = 'Giulia' and revealed) as pass from my_replies();
select 'D20 ora può scriverle' t, can_contact('e1e1e1e1-0000-0000-0000-000000000001') as pass;
select set_config('request.jwt.claims','{"sub":"e1e1e1e1-0000-0000-0000-000000000001","email":"lei@example.com"}',false);
select 'D21 lei vede Marco' t, author_name = 'Marco' as pass from pin_replies_for('vetta01');

-- Estraneo: non legge il video, non vede le risposte, non può "scegliere"
select set_config('request.jwt.claims','{"sub":"e4e4e4e4-0000-0000-0000-000000000004","email":"curioso@example.com"}',false);
select 'D22 estraneo non legge il video' t, count(*) = 0 as pass from storage.objects where name like '%/r-a0a0a0a0-%';
select 'D23 estraneo non vede risposte' t, count(*) = 0 as pass from pin_replies_for('vetta01');
do $$ begin
  perform reply_want('a0a0a0a0-0000-0000-0000-000000000001');
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%autorizzato%' then raise notice 'D24 estraneo non sceglie: OK'; else raise; end if;
end $$;

-- Pin normale (non dating): chi risponde è subito visibile, il creatore può disattivare le risposte
select set_config('request.jwt.claims','{"sub":"e1e1e1e1-0000-0000-0000-000000000001","email":"lei@example.com"}',false);
insert into contents(owner_id, share_slug, title, media_type, text_body, lat, lng, visibility)
values (auth.uid(), 'piazza01', 'Ricordo in piazza', 'text', 'Ciao a tutti', 41, 12, 'public');
select set_config('request.jwt.claims','{"sub":"e4e4e4e4-0000-0000-0000-000000000004","email":"curioso@example.com"}',false);
insert into profiles(id, display_name, privacy_version) values (auth.uid(),'Curioso','2026-11-16');
select 'D25 sblocco pin normale' t, status = 'ok' as pass from unlock('piazza01', 41, 12, 5);
select 'D26 risposta testo' t, add_reply(null, 'piazza01', 'text', null, 'Bellissimo!', null) is not null as pass;
select set_config('request.jwt.claims','{"sub":"e1e1e1e1-0000-0000-0000-000000000001","email":"lei@example.com"}',false);
select 'D27 pin normale: nome subito' t, (author_name = 'Curioso' and revealed) as pass from pin_replies_for('piazza01');
update contents set replies_enabled = false where share_slug = 'piazza01';
select set_config('request.jwt.claims','{"sub":"e4e4e4e4-0000-0000-0000-000000000004","email":"curioso@example.com"}',false);
select 'D28 rimuovo la mia risposta' t, reply_remove(id) is null as pass from my_replies() where share_slug = 'piazza01';
do $$ begin
  perform add_reply(null, 'piazza01', 'text', null, 'Ancora', null);
  raise exception 'NON doveva passare';
exception when raise_exception then
  if sqlerrm like '%disattivato%' then raise notice 'D29 risposte disattivate: OK'; else raise; end if;
end $$;
reset role;
