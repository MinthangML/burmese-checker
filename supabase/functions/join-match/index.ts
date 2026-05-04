import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  broadcastMatchState,
  createGuestToken,
  getAdminClient,
  hashToken,
  normalizeRoomCode,
  PLAYERS,
  sanitizeMatch,
} from "../_shared/match-utils.ts";

Deno.serve(async (request) => {
  const earlyResponse = handleOptions(request);
  if (earlyResponse) {
    return earlyResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const roomCode = normalizeRoomCode(body.roomCode);

    if (roomCode.length !== 6) {
      return jsonResponse({
        ok: false,
        code: "invalid_room_code",
        message: "Enter a 6-character room code.",
      });
    }

    const supabase = getAdminClient();
    const playerToken = createGuestToken();
    const blueTokenHash = await hashToken(playerToken);
    const { data, error } = await supabase
      .from("matches")
      .update({
        blue_token_hash: blueTokenHash,
        status: "active",
      })
      .eq("room_code", roomCode)
      .eq("status", "waiting")
      .is("blue_token_hash", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { data: existing, error: lookupError } = await supabase
        .from("matches")
        .select("status, blue_token_hash")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      return jsonResponse({
        ok: false,
        code: existing ? "room_full" : "room_not_found",
        message: existing
          ? "That room is already full or no longer waiting."
          : "No waiting room exists for that code.",
      });
    }

    await broadcastMatchState(data).catch(() => {});

    return jsonResponse({
      ok: true,
      matchId: data.id,
      roomCode: data.room_code,
      color: PLAYERS.BLUE,
      playerToken,
      realtimeTopic: data.realtime_topic,
      state: sanitizeMatch(data),
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: "server_error",
        message: error instanceof Error ? error.message : "Join match failed.",
      },
      500
    );
  }
});
