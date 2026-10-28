-- Public disclosure is separate from private application/review data.
create table public.provider_public_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  legal_name text check (char_length(btrim(legal_name)) between 2 and 150),
  operating_status text check (operating_status in ('company','sole_trader','individual')),
  company_code text not null default '' check (char_length(company_code)<=64),
  contact_email text not null default '' check (contact_email='' or (char_length(contact_email)<=254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  contact_phone text not null default '' check (contact_phone='' or (contact_phone ~ '^\+?[0-9 ()-]{7,25}$' and char_length(regexp_replace(contact_phone,'[^0-9]','','g')) between 7 and 15)),
  contact_address text not null default '' check (contact_address='' or char_length(btrim(contact_address)) between 5 and 300),
  ready boolean generated always as (
    legal_name is not null and operating_status is not null
    and (operating_status<>'company' or char_length(btrim(company_code))>0)
    and contact_email<>'' and contact_phone<>'' and contact_address<>''
  ) stored,
  check (operating_status='company' or company_code='')
);
alter table public.provider_public_profiles enable row level security;
revoke all on public.provider_public_profiles from public,anon,authenticated;
grant select on public.provider_public_profiles to anon,authenticated;
grant update(contact_email,contact_phone,contact_address) on public.provider_public_profiles to authenticated;
create policy provider_public_read on public.provider_public_profiles for select to anon
using (ready and exists(select 1 from public.venues v where v.business_id=provider_public_profiles.business_id and v.published));
create policy provider_authenticated_read on public.provider_public_profiles for select to authenticated
using ((ready and exists(select 1 from public.venues v where v.business_id=provider_public_profiles.business_id and v.published))
  or business_id in(select id from public.businesses where owner_id=(select auth.uid())));
create policy provider_owner_update on public.provider_public_profiles for update to authenticated
using (business_id in(select id from public.businesses where owner_id=(select auth.uid())))
with check (business_id in(select id from public.businesses where owner_id=(select auth.uid())));
comment on table public.provider_public_profiles is 'Customer-facing disclosure. Legal identity comes from approved application; only a trusted operator may correct it. Owners choose public contact fields. Never copy private addresses, phones, qualifications or review notes automatically.';

insert into public.provider_public_profiles(business_id,legal_name,operating_status,company_code)
select b.id,a.legal_name,a.operating_status,case when a.operating_status='company' then a.registration_number else '' end
from public.businesses b left join public.provider_applications a on a.approved_business_id=b.id and a.status='approved';

create function onboarding_private.provision_public_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='approved' and old.status is distinct from new.status then
    insert into public.provider_public_profiles(business_id,legal_name,operating_status,company_code)
    values(new.approved_business_id,new.legal_name,new.operating_status,case when new.operating_status='company' then new.registration_number else '' end);
  end if;
  return new;
end $$;
revoke all on function onboarding_private.provision_public_profile() from public,anon,authenticated;
create trigger provision_provider_public_profile after update on public.provider_applications for each row execute function onboarding_private.provision_public_profile();

alter table public.venues add column service_address text not null default '' check(char_length(service_address)<=300);
create schema if not exists disclosure_private;
revoke all on schema disclosure_private from public,anon,authenticated;
create function disclosure_private.guard_listing() returns trigger
language plpgsql security definer set search_path='' as $$
declare complete boolean;
begin
  if new.published then
    select p.ready into complete from public.provider_public_profiles p where p.business_id=new.business_id for share;
    if char_length(btrim(new.service_address))<5 or complete is distinct from true then
      raise exception 'public_provider_details_required' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create function disclosure_private.guard_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not new.ready and exists(select 1 from public.venues v where v.business_id=new.business_id and v.published) then
    raise exception 'unpublish_before_removing_public_details' using errcode='23514';
  end if;
  return new;
end $$;
create function disclosure_private.guard_booking() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.venues v join public.provider_public_profiles p on p.business_id=v.business_id where v.id=new.venue_id and p.ready and char_length(btrim(v.service_address))>=5) then
    raise exception 'public_provider_details_required' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function disclosure_private.guard_listing(),disclosure_private.guard_profile(),disclosure_private.guard_booking() from public,anon,authenticated;
-- Legal guards run first, preserving their error contract.
create trigger provider_listing_disclosure before insert or update on public.venues for each row execute function disclosure_private.guard_listing();
create trigger provider_profile_disclosure after update on public.provider_public_profiles for each row execute function disclosure_private.guard_profile();
create trigger provider_booking_disclosure before insert on public.appointments for each row execute function disclosure_private.guard_booking();
