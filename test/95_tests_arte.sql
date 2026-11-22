-- Ubi Arte: artisti, mostre, anteprima dell'artista, recensioni pubbliche, numeri
\set ON_ERROR_STOP 1
reset role;
insert into auth.users(id, email) values
 ('a5a5a5a5-0000-0000-0000-000000000001','adm5@example.com'),   -- amministratore
 ('a5a5a5a5-0000-0000-0000-000000000002','art5@example.com'),   -- l'artista
 ('a5a5a5a5-0000-0000-0000-000000000003','vis5@example.com')    -- un visitatore
 on conflict do nothing;
insert into app_admins(user_id) values ('a5a5a5a5-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.profiles(id, display_name, privacy_version) values ('a5a5a5a5-0000-0000-0000-000000000003','Lucia','t') on conflict do nothing;
delete from public.artists where slug = 'pittore-prova'; delete from public.contents where share_slug in ('opera1t','opera2t'); delete from public.unlocks where user_id = 'a5a5a5a5-0000-0000-0000-000000000003';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
insert into public.artists(id, slug, name, bio, socials, shop_url, active)
 values ('a7000000-0000-0000-0000-000000000001','pittore-prova','Pittore Prova','Bio','{"instagram":"https://instagram.com/x"}','https://shop.example.com', false);
insert into public.exhibitions(id, artist_id, owner_id, title, place_name, published)
 values ('e7000000-0000-0000-0000-000000000001','a7000000-0000-0000-0000-000000000001','a5a5a5a5-0000-0000-0000-000000000001','Mostra di prova','Piazza Prova', true);
insert into public.contents(id, owner_id, title, media_type, media_path, text_body, lat, lng, unlock_radius_m, share_slug, visibility, exhibition_id, exhibition_step, tags, art)
 values ('c7000000-0000-0000-0000-000000000001','a5a5a5a5-0000-0000-0000-000000000001','Opera 1','photo','a5a5a5a5-0000-0000-0000-000000000001/c7000000-0000-0000-0000-000000000001/media.jpg','Descrizione 1',45.65,13.77,15,'opera1t','public','e7000000-0000-0000-0000-000000000001',1,'{arte,art-1}','{"year":"2024","technique":"Olio su tela","comment":"segreto"}'),
        ('c7000000-0000-0000-0000-000000000002','a5a5a5a5-0000-0000-0000-000000000001','Opera 2','text',null,'Descrizione 2',45.651,13.771,15,'opera2t','hidden','e7000000-0000-0000-0000-000000000001',2,'{arte,art-2}','{}');
-- prima del consenso (artista non attivo) il pubblico non vede niente
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin if public.artist_page('pittore-prova') is not null then raise exception 'FAIL pagina visibile prima del consenso'; end if; end $$;
do $$ begin if public.exhibition_view('e7000000-0000-0000-0000-000000000001') is not null then raise exception 'FAIL mostra visibile prima del consenso'; end if; end $$;
do $$ begin if (select count(*) from public.artists) <> 0 then raise exception 'FAIL artisti leggibili'; end if; end $$;
-- l'admin attiva l'artista e collega il suo account
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000001"}',false);
update public.artists set active = true where id = 'a7000000-0000-0000-0000-000000000001';
do $$ begin if not public.admin_artist_set_user('a7000000-0000-0000-0000-000000000001','ART5@example.com') then raise exception 'FAIL collegamento'; end if; end $$;
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ declare j jsonb := public.artist_page('pittore-prova'); begin
  if j is null or jsonb_array_length(j->'exhibitions') <> 1 then raise exception 'FAIL pagina %', j; end if;
  if j->'artist' ? 'user_id' then raise exception 'FAIL user_id esposto'; end if; end $$;
do $$ declare j jsonb := public.exhibition_view('e7000000-0000-0000-0000-000000000001'); begin
  if jsonb_array_length(j->'stops') <> 1 then raise exception 'FAIL la postazione nascosta si vede: %', j->'stops'; end if; end $$;
-- scheda dell'opera: prima dello sblocco niente commento
do $$ declare j jsonb := public.art_info('opera1t'); begin
  if j->'art' ? 'comment' then raise exception 'FAIL commento visibile prima dello sblocco'; end if;
  if j->'art'->>'technique' <> 'Olio su tela' then raise exception 'FAIL tecnica'; end if;
  if (j->>'steps')::int <> 2 then raise exception 'FAIL numero opere'; end if;
  if (j->>'can_preview')::boolean then raise exception 'FAIL anteprima ad anonimo'; end if; end $$;
do $$ begin if public.art_info('opera2t') is not null then raise exception 'FAIL opera nascosta visibile'; end if; end $$;
-- il visitatore: niente anteprima, niente numeri
reset role; set role authenticated;
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000003"}',false);
do $$ begin if (select status from public.art_preview('opera1t')) <> 'not_allowed' then raise exception 'FAIL anteprima a visitatore'; end if; end $$;
do $$ begin perform public.art_stats('a7000000-0000-0000-0000-000000000001'); raise exception 'FAIL numeri a visitatore'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
-- sblocca sul posto, risponde e rende pubblica la recensione
do $$ begin if (select status from public.unlock('opera1t', 45.65, 13.77, 5, null)) <> 'ok' then raise exception 'FAIL sblocco'; end if; end $$;
do $$ declare j jsonb := public.art_info('opera1t'); begin if j->'art'->>'comment' <> 'segreto' then raise exception 'FAIL commento dopo sblocco'; end if; end $$;
select public.add_reply('d7000000-0000-0000-0000-000000000001','opera1t','text',null,'Bellissima!',null);
select public.reply_set_public('d7000000-0000-0000-0000-000000000001', true);
select public.art_click('a7000000-0000-0000-0000-000000000001','instagram','opera1t');
-- l'artista: anteprima da lontano, opera nascosta compresa, e i suoi numeri
select set_config('request.jwt.claims','{"sub":"a5a5a5a5-0000-0000-0000-000000000002"}',false);
do $$ begin if (select status from public.art_preview('opera2t')) <> 'ok' then raise exception 'FAIL anteprima artista'; end if; end $$;
do $$ begin if not (public.art_info('opera2t')->>'can_preview')::boolean then raise exception 'FAIL can_preview'; end if; end $$;
do $$ declare r record; begin select * into r from public.art_stats('a7000000-0000-0000-0000-000000000001') where step = 1;
  if r.unlocks <> 1 or r.public_reviews <> 1 then raise exception 'FAIL numeri %', r; end if; end $$;
do $$ begin if (select clicks from public.art_click_stats('a7000000-0000-0000-0000-000000000001') where kind = 'instagram') <> 1 then raise exception 'FAIL clic'; end if; end $$;
do $$ begin if (select count(*) from public.my_artists()) <> 1 then raise exception 'FAIL my_artists'; end if; end $$;
-- l'artista può aggiungere i luoghi dove vedere le opere dal vivo
insert into public.artist_places(artist_id, name, from_date, to_date) values ('a7000000-0000-0000-0000-000000000001','Museo Prova', current_date, current_date + 30);
reset role; set role anon; select set_config('request.jwt.claims','{}',false);
do $$ begin if (select count(*) from public.artist_reviews('pittore-prova')) <> 1 then raise exception 'FAIL recensioni pubbliche'; end if; end $$;
do $$ begin if jsonb_array_length(public.artist_page('pittore-prova')->'places') <> 1 then raise exception 'FAIL luoghi'; end if; end $$;
do $$ begin perform public.art_click('a7000000-0000-0000-0000-000000000001','shop',null); end $$;
reset role;
select 'OK arte' as esito;
