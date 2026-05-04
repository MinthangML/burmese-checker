create extension if not exists pgcrypto;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  realtime_topic text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'finished')),
  board jsonb not null,
  current_player text not null default 'red'
    check (current_player in ('red', 'blue')),
  forced_piece jsonb,
  winner text check (winner in ('red', 'blue')),
  move_number integer not null default 0 check (move_number >= 0),
  red_token_hash text not null,
  blue_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_moves (
  id bigserial primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  move_number integer not null check (move_number > 0),
  player text not null check (player in ('red', 'blue')),
  move jsonb not null,
  board jsonb not null,
  created_at timestamptz not null default now(),
  unique (match_id, move_number)
);

create index if not exists matches_room_code_idx on public.matches (room_code);
create index if not exists matches_recent_open_idx
  on public.matches (created_at desc)
  where status in ('waiting', 'active');
create index if not exists match_moves_match_id_idx
  on public.match_moves (match_id, move_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create or replace function public.commit_match_move(
  p_match_id uuid,
  p_expected_move_number integer,
  p_player text,
  p_move jsonb,
  p_board jsonb,
  p_current_player text,
  p_forced_piece jsonb,
  p_winner text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
begin
  update public.matches
  set
    board = p_board,
    current_player = p_current_player,
    forced_piece = p_forced_piece,
    winner = p_winner,
    status = p_status,
    move_number = p_expected_move_number + 1
  where id = p_match_id
    and move_number = p_expected_move_number
  returning * into v_match;

  if v_match is null then
    return null;
  end if;

  insert into public.match_moves (
    match_id,
    move_number,
    player,
    move,
    board
  )
  values (
    p_match_id,
    p_expected_move_number + 1,
    p_player,
    p_move,
    p_board
  );

  return to_jsonb(v_match);
end;
$$;

alter table public.matches enable row level security;
alter table public.match_moves enable row level security;

revoke all on table public.matches from public, anon, authenticated;
revoke all on table public.match_moves from public, anon, authenticated;
revoke all on sequence public.match_moves_id_seq from public, anon, authenticated;
revoke all on function public.commit_match_move(
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text,
  jsonb,
  text,
  text
) from public, anon, authenticated;

grant all on table public.matches to service_role;
grant all on table public.match_moves to service_role;
grant usage, select on sequence public.match_moves_id_seq to service_role;
grant execute on function public.commit_match_move(
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text,
  jsonb,
  text,
  text
) to service_role;
