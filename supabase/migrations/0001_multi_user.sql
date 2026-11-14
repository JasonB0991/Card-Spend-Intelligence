-- Multi-user support: every user-owned row gets a user_id, and RLS limits
-- signed-in users to their own rows.
--
-- Usage: run inside a transaction with the owner's auth user id bound to the
-- custom setting `app.owner_id`, e.g.
--   select set_config('app.owner_id', '<uuid>', true);
-- Existing (pre-multi-user) rows are assigned to that owner.

-- 1. user_id columns ---------------------------------------------------------
alter table public.cards                     add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.emails                    add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.transactions              add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.platform_orders           add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.splits                    add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.transaction_order_matches add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.gmail_accounts            add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.gmail_accounts            add column if not exists consented_at timestamptz;

-- 2. Backfill existing rows to the owner -----------------------------------
update public.cards                     set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.emails                    set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.transactions              set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.platform_orders           set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.splits                    set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.transaction_order_matches set user_id = current_setting('app.owner_id')::uuid where user_id is null;
update public.gmail_accounts
   set user_id = current_setting('app.owner_id')::uuid,
       email = (select email from auth.users where id = current_setting('app.owner_id')::uuid),
       consented_at = coalesce(consented_at, now())
 where user_id is null;

alter table public.cards                     alter column user_id set not null;
alter table public.emails                    alter column user_id set not null;
alter table public.transactions              alter column user_id set not null;
alter table public.platform_orders           alter column user_id set not null;
alter table public.splits                    alter column user_id set not null;
alter table public.transaction_order_matches alter column user_id set not null;
alter table public.gmail_accounts            alter column user_id set not null;

-- 3. Uniqueness is now per user ---------------------------------------------
alter table public.emails drop constraint if exists emails_gmail_message_id_key;
alter table public.emails add constraint emails_user_gmail_message_id_key unique (user_id, gmail_message_id);

alter table public.gmail_accounts drop constraint if exists gmail_accounts_email_key;
alter table public.gmail_accounts add constraint gmail_accounts_user_id_key unique (user_id);

create index if not exists cards_user_id_idx                     on public.cards (user_id);
create index if not exists transactions_user_id_idx              on public.transactions (user_id);
create index if not exists platform_orders_user_id_idx           on public.platform_orders (user_id);
create index if not exists splits_user_id_idx                    on public.splits (user_id);
create index if not exists transaction_order_matches_user_id_idx on public.transaction_order_matches (user_id);

-- 4. Row level security ------------------------------------------------------
alter table public.cards                     enable row level security;
alter table public.emails                    enable row level security;
alter table public.transactions              enable row level security;
alter table public.platform_orders           enable row level security;
alter table public.splits                    enable row level security;
alter table public.transaction_order_matches enable row level security;
alter table public.gmail_accounts            enable row level security;
alter table public.supported_card_types      enable row level security;
alter table public.supported_platform_types  enable row level security;

create policy "own rows" on public.cards                     for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.emails                    for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.transactions              for all to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (card_id is null or exists (select 1 from public.cards c where c.id = card_id and c.user_id = (select auth.uid())))
);
create policy "own rows" on public.platform_orders           for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.transaction_order_matches for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.splits                    for all to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
);

-- Reference data: readable by any signed-in user, writable only by service role.
create policy "read reference" on public.supported_card_types     for select to authenticated using (true);
create policy "read reference" on public.supported_platform_types for select to authenticated using (true);

-- gmail_accounts holds OAuth tokens: deliberately no policies, so only the
-- service role (server code) can touch it.
