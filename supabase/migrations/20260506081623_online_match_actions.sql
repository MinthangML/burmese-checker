alter table public.matches
  add column if not exists draw_offer_player text
    check (draw_offer_player in ('red', 'blue')),
  add column if not exists result text
    check (result in ('red_win', 'blue_win', 'draw')),
  add column if not exists finished_reason text
    check (finished_reason in ('board', 'resignation', 'draw_agreement'));

update public.matches
set
  result = case winner
    when 'red' then 'red_win'
    when 'blue' then 'blue_win'
    else result
  end,
  finished_reason = coalesce(finished_reason, 'board')
where status = 'finished'
  and winner is not null
  and result is null;

update public.matches
set
  result = 'draw',
  finished_reason = coalesce(finished_reason, 'draw_agreement'),
  draw_offer_player = null
where status = 'finished'
  and winner is null
  and result is null;

alter table public.matches
  drop constraint if exists matches_finished_result_consistency;

alter table public.matches
  add constraint matches_finished_result_consistency
  check (
    (
      status = 'finished'
      and result is not null
      and finished_reason is not null
      and draw_offer_player is null
      and (
        (result = 'draw' and winner is null)
        or (result = 'red_win' and winner = 'red')
        or (result = 'blue_win' and winner = 'blue')
      )
    )
    or (
      status <> 'finished'
      and result is null
      and finished_reason is null
    )
  );

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
    result = case
      when p_status = 'finished' and p_winner = 'red' then 'red_win'
      when p_status = 'finished' and p_winner = 'blue' then 'blue_win'
      else null
    end,
    finished_reason = case
      when p_status = 'finished' and p_winner is not null then 'board'
      else null
    end,
    draw_offer_player = case
      when p_status = 'finished' then null
      else draw_offer_player
    end,
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

create or replace function public.commit_match_action(
  p_match_id uuid,
  p_expected_move_number integer,
  p_current_player text,
  p_draw_offer_player text,
  p_winner text,
  p_status text,
  p_result text,
  p_finished_reason text
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
    current_player = p_current_player,
    forced_piece = null,
    draw_offer_player = p_draw_offer_player,
    winner = p_winner,
    status = p_status,
    result = p_result,
    finished_reason = p_finished_reason,
    move_number = p_expected_move_number + 1
  where id = p_match_id
    and move_number = p_expected_move_number
    and status = 'active'
  returning * into v_match;

  if v_match is null then
    return null;
  end if;

  return to_jsonb(v_match);
end;
$$;

revoke all on function public.commit_match_action(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.commit_match_action(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
