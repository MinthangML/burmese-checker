import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  broadcastMatchState,
  getAdminClient,
  getMatchById,
  getPlayerColor,
  prepareMoveCommit,
  sanitizeMatch,
} from "../_shared/match-utils.ts";

Deno.serve(async (request) => {
  const earlyResponse = handleOptions(request);
  if (earlyResponse) {
    return earlyResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const match = await getMatchById(body.matchId);

    if (!match) {
      return jsonResponse({
        ok: false,
        code: "match_not_found",
        message: "This online match no longer exists.",
      });
    }

    const color = await getPlayerColor(match, body.playerToken);

    if (!color) {
      return jsonResponse({
        ok: false,
        code: "unauthorized_match",
        message: "This device is not a player in that match.",
      });
    }

    const prepared = prepareMoveCommit(
      match,
      color,
      body.expectedMoveNumber,
      body.move
    );

    if (!prepared.ok) {
      return jsonResponse(prepared);
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("commit_match_move", {
      p_match_id: match.id,
      p_expected_move_number: match.move_number,
      p_player: color,
      p_move: prepared.canonicalMove,
      p_board: prepared.update.board,
      p_current_player: prepared.update.currentPlayer,
      p_forced_piece: prepared.update.forcedPiece,
      p_winner: prepared.update.winner,
      p_status: prepared.update.status,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      const latest = await getMatchById(match.id);
      return jsonResponse({
        ok: false,
        code: "move_conflict",
        message: "Match state changed. Refreshing the board.",
        state: latest ? sanitizeMatch(latest) : null,
      });
    }

    await broadcastMatchState(data).catch(() => {});

    return jsonResponse({
      ok: true,
      matchId: data.id,
      roomCode: data.room_code,
      color,
      realtimeTopic: data.realtime_topic,
      state: sanitizeMatch(data),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: "server_error",
        message: error instanceof Error ? error.message : "Submit move failed.",
      },
      500
    );
  }
});
