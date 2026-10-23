begin;
insert into auth.users(id) values('a2100000-0000-4000-8000-000000000001'),('a2100000-0000-4000-8000-000000000002'),('a2100000-0000-4000-8000-000000000003');
create temp table provider_fixture(details jsonb);
insert into provider_fixture values('{"provider_type":"business","public_name":"Provider fixture","contact_name":"Fixture Applicant","phone":"+995 555 123456","city":"Tbilisi","address_or_area":"Vake service area","work_mode":"studio","service_categories":["Hair"],"experience_years":3,"description":"Independent beauty services delivered with care and attention.","details_confirmed":true,"status":"approved","user_id":"a2100000-0000-4000-8000-000000000003"}');
grant select on provider_fixture to authenticated;
set local role anon;
do $$ begin
  if has_table_privilege('anon','public.provider_applications','SELECT') or has_function_privilege('anon','public.submit_provider_application(jsonb)','EXECUTE') then raise exception 'Anonymous application access';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$begin begin perform public.submit_provider_application('{}');raise exception 'Missing identity accepted';exception when insufficient_privilege then null;end;end$$;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000001',true);
do $$declare payload jsonb;begin
  select details into payload from provider_fixture;
  begin perform public.submit_provider_application(payload||'{"phone":"abc"}');raise exception 'Invalid phone accepted';exception when check_violation then null;end;
  begin perform public.submit_provider_application(payload||'{"service_categories":["Unlisted"]}');raise exception 'Invalid services accepted';exception when check_violation then null;end;
  perform public.submit_provider_application(payload);
  if not exists(select 1 from public.provider_applications where user_id=auth.uid() and status='pending' and approved_business_id is null and reviewed_at is null) then raise exception 'Forged status or identity accepted';end if;
  if exists(select 1 from public.businesses where owner_id=auth.uid()) then raise exception 'Pending applicant owns a business';end if;
  begin perform public.submit_provider_application(payload||'{"public_name":"Changed during review"}');raise exception 'Pending application changed during review';exception when invalid_parameter_value then null;end;
  begin update public.provider_applications set status='approved' where user_id=auth.uid();raise exception 'Self approval allowed';exception when insufficient_privilege then null;end;
  if has_table_privilege('authenticated','public.provider_application_reviews','INSERT') then raise exception 'Client can forge review audit';end if;
end$$;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000003',true);
do $$begin if exists(select 1 from public.provider_applications where user_id='a2100000-0000-4000-8000-000000000001') then raise exception 'Cross-user application disclosure';end if;end$$;
reset role;
do $$begin
  begin update public.provider_applications set status='rejected' where user_id='a2100000-0000-4000-8000-000000000001';raise exception 'Rejection without a reason accepted';exception when invalid_parameter_value then null;end;
end$$;
-- Table Editor can save the reason and status in separate edits.
update public.provider_applications set review_reason='Please add a clear portfolio and service area.' where user_id='a2100000-0000-4000-8000-000000000001';
update public.provider_applications set status='rejected' where user_id='a2100000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000001',true);
do $$begin
  if not exists(select 1 from public.provider_applications where user_id=auth.uid() and status='rejected' and review_reason like 'Please add%') then raise exception 'Decision not visible to applicant';end if;
  perform public.submit_provider_application((select details from provider_fixture));
  if not exists(select 1 from public.provider_applications where user_id=auth.uid() and status='pending' and revision=2 and review_reason='' and reviewed_at is null) then raise exception 'Resubmission did not reset review';end if;
  if (select count(*) from public.provider_application_reviews where user_id=auth.uid())<>1 then raise exception 'Review audit lost';end if;
end$$;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000002',true);
select public.submit_provider_application((select details||'{"provider_type":"professional","public_name":"Solo fixture","work_mode":"mobile"}' from provider_fixture));
reset role;
update public.provider_applications set status='approved' where user_id in('a2100000-0000-4000-8000-000000000001','a2100000-0000-4000-8000-000000000002');
update public.provider_applications set status='approved' where user_id='a2100000-0000-4000-8000-000000000002';
do $$begin
  if (select count(*) from public.businesses where owner_id in('a2100000-0000-4000-8000-000000000001','a2100000-0000-4000-8000-000000000002'))<>2 then raise exception 'Approval duplicated or failed';end if;
  if exists(select 1 from public.venues v join public.businesses b on b.id=v.business_id where b.owner_id in('a2100000-0000-4000-8000-000000000001','a2100000-0000-4000-8000-000000000002') and v.published) then raise exception 'Approval auto-published a studio';end if;
  if (select count(*) from public.staff s join public.venues v on v.id=s.venue_id join public.businesses b on b.id=v.business_id where b.owner_id='a2100000-0000-4000-8000-000000000002' and b.provider_type='professional')<>1 then raise exception 'Solo professional profile missing or duplicated';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000002',true);
do $$begin
  if (select count(*) from public.businesses where owner_id=auth.uid())<>1 then raise exception 'Approved provider cannot access business';end if;
  if (select count(*) from public.provider_application_reviews where user_id=auth.uid())<>1 then raise exception 'Wrong review audit visibility';end if;
  begin perform public.submit_provider_application((select details from provider_fixture));raise exception 'Approved identity changed';exception when invalid_parameter_value then null;end;
end$$;
reset role;
select 'PASS: provider privacy, no self-approval, pending lock, rejection, resubmission, audit and automatic business/solo provisioning' as result;
rollback;
