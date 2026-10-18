begin;

create table public.saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  basis text not null check (basis in ('per_100g', 'per_serving')),
  basis_kcal numeric not null check (basis_kcal between 0 and 1000000 and scale(basis_kcal) <= 3),
  basis_protein numeric not null check (basis_protein between 0 and 1000000 and scale(basis_protein) <= 3),
  serving_description text not null default '' check (char_length(serving_description) <= 100),
  preparation text not null check (preparation in ('unspecified', 'raw', 'cooked', 'as_served')),
  notes text not null default '' check (char_length(notes) <= 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (basis <> 'per_serving' or char_length(btrim(serving_description)) > 0)
);
create index saved_foods_owner on public.saved_foods(user_id, archived_at);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index saved_meals_owner on public.saved_meals(user_id, archived_at);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  meal_id uuid not null,
  position integer not null check (position >= 0),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  basis text not null check (basis in ('total', 'per_100g', 'per_serving')),
  basis_kcal numeric not null check (basis_kcal between 0 and 1000000 and scale(basis_kcal) <= 3),
  basis_protein numeric not null check (basis_protein between 0 and 1000000 and scale(basis_protein) <= 3),
  quantity numeric not null check (quantity > 0 and quantity <= 1000000000),
  serving_description text not null default '' check (char_length(serving_description) <= 100),
  preparation text not null default 'unspecified' check (preparation in ('unspecified', 'raw', 'cooked', 'as_served')),
  notes text not null default '' check (char_length(notes) <= 2000),
  kcal numeric generated always as (basis_kcal * case when basis = 'per_100g' then quantity / 100 else quantity end) stored,
  protein_g numeric generated always as (basis_protein * case when basis = 'per_100g' then quantity / 100 else quantity end) stored,
  check (basis <> 'total' or quantity = 1),
  check (basis <> 'per_serving' or char_length(btrim(serving_description)) > 0),
  foreign key (meal_id, user_id) references public.saved_meals(id, user_id) on delete cascade,
  unique (meal_id, position)
);
create index saved_meal_items_owner on public.saved_meal_items(user_id, meal_id);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  diary_date date not null check (isfinite(diary_date)),
  category text not null check (category in ('breakfast', 'lunch', 'dinner', 'snacks')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  basis text not null check (basis in ('total', 'per_100g', 'per_serving')),
  basis_kcal numeric not null check (basis_kcal between 0 and 1000000 and scale(basis_kcal) <= 3),
  basis_protein numeric not null check (basis_protein between 0 and 1000000 and scale(basis_protein) <= 3),
  quantity numeric not null check (quantity > 0 and quantity <= 1000000000),
  serving_description text not null default '' check (char_length(serving_description) <= 100),
  preparation text not null default 'unspecified' check (preparation in ('unspecified', 'raw', 'cooked', 'as_served')),
  notes text not null default '' check (char_length(notes) <= 2000),
  kcal numeric generated always as (basis_kcal * case when basis = 'per_100g' then quantity / 100 else quantity end) stored,
  protein_g numeric generated always as (basis_protein * case when basis = 'per_100g' then quantity / 100 else quantity end) stored,
  check (basis <> 'total' or quantity = 1),
  check (basis <> 'per_serving' or char_length(btrim(serving_description)) > 0),
  source_food_id uuid,
  source_meal_id uuid,
  created_at timestamptz not null default now(),
  foreign key (source_food_id, user_id) references public.saved_foods(id, user_id),
  foreign key (source_meal_id, user_id) references public.saved_meals(id, user_id)
);
create index food_logs_owner_day on public.food_logs(user_id, diary_date, created_at);
create index food_logs_source_food on public.food_logs(source_food_id, user_id);
create index food_logs_source_meal on public.food_logs(source_meal_id, user_id);

create table public.food_diary_days (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  diary_date date not null check (isfinite(diary_date)),
  completed_at timestamptz,
  primary key (user_id, diary_date)
);

create table private.food_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null,
  payload_hash text not null,
  result_id uuid,
  primary key (user_id, request_id)
);
revoke all on private.food_requests from public, anon, authenticated;

alter table public.saved_foods enable row level security;
create policy "Read own saved_foods" on public.saved_foods for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.saved_foods from anon, authenticated;
grant select on public.saved_foods to authenticated;
alter table public.saved_meals enable row level security;
create policy "Read own saved_meals" on public.saved_meals for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.saved_meals from anon, authenticated;
grant select on public.saved_meals to authenticated;
alter table public.saved_meal_items enable row level security;
create policy "Read own saved_meal_items" on public.saved_meal_items for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.saved_meal_items from anon, authenticated;
grant select on public.saved_meal_items to authenticated;
alter table public.food_logs enable row level security;
create policy "Read own food_logs" on public.food_logs for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.food_logs from anon, authenticated;
grant select on public.food_logs to authenticated;
alter table public.food_diary_days enable row level security;
create policy "Read own food_diary_days" on public.food_diary_days for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.food_diary_days from anon, authenticated;
grant select on public.food_diary_days to authenticated;

-- Snapshots share one typed representation. The table constraints are the
-- final validation boundary even when an authenticated caller bypasses the UI.
create type private.food_snapshot as (
  name text, basis text, basis_kcal numeric, basis_protein numeric, quantity numeric,
  serving_description text, preparation text, notes text
);
create function private.food_values(p jsonb) returns private.food_snapshot
language sql immutable set search_path = '' as $$
  select row(btrim(p->>'name'), p->>'basis', (p->>'basis_kcal')::numeric,
    (p->>'basis_protein')::numeric, (p->>'quantity')::numeric,
    coalesce(p->>'serving_description', ''), coalesce(p->>'preparation', 'unspecified'),
    coalesce(p->>'notes', ''))::private.food_snapshot;
$$;

create function private.add_food_log(p_uid uuid, p_date date, p_category text, p private.food_snapshot,
  p_food uuid default null, p_meal uuid default null) returns uuid
language sql set search_path = '' as $$
  insert into public.food_logs(user_id, diary_date, category, name, basis, basis_kcal, basis_protein,
    quantity, serving_description, preparation, notes, source_food_id, source_meal_id)
  values (p_uid, p_date, p_category, (p).name, (p).basis, (p).basis_kcal, (p).basis_protein,
    (p).quantity, (p).serving_description, (p).preparation, (p).notes, p_food, p_meal)
  returning id;
$$;

create function private.invalidate_food_diary() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Account deletion cascades must not recreate a diary for a deleted profile.
  if not exists (select 1 from public.profiles where user_id = coalesce(new.user_id, old.user_id)) then return null; end if;
  if tg_op in ('UPDATE', 'DELETE') then
    insert into public.food_diary_days(user_id, diary_date) values (old.user_id, old.diary_date)
    on conflict (user_id, diary_date) do update set completed_at = null;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.food_diary_days(user_id, diary_date) values (new.user_id, new.diary_date)
    on conflict (user_id, diary_date) do update set completed_at = null;
  end if;
  return null;
end;
$$;
create trigger invalidate_food_diary after insert or update or delete on public.food_logs
for each row execute function private.invalidate_food_diary();

-- All diary writes (including completion) serialize on one per-user lock.
-- Copies, meal expansion, completion invalidation and request receipts commit
-- together. Neither owner IDs nor computed totals are accepted from the client.
create function public.food_write(p_action text, p_data jsonb, p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_id uuid := nullif(p_data->>'id', '')::uuid;
  v_result uuid;
  v_request private.food_requests;
  v_values private.food_snapshot;
  v_food public.saved_foods;
  v_log public.food_logs;
  v_item public.saved_meal_items;
  v_json jsonb;
  v_position integer := 0;
  v_multiplier numeric;
  v_count integer := 0;
  v_date date := (p_data->>'diary_date')::date;
  v_category text := p_data->>'category';
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_request_id is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid request' using errcode = '22023'; end if;
  select * into v_profile from public.profiles where user_id = v_uid and onboarded_at is not null;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 1));
  select * into v_request from private.food_requests where user_id = v_uid and request_id = p_request_id;
  if found then
    if v_request.operation <> p_action or v_request.payload_hash <> pg_catalog.md5(p_data::text) then
      raise exception 'Earlier request already saved; reload before changing it' using errcode = '22023';
    end if;
    return v_request.result_id;
  end if;

  case p_action
  when 'save_log' then
    v_values := private.food_values(p_data);
    if v_id is null then
      v_result := private.add_food_log(v_uid, v_date, v_category, v_values);
    else
      update public.food_logs set diary_date = v_date, category = v_category,
        name = v_values.name, basis = v_values.basis, basis_kcal = v_values.basis_kcal,
        basis_protein = v_values.basis_protein, quantity = v_values.quantity,
        serving_description = v_values.serving_description, preparation = v_values.preparation, notes = v_values.notes
      where id = v_id and user_id = v_uid returning id into v_result;
      if not found then raise exception 'Entry unavailable' using errcode = '42501'; end if;
    end if;
  when 'delete_log' then
    delete from public.food_logs where id = v_id and user_id = v_uid returning id into v_result;
    if not found then raise exception 'Entry unavailable' using errcode = '42501'; end if;
  when 'save_food' then
    v_values := private.food_values(p_data);
    if v_id is null then
      insert into public.saved_foods(user_id, name, basis, basis_kcal, basis_protein, serving_description, preparation, notes)
      values (v_uid, v_values.name, v_values.basis, v_values.basis_kcal, v_values.basis_protein, v_values.serving_description, v_values.preparation, v_values.notes)
      returning id into v_result;
    else
      update public.saved_foods set name = v_values.name, basis = v_values.basis,
        basis_kcal = v_values.basis_kcal, basis_protein = v_values.basis_protein,
        serving_description = v_values.serving_description, preparation = v_values.preparation, notes = v_values.notes
      where id = v_id and user_id = v_uid and archived_at is null returning id into v_result;
      if not found then raise exception 'Food unavailable' using errcode = '42501'; end if;
    end if;
  when 'archive_food' then
    update public.saved_foods set archived_at = now() where id = v_id and user_id = v_uid returning id into v_result;
    if not found then raise exception 'Food unavailable' using errcode = '42501'; end if;
  when 'log_food' then
    select * into v_food from public.saved_foods where id = v_id and user_id = v_uid and archived_at is null;
    if not found then raise exception 'Food unavailable' using errcode = '42501'; end if;
    v_values := private.food_values(to_jsonb(v_food) || jsonb_build_object('quantity', p_data->'quantity', 'notes', coalesce(p_data->>'notes', '')));
    v_result := private.add_food_log(v_uid, v_date, v_category, v_values, v_food.id);
  when 'save_meal' then
    if jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items') not between 1 and 50 then
      raise exception 'A meal needs 1 to 50 items' using errcode = '22023';
    end if;
    if v_id is null then
      insert into public.saved_meals(user_id, name) values (v_uid, btrim(p_data->>'name')) returning id into v_result;
    else
      update public.saved_meals set name = btrim(p_data->>'name') where id = v_id and user_id = v_uid and archived_at is null returning id into v_result;
      if not found then raise exception 'Meal unavailable' using errcode = '42501'; end if;
      delete from public.saved_meal_items where meal_id = v_result and user_id = v_uid;
    end if;
    for v_json in select value from jsonb_array_elements(p_data->'items') loop
      v_values := private.food_values(v_json);
      insert into public.saved_meal_items(user_id, meal_id, position, name, basis, basis_kcal, basis_protein, quantity, serving_description, preparation, notes)
      values (v_uid, v_result, v_position, v_values.name, v_values.basis, v_values.basis_kcal, v_values.basis_protein,
        v_values.quantity, v_values.serving_description, v_values.preparation, v_values.notes);
      v_position := v_position + 1;
    end loop;
  when 'archive_meal' then
    update public.saved_meals set archived_at = now() where id = v_id and user_id = v_uid returning id into v_result;
    if not found then raise exception 'Meal unavailable' using errcode = '42501'; end if;
  when 'log_meal' then
    perform 1 from public.saved_meals where id = v_id and user_id = v_uid and archived_at is null;
    if not found then raise exception 'Meal unavailable' using errcode = '42501'; end if;
    v_multiplier := (p_data->>'multiplier')::numeric;
    if v_multiplier is null or not (v_multiplier > 0 and v_multiplier <= 1000) then raise exception 'Invalid meal multiplier' using errcode = '22023'; end if;
    for v_item in select * from public.saved_meal_items where meal_id = v_id and user_id = v_uid order by position loop
      v_values := private.food_values(to_jsonb(v_item));
      -- A quick-total item becomes a clearly defined serving when multiplied;
      -- the stored snapshot always retains the original basis and quantity.
      if v_values.basis = 'total' and v_multiplier <> 1 then
        v_values.basis := 'per_serving';
        v_values.serving_description := 'one original meal item';
      end if;
      v_values.quantity := v_values.quantity * v_multiplier;
      v_result := private.add_food_log(v_uid, v_date, v_category, v_values, null, v_id);
      v_count := v_count + 1;
    end loop;
    if v_count = 0 then raise exception 'Meal is empty' using errcode = '22023'; end if;
  when 'copy_category' then
    -- Materialize the source before inserting, including when source=destination.
    for v_log in select * from public.food_logs where user_id = v_uid and diary_date = (p_data->>'source_date')::date and category = v_category order by created_at, id loop
      perform private.add_food_log(v_uid, v_date, v_category, private.food_values(to_jsonb(v_log)), v_log.source_food_id, v_log.source_meal_id);
      v_count := v_count + 1;
    end loop;
    if v_count = 0 then raise exception 'No entries to copy' using errcode = '22023'; end if;
  when 'set_diary' then
    if v_date is null then raise exception 'Date required' using errcode = '22023'; end if;
    if (p_data->>'complete')::boolean and (not coalesce((p_data->>'confirmed')::boolean, false) or v_date > (now() at time zone v_profile.timezone)::date) then
      raise exception 'Confirm a completed diary on today or an earlier date' using errcode = '22023';
    end if;
    insert into public.food_diary_days(user_id, diary_date, completed_at)
    values (v_uid, v_date, case when (p_data->>'complete')::boolean then now() else null end)
    on conflict (user_id, diary_date) do update set completed_at = excluded.completed_at;
  else
    raise exception 'Unknown food operation' using errcode = '22023';
  end case;
  insert into private.food_requests(user_id, request_id, operation, payload_hash, result_id)
  values (v_uid, p_request_id, p_action, pg_catalog.md5(p_data::text), v_result);
  return v_result;
end;
$$;

revoke all on type private.food_snapshot from public, anon, authenticated;
revoke all on function private.food_values(jsonb), private.add_food_log(uuid, date, text, private.food_snapshot, uuid, uuid), private.invalidate_food_diary() from public, anon, authenticated;
revoke all on function public.food_write(text, jsonb, uuid) from public, anon;
grant execute on function public.food_write(text, jsonb, uuid) to authenticated;

comment on table public.food_logs is 'Nutrition snapshots; reusable definition edits never rewrite diary history.';
notify pgrst, 'reload schema';
commit;
