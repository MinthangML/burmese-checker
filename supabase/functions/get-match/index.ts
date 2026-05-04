import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  getMatchById,
  getPlayerColor,
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

    return jsonResponse({
      ok: true,
      matchId: match.id,
      roomCode: match.room_code,
      color,
      realtimeTopic: match.realtime_topic,
      state: sanitizeMatch(match),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: "server_error",
        message: error instanceof Error ? error.message : "Get match failed.",
      },
      500
    );
  }
});
