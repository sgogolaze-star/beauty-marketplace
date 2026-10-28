begin;
insert into auth.users(id) values('e2100000-0000-4000-8000-000000000001'),('e2100000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) values('e2110000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000001'),('e2110000-0000-4000-8000-000000000002','e2100000-0000-4000-8000-000000000002');
set local role anon;
do $$begin
  if has_function_privilege('anon','public.consume_password_recovery()','EXECUTE') or has_function_privilege('anon','public.password_recovery_status()','EXECUTE') then raise exception 'Anonymous recovery access';end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','e2100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',jsonb_build_object('session_id','e2110000-0000-4000-8000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)),'user_metadata',jsonb_build_object('recovery',true))::text,true);
do $$begin
  if public.password_recovery_status() then raise exception 'Normal sign-in gained reset access';end if;
  begin perform public.consume_password_recovery();raise exception 'Normal session consumed recovery';exception when insufficient_privilege then null;end;
  if has_table_privilege('authenticated','recovery_private.used_sessions','SELECT') or has_table_privilege('authenticated','recovery_private.used_sessions','DELETE') or has_function_privilege('authenticated','recovery_private.current_session()','EXECUTE') then raise exception 'Private recovery state exposed';end if;
end$$;
-- A signed recovery method still cannot act through someone else's session.
select set_config('request.jwt.claims',jsonb_build_object('session_id','e2110000-0000-4000-8000-000000000002','amr',jsonb_build_array(jsonb_build_object('method','recovery','timestamp',extract(epoch from now())::bigint)))::text,true);
do $$begin if public.password_recovery_status() then raise exception 'Cross-user session accepted';end if;end$$;
select set_config('request.jwt.claims',jsonb_build_object('session_id','e2110000-0000-4000-8000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','recovery','timestamp',extract(epoch from now()-interval '16 minutes')::bigint)))::text,true);
do $$begin if public.password_recovery_status() then raise exception 'Expired recovery accepted';end if;end$$;
select set_config('request.jwt.claims',jsonb_build_object('session_id','e2110000-0000-4000-8000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','recovery','timestamp',extract(epoch from now()+interval '2 minutes')::bigint)))::text,true);
do $$begin if public.password_recovery_status() then raise exception 'Future recovery accepted';end if;end$$;
select set_config('request.jwt.claims','{"session_id":"invalid","amr":{"method":"recovery"}}',true);
do $$begin if public.password_recovery_status() then raise exception 'Malformed claims accepted';end if;end$$;
select set_config('request.jwt.claims',jsonb_build_object('session_id','e2110000-0000-4000-8000-000000000001','amr',jsonb_build_array(jsonb_build_object('method','recovery','timestamp',extract(epoch from now())::bigint)))::text,true);
do $$begin if not public.password_recovery_status() then raise exception 'Fresh recovery rejected';end if;end$$;
select public.consume_password_recovery();
do $$begin
  if public.password_recovery_status() then raise exception 'Used permission remained available';end if;
  begin perform public.consume_password_recovery();raise exception 'Recovery permission reused';exception when insufficient_privilege then null;end;
end$$;
reset role;
delete from auth.sessions where id='e2110000-0000-4000-8000-000000000001';
do $$begin if exists(select 1 from recovery_private.used_sessions where session_id='e2110000-0000-4000-8000-000000000001') then raise exception 'Consumed-session cleanup failed';end if;end$$;
set local role authenticated;
do $$begin if public.password_recovery_status() then raise exception 'Revoked session regained access after cleanup';end if;end$$;
reset role;
select 'PASS: recovery requires signed recent method, live owned session, private state and single-use permission; revoked sessions stay denied' as result;
rollback;
