\set ON_ERROR_STOP 1
-- (dopo 10_ e 20_)
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"andrea@example.com"}',false);
update contents set tags = '{monumento,storia,guida}' where share_slug = 'testo1';
select 'T27 tag salvati' t, tags = '{monumento,storia,guida}' as pass from contents where share_slug='testo1';
do $$ begin update contents set tags = '{Sport}' where share_slug='testo1'; raise exception 'NO';
exception when check_violation then raise notice 'T28 maiuscole rifiutate: OK'; end $$;
do $$ begin update contents set tags = '{a,b,c,d,e,f,g,h,i}' where share_slug='testo1'; raise exception 'NO';
exception when check_violation then raise notice 'T29 piu di 8 tag rifiutati: OK'; end $$;
do $$ begin update contents set tags = '{"<script>"}' where share_slug='testo1'; raise exception 'NO';
exception when check_violation then raise notice 'T30 simboli rifiutati: OK'; end $$;
select set_config('request.jwt.claims','{"sub":"cccccccc-0000-0000-0000-000000000003","email":"altro@example.com"}',false);
select 'T31 mappa restituisce i tag' t, tags = '{monumento,storia,guida}' as pass from map_contents(41,12,42,13) where share_slug='testo1';
select 'T32 anteprima restituisce i tag' t, tags @> '{guida}' as pass from get_teaser('testo1');
select 'T33 sblocco ancora ok' t, status = 'ok' as pass from unlock('testo1',41.8903,12.4923,10);
