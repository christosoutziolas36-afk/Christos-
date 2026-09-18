-- Angebotsmeister – Supabase Schema
-- Ausfuehren im Supabase SQL Editor. Danach NEXT_PUBLIC_SUPABASE_URL und
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen.
--
-- Datenhaltung: ein JSONB-Dokument pro Datensatz. Das haelt das Schema stabil,
-- waehrend sich das Produkt weiterentwickelt, und erlaubt trotzdem Indizes und
-- Row Level Security pro Betrieb (company_id).

create table if not exists company_settings (
  id text primary key,
  data jsonb not null,
  next_quote_number integer not null default 1001,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  company_id text not null,
  data jsonb not null,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists inquiries (
  id text primary key,
  company_id text not null,
  data jsonb not null,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id text primary key,
  company_id text not null,
  data jsonb not null,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id text primary key,
  company_id text not null,
  data jsonb not null,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  company_id text not null,
  data jsonb not null,
  owner_id uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_company_idx on customers (company_id);
create index if not exists inquiries_company_idx on inquiries (company_id);
create index if not exists quotes_company_idx on quotes (company_id);
create index if not exists services_company_idx on services (company_id);
create index if not exists tasks_company_idx on tasks (company_id);

-- Row Level Security: jeder Betrieb sieht nur seine eigenen Daten.
alter table company_settings enable row level security;
alter table customers enable row level security;
alter table inquiries enable row level security;
alter table quotes enable row level security;
alter table services enable row level security;
alter table tasks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['company_settings','customers','inquiries','quotes','services','tasks']
  loop
    execute format('drop policy if exists "owner_all" on %I', t);
    execute format(
      'create policy "owner_all" on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Hinweis fuer den Pilotbetrieb ohne Login:
-- Solange noch kein Supabase-Auth aktiv ist, koennen die Policies
-- voruebergehend auf "using (true) with check (true)" gesetzt werden.
-- Vor dem produktiven Einsatz mit echten Kundendaten muss Auth aktiv sein.

-- ---------------------------------------------------------------------------
-- Telefonassistent: angenommene Anrufe
-- ---------------------------------------------------------------------------
create table if not exists voice_calls (
  id text primary key,
  provider_call_id text,
  status text not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists voice_calls_status_idx on voice_calls (status);
create index if not exists voice_calls_provider_idx on voice_calls (provider_call_id);

-- Anrufe schreibt der Server ueber die Webhook-Route (Service-Role-Key).
-- Gelesen werden sie von der angemeldeten Person des Betriebs.
alter table voice_calls enable row level security;

drop policy if exists "voice_calls_read" on voice_calls;
create policy "voice_calls_read" on voice_calls for select using (auth.role() = 'authenticated');

drop policy if exists "voice_calls_write" on voice_calls;
create policy "voice_calls_write" on voice_calls for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
