-- Booking is the sole appointment mutation boundary; direct writes remain revoked.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create schema if not exists booking_private;
revoke all on schema booking_private from public,anon;
grant usage on schema booking_private to authenticated;

alter table public.appointments add column request_id uuid;
create unique index appointments_request_idx on public.appointments(customer_id,request_id) where request_id is not null;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (staff_id extensions.gist_uuid_ops with =, tstzrange(starts_at,ends_at,'[)') with &&)
  where (status='confirmed');

create table public.staff_services (
  venue_id uuid not null references public.venues(id) on delete restrict,
  staff_id uuid not null,
  service_id uuid not null,
  primary key(staff_id,service_id),
  foreign key(staff_id,venue_id) references public.staff(id,venue_id) on delete restrict,
  foreign key(service_id,venue_id) references public.services(id,venue_id) on delete restrict
);
create index staff_services_service_idx on public.staff_services(service_id,venue_id);
create index staff_services_venue_idx on public.staff_services(venue_id);
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null,
  venue_id uuid not null,
  starts_at timestamptz not null check(isfinite(starts_at)),
  ends_at timestamptz not null check(isfinite(ends_at) and ends_at>starts_at and ends_at<=starts_at+interval '16 hours'),
  foreign key(staff_id,venue_id) references public.staff(id,venue_id) on delete restrict,
  exclude using gist (staff_id extensions.gist_uuid_ops with =,tstzrange(starts_at,ends_at,'[)') with &&)
);
create index availability_staff_idx on public.availability(staff_id,venue_id);
create index availability_venue_idx on public.availability(venue_id);
alter table public.staff_services enable row level security;
alter table public.availability enable row level security;
revoke all on public.staff_services,public.availability from public,anon,authenticated;
grant select,insert on public.staff_services,public.availability to authenticated;
create policy staff_services_owner_read on public.staff_services for select to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy staff_services_owner_insert on public.staff_services for insert to authenticated with check (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy availability_owner_read on public.availability for select to authenticated using (venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
create policy availability_owner_insert on public.availability for insert to authenticated with check (starts_at>now() and ends_at<=now()+interval '90 days' and venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));

-- These privileged helpers live outside the exposed API schema. Every entry point
-- checks auth.uid and explicit ownership/publication conditions; none trusts metadata.
create function booking_private.list_slots(p_service_id uuid,p_day date)
returns table(staff_id uuid,staff_name text,starts_at timestamptz,ends_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_day is null or p_day<(now() at time zone 'Asia/Tbilisi')::date or p_day>(now() at time zone 'Asia/Tbilisi')::date+90 then return; end if;
  return query
    select st.id,st.display_name,t.slot,t.slot+make_interval(mins=>sv.duration_minutes)
    from public.services sv join public.venues v on v.id=sv.venue_id
    join public.staff_services ss on ss.service_id=sv.id and ss.venue_id=v.id
    join public.staff st on st.id=ss.staff_id and st.venue_id=v.id
    join public.availability a on a.staff_id=st.id and a.venue_id=v.id
    cross join lateral generate_series(a.starts_at,a.ends_at-make_interval(mins=>sv.duration_minutes),interval '15 minutes') t(slot)
    where sv.id=p_service_id and sv.active and st.active and v.published and not v.is_demo
      and a.starts_at<((p_day+1)::timestamp at time zone 'Asia/Tbilisi')
      and a.ends_at>(p_day::timestamp at time zone 'Asia/Tbilisi')
      and t.slot>now()+interval '30 minutes' and t.slot<=now()+interval '90 days'
      and (t.slot at time zone 'Asia/Tbilisi')::date=p_day
      and not exists(select 1 from public.appointments ap where ap.staff_id=st.id and ap.status='confirmed' and tstzrange(ap.starts_at,ap.ends_at,'[)') && tstzrange(t.slot,t.slot+make_interval(mins=>sv.duration_minutes),'[)'))
    order by t.slot,st.display_name,st.id limit 200;
end $$;

create function booking_private.book(p_service_id uuid,p_staff_id uuid,p_starts_at timestamptz,p_request_id uuid,p_expected_price integer,p_expected_duration integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare sv public.services; st public.staff; existing public.appointments; until_at timestamptz; result uuid; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_request_id is null or p_starts_at is null or not isfinite(p_starts_at) then raise exception 'invalid_booking' using errcode='22023'; end if;
  -- Lock one staff member and customer to serialize booking and cancellation.
  select * into st from public.staff where id=p_staff_id and active for update;
  if not found then raise exception 'slot_unavailable' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into existing from public.appointments where customer_id=actor and request_id=p_request_id;
  if found then
    if existing.service_id=p_service_id and existing.staff_id=p_staff_id and existing.starts_at=p_starts_at and existing.status='confirmed' then return existing.id; end if;
    raise exception 'request_already_used' using errcode='22023';
  end if;
  if p_starts_at<=now()+interval '30 minutes' or p_starts_at>now()+interval '90 days' then raise exception 'slot_unavailable' using errcode='22023'; end if;
  if (select count(*) from public.appointments where customer_id=actor and status='confirmed' and starts_at>now())>=10 then raise exception 'booking_limit' using errcode='22023'; end if;
  select * into sv from public.services where id=p_service_id and venue_id=st.venue_id and active for share;
  if not found then raise exception 'slot_unavailable' using errcode='22023'; end if;
  if p_expected_price is distinct from sv.price_minor or p_expected_duration is distinct from sv.duration_minutes then raise exception 'service_changed' using errcode='22023'; end if;
  perform 1 from public.venues where id=sv.venue_id and published and not is_demo for share;
  if not found then raise exception 'slot_unavailable' using errcode='22023'; end if;
  perform 1 from public.staff_services where staff_id=st.id and service_id=sv.id and venue_id=sv.venue_id for share;
  if not found then raise exception 'slot_unavailable' using errcode='22023'; end if;
  until_at:=p_starts_at+make_interval(mins=>sv.duration_minutes);
  perform 1 from public.availability a where a.staff_id=st.id and a.venue_id=sv.venue_id
    and a.starts_at<=p_starts_at and a.ends_at>=until_at
    and mod(extract(epoch from (p_starts_at-a.starts_at))::numeric,900)=0 for share;
  if not found then raise exception 'slot_unavailable' using errcode='22023'; end if;
  insert into public.appointments(customer_id,venue_id,service_id,staff_id,service_name,starts_at,ends_at,price_minor,currency,request_id)
  values(actor,sv.venue_id,sv.id,st.id,sv.name,p_starts_at,until_at,sv.price_minor,sv.currency,p_request_id) returning id into result;
  return result;
exception when exclusion_violation then raise exception 'slot_unavailable' using errcode='23P01';
end $$;

create function booking_private.cancel(p_appointment_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare ap public.appointments; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into ap from public.appointments where id=p_appointment_id;
  if not found or not (ap.customer_id=actor or exists(select 1 from public.venues v join public.businesses b on b.id=v.business_id where v.id=ap.venue_id and b.owner_id=actor)) then raise exception 'appointment_not_found' using errcode='42501'; end if;
  perform 1 from public.staff where id=ap.staff_id for update;
  select * into ap from public.appointments where id=p_appointment_id for update;
  if ap.status='cancelled' then return; end if;
  if ap.status<>'confirmed' or ap.starts_at<=now() then raise exception 'cancellation_closed' using errcode='22023'; end if;
  update public.appointments set status='cancelled' where id=ap.id;
end $$;

create function booking_private.remove_availability(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a public.availability; actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into a from public.availability where id=p_id;
  if not found or not exists(select 1 from public.venues v join public.businesses b on b.id=v.business_id where v.id=a.venue_id and b.owner_id=actor) then raise exception 'availability_not_found' using errcode='42501'; end if;
  perform 1 from public.staff where id=a.staff_id for update;
  if exists(select 1 from public.appointments ap where ap.staff_id=a.staff_id and ap.status='confirmed' and tstzrange(ap.starts_at,ap.ends_at,'[)') && tstzrange(a.starts_at,a.ends_at,'[)')) then raise exception 'availability_has_bookings' using errcode='22023'; end if;
  delete from public.availability where id=a.id;
end $$;

create function public.list_booking_slots(p_service_id uuid,p_day date)
returns table(staff_id uuid,staff_name text,starts_at timestamptz,ends_at timestamptz)
language sql stable security invoker set search_path='' as $$ select * from booking_private.list_slots(p_service_id,p_day) $$;
create function public.book_appointment(p_service_id uuid,p_staff_id uuid,p_starts_at timestamptz,p_request_id uuid,p_expected_price integer,p_expected_duration integer)
returns uuid language sql security invoker set search_path='' as $$ select booking_private.book(p_service_id,p_staff_id,p_starts_at,p_request_id,p_expected_price,p_expected_duration) $$;
create function public.cancel_appointment(p_appointment_id uuid)
returns void language sql security invoker set search_path='' as $$ select booking_private.cancel(p_appointment_id) $$;
create function public.remove_availability(p_id uuid)
returns void language sql security invoker set search_path='' as $$ select booking_private.remove_availability(p_id) $$;

revoke all on all functions in schema booking_private from public,anon,authenticated;
grant execute on all functions in schema booking_private to authenticated;
revoke all on function public.list_booking_slots(uuid,date),public.book_appointment(uuid,uuid,timestamptz,uuid,integer,integer),public.cancel_appointment(uuid),public.remove_availability(uuid) from public,anon,authenticated;
grant execute on function public.list_booking_slots(uuid,date),public.book_appointment(uuid,uuid,timestamptz,uuid,integer,integer),public.cancel_appointment(uuid),public.remove_availability(uuid) to authenticated;
