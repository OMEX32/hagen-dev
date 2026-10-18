-- Run AFTER both migrations in a disposable Supabase test project.
-- This script makes synthetic accounts/records inside ONE transaction, tests
-- under authenticated/anon roles, and rolls everything back. No email is sent.
-- Run the complete script, never individual selected statements.
begin;
select set_config('hagen.test_a', gen_random_uuid()::text, true);
select set_config('hagen.test_b', gen_random_uuid()::text, true);
insert into auth.users(id, email) values
  (current_setting('hagen.test_a')::uuid, 'hagen-' || current_setting('hagen.test_a') || '@example.invalid'),
  (current_setting('hagen.test_b')::uuid, 'hagen-' || current_setting('hagen.test_b') || '@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('hagen.test_a'), true);
select public.complete_onboarding(
  '{"display_name":"Food test A","age":20,"height_cm":180,"starting_weight_estimate_kg":90,"equation":"male","timezone":"Europe/Brussels"}',
  '{"maintenance_kcal":2600,"deficit_kcal":500,"food_kcal":2100,"protein_g":140,"manual_override":false}', gen_random_uuid());

do $$
declare
  v_food uuid; v_log uuid; v_meal uuid; v_source uuid; v_copy uuid;
  v_request uuid := gen_random_uuid();
  v_payload jsonb;
  v_item jsonb := '{"name":"Label food","basis":"per_100g","basis_kcal":125,"basis_protein":10,"quantity":150,"serving_description":"","preparation":"cooked","notes":""}';
  v_sum numeric; v_count integer;
begin
  v_food := public.food_write('save_food', v_item, gen_random_uuid());
  perform set_config('hagen.test_food', v_food::text, true);
  v_payload := jsonb_build_object('id', v_food, 'diary_date', '2000-01-01', 'category', 'lunch', 'quantity', 150, 'notes', '');
  v_log := public.food_write('log_food', v_payload, v_request);
  if public.food_write('log_food', v_payload, v_request) <> v_log then raise exception 'Retry returned a different log'; end if;
  select count(*), sum(kcal) into v_count, v_sum from public.food_logs where diary_date = '2000-01-01';
  if v_count <> 1 or v_sum <> 187.5 then raise exception 'Scaling or duplicate guard failed'; end if;
  begin
    perform public.food_write('log_food', v_payload || '{"quantity":200}', v_request);
    raise exception 'Changed retry payload was accepted';
  exception when invalid_parameter_value then null;
  end;
  perform public.food_write('save_food', v_item || jsonb_build_object('id', v_food, 'basis_kcal', 500), gen_random_uuid());
  if (select kcal from public.food_logs where id = v_log) <> 187.5 then raise exception 'Definition edit rewrote a log'; end if;

  perform public.food_write('set_diary', '{"diary_date":"2000-01-01","complete":true,"confirmed":true}', gen_random_uuid());
  if (select completed_at from public.food_diary_days where diary_date = '2000-01-01') is null then raise exception 'Completion failed'; end if;
  perform public.food_write('save_log', v_item || jsonb_build_object('id', v_log, 'diary_date', '2000-01-02', 'category', 'lunch'), gen_random_uuid());
  if exists (select 1 from public.food_diary_days where diary_date in ('2000-01-01','2000-01-02') and completed_at is not null) then raise exception 'Moving food did not invalidate both days'; end if;
  perform public.food_write('set_diary', '{"diary_date":"2000-01-02","complete":true,"confirmed":true}', gen_random_uuid());
  perform public.food_write('delete_log', jsonb_build_object('id', v_log), gen_random_uuid());
  if (select completed_at from public.food_diary_days where diary_date = '2000-01-02') is not null then raise exception 'Delete did not reopen diary'; end if;

  v_meal := public.food_write('save_meal', jsonb_build_object('name', 'Test meal', 'items', jsonb_build_array(v_item,
    '{"name":"Quick item","basis":"total","basis_kcal":100,"basis_protein":5,"quantity":1,"serving_description":"","preparation":"raw","notes":""}'::jsonb)), gen_random_uuid());
  perform set_config('hagen.test_meal', v_meal::text, true);
  v_payload := jsonb_build_object('id', v_meal, 'diary_date', '2000-01-03', 'category', 'dinner', 'multiplier', 0.5);
  perform public.food_write('log_meal', v_payload, gen_random_uuid());
  if (select sum(kcal) from public.food_logs where diary_date = '2000-01-03') <> 143.75 then raise exception 'Meal fraction scaling failed'; end if;
  perform public.food_write('save_meal', jsonb_build_object('id', v_meal, 'name', 'Edited meal', 'items', jsonb_build_array(v_item || '{"basis_kcal":999}')), gen_random_uuid());
  if (select sum(kcal) from public.food_logs where diary_date = '2000-01-03') <> 143.75 then raise exception 'Meal edit rewrote history'; end if;

  begin
    perform public.food_write('save_meal', jsonb_build_object('name', 'Must roll back', 'items', jsonb_build_array(v_item, v_item || '{"basis_kcal":-1}')), gen_random_uuid());
    raise exception 'Invalid meal was accepted';
  exception when check_violation then null;
  end;
  if exists (select 1 from public.saved_meals where name = 'Must roll back') then raise exception 'Failed meal left a partial header'; end if;
  begin
    perform public.food_write('save_meal', '{"name":"Empty meal"}', gen_random_uuid());
    raise exception 'Missing meal items were accepted';
  exception when invalid_parameter_value then null;
  end;

  v_source := public.food_write('save_log', v_item || '{"diary_date":"2000-01-04","category":"breakfast"}', gen_random_uuid());
  perform set_config('hagen.test_log', v_source::text, true);
  perform public.food_write('set_diary', '{"diary_date":"2000-01-05","complete":true,"confirmed":true}', gen_random_uuid());
  perform public.food_write('copy_category', '{"source_date":"2000-01-04","diary_date":"2000-01-05","category":"breakfast"}', gen_random_uuid());
  select id into v_copy from public.food_logs where diary_date = '2000-01-05';
  if v_copy = v_source or v_copy is null then raise exception 'Copy is not independent'; end if;
  if (select completed_at from public.food_diary_days where diary_date = '2000-01-05') is not null then raise exception 'Copy failed to invalidate completion'; end if;
  perform public.food_write('delete_log', jsonb_build_object('id', v_copy), gen_random_uuid());
  if not exists (select 1 from public.food_logs where id = v_source) then raise exception 'Copy deletion affected source'; end if;
  perform public.food_write('log_food', jsonb_build_object('id', v_food, 'diary_date', '2000-01-06', 'category', 'snacks', 'quantity', 0.5), gen_random_uuid());
  perform public.food_write('archive_food', jsonb_build_object('id', v_food), gen_random_uuid());
  if not exists (select 1 from public.food_logs where source_food_id = v_food) then raise exception 'Archive removed history'; end if;
  -- Keep a separate active definition for cross-owner attachment tests, so
  -- archive checks cannot mask a missing ownership check.
  perform set_config('hagen.test_food', public.food_write('save_food', v_item, gen_random_uuid())::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('hagen.test_b'), true);
select public.complete_onboarding(
  '{"display_name":"Food test B","age":20,"height_cm":180,"starting_weight_estimate_kg":90,"equation":"male","timezone":"Europe/Brussels"}',
  '{"maintenance_kcal":2600,"deficit_kcal":500,"food_kcal":2100,"protein_g":140,"manual_override":false}', gen_random_uuid());
do $$
begin
  if exists (select 1 from public.food_logs) or exists (select 1 from public.saved_foods) or exists (select 1 from public.saved_meals) or exists (select 1 from public.saved_meal_items) or exists (select 1 from public.food_diary_days) then raise exception 'Account B can read account A data'; end if;
  begin
    perform public.food_write('log_meal', jsonb_build_object('id', current_setting('hagen.test_meal'), 'diary_date', '2000-01-01', 'category', 'lunch', 'multiplier', 1), gen_random_uuid());
    raise exception 'Cross-owner meal attachment accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('log_food', jsonb_build_object('id', current_setting('hagen.test_food'), 'diary_date', '2000-01-01', 'category', 'lunch', 'quantity', 1), gen_random_uuid());
    raise exception 'Cross-owner food attachment accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('delete_log', jsonb_build_object('id', current_setting('hagen.test_log')), gen_random_uuid());
    raise exception 'Cross-owner deletion accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('save_log', jsonb_build_object('id', current_setting('hagen.test_log'), 'diary_date', '2000-01-01', 'category', 'lunch', 'name', 'Intrusion', 'basis', 'total', 'basis_kcal', 1, 'basis_protein', 0, 'quantity', 1), gen_random_uuid());
    raise exception 'Cross-owner log update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('archive_food', jsonb_build_object('id', current_setting('hagen.test_food')), gen_random_uuid());
    raise exception 'Cross-owner food archive accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('save_meal', jsonb_build_object('id', current_setting('hagen.test_meal'), 'name', 'Intrusion', 'items', '[{"name":"x","basis":"total","basis_kcal":1,"basis_protein":0,"quantity":1}]'::jsonb), gen_random_uuid());
    raise exception 'Cross-owner meal update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.food_logs(user_id, diary_date, category, name, basis, basis_kcal, basis_protein, quantity, source_food_id)
    values (current_setting('hagen.test_b')::uuid, '2000-01-01', 'lunch', 'Intrusion', 'total', 1, 0, 1, current_setting('hagen.test_food')::uuid);
    raise exception 'Direct cross-owner attachment accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform 1 from public.food_logs;
    raise exception 'Anonymous table access accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.food_write('set_diary', '{"diary_date":"2000-01-01","complete":false}', gen_random_uuid());
    raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
-- Delete-test within the rollback transaction catches invalidation triggers
-- accidentally recreating child rows during an account cascade.
delete from auth.users where id in (current_setting('hagen.test_a')::uuid, current_setting('hagen.test_b')::uuid);
select 'PASS: food scaling, retries, snapshots, completion, atomicity, account isolation, anonymous denial, and account cascade. Synthetic records rolled back.' as result;
rollback;
