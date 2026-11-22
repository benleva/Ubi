-- Ubi Arte: link di anteprima privata (richiede 95_tests_arte.sql già eseguito)
\set ON_ERROR_STOP 1
reset role;
delete from public.exhibition_previews where exhibition_id = 'e7000000-0000-0000-0000-000000000001';
-- un visitatore non può creare il link
set role authenticated; select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000003"}',false);
do $$ begin perform public.exhibition_preview_set('e7000000-0000-0000-0000-000000000001', true); raise exception 'FAIL visitatore crea il link';
exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- il proprietario lo crea, lo legge e lo rigenera
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
select set_config('t.tok1', public.exhibition_preview_set('e7000000-0000-0000-0000-000000000001', true), false);
do $$ begin if length(current_setting('t.tok1')) <> 24 then raise exception 'FAIL token'; end if;
  if public.exhibition_preview_get('e7000000-0000-0000-0000-000000000001') <> current_setting('t.tok1') then raise exception 'FAIL get'; end if; end $$;
-- nessuno legge la tabella dei link, né il pubblico chiama la funzione dei dati
do $$ begin perform count(*) from public.exhibition_previews; raise exception 'FAIL tabella leggibile';
exception when insufficient_privilege then null; end $$;
do $$ begin perform public.exhibition_by_token('x'); raise exception 'FAIL by_token per gli utenti';
exception when insufficient_privilege then null; end $$;
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin perform public.exhibition_by_token('x'); raise exception 'FAIL by_token per anon';
exception when insufficient_privilege then null; end $$;
-- la funzione (service_role) vede tutte le opere, anche quelle nascoste e il commento
reset role; set role service_role;
do $$ declare j jsonb := public.exhibition_by_token(current_setting('t.tok1')); begin
  if j is null or jsonb_array_length(j->'stops') <> 2 then raise exception 'FAIL anteprima %', j; end if;
  if j->'stops'->0->'art'->>'comment' <> 'segreto' then raise exception 'FAIL scheda completa'; end if;
  if public.exhibition_by_token('0000') is not null then raise exception 'FAIL token sbagliato'; end if; end $$;
-- rigenerato: il vecchio non vale più; disattivato: niente
reset role; set role authenticated; select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
select set_config('t.tok2', public.exhibition_preview_set('e7000000-0000-0000-0000-000000000001', true), false);
reset role; set role service_role;
do $$ begin if public.exhibition_by_token(current_setting('t.tok1')) is not null then raise exception 'FAIL vecchio link'; end if;
  if public.exhibition_by_token(current_setting('t.tok2')) is null then raise exception 'FAIL nuovo link'; end if; end $$;
reset role; set role authenticated; select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
select public.exhibition_preview_set('e7000000-0000-0000-0000-000000000001', false);
reset role; set role service_role;
do $$ begin if public.exhibition_by_token(current_setting('t.tok2')) is not null then raise exception 'FAIL link disattivato'; end if; end $$;
reset role;
select 'OK anteprima';
