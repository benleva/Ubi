-- I numeri del negozio nella sua Cassa: pin collegati (sblocchi e nuovi iscritti),
-- risposte «Sei già cliente?» e tocchi NFC. Solo conteggi, nessun dato personale.
-- Richiede «clienti negozio» (20261121140000). Si può eseguire più volte.
create or replace function public.cashier_stats(p_token text, p_pin text)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare b public.businesses; e text;
begin
  e := public.cashier_auth(p_token, p_pin);
  if e <> 'ok' then return jsonb_build_object('status', 'error', 'message', e); end if;
  select * into b from public.businesses where cashier_token = upper(p_token);
  return jsonb_build_object(
    'pins', coalesce((select jsonb_agg(jsonb_build_object('title', c.title,
        'unlocks', (select count(*) from public.unlocks u where u.content_id = c.id),
        'signups', (select count(*) from public.profiles p where p.signup_slug = c.share_slug)) order by c.created_at)
      from public.contents c where c.business_id = b.id), '[]'::jsonb),
    'customers', (select jsonb_build_object(
        'abituali', count(*) filter (where a.answer = 'abituale'), 'occasionali', count(*) filter (where a.answer = 'occasionale'),
        'nuovi', count(*) filter (where a.answer = 'nuovo'), 'non_detto', count(*) filter (where a.answer = 'nd'))
      from public.customer_answers a where a.business_id = b.id),
    'nfc', (select jsonb_build_object('total', count(*), 'last30', count(*) filter (where t.at > now() - interval '30 days'))
      from public.nfc_taps t join public.nfc_tags g on g.code = t.code where g.business_id = b.id));
end $$;
revoke all on function public.cashier_stats(text, text) from public;
grant execute on function public.cashier_stats(text, text) to anon, authenticated;
