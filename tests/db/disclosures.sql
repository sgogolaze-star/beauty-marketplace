begin;
insert into auth.users(id) values ('f1100000-0000-4000-8000-000000000001'),('f1100000-0000-4000-8000-000000000002');
insert into public.businesses(id,owner_id,name) values ('f1200000-0000-4000-8000-000000000001','f1100000-0000-4000-8000-000000000001','Disclosure test');
insert into public.provider_public_profiles(business_id,legal_name,operating_status) values ('f1200000-0000-4000-8000-000000000001','Approved legal identity','individual');
insert into public.venues(id,business_id,slug,name,city,category) values ('f1300000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000001','disclosure-fixture','Disclosure studio','Tbilisi','Hair');
do $$begin
  begin insert into public.appointments(venue_id) values ('f1300000-0000-4000-8000-000000000001');raise exception 'Booking without disclosures accepted';exception when check_violation then null;end;
end$$;
set local role anon;
do $$begin
  if exists(select 1 from public.provider_public_profiles where business_id='f1200000-0000-4000-8000-000000000001') then raise exception 'Draft identity exposed';end if;
  if has_table_privilege('anon','public.provider_public_profiles','UPDATE') then raise exception 'Anonymous disclosure write';end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
do $$begin
  if exists(select 1 from public.provider_public_profiles where business_id='f1200000-0000-4000-8000-000000000001') then raise exception 'Other owner draft identity exposed';end if;
  update public.provider_public_profiles set contact_email='attacker@example.invalid' where business_id='f1200000-0000-4000-8000-000000000001';
  if found then raise exception 'Cross-owner contacts changed';end if;
  begin insert into public.provider_public_profiles(business_id) values(gen_random_uuid());raise exception 'Unapproved profile created';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
do $$begin
  begin update public.provider_public_profiles set legal_name='Forged legal identity' where business_id='f1200000-0000-4000-8000-000000000001';raise exception 'Approved identity editable';exception when insufficient_privilege then null;end;
  begin update public.venues set published=true where id='f1300000-0000-4000-8000-000000000001';raise exception 'Published without disclosure';exception when check_violation then null;end;
  update public.provider_public_profiles set contact_email='public@example.invalid',contact_phone='+995555000123',contact_address='Public Studio Street 10' where business_id='f1200000-0000-4000-8000-000000000001';
  begin update public.venues set published=true where id='f1300000-0000-4000-8000-000000000001';raise exception 'Published without location';exception when check_violation then null;end;
  update public.venues set service_address='Public Studio Street 12',published=true where id='f1300000-0000-4000-8000-000000000001';
  begin update public.provider_public_profiles set contact_email='' where business_id='f1200000-0000-4000-8000-000000000001';raise exception 'Live disclosure removed';exception when check_violation then null;end;
  begin update public.venues set service_address='' where id='f1300000-0000-4000-8000-000000000001';raise exception 'Live location removed';exception when check_violation then null;end;
end$$;
reset role;
set local role anon;
do $$begin
  if not exists(select 1 from public.provider_public_profiles where business_id='f1200000-0000-4000-8000-000000000001' and legal_name='Approved legal identity' and ready) then raise exception 'Published details unavailable';end if;
end$$;
reset role;
update public.venues set published=false where id='f1300000-0000-4000-8000-000000000001';
set local role anon;
do $$begin if exists(select 1 from public.provider_public_profiles where business_id='f1200000-0000-4000-8000-000000000001') then raise exception 'Unpublished profile still public';end if;end$$;
reset role;
select 'PASS: public disclosure isolation, immutable identity, publication/location guards, contact removal and unpublication privacy' as result;
rollback;
