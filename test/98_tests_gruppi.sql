-- Gruppi: iscrizione, pin riservati, ban, sblocco a distanza (richiede la migrazione 20261126100000_gruppi.sql)
\set ON_ERROR_STOP 1
reset role;
delete from public.contents where title like 'T98%'; delete from public.ugroups where tag like 't98-%';
insert into auth.users(id,email) values ('98000000-0000-0000-0000-00000000000a','a98@x.it'),('98000000-0000-0000-0000-00000000000b','b98@x.it'),('98000000-0000-0000-0000-00000000000c','c98@x.it') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000a","email":"a98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000a',false);
select set_config('t.gid', public.group_create('{"tag":"t98-cucina","name":"Cucina prova","privacy":"private"}')::text, false);
-- tag riservato rifiutato
do $$ begin perform public.group_create('{"tag":"comune-t98","name":"Finto comune"}'); raise exception 'FAIL tag riservato';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- B chiede di entrare (privato = in attesa), A approva
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000b","email":"b98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000b',false);
do $$ begin if public.group_join('t98-cucina') <> 'pending' then raise exception 'FAIL join privato'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000a","email":"a98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000a',false);
select public.group_member_set(current_setting('t.gid')::uuid,'98000000-0000-0000-0000-00000000000b','approve');
-- B pubblica un pin riservato e uno pubblico «anche da lontano»
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000b","email":"b98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000b',false);
insert into public.contents(owner_id,title,media_type,text_body,lat,lng,group_id,group_only) values ('98000000-0000-0000-0000-00000000000b','T98 riservato','text','x',45.6,13.7,current_setting('t.gid')::uuid,true);
insert into public.contents(owner_id,title,media_type,text_body,lat,lng,group_id,group_only,open_anywhere) values ('98000000-0000-0000-0000-00000000000b','T98 lontano','text','y',45.6,13.7,current_setting('t.gid')::uuid,false,true);
-- C, estraneo: vede solo il pubblico, lo apre da lontano; non può mettere pin nel gruppo
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000c","email":"c98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000c',false);
do $$ declare n int; begin
  select count(*) into n from public.map_contents(45,13,46,14) where title like 'T98%'; if n <> 1 then raise exception 'FAIL C vede % pin', n; end if;
end $$;
do $$ begin insert into public.contents(owner_id,title,media_type,text_body,lat,lng,group_id) values ('98000000-0000-0000-0000-00000000000c','T98 abuso','text','x',1,1,current_setting('t.gid')::uuid); raise exception 'FAIL C inserisce nel gruppo';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- A bandisce B: i pin di B tornano privati, B non rientra
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000a","email":"a98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000a',false);
select public.group_member_set(current_setting('t.gid')::uuid,'98000000-0000-0000-0000-00000000000b','ban');
select set_config('request.jwt.claims','{"sub":"98000000-0000-0000-0000-00000000000b","email":"b98@x.it"}',false);
select set_config('request.jwt.claim.sub','98000000-0000-0000-0000-00000000000b',false);
do $$ begin perform public.group_join('t98-cucina'); raise exception 'FAIL B rientra';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
do $$ declare n int; begin
  select count(*) into n from public.contents where owner_id='98000000-0000-0000-0000-00000000000b' and title like 'T98%' and group_id is null and visibility='hidden' and not open_anywhere;
  if n <> 2 then raise exception 'FAIL pin dopo ban: %', n; end if; end $$;
reset role;
delete from public.contents where title like 'T98%'; delete from public.ugroups where tag like 't98-%';
select 'gruppi: tutti i controlli superati' as esito;
