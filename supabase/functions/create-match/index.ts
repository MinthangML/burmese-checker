import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  broadcastMatchState,
  createGuestToken,
  createInitialBoard,
  createRealtimeTopic,
  createRoomCode,
  getAdminClient,
  hashToken,
  PLAYERS,
  sanitizeMatch,
} from "../_shared/match-utils.ts";

Deno.serve(async (request) => {
  const earlyResponse = handleOptions(request);
  if (earlyResponse) {
    return earlyResponse;
  }

  try {
    const supabase = getAdminClient();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const playerToken = createGuestToken();
      const roomCode = createRoomCode();
      const realtimeTopic = createRealtimeTopic();
      const redTokenHash = await hashToken(playerToken);

      const { data, error } = await supabase
        .from("matches")
        .insert({
          room_code: roomCode,
          realtime_topic: realtimeTopic,
          status: "waiting",
          board: createInitialBoard(),
          current_player: PLAYERS.RED,
          red_token_hash: redTokenHash,
        })
        .select("*")
        .single();

      if (error?.code === "23505") {
        continue;
      }

      if (error) {
        throw error;
      }

      await broadcastMatchState(data).catch(() => {});

      return jsonResponse({
        ok: true,
        matchId: data.id,
        roomCode: data.room_code,
        color: PLAYERS.RED,
        playerToken,
        realtimeTopic: data.realtime_topic,
        state: sanitizeMatch(data),
      });
    }

    return jsonResponse({
      ok: false,
      code: "room_code_failed",
      message: "Could not create a unique room code. Try again.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: "server_error",
        message: error instanceof Error ? error.message : "Create match failed.",
      },
      500
    );
  }
});
