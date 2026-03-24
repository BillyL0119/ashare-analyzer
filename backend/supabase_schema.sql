create table if not exists watchlist (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  added_at timestamp with time zone default now()
);
