-- Add Thai full name, position, and department fields to registrations.

alter table car_registrations
  add column if not exists full_name_th varchar(100),
  add column if not exists position varchar(100),
  add column if not exists department varchar(100);

-- Existing rows (if any) predate these fields; backfill so NOT NULL can be
-- enforced going forward without breaking historical data.
update car_registrations
set
  full_name_th = coalesce(full_name_th, '-'),
  position = coalesce(position, '-'),
  department = coalesce(department, '-')
where full_name_th is null or position is null or department is null;

alter table car_registrations
  alter column full_name_th set not null,
  alter column position set not null,
  alter column department set not null;
