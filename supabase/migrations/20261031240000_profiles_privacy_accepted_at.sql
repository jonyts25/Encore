-- Privacy notice acceptance timestamp (18+ confirmation).

alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz;
