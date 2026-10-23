-- Provider intent never grants permissions. Only a trusted Supabase review can
-- provision an owner record; applicants cannot write review columns or businesses.
alter table public.businesses add column provider_type text not null default 'business' check(provider_type in ('business','professional'));
create table public.provider_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_type text not null check(provider_type in ('business','professional')),
  public_name text not null check(char_length(btrim(public_name)) between 2 and 150),
  contact_name text not null check(char_length(btrim(contact_name)) between 2 and 100),
  phone text not null check(phone ~ '^\+?[0-9 ()-]{7,25}$' and char_length(regexp_replace(phone,'[^0-9]','','g')) between 7 and 15),
  city text not null check(char_length(btrim(city)) between 2 and 100),
  address_or_area text not null check(char_length(btrim(address_or_area)) between 5 and 300),
  work_mode text not null check(work_mode in ('studio','home','mobile','mixed')),
  service_categories text[] not null check(cardinality(service_categories) between 1 and 5 and service_categories <@ array['Hair','Nails','Skin','Massage','Brows & lashes']::text[] and array_position(service_categories,null) is null),
  experience_years integer not null check(experience_years between 0 and 80),
  description text not null check(char_length(btrim(description)) between 30 and 3000),
  portfolio_url text not null default '' check(char_length(portfolio_url)<=500 and (portfolio_url='' or portfolio_url ~ '^https://[^[:space:]]+$')),
  registration_number text not null default '' check(char_length(registration_number)<=64),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_reason text not null default '' check(char_length(review_reason)<=1000 and (status<>'rejected' or char_length(btrim(review_reason))>=5)),
  approved_business_id uuid references public.businesses(id) on delete restrict,
  revision integer not null default 1 check(revision>0),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check((status='approved')=(approved_business_id is not null)),
  check((status='pending')=(reviewed_at is null))
);
create index provider_applications_status_idx on public.provider_applications(status,submitted_at);
create index provider_applications_business_idx on public.provider_applications(approved_business_id);
create table public.provider_application_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.provider_applications(user_id) on delete cascade,
  revision integer not null,
  decision text not null check(decision in ('approved','rejected')),
  reason text not null,
  reviewed_at timestamptz not null default now()
);
create index provider_reviews_user_idx on public.provider_application_reviews(user_id,reviewed_at);
alter table public.provider_applications enable row level security;
alter table public.provider_application_reviews enable row level security;
revoke all on public.provider_applications,public.provider_application_reviews from public,anon,authenticated;
grant select on public.provider_applications,public.provider_application_reviews to authenticated;
create policy provider_application_self_read on public.provider_applications for select to authenticated using(user_id=(select auth.uid()));
create policy provider_reviews_self_read on public.provider_application_reviews for select to authenticated using(user_id=(select auth.uid()));
comment on table public.provider_applications is 'Review in Supabase: read the application, then change pending status to approved; or enter review_reason (at least 5 characters) and change status to rejected. Approval provisions a draft studio atomically. Never change user_id or approved_business_id manually. Approval is final in this release; suspension is a separate future workflow.';

create schema if not exists onboarding_private;
revoke all on schema onboarding_private from public,anon;
grant usage on schema onboarding_private to authenticated;

create function onboarding_private.review_application()
returns trigger language plpgsql security definer set search_path='' as $$
declare business_id uuid; venue_id uuid;
begin
  if new.user_id<>old.user_id then raise exception 'application_owner_immutable' using errcode='22023'; end if;
  if old.status='approved' then
    if new is distinct from old then raise exception 'approved_application_immutable' using errcode='22023'; end if;
    return new;
  end if;
  if new.status in ('approved','rejected') and new.status is distinct from old.status then
    if old.status<>'pending' then raise exception 'review_requires_pending' using errcode='22023'; end if;
    if new.status='rejected' and char_length(btrim(new.review_reason))<5 then raise exception 'rejection_reason_required' using errcode='22023'; end if;
    new.reviewed_at:=now();
    if new.status='approved' then
      insert into public.businesses(owner_id,name,provider_type) values(new.user_id,new.public_name,new.provider_type) returning id into business_id;
      insert into public.venues(business_id,slug,name,city,category,description,published)
      values(business_id,'provider-'||replace(business_id::text,'-',''),new.public_name,new.city,new.service_categories[1],new.description,false) returning id into venue_id;
      if new.provider_type='professional' then
        insert into public.staff(venue_id,display_name,active) values(venue_id,new.public_name,true);
      end if;
      new.approved_business_id:=business_id;
    else new.approved_business_id:=null;
    end if;
    insert into public.provider_application_reviews(user_id,revision,decision,reason) values(new.user_id,new.revision,new.status,new.review_reason);
  elsif new.status='pending' then
    new.reviewed_at:=null; new.approved_business_id:=null;
    if new.revision is distinct from old.revision or new.status is distinct from old.status then new.review_reason:=''; end if;
  end if;
  return new;
end $$;
revoke all on function onboarding_private.review_application() from public,anon,authenticated;
create trigger review_provider_application before update on public.provider_applications for each row execute function onboarding_private.review_application();

create function onboarding_private.submit(p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.provider_applications; categories text[];
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_application' using errcode='22023'; end if;
  if p_details->>'details_confirmed' is distinct from 'true' then raise exception 'confirmation_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
  select * into existing from public.provider_applications where user_id=actor for update;
  if found and existing.status='approved' then raise exception 'already_approved' using errcode='22023'; end if;
  if exists(select 1 from public.businesses where owner_id=actor) then raise exception 'existing_provider' using errcode='22023'; end if;
  select array_agg(distinct c order by c) into categories from jsonb_array_elements_text(p_details->'service_categories') c;
  insert into public.provider_applications(user_id,provider_type,public_name,contact_name,phone,city,address_or_area,work_mode,service_categories,experience_years,description,portfolio_url,registration_number)
  values(actor,p_details->>'provider_type',btrim(p_details->>'public_name'),btrim(p_details->>'contact_name'),btrim(p_details->>'phone'),btrim(p_details->>'city'),btrim(p_details->>'address_or_area'),p_details->>'work_mode',categories,(p_details->>'experience_years')::integer,btrim(p_details->>'description'),coalesce(btrim(p_details->>'portfolio_url'),''),coalesce(btrim(p_details->>'registration_number'),''))
  on conflict(user_id) do update set provider_type=excluded.provider_type,public_name=excluded.public_name,contact_name=excluded.contact_name,phone=excluded.phone,city=excluded.city,address_or_area=excluded.address_or_area,work_mode=excluded.work_mode,service_categories=excluded.service_categories,experience_years=excluded.experience_years,description=excluded.description,portfolio_url=excluded.portfolio_url,registration_number=excluded.registration_number,status='pending',review_reason='',reviewed_at=null,approved_business_id=null,revision=public.provider_applications.revision+1,submitted_at=now();
end $$;
create function public.submit_provider_application(p_details jsonb)
returns void language sql security invoker set search_path='' as $$ select onboarding_private.submit(p_details) $$;
revoke all on function onboarding_private.submit(jsonb),public.submit_provider_application(jsonb) from public,anon,authenticated;
grant execute on function onboarding_private.submit(jsonb),public.submit_provider_application(jsonb) to authenticated;
