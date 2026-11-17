-- UBI — Avviso email all'amministratore per ogni nuovo iscritto.
-- Il profilo nasce quando l'utente conferma l'email ed entra la prima volta (con il nome scelto):
-- a quel punto il database chiama la funzione notify-signup, che invia l'email.
-- La chiamata è asincrona (pg_net): se qualcosa va storto, l'iscrizione NON viene mai bloccata.

create extension if not exists pg_net with schema extensions;

alter table public.profiles add column if not exists signup_notified_at timestamptz;
-- gli iscritti che ci sono già non vanno segnalati
update public.profiles set signup_notified_at = coalesce(signup_notified_at, created_at) where signup_notified_at is null;

create or replace function public.notify_new_signup()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    perform net.http_post(
      url     := 'https://fghbhdmcnhskrmduroes.supabase.co/functions/v1/notify-signup',
      body    := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  exception when others then
    null; -- mai bloccare un'iscrizione per un avviso
  end;
  return new;
end $$;

revoke all on function public.notify_new_signup() from public, anon, authenticated;

drop trigger if exists on_profile_created_notify on public.profiles;
create trigger on_profile_created_notify
  after insert on public.profiles
  for each row execute function public.notify_new_signup();
