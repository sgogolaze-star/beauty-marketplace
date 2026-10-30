create or replace function onboarding_private.submit(p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.provider_applications; categories text[];
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_application' using errcode='22023'; end if;
  if p_details->>'details_confirmed' is distinct from 'true' then raise exception 'confirmation_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
  select * into existing from public.provider_applications where user_id=actor for update;
  if found and existing.status='pending' then raise exception 'application_pending' using errcode='22023'; end if;
  if found and existing.status='approved' then raise exception 'already_approved' using errcode='22023'; end if;
  if exists(select 1 from public.businesses where owner_id=actor) then raise exception 'existing_provider' using errcode='22023'; end if;
  select array_agg(distinct c order by c) into categories from jsonb_array_elements_text(p_details->'service_categories') c;
  insert into public.provider_applications(user_id,provider_type,public_name,contact_name,phone,city,address_or_area,work_mode,service_categories,experience_years,description,portfolio_url,registration_number)
  values(actor,p_details->>'provider_type',btrim(p_details->>'public_name'),btrim(p_details->>'contact_name'),btrim(p_details->>'phone'),btrim(p_details->>'city'),btrim(p_details->>'address_or_area'),p_details->>'work_mode',categories,(p_details->>'experience_years')::integer,btrim(p_details->>'description'),coalesce(btrim(p_details->>'portfolio_url'),''),coalesce(btrim(p_details->>'registration_number'),''))
  on conflict(user_id) do update set provider_type=excluded.provider_type,public_name=excluded.public_name,contact_name=excluded.contact_name,phone=excluded.phone,city=excluded.city,address_or_area=excluded.address_or_area,work_mode=excluded.work_mode,service_categories=excluded.service_categories,experience_years=excluded.experience_years,description=excluded.description,portfolio_url=excluded.portfolio_url,registration_number=excluded.registration_number,status='pending',review_reason='',reviewed_at=null,approved_business_id=null,revision=public.provider_applications.revision+1,submitted_at=now();
end $$;

