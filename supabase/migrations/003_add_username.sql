-- Auto-generated username (e.g. "apirak.ja"), unique per person.
-- Existing rows are left NULL — Postgres allows multiple NULLs under a
-- unique constraint, and backfilling them requires running the same
-- collision-avoidance algorithm as the app (see lib/username.ts), not a
-- plain SQL expression — new registrations get one going forward.

alter table car_registrations
  add column if not exists username varchar(10);

create unique index if not exists idx_car_registrations_username
  on car_registrations (username);
