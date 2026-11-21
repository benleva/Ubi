-- Domanda «Sei già nostro cliente?» e pin collegati ai negozi
\set ON_ERROR_STOP 1
reset role;
insert into auth.users(id, email) values
 ('a9a9a9a9-0000-0000-0000-000000000001','adm9@example.com'),
 ('a9a9a9a9-0000-0000-0000-000000000002','cli9@example.com'),
 ('a9a9a9a9-0000-0000-0000-000000000003','alt9@example.com') on conflict do nothing;
insert into app_admins(user_id) values ('a9a9a9a9-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.businesses(id, name, enabled, cashier_token) values ('b9b9b9b9-0000-0000-0000-000000000001','Garden Test',true,'TOKEN9TEST0001') on conflict do nothing;
insert into public.contents(id, owner_id, title, media_type, text_body, lat, lng, unlock_radius_m, share_slug)
 values ('c9c9c9c9-0000-0000-0000-000000000001','a9a9a9a9-0000-0000-0000-000000000001','Stella','text','x',45.87,9.96,15,'stella9') on conflict do nothing;
set role authenticated;
-- un utente normale non può collegare pin
select set_config('request.jwt.claims','{"sub":"a9a9a9a9-0000-0000-0000-000000000002"}',false);
do $$ begin perform public.admin_set_pin_business('stella9','b9b9b9b9-0000-0000-0000-000000000001'); raise exception 'FAIL: non admin ha collegato'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- l'admin collega
select set_config('request.jwt.claims','{"sub":"a9a9a9a9-0000-0000-0000-000000000001"}',false);
select public.admin_set_pin_business('stella9','b9b9b9b9-0000-0000-0000-000000000001');
-- anonimo vede il negozio del pin
reset role; set role anon;
do $$ begin if (select name from public.pin_business('stella9')) <> 'Garden Test' then raise exception 'FAIL pin_business'; end if; end $$;
-- anonimo non può rispondere né leggere la tabella
do $$ begin perform public.set_customer_answer('b9b9b9b9-0000-0000-0000-000000000001','nuovo'); raise exception 'FAIL anon risponde'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
do $$ begin perform 1 from public.customer_answers; raise exception 'FAIL anon legge'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"a9a9a9a9-0000-0000-0000-000000000002"}',false);
do $$ begin if public.my_customer_answer('b9b9b9b9-0000-0000-0000-000000000001') is not null then raise exception 'FAIL gia risposto'; end if; end $$;
select public.set_customer_answer('b9b9b9b9-0000-0000-0000-000000000001','nuovo');
select public.set_customer_answer('b9b9b9b9-0000-0000-0000-000000000001','abituale'); -- ignorata: una sola risposta
do $$ begin if public.my_customer_answer('b9b9b9b9-0000-0000-0000-000000000001') <> 'nuovo' then raise exception 'FAIL risposta cambiata'; end if; end $$;
do $$ begin perform public.set_customer_answer('b9b9b9b9-0000-0000-0000-000000000001','boh'); raise exception 'FAIL risposta non valida accettata'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- un utente non può leggere le statistiche
do $$ begin perform public.admin_customer_stats(); raise exception 'FAIL stats a non admin'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"a9a9a9a9-0000-0000-0000-000000000003"}',false);
select public.set_customer_answer('b9b9b9b9-0000-0000-0000-000000000001','abituale');
select set_config('request.jwt.claims','{"sub":"a9a9a9a9-0000-0000-0000-000000000001"}',false);
do $$ declare r record; begin select * into r from public.admin_customer_stats() where business_id = 'b9b9b9b9-0000-0000-0000-000000000001';
  if r.nuovi <> 1 or r.abituali <> 1 then raise exception 'FAIL conteggi %', r; end if; end $$;
do $$ begin if (select count(*) from public.admin_business_pins('b9b9b9b9-0000-0000-0000-000000000001')) <> 1 then raise exception 'FAIL pin collegati'; end if; end $$;
reset role;
select 'OK clienti negozio' as esito;
