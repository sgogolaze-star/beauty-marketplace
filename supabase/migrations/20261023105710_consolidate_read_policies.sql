-- Combine authenticated read predicates to avoid repeated permissive policy evaluation.
drop policy venues_read on public.venues;
drop policy venues_owner_read on public.venues;
create policy venues_public_read on public.venues for select to anon using (published);
create policy venues_authenticated_read on public.venues for select to authenticated using (published or business_id in (select id from public.businesses where owner_id=(select auth.uid())));
drop policy services_read on public.services;
drop policy services_owner_read on public.services;
create policy services_public_read on public.services for select to anon using (active and venue_id in (select id from public.venues where published));
create policy services_authenticated_read on public.services for select to authenticated using ((active and venue_id in (select id from public.venues where published)) or venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
drop policy staff_read on public.staff;
drop policy staff_owner_read on public.staff;
create policy staff_public_read on public.staff for select to anon using (active and venue_id in (select id from public.venues where published));
create policy staff_authenticated_read on public.staff for select to authenticated using ((active and venue_id in (select id from public.venues where published)) or venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
drop policy appointments_customer_read on public.appointments;
drop policy appointments_business_read on public.appointments;
create policy appointments_read on public.appointments for select to authenticated using (customer_id=(select auth.uid()) or venue_id in (select v.id from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id=(select auth.uid())));
