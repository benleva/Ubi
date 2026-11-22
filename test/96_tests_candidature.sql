\set ON_ERROR_STOP 1
reset role; delete from public.artist_requests where phone = '3330000000';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000003"}',false);
insert into public.artist_requests(user_id, name, phone, bio, consent) values ('a5a5a5a5-0000-0000-0000-000000000003','Pittrice Prova','3330000000','Dipingo paesaggi di montagna da dieci anni.', true);
do $$ begin insert into public.artist_requests(user_id, name, phone, bio, consent) values ('a5a5a5a5-0000-0000-0000-000000000002','Altro','3330000000','Dipingo paesaggi di montagna da dieci anni.', true); raise exception 'FAIL per conto di altri'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
do $$ begin insert into public.artist_requests(user_id, name, phone, bio, consent, status) values ('a5a5a5a5-0000-0000-0000-000000000003','X','3330000000','Dipingo paesaggi di montagna da dieci anni.', true, 'accettata'); raise exception 'FAIL si auto-accetta'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
update public.artist_requests set status = 'accettata' where phone = '3330000000';
do $$ begin if (select status from public.artist_requests where phone = '3330000000') <> 'nuova' then raise exception 'FAIL utente cambia stato'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000002"}',false);
do $$ begin if (select count(*) from public.artist_requests where phone = '3330000000') <> 0 then raise exception 'FAIL altri leggono'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
update public.artist_requests set status = 'contattato' where phone = '3330000000';
do $$ begin if (select status from public.artist_requests where phone = '3330000000') <> 'contattato' then raise exception 'FAIL admin'; end if; end $$;
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin perform 1 from public.artist_requests; if found then raise exception 'FAIL anon legge'; end if; exception when insufficient_privilege then null; end $$;
reset role; select 'OK candidature' as esito;
