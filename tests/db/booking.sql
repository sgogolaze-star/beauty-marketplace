-- Exercise booking APIs as real API roles. All fixture data is rolled back.
begin;
insert into auth.users(id) values ('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002'),('91000000-0000-4000-8000-000000000003'),('91000000-0000-4000-8000-000000000004');
insert into public.businesses(id,owner_id,name) values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','Booking fixture business');
insert into public.venues(id,business_id,slug,name,city,category,published) values ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','booking-fixture','Booking fixture','Tbilisi','Hair',true);
insert into public.services(id,venue_id,name,duration_minutes,price_minor,active) values ('94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Booking treatment',30,7500,true),('94000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000001','Unassigned treatment',30,8500,true);
insert into public.staff(id,venue_id,display_name,active) values ('95000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Booking professional',true);
insert into public.staff_services values ('93000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001');
create temp table booking_fixture(start_time timestamptz,appointment_id uuid);
insert into booking_fixture(start_time) values ((((now() at time zone 'Asia/Tbilisi')::date+2)::timestamp+interval '10 hours') at time zone 'Asia/Tbilisi');
grant select,update on booking_fixture to authenticated;
insert into public.availability(id,staff_id,venue_id,starts_at,ends_at) select '96000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',start_time,start_time+interval '2 hours' from booking_fixture;

set local role anon;
do $$ begin
  if has_function_privilege('anon','public.book_appointment(uuid,uuid,timestamptz,uuid,integer,integer)','EXECUTE') or has_function_privilege('anon','public.list_booking_slots(uuid,date)','EXECUTE') then raise exception 'Anonymous booking APIs exposed'; end if;
  if has_table_privilege('anon','public.availability','SELECT') then raise exception 'Availability raw data exposed'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform * from public.list_booking_slots('94000000-0000-4000-8000-000000000001',current_date);raise exception 'Missing UID accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$ declare t timestamptz; a uuid; retry uuid; begin
  select start_time into t from booking_fixture;
  if (select count(*) from public.list_booking_slots('94000000-0000-4000-8000-000000000001',(t at time zone 'Asia/Tbilisi')::date))<>7 then raise exception 'Incorrect initial slot generation';end if;
  if exists(select 1 from public.availability where venue_id='93000000-0000-4000-8000-000000000001') then raise exception 'Customer can read raw availability';end if;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,gen_random_uuid(),1,30);raise exception 'Forged price accepted';exception when invalid_parameter_value then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,gen_random_uuid(),7500,15);raise exception 'Forged duration accepted';exception when invalid_parameter_value then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000001',t,gen_random_uuid(),8500,30);raise exception 'Unassigned treatment accepted';exception when invalid_parameter_value then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t+interval '1 minute',gen_random_uuid(),7500,30);raise exception 'Off-grid time accepted';exception when invalid_parameter_value then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t+interval '100 days',gen_random_uuid(),7500,30);raise exception 'Booking horizon bypass';exception when invalid_parameter_value then null;end;
  a:=public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,'97000000-0000-4000-8000-000000000001',7500,30);
  retry:=public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,'97000000-0000-4000-8000-000000000001',7500,30);
  if a<>retry then raise exception 'Idempotent retry duplicated appointment';end if;
  update booking_fixture set appointment_id=a;
  if not exists(select 1 from public.appointments where id=a and customer_id='91000000-0000-4000-8000-000000000001' and price_minor=7500 and service_name='Booking treatment' and ends_at=t+interval '30 minutes') then raise exception 'Snapshot or ownership incorrect';end if;
  if (select count(*) from public.list_booking_slots('94000000-0000-4000-8000-000000000001',(t at time zone 'Asia/Tbilisi')::date))<>5 then raise exception 'Booked overlap remains visible';end if;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t+interval '30 minutes','97000000-0000-4000-8000-000000000001',7500,30);raise exception 'Request ID reuse accepted';exception when invalid_parameter_value then null;end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$ declare t timestamptz; a uuid;begin
  select start_time,appointment_id into t,a from booking_fixture;
  if exists(select 1 from public.appointments where id=a) then raise exception 'Other customer appointment exposed';end if;
  begin perform public.cancel_appointment(a);raise exception 'Cross-customer cancellation allowed';exception when insufficient_privilege then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,gen_random_uuid(),7500,30);raise exception 'Double booking accepted';exception when exclusion_violation then null;end;
  begin perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t+interval '15 minutes',gen_random_uuid(),7500,30);raise exception 'Partial overlap accepted';exception when exclusion_violation then null;end;
  perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t+interval '30 minutes',gen_random_uuid(),7500,30);
  begin insert into public.availability(staff_id,venue_id,starts_at,ends_at) values('95000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',t+interval '3 hours',t+interval '4 hours');raise exception 'Customer can manage availability';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$ begin
  begin perform public.remove_availability('96000000-0000-4000-8000-000000000001');raise exception 'Window with bookings removed';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
do $$ begin
  begin perform public.remove_availability('96000000-0000-4000-8000-000000000001');raise exception 'Cross-owner window removal allowed';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$ declare t timestamptz; a uuid;begin
  select start_time,appointment_id into t,a from booking_fixture;
  perform public.cancel_appointment(a);perform public.cancel_appointment(a);
  if not exists(select 1 from public.list_booking_slots('94000000-0000-4000-8000-000000000001',(t at time zone 'Asia/Tbilisi')::date) where starts_at=t) then raise exception 'Cancellation did not release slot';end if;
  perform public.book_appointment('94000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001',t,gen_random_uuid(),7500,30);
end $$;
reset role;
select 'PASS: booking, idempotency, pricing, assignments, grid, overlap, cancellation, ownership and availability protections' as result;
rollback;
