\set ON_ERROR_STOP 1
-- (dopo 10_..40_) Utenti: A autore (pin pubblici), B, C. Aggiungo D senza pin.
reset role;
insert into auth.users values ('dddddddd-0000-0000-0000-000000000004','dino@example.com',null);
insert into profiles(id, display_name, privacy_version) values
 ('bbbbbbbb-0000-0000-0000-000000000002','Maria','2026-11'),
 ('cccccccc-0000-0000-0000-000000000003','Carlo','2026-11'),
 ('dddddddd-0000-0000-0000-000000000004','Dino','2026-11') on conflict do nothing;
grant select, insert on public.messages to authenticated;
set role authenticated;
-- A compila il profilo
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}',false);
update profiles set bio='Guida a Roma', contact_website='https://andrea.it', contact_instagram='andrea.foto', contact_whatsapp='+393331234567', avatar_path='aaaaaaaa-0000-0000-0000-000000000001/a.jpg' where id=auth.uid();
do $$ begin update profiles set contact_website='javascript:alert(1)' where id=auth.uid(); raise exception 'NO';
exception when check_violation then raise notice 'T41 sito non valido rifiutato: OK'; end $$;
do $$ begin update profiles set contact_whatsapp='3331234567' where id=auth.uid(); raise exception 'NO';
exception when check_violation then raise notice 'T42 whatsapp senza prefisso rifiutato: OK'; end $$;
-- C (estraneo) vede il profilo di A perché A ha pin pubblici
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003"}',false);
select 'T43 C vede profilo e contatti di A' t, bio='Guida a Roma' and instagram='andrea.foto' and can_message and avatar_path like '%a.jpg' as pass from get_author('aaaaaaaa-0000-0000-0000-000000000001');
select 'T44 C vede solo i pin pubblici di A' t, string_agg(share_slug, ',' order by share_slug) = 'caccia1,testo1' as pass from author_pins('aaaaaaaa-0000-0000-0000-000000000001');
select 'T45 anteprima con id e foto autore' t, author_id = 'aaaaaaaa-0000-0000-0000-000000000001' and author_avatar like '%a.jpg' as pass from get_teaser('testo1');
-- C scrive ad A
insert into messages(recipient_id, content_id, body) select 'aaaaaaaa-0000-0000-0000-000000000001', id, 'Ciao, bella guida!' from get_teaser('testo1');
-- C non può scrivere a D (nessun pin visibile, nessun messaggio)
do $$ begin insert into messages(recipient_id, body) values ('dddddddd-0000-0000-0000-000000000004','spam'); raise exception 'NO';
exception when insufficient_privilege then raise notice 'T46 non si scrive a sconosciuti: OK'; end $$;
select 'T47 profilo di D invisibile a C' t, count(*) = 0 as pass from get_author('dddddddd-0000-0000-0000-000000000004');
-- falsificare il mittente non funziona
insert into messages(sender_id, recipient_id, body) values ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','finto');
reset role;
select 'T48 mittente forzato = chi scrive' t, sender_id = 'cccccccc-0000-0000-0000-000000000003' as pass from messages where body='finto';
set role authenticated;
-- A legge e risponde (C non ha pin, ma gli ha scritto: si può rispondere)
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}',false);
select 'T49 A ha 2 non letti' t, unread_count() = 2 as pass;
select 'T50 conversazione con C' t, other_name = 'Carlo' and unread = 2 as pass from my_conversations();
select mark_read('cccccccc-0000-0000-0000-000000000003');
select 'T51 letti dopo apertura' t, unread_count() = 0 as pass;
insert into messages(recipient_id, body) values ('cccccccc-0000-0000-0000-000000000003','Grazie Carlo!');
-- B non legge i messaggi tra A e C
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}',false);
select 'T52 B non vede messaggi altrui' t, count(*) = 0 as pass from messages;
-- C non può modificare o cancellare messaggi
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003"}',false);
do $$ begin delete from messages; raise exception 'NO';
exception when insufficient_privilege then raise notice 'T53 messaggi non cancellabili: OK'; end $$;
select 'T54 C riceve la risposta' t, last_body = 'Grazie Carlo!' and unread = 1 as pass from my_conversations();
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin perform * from get_author('aaaaaaaa-0000-0000-0000-000000000001'); raise exception 'NO';
exception when insufficient_privilege then raise notice 'T55 anonimo non vede profili: OK'; end $$;
