-- Allow one username to be shared across multiple registrations for the
-- same person (an employee with more than one vehicle). Previously
-- username was unique per row; it now identifies the *person*, and a
-- second/third car for the same person reuses their existing username
-- instead of getting a different one generated.

drop index if exists idx_car_registrations_username;

-- Keep a plain (non-unique) index for lookup performance — the app still
-- queries by username frequently (collision checks, "other cars for this
-- person" lookups).
create index if not exists idx_car_registrations_username_lookup
  on car_registrations (username);

-- Matching "is this the same person" by full name + phone together.
create index if not exists idx_car_registrations_person_lookup
  on car_registrations (full_name_th, phone_number);
