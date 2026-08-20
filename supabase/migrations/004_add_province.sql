-- Add province field to registrations.

alter table car_registrations
  add column if not exists province varchar(50);

update car_registrations
set province = coalesce(province, '-')
where province is null;

alter table car_registrations
  alter column province set not null;
