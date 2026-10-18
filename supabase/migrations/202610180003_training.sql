begin;

-- Immutable template revisions. JSON holds the small ordered prescription;
-- sessions materialize independent exercise/set rows before actual work is saved.
create function private.valid_training_routine(p_days jsonb, p_exercises jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare d jsonb; e jsonb;
begin
  if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days) <> 7
    or jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises) not between 1 and 12 then return false; end if;
  if (select count(distinct (value->>'weekday')::integer) from jsonb_array_elements(p_days)) <> 7
    or (select count(distinct value->>'key') from jsonb_array_elements(p_exercises)) <> jsonb_array_length(p_exercises) then return false; end if;
  for d in select value from jsonb_array_elements(p_days) loop
    if not coalesce((d->>'weekday')::integer between 1 and 7 and d->>'kind' in ('strength','walk','easy','rest')
      and case when d->>'kind' = 'walk' then (d->>'minutes')::integer between 1 and 300 else d->>'minutes' is null end, false) then return false; end if;
  end loop;
  for e in select value from jsonb_array_elements(p_exercises) loop
    if not coalesce(e->>'key' ~ '^[a-z_]{1,40}$' and char_length(btrim(e->>'name')) between 1 and 120
      and char_length(btrim(e->>'instructions')) between 1 and 2000 and char_length(btrim(e->>'variation')) between 1 and 120
      and (e->>'sets')::integer between 1 and 6 and (e->>'reps_min')::integer between 1 and 100
      and (e->>'reps_max')::integer between (e->>'reps_min')::integer and 100
      and jsonb_typeof(e->'per_side') = 'boolean', false) then return false; end if;
  end loop;
  return true;
end;
$$;

create table public.training_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  effective_date date not null check (isfinite(effective_date)),
  days jsonb not null,
  exercises jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  check (private.valid_training_routine(days, exercises)),
  unique (id, user_id)
);
create index training_routines_owner_date on public.training_routines(user_id, effective_date desc, created_at desc, id desc);
create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  diary_date date not null check (isfinite(diary_date)),
  routine_id uuid not null,
  kind text not null check (kind in ('strength','walk','easy','rest')),
  planned_minutes integer check (planned_minutes between 1 and 300),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 2000),
  effort integer check (effort between 1 and 10),
  discomfort text not null default '' check (char_length(discomfort) <= 2000),
  rest_deadline timestamptz,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  foreign key (routine_id, user_id) references public.training_routines(id, user_id),
  unique (user_id, diary_date),
  unique (id, user_id),
  check ((status = 'completed') = (completed_at is not null)),
  check ((kind = 'walk') = (planned_minutes is not null))
);
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  position integer not null check (position between 1 and 12),
  exercise_key text not null,
  prescription jsonb not null,
  variation text not null check (char_length(btrim(variation)) between 1 and 120),
  per_side boolean not null,
  resistance text not null default '' check (char_length(resistance) <= 120),
  revision integer not null default 0 check (revision >= 0),
  foreign key (session_id, user_id) references public.training_sessions(id, user_id) on delete cascade,
  unique (session_id, position), unique (session_id, exercise_key), unique (id, user_id)
);
create index session_exercises_owner on public.session_exercises(user_id, session_id);
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position between 1 and 6),
  reps integer check (reps between 0 and 1000),
  reps_other integer check (reps_other between 0 and 1000),
  weight_kg numeric check (weight_kg between 0 and 1000),
  completed boolean not null default false,
  check (not completed or reps is not null),
  foreign key (exercise_id, user_id) references public.session_exercises(id, user_id) on delete cascade,
  unique (exercise_id, position)
);
create index workout_sets_owner on public.workout_sets(user_id, exercise_id);
create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  diary_date date not null check (isfinite(diary_date)),
  session_id uuid unique,
  kind text not null check (kind in ('walk','jog')),
  minutes numeric not null check (minutes > 0 and minutes <= 1440),
  distance_km numeric check (distance_km between 0 and 500),
  effort integer check (effort between 1 and 10),
  notes text not null default '' check (char_length(notes) <= 2000),
  discomfort text not null default '' check (char_length(discomfort) <= 2000),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.training_sessions(id, user_id)
);
create index cardio_logs_owner_date on public.cardio_logs(user_id, diary_date, created_at, id);
create table private.training_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null,
  payload_hash text not null,
  result_id uuid,
  primary key (user_id, request_id)
);
alter table public.training_routines enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.cardio_logs enable row level security;
create policy own_training_routines on public.training_routines for select to authenticated using ((select auth.uid()) = user_id);
create policy own_training_sessions on public.training_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_session_exercises on public.session_exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy own_workout_sets on public.workout_sets for select to authenticated using ((select auth.uid()) = user_id);
create policy own_cardio_logs on public.cardio_logs for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.training_routines, public.training_sessions, public.session_exercises, public.workout_sets, public.cardio_logs from anon, authenticated;
grant select on public.training_routines, public.training_sessions, public.session_exercises, public.workout_sets, public.cardio_logs to authenticated;
revoke all on private.training_requests from public, anon, authenticated;

create function public.training_write(p_action text, p_data jsonb, p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); p public.profiles;
  receipt private.training_requests; r public.training_routines;
  s public.training_sessions; e public.session_exercises; c public.cardio_logs;
  result uuid; x uuid := nullif(p_data->>'id','')::uuid;
  d date := (p_data->>'diary_date')::date;
  today date; rule jsonb; item jsonb; set_item jsonb;
  pos integer := 0; deadline timestamptz; next_status text;
begin
  if u is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_request_id is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid request' using errcode = '22023'; end if;
  select * into p from public.profiles where user_id = u and onboarded_at is not null;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  today := (now() at time zone p.timezone)::date;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text, 3));
  select * into receipt from private.training_requests where user_id = u and request_id = p_request_id;
  if found then
    if receipt.operation <> p_action or receipt.payload_hash <> pg_catalog.md5(p_data::text) then
      raise exception 'Earlier request already saved; reload before changing it' using errcode = '22023';
    end if;
    return receipt.result_id;
  end if;

  case p_action
  when 'save_routine' then
    d := (p_data->>'effective_date')::date;
    if d is null or not isfinite(d) or d < today or (d = today and exists(select 1 from public.training_routines where user_id = u)) then
      raise exception 'Routine edits start tomorrow or later' using errcode = '22023'; end if;
    insert into public.training_routines(user_id,effective_date,days,exercises)
      values(u,d,p_data->'days',p_data->'exercises') returning id into result;

  when 'open' then
    if d is null or not isfinite(d) or d > today then raise exception 'Open today or an earlier day' using errcode = '22023'; end if;
    select id into result from public.training_sessions where user_id = u and diary_date = d;
    if result is null then
      select * into r from public.training_routines where user_id = u and effective_date <= d order by effective_date desc, created_at desc, id desc limit 1;
      if not found then raise exception 'Save a routine for this date first' using errcode = '22023'; end if;
      select value into rule from jsonb_array_elements(r.days) where (value->>'weekday')::integer = extract(isodow from d)::integer;
      insert into public.training_sessions(user_id,diary_date,routine_id,kind,planned_minutes)
        values(u,d,r.id,rule->>'kind',(rule->>'minutes')::integer) returning id into result;
      if rule->>'kind' = 'strength' then
        for item in select value from jsonb_array_elements(r.exercises) loop
          pos := pos + 1;
          insert into public.session_exercises(user_id,session_id,position,exercise_key,prescription,variation,per_side)
            values(u,result,pos,item->>'key',item,item->>'variation',(item->>'per_side')::boolean) returning * into e;
          insert into public.workout_sets(user_id,exercise_id,position) select u,e.id,generate_series(1,(item->>'sets')::integer);
        end loop;
      end if;
    end if;

  when 'save_exercise' then
    select * into e from public.session_exercises where id = x and user_id = u;
    if not found then raise exception 'Exercise unavailable' using errcode = '42501'; end if;
    select * into s from public.training_sessions where id = e.session_id and user_id = u;
    if s.status <> 'in_progress' then raise exception 'Start or reopen the session first' using errcode = '22023'; end if;
    if (p_data->>'revision')::integer is distinct from e.revision then raise exception 'Record changed; reload before saving' using errcode = '40001'; end if;
    if jsonb_typeof(p_data->'sets') is distinct from 'array' or jsonb_array_length(p_data->'sets') <> (e.prescription->>'sets')::integer
      or (select count(distinct (value->>'position')::integer) from jsonb_array_elements(p_data->'sets')) <> (e.prescription->>'sets')::integer
      or jsonb_typeof(p_data->'per_side') is distinct from 'boolean' then raise exception 'Invalid sets' using errcode = '22023'; end if;
    update public.session_exercises set variation = btrim(p_data->>'variation'), resistance = coalesce(p_data->>'resistance',''),
      per_side = (p_data->>'per_side')::boolean, revision = revision+1 where id = e.id;
    for set_item in select value from jsonb_array_elements(p_data->'sets') loop
      if jsonb_typeof(set_item->'completed') is distinct from 'boolean'
        or (set_item->>'position')::integer is null or (set_item->>'position')::integer not between 1 and (e.prescription->>'sets')::integer
        or ((p_data->>'per_side')::boolean and (set_item->>'completed')::boolean and set_item->>'reps_other' is null) then
        raise exception 'Completed sets need actual reps on each recorded side' using errcode = '22023'; end if;
      update public.workout_sets set reps = (set_item->>'reps')::integer,
        reps_other = case when (p_data->>'per_side')::boolean then (set_item->>'reps_other')::integer else null end,
        weight_kg = (set_item->>'weight_kg')::numeric, completed = (set_item->>'completed')::boolean
        where exercise_id = e.id and user_id = u and position = (set_item->>'position')::integer;
    end loop;
    result := e.id;

  when 'save_cardio' then
    if d is null or d > today then raise exception 'Log actual activity today or earlier' using errcode = '22023'; end if;
    if x is not null then
      select * into c from public.cardio_logs where id = x and user_id = u;
      if not found then raise exception 'Activity unavailable' using errcode = '42501'; end if;
      if c.revision is distinct from (p_data->>'revision')::integer then raise exception 'Record changed; reload before saving' using errcode = '40001'; end if;
      if c.session_id is distinct from nullif(p_data->>'session_id','')::uuid then raise exception 'Activity link cannot change' using errcode = '22023'; end if;
    end if;
    if nullif(p_data->>'session_id','') is not null then
      select * into s from public.training_sessions where id = (p_data->>'session_id')::uuid and user_id = u;
      if not found then raise exception 'Session unavailable' using errcode = '42501'; end if;
      if s.kind <> 'walk' or s.status <> 'in_progress' or s.diary_date <> d then raise exception 'Start or reopen this walking session first' using errcode = '22023'; end if;
    end if;
    if x is null then
      insert into public.cardio_logs(user_id,diary_date,session_id,kind,minutes,distance_km,effort,notes,discomfort)
        values(u,d,nullif(p_data->>'session_id','')::uuid,p_data->>'kind',(p_data->>'minutes')::numeric,(p_data->>'distance_km')::numeric,
          (p_data->>'effort')::integer,coalesce(p_data->>'notes',''),coalesce(p_data->>'discomfort','')) returning id into result;
    else
      update public.cardio_logs set diary_date=d,kind=p_data->>'kind',minutes=(p_data->>'minutes')::numeric,distance_km=(p_data->>'distance_km')::numeric,
        effort=(p_data->>'effort')::integer,notes=coalesce(p_data->>'notes',''),discomfort=coalesce(p_data->>'discomfort',''),revision=revision+1
        where id=x and user_id=u returning id into result;
    end if;

  when 'delete_cardio' then
    if not coalesce((p_data->>'confirmed')::boolean,false) then raise exception 'Confirmation required' using errcode = '22023'; end if;
    select * into c from public.cardio_logs where id=x and user_id=u;
    if not found then raise exception 'Activity unavailable' using errcode = '42501'; end if;
    if c.revision is distinct from (p_data->>'revision')::integer then raise exception 'Record changed; reload before saving' using errcode = '40001'; end if;
    if c.session_id is not null then
      select * into s from public.training_sessions where id=c.session_id and user_id=u;
      if s.status <> 'in_progress' then raise exception 'Reopen the walking session first' using errcode = '22023'; end if;
    end if;
    delete from public.cardio_logs where id=x and user_id=u returning id into result;

  when 'notes', 'state', 'timer' then
    select * into s from public.training_sessions where id=x and user_id=u;
    if not found then raise exception 'Session unavailable' using errcode = '42501'; end if;
    result := s.id;
    if p_action = 'timer' then
      if s.status <> 'in_progress' or s.kind <> 'strength' then raise exception 'Start strength training first' using errcode = '22023'; end if;
      if (p_data->>'seconds')::integer not in (0,60,90) or p_data->>'seconds' is null then raise exception 'Invalid rest duration' using errcode = '22023'; end if;
      deadline := case when (p_data->>'seconds')::integer > 0 then clock_timestamp() + make_interval(secs => (p_data->>'seconds')::integer) else null end;
      update public.training_sessions set rest_deadline=deadline where id=s.id;
    else
      if s.revision is distinct from (p_data->>'revision')::integer then raise exception 'Record changed; reload before saving' using errcode = '40001'; end if;
      if p_action = 'notes' then
        if s.status <> 'in_progress' then raise exception 'Start or reopen the session first' using errcode = '22023'; end if;
        update public.training_sessions set notes=coalesce(p_data->>'notes',''),discomfort=coalesce(p_data->>'discomfort',''),
          effort=(p_data->>'effort')::integer,revision=revision+1 where id=s.id;
      else
        next_status := p_data->>'status';
        if next_status = 'in_progress' then
          if s.status = 'in_progress' or (s.status in ('completed','skipped') and not coalesce((p_data->>'confirmed')::boolean,false)) then raise exception 'Confirm reopening this session' using errcode = '22023'; end if;
        elsif next_status in ('completed','skipped') then
          if not coalesce((p_data->>'confirmed')::boolean,false) or s.status not in ('planned','in_progress')
            or (next_status = 'completed' and s.status = 'planned' and s.kind in ('strength','walk')) then raise exception 'Start and confirm this session first' using errcode = '22023'; end if;
          if next_status = 'completed' and s.kind = 'walk' and not exists(select 1 from public.cardio_logs where session_id=s.id and user_id=u) then raise exception 'Save actual walking duration before completing' using errcode = '22023'; end if;
        else raise exception 'Invalid status' using errcode = '22023';
        end if;
        update public.training_sessions set status=next_status,revision=revision+1,rest_deadline=null,
          started_at=case when next_status='in_progress' then coalesce(started_at,now()) else started_at end,
          completed_at=case when next_status='completed' then now() else null end where id=s.id;
        -- Completing a session deliberately does not mark any set complete.
      end if;
    end if;
  else raise exception 'Unknown training operation' using errcode = '22023';
  end case;

  insert into private.training_requests(user_id,request_id,operation,payload_hash,result_id)
    values(u,p_request_id,p_action,pg_catalog.md5(p_data::text),result);
  return result;
end;
$$;
revoke all on function private.valid_training_routine(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.training_write(text,jsonb,uuid) from public,anon;
grant execute on function public.training_write(text,jsonb,uuid) to authenticated;
comment on table public.training_sessions is 'One dated prescription snapshot per owner. Actual set completion is always explicit.';
notify pgrst, 'reload schema';
commit;
