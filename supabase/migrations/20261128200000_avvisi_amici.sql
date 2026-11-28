-- v.148: avvisi email agli amici, interruttore nel profilo, Novità con amici
alter table public.profiles add column if not exists friend_mail boolean not null default true;
-- (funzioni friend_mail_get / friend_mail_set e follow_feed con is_friend: applicate su Supabase il 28/11/2026)
