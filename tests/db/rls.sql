-- Transactional fixtures: no users, businesses, appointments or profiles persist.
begin;
insert into auth.users(id) values
('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002'),
('a1000000-0000-4000-8000-000000000003'),('a1000000-0000-4000-8000-000000000004');
insert into public.profiles(id,display_name) values
('a1000000-0000-4000-8000-000000000001','Customer A'),('a1000000-0000-4000-8000-000000000002','Customer B');
insert into public.businesses(id,owner_id,name) values
('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','Fixture business A'),
('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004','Fixture business B');
insert into public.venues(id,business_id,slug,name,city,category,published) values
('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','fixture-public-a','Fixture A','Tbilisi','Hair',true),
('c1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','fixture-draft-a','Fixture Draft','Tbilisi','Hair',false),
('c1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000002','fixture-public-b','Fixture B','Tbilisi','Nails',true);
insert into public.services(id,venue_id,name,duration_minutes,price_minor,active) values
('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Fixture active',30,2500,true),
('d1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','Fixture inactive',30,2500,false),
('d1000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000002','Fixture draft service',30,2500,true),
('d1000000-0000-4000-8000-000000000004','c1000000-0000-4000-8000-000000000003','Fixture other',30,2500,true);
insert into public.staff(id,venue_id,display_name,active) values
('e1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Fixture Staff A',true),
('e1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','Fixture Staff B',true);
insert into public.appointments(customer_id,venue_id,service_id,staff_id,service_name,starts_at,ends_at,price_minor) values
('a1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Fixture service A','2030-01-01 10:00Z','2030-01-01 10:30Z',2500),
('a1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000002','Fixture service B','2030-01-01 10:00Z','2030-01-01 10:30Z',2500);

set local role anon;
do $$ begin
  if (select count(*) from public.venues where slug like 'fixture-%') <> 2 then raise exception 'Anon venue isolation failed'; end if;
  if (select count(*) from public.services where name like 'Fixture%') <> 2 then raise exception 'Anon service visibility failed'; end if;
  if has_table_privilege('anon','public.appointments','SELECT') or has_table_privilege('anon','public.profiles','SELECT') or has_table_privilege('anon','public.businesses','SELECT') then raise exception 'Anon private table access'; end if;
  if has_table_privilege('anon','public.venues','INSERT') then raise exception 'Anon write privilege'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.profiles where id::text like 'a1000000-%') <> 1 then raise exception 'Customer profile isolation failed'; end if;
  if (select count(*) from public.appointments where service_name like 'Fixture%') <> 1 then raise exception 'Customer appointment isolation failed'; end if;
  if exists(select 1 from public.businesses where name like 'Fixture%') then raise exception 'Customer business exposure'; end if;
  update public.profiles set display_name='Allowed' where id='a1000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Own profile update failed'; end if;
  update public.profiles set display_name='Denied' where id='a1000000-0000-4000-8000-000000000002';
  if found then raise exception 'Cross-user profile update allowed'; end if;
  update public.venues set name='Denied' where id='c1000000-0000-4000-8000-000000000001';
  if found then raise exception 'Customer venue update allowed'; end if;
  begin
    insert into public.profiles(id) values ('a1000000-0000-4000-8000-000000000003');
    raise exception 'Cross-user profile insert allowed';
  exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','public.appointments','INSERT') or has_table_privilege('authenticated','public.appointments','UPDATE') or has_table_privilege('authenticated','public.appointments','DELETE') then raise exception 'Appointment writes enabled prematurely'; end if;
  if has_table_privilege('authenticated','public.businesses','INSERT') or has_table_privilege('authenticated','public.businesses','UPDATE') then raise exception 'Client business escalation enabled'; end if;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$ begin
  if (select count(*) from public.businesses where name like 'Fixture%') <> 1 then raise exception 'Business ownership isolation failed'; end if;
  if (select count(*) from public.venues where slug like 'fixture-%') <> 3 then raise exception 'Owner cannot read own draft'; end if;
  if (select count(*) from public.services where name like 'Fixture%') <> 4 then raise exception 'Owner cannot read draft/inactive services'; end if;
  if (select count(*) from public.appointments where service_name like 'Fixture%') <> 1 then raise exception 'Owner appointment isolation failed'; end if;
  update public.venues set name='Allowed owner edit' where id='c1000000-0000-4000-8000-000000000001';
  if not found then raise exception 'Owner edit failed'; end if;
  update public.venues set name='Denied' where id='c1000000-0000-4000-8000-000000000003';
  if found then raise exception 'Cross-business update allowed'; end if;
  begin
    update public.venues set business_id='b1000000-0000-4000-8000-000000000002' where id='c1000000-0000-4000-8000-000000000001';
    raise exception 'Venue ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.services set venue_id='c1000000-0000-4000-8000-000000000003' where id='d1000000-0000-4000-8000-000000000002';
    raise exception 'Service ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.staff set venue_id='c1000000-0000-4000-8000-000000000003' where id='e1000000-0000-4000-8000-000000000001';
    raise exception 'Staff ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: anonymous, customer, owner, cross-tenant, reassignment and fail-closed write checks' as result;
rollback;
