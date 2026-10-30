begin;
insert into auth.users(id) values ('d2100000-0000-4000-8000-000000000001'),('d2100000-0000-4000-8000-000000000002');
set local role anon;
do $$begin
  if exists(select 1 from public.legal_documents where status='draft') then raise exception 'Draft registry exposed';end if;
  if has_table_privilege('anon','public.legal_receipts','SELECT') or has_function_privilege('anon','public.record_legal_receipts(jsonb,jsonb,text,boolean)','EXECUTE') then raise exception 'Anonymous receipt access';end if;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000001',true);
do $$begin
  begin perform public.record_legal_receipts('{"terms":"2026-10-28-draft","privacy":"2026-10-28-draft"}',jsonb_build_object('terms',encode(sha256(convert_to('{}','UTF8')),'hex'),'privacy',encode(sha256(convert_to('{}','UTF8')),'hex')),'ka',false);raise exception 'Draft accepted';exception when invalid_parameter_value then null;end;
  begin insert into public.legal_receipts(user_id,kind,version,locale,action) values(auth.uid(),'terms','forged','ka','agreed');raise exception 'Direct receipt insert';exception when insufficient_privilege then null;end;
  if has_function_privilege('authenticated','legal_private.require_current(uuid,boolean)','EXECUTE') then raise exception 'Internal guard exposed';end if;
end$$;
reset role;
insert into public.legal_documents(kind,version,content_sha256,content_json,status,published_at)
select kind,'legal-test-v1',encode(sha256(convert_to('{}','UTF8')),'hex'),'{}','published',now() from unnest(array['terms','privacy','provider_terms']) kind;
do $$begin
  begin perform legal_private.require_current('d2100000-0000-4000-8000-000000000001',false);raise exception 'Missing agreements allowed';exception when invalid_parameter_value then null;end;
  begin update public.legal_documents set content_json='{"changed":true}' where kind='terms' and version='legal-test-v1';raise exception 'Published snapshot changed';exception when invalid_parameter_value then null;end;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000001',true);
do $$declare versions jsonb:='{"terms":"legal-test-v1","privacy":"legal-test-v1"}'; hashes jsonb:=jsonb_build_object('terms',encode(sha256(convert_to('{}','UTF8')),'hex'),'privacy',encode(sha256(convert_to('{}','UTF8')),'hex'));begin
  begin perform public.record_legal_receipts(versions,hashes||'{"terms":"wrong"}','en',false);raise exception 'Hash mismatch accepted';exception when invalid_parameter_value then null;end;
  begin perform public.record_legal_receipts(versions,hashes,'fr',false);raise exception 'Unknown language accepted';exception when invalid_parameter_value then null;end;
  begin perform public.record_legal_receipts(versions||'{"user_id":"d2100000-0000-4000-8000-000000000002"}',hashes,'en',false);raise exception 'Forged owner accepted';exception when invalid_parameter_value then null;end;
  perform public.record_legal_receipts(versions,hashes,'ka',false);
  perform public.record_legal_receipts(versions,hashes,'en',false);
  if (select count(*) from public.legal_receipts where user_id=auth.uid())<>2 then raise exception 'Retry duplicated receipt';end if;
  if exists(select 1 from public.legal_receipts where user_id=auth.uid() and (locale<>'ka' or recorded_at<>now() or (kind='privacy' and action<>'acknowledged'))) then raise exception 'Receipt audit overwritten or incorrect';end if;
end$$;
reset role;
select legal_private.require_current('d2100000-0000-4000-8000-000000000001',false);
do $$begin begin perform legal_private.require_current('d2100000-0000-4000-8000-000000000001',true);raise exception 'Provider skipped provider agreement';exception when invalid_parameter_value then null;end;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000001',true);
select public.record_legal_receipts('{"terms":"legal-test-v1","privacy":"legal-test-v1","provider_terms":"legal-test-v1"}',jsonb_build_object('terms',encode(sha256(convert_to('{}','UTF8')),'hex'),'privacy',encode(sha256(convert_to('{}','UTF8')),'hex'),'provider_terms',encode(sha256(convert_to('{}','UTF8')),'hex')),'ka',true);
select set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000002',true);
do $$begin if exists(select 1 from public.legal_receipts) then raise exception 'Other user receipt exposed';end if;end$$;
reset role;
select legal_private.require_current('d2100000-0000-4000-8000-000000000001',true);
do $$begin
  begin insert into public.appointments(customer_id) values('d2100000-0000-4000-8000-000000000002');raise exception 'Booking bypassed agreement guard';exception when invalid_parameter_value then null;end;
  begin insert into public.provider_applications(user_id) values('d2100000-0000-4000-8000-000000000002');raise exception 'Provider application bypassed agreement guard';exception when invalid_parameter_value then null;end;
  begin insert into public.venues(published) values(true);raise exception 'Publishing bypassed agreement guard';exception when invalid_parameter_value then null;end;
  begin insert into public.legal_documents(kind,version,content_sha256,content_json) values('terms','bad-snapshot',repeat('0',64),'{}');raise exception 'Incorrect content hash allowed';exception when check_violation then null;end;
end$$;

update public.legal_documents set status='retired' where kind='terms' and version='legal-test-v1';
insert into public.legal_documents(kind,version,content_sha256,content_json,status,published_at) values('terms','legal-test-v2',encode(sha256(convert_to('{"v":2}','UTF8')),'hex'),'{"v":2}','published',now());
do $$begin
  begin perform legal_private.require_current('d2100000-0000-4000-8000-000000000001',false);raise exception 'Old version accepted as current';exception when invalid_parameter_value then null;end;
  if not exists(select 1 from public.legal_receipts where kind='terms' and version='legal-test-v1') then raise exception 'Historical receipt lost';end if;
end$$;
select 'PASS: no draft acceptance, immutable published documents, private/idempotent server receipts, notice vs agreement, provider requirements and current-version enforcement' as result;
rollback;
