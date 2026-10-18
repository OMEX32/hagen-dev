-- Disposable Supabase project ONLY; apply all three migrations first.
-- Run this entire script in one connection. Synthetic records are rolled back.
begin;
select set_config('hagen.training_a',gen_random_uuid()::text,true);
select set_config('hagen.training_b',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
(current_setting('hagen.training_a')::uuid,'training-' || current_setting('hagen.training_a') || '@example.invalid'),
(current_setting('hagen.training_b')::uuid,'training-' || current_setting('hagen.training_b') || '@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('hagen.training_a'),true);
select public.complete_onboarding(
'{"display_name":"Training A","age":20,"height_cm":180,"starting_weight_estimate_kg":90,"equation":"male","timezone":"Europe/Brussels"}',
'{"maintenance_kcal":2600,"deficit_kcal":500,"food_kcal":2100,"protein_g":140,"manual_override":false}',gen_random_uuid());
do $$
declare
  today date := (now() at time zone 'Europe/Brussels')::date;
  days jsonb; exercises jsonb := '[{"key":"bird_dog","name":"Bird dog","instructions":"Keep steady.","sets":2,"reps_min":6,"reps_max":6,"per_side":true,"variation":"Bird dog"}]';
  payload jsonb; request uuid := gen_random_uuid(); routine uuid; session uuid; exercise uuid; deadline timestamptz;
begin
  select jsonb_agg(jsonb_build_object('weekday',i,'kind','strength','minutes',null)) into days from generate_series(1,7) i;
  payload := jsonb_build_object('effective_date',today,'days',days,'exercises',exercises);
  routine := public.training_write('save_routine',payload,request);
  if public.training_write('save_routine',payload,request) <> routine or (select count(*) from public.training_routines) <> 1 then raise exception 'Routine retry duplicated a revision'; end if;
  begin
    perform public.training_write('save_routine',payload || jsonb_build_object('effective_date',today+1),request);
    raise exception 'Changed retry accepted';
  exception when invalid_parameter_value then null; end;
  perform set_config('hagen.training_routine',routine::text,true);
  begin
    perform public.training_write('save_routine',payload,gen_random_uuid());
    raise exception 'Same-day routine edit accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.training_write('open',jsonb_build_object('diary_date',today+1),gen_random_uuid());
    raise exception 'Future actual session accepted';
  exception when invalid_parameter_value then null; end;
  session := public.training_write('open',jsonb_build_object('diary_date',today),gen_random_uuid());
  if public.training_write('open',jsonb_build_object('diary_date',today),gen_random_uuid()) <> session or (select count(*) from public.training_sessions) <> 1 then raise exception 'Duplicate scheduled session'; end if;
  perform set_config('hagen.training_session',session::text,true);
  select id into exercise from public.session_exercises where session_id=session;
  perform set_config('hagen.training_exercise',exercise::text,true);
  if (select count(*) from public.workout_sets where exercise_id=exercise) <> 2 or exists(select 1 from public.workout_sets where completed) then raise exception 'Invalid initial sets'; end if;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',0,'status','in_progress'),gen_random_uuid());
  request := gen_random_uuid();
  payload := jsonb_build_object('id',exercise,'revision',0,'variation','Bird dog on mat','resistance','Bodyweight','per_side',true,'sets',
    '[{"position":1,"reps":6,"reps_other":6,"weight_kg":null,"completed":true},{"position":2,"reps":null,"reps_other":null,"weight_kg":null,"completed":false}]'::jsonb);
  perform public.training_write('save_exercise',payload,request);
  perform public.training_write('save_exercise',payload,request);
  if (select revision from public.session_exercises where id=exercise) <> 1 or (select count(*) from public.workout_sets where completed) <> 1 then raise exception 'Set save or retry failed'; end if;
  begin
    perform public.training_write('save_exercise',payload,gen_random_uuid());
    raise exception 'Stale exercise overwrite accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.training_write('save_exercise',payload || jsonb_build_object('revision',1,'variation','Must roll back','sets',
      '[{"position":1,"reps":7,"reps_other":7,"completed":true},{"position":2,"reps":7,"reps_other":null,"completed":true}]'::jsonb),gen_random_uuid());
    raise exception 'Missing side reps accepted';
  exception when invalid_parameter_value then null; end;
  if (select variation from public.session_exercises where id=exercise) <> 'Bird dog on mat' or (select reps from public.workout_sets where exercise_id=exercise and position=1) <> 6 then raise exception 'Failed multi-row set save left partial changes'; end if;
  begin
    perform public.training_write('save_exercise',payload || jsonb_build_object('revision',1,'sets',
      '[{"position":1,"reps":8,"reps_other":8,"completed":true},{"position":2,"reps":8,"reps_other":8,"weight_kg":-1,"completed":true}]'::jsonb),gen_random_uuid());
    raise exception 'Negative weight accepted';
  exception when check_violation then null; end;
  if (select revision from public.session_exercises where id=exercise) <> 1 then raise exception 'Failed constraint left partial exercise'; end if;

  perform public.training_write('notes',jsonb_build_object('id',session,'revision',1,'notes','Saved before interruption','effort',4,'discomfort','Mild discomfort noted'),gen_random_uuid());
  request := gen_random_uuid(); payload := jsonb_build_object('id',session,'seconds',90);
  perform public.training_write('timer',payload,request);
  select rest_deadline into deadline from public.training_sessions where id=session;
  if deadline < clock_timestamp()+interval '85 seconds' or deadline > clock_timestamp()+interval '91 seconds' then raise exception 'Timer is not a server deadline'; end if;
  perform public.training_write('timer',payload,request);
  if (select rest_deadline from public.training_sessions where id=session) is distinct from deadline then raise exception 'Timer retry restarted rest'; end if;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',2,'status','completed','confirmed',true),gen_random_uuid());
  if (select count(*) from public.workout_sets where completed) <> 1 or (select count(*) from public.workout_sets where not completed) <> 1 then raise exception 'Completing session changed unfinished sets'; end if;
  if (select notes from public.training_sessions where id=session) <> 'Saved before interruption' or (select rest_deadline from public.training_sessions where id=session) is not null then raise exception 'Session state lost notes or retained timer'; end if;
  begin
    perform public.training_write('state',jsonb_build_object('id',session,'revision',3,'status','in_progress'),gen_random_uuid());
    raise exception 'Reopen without confirmation accepted';
  exception when invalid_parameter_value then null; end;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',3,'status','in_progress','confirmed',true),gen_random_uuid());
  perform public.training_write('state',jsonb_build_object('id',session,'revision',4,'status','skipped','confirmed',true),gen_random_uuid());
  if not exists(select 1 from public.training_sessions where id=session and status='skipped' and completed_at is null and discomfort='Mild discomfort noted') then raise exception 'Skipped is not distinct from completed'; end if;
  select jsonb_agg(jsonb_build_object('weekday',i,'kind','walk','minutes',20)) into days from generate_series(1,7) i;
  perform public.training_write('save_routine',jsonb_build_object('effective_date',today+1,'days',days,'exercises',exercises),gen_random_uuid());
  if not exists(select 1 from public.training_sessions where id=session and routine_id=routine and kind='strength') or (select prescription->>'variation' from public.session_exercises where id=exercise) <> 'Bird dog' then raise exception 'New routine rewrote a snapshot'; end if;
end;
$$;

select set_config('request.jwt.claim.sub',current_setting('hagen.training_b'),true);
select public.complete_onboarding(
'{"display_name":"Training B","age":20,"height_cm":180,"starting_weight_estimate_kg":90,"equation":"male","timezone":"Europe/Brussels"}',
'{"maintenance_kcal":2600,"deficit_kcal":500,"food_kcal":2100,"protein_g":140,"manual_override":false}',gen_random_uuid());
do $$
declare
  today date := (now() at time zone 'Europe/Brussels')::date; days jsonb;
  session uuid; cardio uuid; request uuid := gen_random_uuid(); payload jsonb;
begin
  if exists(select 1 from public.training_routines) or exists(select 1 from public.training_sessions) or exists(select 1 from public.session_exercises) or exists(select 1 from public.workout_sets) or exists(select 1 from public.cardio_logs) then raise exception 'Cross-account read'; end if;
  begin
    perform public.training_write('state',jsonb_build_object('id',current_setting('hagen.training_session'),'revision',5,'status','in_progress','confirmed',true),gen_random_uuid());
    raise exception 'Cross-account session write';
  exception when insufficient_privilege then null; end;
  begin
    perform public.training_write('save_exercise',jsonb_build_object('id',current_setting('hagen.training_exercise'),'revision',1),gen_random_uuid());
    raise exception 'Cross-account exercise write';
  exception when insufficient_privilege then null; end;
  begin
    perform public.training_write('save_cardio',jsonb_build_object('diary_date',today,'session_id',current_setting('hagen.training_session'),'kind','walk','minutes',20),gen_random_uuid());
    raise exception 'Cross-account session attachment';
  exception when insufficient_privilege then null; end;
  begin
    update public.training_sessions set notes='Intrusion' where id=current_setting('hagen.training_session')::uuid;
    raise exception 'Direct session writes allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from private.training_requests;
    raise exception 'Private receipt access allowed';
  exception when insufficient_privilege then null; end;
  select jsonb_agg(jsonb_build_object('weekday',i,'kind','walk','minutes',20)) into days from generate_series(1,7) i;
  perform public.training_write('save_routine',jsonb_build_object('effective_date',today,'days',days,'exercises',
    '[{"key":"squat","name":"Chair squat","instructions":"With control.","sets":1,"reps_min":8,"reps_max":12,"per_side":false,"variation":"Chair squat"}]'::jsonb),gen_random_uuid());
  session := public.training_write('open',jsonb_build_object('diary_date',today),gen_random_uuid());
  perform public.training_write('state',jsonb_build_object('id',session,'revision',0,'status','in_progress'),gen_random_uuid());
  begin
    perform public.training_write('state',jsonb_build_object('id',session,'revision',1,'status','completed','confirmed',true),gen_random_uuid());
    raise exception 'Walk completed without actual duration';
  exception when invalid_parameter_value then null; end;
  payload := jsonb_build_object('revision',0,'diary_date',today,'session_id',session,'kind','walk','minutes',23,'distance_km',null,'effort',3,'notes','Actual walk','discomfort','Ankle note');
  cardio := public.training_write('save_cardio',payload,request);
  perform set_config('hagen.training_cardio',cardio::text,true);
  if public.training_write('save_cardio',payload,request) <> cardio or (select sum(minutes) from public.cardio_logs) <> 23 then raise exception 'Walking retry duplicated minutes'; end if;
  begin
    perform public.training_write('save_cardio',payload,gen_random_uuid());
    raise exception 'Duplicate linked walking record accepted';
  exception when unique_violation then null; end;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',1,'status','completed','confirmed',true),gen_random_uuid());
  begin
    perform public.training_write('save_cardio',payload || jsonb_build_object('id',cardio,'minutes',25),gen_random_uuid());
    raise exception 'Closed session edited without reopening';
  exception when invalid_parameter_value then null; end;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',2,'status','in_progress','confirmed',true),gen_random_uuid());
  perform public.training_write('save_cardio',payload || jsonb_build_object('id',cardio,'minutes',25),gen_random_uuid());
  begin
    perform public.training_write('delete_cardio',jsonb_build_object('id',cardio,'revision',0,'confirmed',true),gen_random_uuid());
    raise exception 'Stale cardio deletion accepted';
  exception when serialization_failure then null; end;
  perform public.training_write('delete_cardio',jsonb_build_object('id',cardio,'revision',1,'confirmed',true),gen_random_uuid());
  if exists(select 1 from public.cardio_logs where id=cardio) then raise exception 'Cardio delete failed'; end if;
  perform public.training_write('state',jsonb_build_object('id',session,'revision',3,'status','skipped','confirmed',true),gen_random_uuid());
  -- An independent log is distinct from the scheduled session, with no duration double count.
  cardio := public.training_write('save_cardio',payload || jsonb_build_object('session_id',null,'diary_date',today-1),gen_random_uuid());
  perform set_config('hagen.training_cardio',cardio::text,true);
  begin
    perform public.training_write('save_cardio',payload || jsonb_build_object('session_id',null,'diary_date',today-1,'minutes',-1),gen_random_uuid());
    raise exception 'Negative cardio duration accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.cardio_logs) <> 1 then raise exception 'Invalid cardio left records'; end if;
end;
$$;
-- B has a cardio record; A cannot modify/delete it through the privileged RPC.
select set_config('request.jwt.claim.sub',current_setting('hagen.training_a'),true);
do $$
begin
  begin
    perform public.training_write('delete_cardio',jsonb_build_object('id',current_setting('hagen.training_cardio'),'revision',0,'confirmed',true),gen_random_uuid());
    raise exception 'Cross-account cardio deletion';
  exception when insufficient_privilege then null; end;
end;
$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  begin perform 1 from public.training_sessions; raise exception 'Anonymous read'; exception when insufficient_privilege then null; end;
  begin perform public.training_write('open','{"diary_date":"2000-01-01"}',gen_random_uuid()); raise exception 'Anonymous write'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
-- Even a privileged insertion must satisfy owner-consistent foreign keys.
do $$
begin
  begin
    insert into public.training_sessions(user_id,diary_date,routine_id,kind)
      values(current_setting('hagen.training_b')::uuid,'2000-01-01',current_setting('hagen.training_routine')::uuid,'strength');
    raise exception 'Cross-owner routine FK accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.session_exercises(user_id,session_id,position,exercise_key,prescription,variation,per_side)
      values(current_setting('hagen.training_b')::uuid,current_setting('hagen.training_session')::uuid,12,'bad','{}','Bad',false);
    raise exception 'Cross-owner session FK accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.workout_sets(user_id,exercise_id,position)
      values(current_setting('hagen.training_b')::uuid,current_setting('hagen.training_exercise')::uuid,6);
    raise exception 'Cross-owner exercise FK accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.cardio_logs(user_id,diary_date,session_id,kind,minutes)
      values(current_setting('hagen.training_b')::uuid,'2000-01-01',current_setting('hagen.training_session')::uuid,'walk',10);
    raise exception 'Cross-owner cardio FK accepted';
  exception when foreign_key_violation then null; end;
end;
$$;
delete from auth.users where id in (current_setting('hagen.training_a')::uuid,current_setting('hagen.training_b')::uuid);
select 'PASS: training retries, snapshots, partial sets, optimistic revisions, timer deadlines, cardio, isolation, owner FKs, anonymous denial, account cascade. All synthetic data rolled back.' as result;
rollback;
