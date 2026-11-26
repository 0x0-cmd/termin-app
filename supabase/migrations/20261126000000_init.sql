-- Termin-App: Phase-1-Datenmodell
-- Zeitzone der Betriebe standardmäßig Europe/Vienna; alle Zeitpunkte als timestamptz.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Betriebe
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 1 and 120),
  phone text,
  address text,
  timezone text not null default 'Europe/Vienna',
  slot_interval_min int not null default 15 check (slot_interval_min in (5, 10, 15, 20, 30, 60)),
  min_notice_min int not null default 60 check (min_notice_min >= 0),
  booking_horizon_days int not null default 60 check (booking_horizon_days between 1 and 365),
  reminder_hours int not null default 24 check (reminder_hours between 1 and 72),
  send_confirmation boolean not null default true,
  plan text not null default 'trial' check (plan in ('trial', 'solo', 'team')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index on public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- Leistungen
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  duration_min int not null check (duration_min between 5 and 600),
  price_cents int check (price_cents >= 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.services (business_id);

-- ---------------------------------------------------------------------------
-- Mitarbeiter
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.staff (business_id);

-- Welche Mitarbeiter welche Leistung anbieten
create table public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);
create index on public.staff_services (service_id);

-- ---------------------------------------------------------------------------
-- Öffnungszeiten (pro Wochentag, 1 = Montag … 7 = Sonntag; ISO)
-- Mehrere Zeilen pro Tag erlaubt. Kein Eintrag = geschlossen.
-- ---------------------------------------------------------------------------
create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  opens time not null,
  closes time not null,
  check (closes > opens)
);
create index on public.opening_hours (business_id);

-- Wiederkehrende Pausen (z. B. Mittagspause), für den ganzen Betrieb oder einen Mitarbeiter
create table public.breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  starts time not null,
  ends time not null,
  check (ends > starts)
);
create index on public.breaks (business_id);

-- Urlaub / Abwesenheit, ganzer Betrieb (staff_id null) oder einzelner Mitarbeiter
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);
create index on public.time_off (business_id, starts_at);

-- ---------------------------------------------------------------------------
-- Kunden (nur Name + Telefon, kein Konto)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'), -- leer erlaubt bei telefonisch eingetragenen Kunden
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

-- ---------------------------------------------------------------------------
-- Termine
-- ---------------------------------------------------------------------------
create type public.appointment_status as enum ('booked', 'confirmed', 'cancelled', 'no_show', 'completed');
create type public.appointment_source as enum ('online', 'manual');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  source public.appointment_source not null default 'online',
  note text,
  manage_token uuid not null unique default gen_random_uuid(),
  reminder_sent_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Doppelbuchungen eines Mitarbeiters verhindern (abgesagte zählen nicht)
  constraint appointments_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled'))
);
create index on public.appointments (business_id, starts_at);
create index appointments_reminder_due on public.appointments (starts_at)
  where reminder_sent_at is null and status in ('booked', 'confirmed');

-- ---------------------------------------------------------------------------
-- Versendete Nachrichten (SMS-Kontingent laut Tarif, Nachvollziehbarkeit)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  kind text not null check (kind in ('confirmation', 'reminder', 'cancellation')),
  channel text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  to_phone text not null,
  body text not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index on public.messages (business_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Betriebsinhaber sehen und ändern nur ihre eigenen Daten.
-- Die öffentliche Buchungsseite läuft serverseitig mit dem Service-Role-Key
-- und prüft dort selbst (siehe src/lib/booking).
-- ---------------------------------------------------------------------------
create or replace function public.owns_business(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.opening_hours enable row level security;
alter table public.breaks enable row level security;
alter table public.time_off enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.messages enable row level security;

create policy "owner all" on public.businesses
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner all" on public.services
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.staff
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.opening_hours
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.breaks
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.time_off
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.customers
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner all" on public.appointments
  for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "owner read" on public.messages
  for select to authenticated using (public.owns_business(business_id));

create policy "owner all" on public.staff_services
  for all to authenticated
  using (exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id)))
  with check (
    exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id))
    and exists (select 1 from public.services v where v.id = service_id and public.owns_business(v.business_id))
  );

-- Mitarbeiter/Leistung/Kunde eines Termins müssen zum selben Betrieb gehören
create or replace function public.check_appointment_refs()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.staff where id = new.staff_id and business_id = new.business_id) then
    raise exception 'staff does not belong to business';
  end if;
  if new.service_id is not null and not exists (select 1 from public.services where id = new.service_id and business_id = new.business_id) then
    raise exception 'service does not belong to business';
  end if;
  if new.customer_id is not null and not exists (select 1 from public.customers where id = new.customer_id and business_id = new.business_id) then
    raise exception 'customer does not belong to business';
  end if;
  return new;
end $$;

create trigger appointments_check_refs
  before insert or update of business_id, staff_id, service_id, customer_id on public.appointments
  for each row execute function public.check_appointment_refs();
