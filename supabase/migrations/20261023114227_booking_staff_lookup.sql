-- Support composite staff ownership/foreign-key lookups.
create index staff_services_staff_idx on public.staff_services(staff_id,venue_id);
