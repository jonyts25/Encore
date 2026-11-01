-- Cached Odesli (song.link) platform URLs keyed by Apple Music track/page URL.

create table if not exists public.song_links (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs (id) on delete set null,
  apple_url text not null,
  youtube_music_url text,
  spotify_url text,
  youtube_url text,
  fetched_at timestamptz not null default now(),
  constraint song_links_apple_url_unique unique (apple_url)
);

create index if not exists song_links_fetched_at_idx on public.song_links (fetched_at desc);

alter table public.song_links enable row level security;
