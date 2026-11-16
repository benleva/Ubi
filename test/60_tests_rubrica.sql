\set ON_ERROR_STOP 1
reset role; grant select, insert, update, delete on public.address_book to authenticated; set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}',false);
insert into address_book(name, email) values ('Maria', 'moglie@example.com'), ('Luca', 'luca@example.com');
select 'T56 contatti salvati con proprietario automatico' t, count(*) = 2 and bool_and(owner_id = auth.uid()) as pass from address_book;
do $$ begin insert into address_book(name, email) values ('Doppio', 'luca@example.com'); raise exception 'NO';
exception when unique_violation then raise notice 'T57 email doppia rifiutata: OK'; end $$;
do $$ begin insert into address_book(name, email) values ('X', 'Luca@Example.com'); raise exception 'NO';
exception when check_violation then raise notice 'T58 email maiuscola rifiutata (l app la normalizza): OK'; end $$;
do $$ begin insert into address_book(owner_id, name, email) values ('cccccccc-0000-0000-0000-000000000003','Furbo','f@x.it'); raise exception 'NO';
exception when insufficient_privilege then raise notice 'T59 non si scrive nella rubrica altrui: OK'; end $$;
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003"}',false);
select 'T60 rubrica altrui invisibile' t, count(*) = 0 as pass from address_book;
delete from address_book; update address_book set name = 'HACK';
reset role;
select 'T61 rubrica altrui intoccabile' t, count(*) = 2 and bool_and(name <> 'HACK') as pass from address_book;
