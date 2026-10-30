-- Private identity fields support human provider review for the Georgia launch.
-- Existing applications remain explicitly unverified (NULL), never invented/backfilled.
alter table public.provider_applications
  add column legal_name text check(char_length(btrim(legal_name)) between 2 and 150),
  add column contact_address text check(char_length(btrim(contact_address)) between 5 and 300),
  add column operating_status text check(operating_status in ('company','sole_trader','individual')),
  add column country_code text check(country_code='GE'),
  add column qualification_summary text not null default '' check(char_length(qualification_summary)<=1000),
  add column declaration_version text check(declaration_version='provider-declaration-v1'),
  add column declaration_at timestamptz,
  add constraint provider_identity_complete check (
    (legal_name is null and contact_address is null and operating_status is null and country_code is null and declaration_version is null and declaration_at is null)
    or (legal_name is not null and contact_address is not null and operating_status is not null and country_code is not null and declaration_version is not null and declaration_at is not null)
  );
comment on column public.provider_applications.legal_name is 'Private review identity; not a public listing field. NULL means legacy application not yet collected.';
comment on column public.provider_applications.declaration_version is 'Applicant accuracy/authority declaration only, not acceptance of marketplace Terms or a claim of legal verification.';
create or replace function onboarding_private.submit(p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.provider_applications; categories text[];
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_application' using errcode='22023'; end if;
  if p_details->>'details_confirmed' is distinct from 'true' then raise exception 'confirmation_required' using errcode='22023'; end if;
  if coalesce(p_details->>'legal_name','')='' or coalesce(p_details->>'contact_address','')='' or coalesce(p_details->>'operating_status','') not in ('company','sole_trader','individual') or p_details->>'country_code' is distinct from 'GE' then
    raise exception 'provider_identity_required' using errcode='23514';
  end if;
  if p_details->>'operating_status'<>'company' and coalesce(btrim(p_details->>'registration_number'),'')<>'' then
    raise exception 'company_code_only' using errcode='23514';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
  select * into existing from public.provider_applications where user_id=actor for update;
  if found and existing.status='pending' then raise exception 'application_pending' using errcode='22023'; end if;
  if found and existing.status='approved' then raise exception 'already_approved' using errcode='22023'; end if;
  if exists(select 1 from public.businesses where owner_id=actor) then raise exception 'existing_provider' using errcode='22023'; end if;
  select array_agg(distinct c order by c) into categories from jsonb_array_elements_text(p_details->'service_categories') c;
  insert into public.provider_applications(user_id,provider_type,public_name,contact_name,phone,city,address_or_area,work_mode,service_categories,experience_years,description,portfolio_url,registration_number,legal_name,contact_address,operating_status,country_code,qualification_summary,declaration_version,declaration_at)
  values(actor,p_details->>'provider_type',btrim(p_details->>'public_name'),btrim(p_details->>'contact_name'),btrim(p_details->>'phone'),btrim(p_details->>'city'),btrim(p_details->>'address_or_area'),p_details->>'work_mode',categories,(p_details->>'experience_years')::integer,btrim(p_details->>'description'),coalesce(btrim(p_details->>'portfolio_url'),''),coalesce(btrim(p_details->>'registration_number'),''),btrim(p_details->>'legal_name'),btrim(p_details->>'contact_address'),p_details->>'operating_status','GE',coalesce(btrim(p_details->>'qualification_summary'),''),'provider-declaration-v1',now())
  on conflict(user_id) do update set provider_type=excluded.provider_type,public_name=excluded.public_name,contact_name=excluded.contact_name,phone=excluded.phone,city=excluded.city,address_or_area=excluded.address_or_area,work_mode=excluded.work_mode,service_categories=excluded.service_categories,experience_years=excluded.experience_years,description=excluded.description,portfolio_url=excluded.portfolio_url,registration_number=excluded.registration_number,legal_name=excluded.legal_name,contact_address=excluded.contact_address,operating_status=excluded.operating_status,country_code=excluded.country_code,qualification_summary=excluded.qualification_summary,declaration_version=excluded.declaration_version,declaration_at=excluded.declaration_at,status='pending',review_reason='',reviewed_at=null,approved_business_id=null,revision=public.provider_applications.revision+1,submitted_at=now();
end $$;

