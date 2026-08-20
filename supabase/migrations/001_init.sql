-- Car Park Registration System — initial schema
-- Walailak University Hospital

create extension if not exists "pgcrypto";

create table if not exists car_registrations (
  id uuid primary key default gen_random_uuid(),
  license_plate varchar(20) unique not null,
  full_name_en varchar(100) not null,
  phone_number varchar(10) not null,
  car_type varchar(20) not null,
  car_color varchar(30) not null,
  license_plate_type varchar(50) not null,
  status varchar(20) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_car_registrations_license_plate
  on car_registrations (license_plate);

-- Keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_car_registrations_updated_at on car_registrations;
create trigger trg_car_registrations_updated_at
  before update on car_registrations
  for each row
  execute function set_updated_at();

-- Row Level Security: the public must never read/write this table directly
-- from the browser. All access goes through the Next.js API routes using the
-- Supabase service role key, which bypasses RLS. These policies are added
-- as an explicit, defense-in-depth statement of intent — no policy exists
-- for the anon/authenticated roles, so PostgREST calls made with the public
-- anon key are denied by default once RLS is enabled below.
alter table car_registrations enable row level security;

create policy "service_role_select"
  on car_registrations
  for select
  to service_role
  using (true);

create policy "service_role_insert"
  on car_registrations
  for insert
  to service_role
  with check (true);

create policy "service_role_update"
  on car_registrations
  for update
  to service_role
  using (true)
  with check (true);
