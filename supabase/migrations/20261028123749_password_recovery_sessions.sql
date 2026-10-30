-- Password resets require a recent server-signed recovery method and live Auth
-- session. A used permission is atomically consumed before calling Auth updateUser.
create schema recovery_private;
revoke all on schema recovery_private from public,anon,authenticated;
grant usage on schema recovery_private to authenticated;
create table recovery_private.used_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  consumed_at timestamptz not null default now()
);
alter table recovery_private.used_sessions enable row level security;
revoke all on recovery_private.used_sessions from public,anon,authenticated;

create function recovery_private.current_session() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); claims jsonb:=auth.jwt(); session text; result uuid;
begin
  if actor is null then return null;end if;
  session:=claims->>'session_id';
  if session is null or session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null;end if;
  if not exists(
    select 1 from jsonb_array_elements(case when jsonb_typeof(claims->'amr')='array' then claims->'amr' else '[]'::jsonb end) entry
    where entry->>'method'='recovery'
      and (case when entry->>'timestamp' ~ '^[0-9]{1,12}$' then (entry->>'timestamp')::numeric else 0 end)
        between extract(epoch from now())-900 and extract(epoch from now())+30
  ) then return null;end if;
  select s.id into result from auth.sessions s
    where s.id=session::uuid and s.user_id=actor and (s.not_after is null or s.not_after>now())
      and not exists(select 1 from recovery_private.used_sessions used where used.session_id=s.id);
  return result;
end $$;
create function recovery_private.status() returns boolean
language sql security definer set search_path='' as $$ select recovery_private.current_session() is not null $$;
create function recovery_private.consume() returns void
language plpgsql security definer set search_path='' as $$
declare session uuid; inserted integer;
begin
  session:=recovery_private.current_session();
  if session is null then raise exception 'recovery_session_required' using errcode='42501';end if;
  insert into recovery_private.used_sessions(session_id) values(session) on conflict(session_id) do nothing;
  get diagnostics inserted=row_count;
  if inserted<>1 then raise exception 'recovery_session_already_used' using errcode='42501';end if;
end $$;
create function public.password_recovery_status() returns boolean
language sql security invoker set search_path='' as $$ select recovery_private.status() $$;
create function public.consume_password_recovery() returns void
language sql security invoker set search_path='' as $$ select recovery_private.consume() $$;
revoke all on function recovery_private.current_session(),recovery_private.status(),recovery_private.consume(),public.password_recovery_status(),public.consume_password_recovery() from public,anon,authenticated;
grant execute on function recovery_private.status(),recovery_private.consume(),public.password_recovery_status(),public.consume_password_recovery() to authenticated;
