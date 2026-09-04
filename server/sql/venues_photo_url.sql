-- Run in Supabase SQL editor if venues.photo_url is missing.
alter table public.venues
  add column if not exists photo_url text;
