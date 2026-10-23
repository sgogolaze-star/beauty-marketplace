-- Initial foundation. No live catalog seed; browser preview content is fictional.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);

-- Business approval is provisioned by a trusted operator, never by signup metadata.
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 150),
  created_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100 and slug not in ('studio-muse','the-soft-room','nail-atelier')),
  name text not null check (char_length(name) between 1 and 150),
  description text not null default '' check (char_length(description) <= 4000),
  city text not null check (char_length(city) between 1 and 100),
  neighborhood text not null default '' check (char_length(neighborhood) <= 100),
  category text not null check (category in ('Hair','Nails','Skin','Massage','Brows & lashes')),
  timezone text not null default 'Asia/Tbilisi' check (timezone = 'Asia/Tbilisi'),
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index venues_business_idx on public.venues(business_id);
create index venues_discovery_idx on public.venues(city,category) where published;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 150),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_minor integer not null check (price_minor between 0 and 100000000),
  currency text not null default 'GEL' check (currency = 'GEL'),
  active boolean not null default false,
  unique (id,venue_id)
);
create index services_venue_idx on public.services(venue_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 100),
  active boolean not null default false,
  unique (id,venue_id)
);
create index staff_venue_idx on public.staff(venue_id);

-- Reads only in this release. No client insert/update/delete permissions.
-- Enable writes only alongside a transactional availability/overlap-safe booking API.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  service_id uuid not null,
  staff_id uuid not null,
  service_name text not null check (char_length(service_name) between 1 and 150),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  price_minor integer not null check (price_minor between 0 and 100000000),
  currency text not null default 'GEL' check (currency = 'GEL'),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at timestamptz not null default now(),
  foreign key(service_id,venue_id) references public.services(id,venue_id) on delete restrict,
  foreign key(staff_id,venue_id) references public.staff(id,venue_id) on delete restrict
);
create index appointments_customer_idx on public.appointments(customer_id,starts_at);
create index appointments_venue_idx on public.appointments(venue_id,starts_at);
create index appointments_service_idx on public.appointments(service_id,venue_id);
create index appointments_staff_idx on public.appointments(staff_id,venue_id);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.venues enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.appointments enable row level security;

revoke all on public.profiles,public.businesses,public.venues,public.services,public.staff,public.appointments from anon,authenticated;
grant select on public.venues,public.services,public.staff to anon,authenticated;
grant select on public.profiles,public.businesses,public.appointments to authenticated;
grant insert (id,display_name), update (display_name) on public.profiles to authenticated;
grant insert,update on public.venues,public.services,public.staff to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy businesses_read on public.businesses for select to authenticated using (owner_id = (select auth.uid()));

create policy venues_read on public.venues for select to anon,authenticated using (published);
create policy venues_owner_read on public.venues for select to authenticated using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy venues_insert on public.venues for insert to authenticated with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy venues_update on public.venues for update to authenticated using (business_id in (select id from public.businesses where owner_id = (select auth.uid()))) with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

create policy services_read on public.services for select to anon,authenticated using (active and venue_id in (select id from public.venues where published));
create policy services_owner_read on public.services for select to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy services_insert on public.services for insert to authenticated with check (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy services_update on public.services for update to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid()))) with check (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));

create policy staff_read on public.staff for select to anon,authenticated using (active and venue_id in (select id from public.venues where published));
create policy staff_owner_read on public.staff for select to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy staff_insert on public.staff for insert to authenticated with check (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy staff_update on public.staff for update to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid()))) with check (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));

create policy appointments_customer_read on public.appointments for select to authenticated using (customer_id=(select auth.uid()));
create policy appointments_business_read on public.appointments for select to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
