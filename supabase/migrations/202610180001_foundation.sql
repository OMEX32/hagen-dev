begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Keep receipts after a future target is intentionally replaced, so a delayed
-- retry of an older save can never restore superseded values.
create table private.target_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  primary key (user_id, request_id)
);
revoke all on private.target_requests from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  age integer not null check (age between 18 and 120),
  height_cm numeric(5,2) not null check (height_cm between 80 and 250),
  starting_weight_estimate_kg numeric(5,2) not null check (starting_weight_estimate_kg between 20 and 500),
  equation text not null check (equation in ('male', 'female')),
  timezone text not null check (char_length(timezone) between 1 and 100),
  units text not null default 'metric' check (units = 'metric'),
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.target_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  effective_date date not null,
  maintenance_kcal numeric(8,2) not null check (maintenance_kcal between 0.01 and 100000),
  deficit_kcal numeric(8,2) not null check (deficit_kcal between 0 and 100000),
  food_kcal numeric(8,2) not null check (food_kcal between 0.01 and 100000),
  protein_g numeric(7,2) not null check (protein_g between 0 and 10000),
  manual_override boolean not null default false,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_date),
  unique (user_id, request_id),
  check (manual_override or food_kcal = maintenance_kcal - deficit_kcal)
);

alter table public.profiles enable row level security;
alter table public.target_history enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Read own target history" on public.target_history for select to authenticated
  using ((select auth.uid()) = user_id);

-- No direct client writes. All writes pass through the authenticated, atomic
-- functions below. Owner IDs are never accepted as function arguments.
revoke all on public.profiles, public.target_history from anon, authenticated;
grant select on public.profiles, public.target_history to authenticated;

create function private.apply_profile(p_uid uuid, p_profile jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_profile->>'timezone') then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  insert into public.profiles (user_id, display_name, age, height_cm, starting_weight_estimate_kg, equation, timezone)
  values (p_uid, btrim(p_profile->>'display_name'), (p_profile->>'age')::integer,
    (p_profile->>'height_cm')::numeric, (p_profile->>'starting_weight_estimate_kg')::numeric,
    p_profile->>'equation', p_profile->>'timezone')
  on conflict (user_id) do update set
    display_name = excluded.display_name, age = excluded.age, height_cm = excluded.height_cm,
    starting_weight_estimate_kg = excluded.starting_weight_estimate_kg,
    equation = excluded.equation, timezone = excluded.timezone, updated_at = now();
end;
$$;

create function private.insert_target(p_uid uuid, p_target jsonb, p_date date, p_request_id uuid)
returns void language sql set search_path = '' as $$
  insert into public.target_history (user_id, effective_date, maintenance_kcal, deficit_kcal, food_kcal, protein_g, manual_override, request_id)
  values (p_uid, p_date, (p_target->>'maintenance_kcal')::numeric, (p_target->>'deficit_kcal')::numeric,
    (p_target->>'food_kcal')::numeric, (p_target->>'protein_g')::numeric, (p_target->>'manual_override')::boolean, p_request_id)
  on conflict (user_id, effective_date) do update set
    maintenance_kcal = excluded.maintenance_kcal, deficit_kcal = excluded.deficit_kcal,
    food_kcal = excluded.food_kcal, protein_g = excluded.protein_g, manual_override = excluded.manual_override,
    request_id = excluded.request_id, created_at = now();
$$;

create function public.complete_onboarding(p_profile jsonb, p_target jsonb, p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Serialize onboarding and retries even before the profile exists.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  select * into v_profile from public.profiles where user_id = v_uid for update;
  if v_profile.onboarded_at is not null then return; end if;
  perform private.apply_profile(v_uid, p_profile);
  perform private.insert_target(v_uid, p_target, (now() at time zone (p_profile->>'timezone'))::date, p_request_id);
  update public.profiles set onboarded_at = now() where user_id = v_uid;
end;
$$;

create function public.update_profile(p_profile jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.profiles where user_id = v_uid and onboarded_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  perform private.apply_profile(v_uid, p_profile);
end;
$$;

create function public.schedule_target(p_target jsonb, p_effective_date date, p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where user_id = v_uid and onboarded_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  -- A retry is a no-op; intentionally editing the form uses a new request ID.
  if exists (select 1 from private.target_requests where user_id = v_uid and request_id = p_request_id) then return; end if;
  if p_effective_date is null or p_effective_date <= (now() at time zone v_profile.timezone)::date then
    raise exception 'Target changes must start on a future date' using errcode = '22023';
  end if;
  perform private.insert_target(v_uid, p_target, p_effective_date, p_request_id);
  insert into private.target_requests (user_id, request_id) values (v_uid, p_request_id);
end;
$$;

revoke all on function private.apply_profile(uuid, jsonb), private.insert_target(uuid, jsonb, date, uuid) from public, anon, authenticated;
revoke all on function public.complete_onboarding(jsonb, jsonb, uuid), public.update_profile(jsonb), public.schedule_target(jsonb, date, uuid) from public, anon;
grant execute on function public.complete_onboarding(jsonb, jsonb, uuid), public.update_profile(jsonb), public.schedule_target(jsonb, date, uuid) to authenticated;

comment on column public.profiles.starting_weight_estimate_kg is 'Confirmed starting assumption; never a measured weigh-in.';
comment on table public.target_history is 'Provisional targets effective on diary dates; no automatic calorie prescription.';
commit;
