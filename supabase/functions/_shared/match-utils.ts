import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  applyMove,
  countPieces,
  createInitialBoard,
  getAllCaptureMoves,
  getAllLegalMoves,
  getCaptureMoves,
  getLegalMovesForPiece,
  getOpponent,
  PLAYERS,
} from "./game-rules.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_BYTES = 32;
const TOPIC_BYTES = 24;

type Player = "red" | "blue";

type Square = {
  row: number;
  col: number;
};

type Move = {
  from: Square;
  to: Square;
  captured?: Square | null;
};

export type MatchRow = {
  id: string;
  room_code: string;
  realtime_topic: string;
  status: "waiting" | "active" | "finished";
  board: unknown[][];
  current_player: Player;
  forced_piece: Square | null;
  winner: Player | null;
  move_number: number;
  red_token_hash: string;
  blue_token_hash: string | null;
};

export type SanitizedMatchState = {
  matchId: string;
  roomCode: string;
  status: "waiting" | "active" | "finished";
  board: unknown[][];
  currentPlayer: Player;
  forcedPiece: Square | null;
  winner: Player | null;
  moveNumber: number;
};

export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase Edge Function environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createGuestToken() {
  return bytesToBase64Url(randomBytes(TOKEN_BYTES));
}

export function createRealtimeTopic() {
  return `match:${bytesToBase64Url(randomBytes(TOPIC_BYTES))}`;
}

export function createRoomCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join("");
}

export function normalizeRoomCode(value: unknown) {
  return String(value ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6);
}

export async function hashToken(token: string) {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

export function sanitizeMatch(row: MatchRow): SanitizedMatchState {
  return {
    matchId: row.id,
    roomCode: row.room_code,
    status: row.status,
    board: row.board,
    currentPlayer: row.current_player,
    forcedPiece: row.forced_piece,
    winner: row.winner,
    moveNumber: row.move_number,
  };
}

export async function getMatchById(matchId: unknown) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", String(matchId ?? ""))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as MatchRow | null;
}

export async function getPlayerColor(row: MatchRow, playerToken: unknown) {
  const token = String(playerToken ?? "");

  if (!token) {
    return null;
  }

  const tokenHash = await hashToken(token);

  if (tokenHash === row.red_token_hash) {
    return PLAYERS.RED as Player;
  }

  if (row.blue_token_hash && tokenHash === row.blue_token_hash) {
    return PLAYERS.BLUE as Player;
  }

  return null;
}

function isSquare(square: unknown): square is Square {
  const maybeSquare = square as Square;
  return (
    Number.isInteger(maybeSquare?.row) &&
    Number.isInteger(maybeSquare?.col) &&
    maybeSquare.row >= 0 &&
    maybeSquare.row < 8 &&
    maybeSquare.col >= 0 &&
    maybeSquare.col < 8
  );
}

function sameSquare(first: Square | null | undefined, second: Square | null | undefined) {
  return Boolean(
    first &&
      second &&
      first.row === second.row &&
      first.col === second.col
  );
}

function sameMoveIntent(legalMove: Move, submittedMove: Move) {
  return (
    sameSquare(legalMove.from, submittedMove.from) &&
    sameSquare(legalMove.to, submittedMove.to)
  );
}

export function prepareMoveCommit(row: MatchRow, color: Player, expectedMoveNumber: unknown, submittedMove: unknown) {
  if (row.status === "waiting") {
    return {
      ok: false,
      code: "match_waiting",
      message: "Waiting for the second player to join.",
    };
  }

  if (row.status === "finished" || row.winner) {
    return {
      ok: false,
      code: "match_finished",
      message: "This match is already finished.",
    };
  }

  if (Number(expectedMoveNumber) !== row.move_number) {
    return {
      ok: false,
      code: "move_conflict",
      message: "Match state changed. Refreshing the board.",
      state: sanitizeMatch(row),
    };
  }

  if (row.current_player !== color) {
    return {
      ok: false,
      code: "wrong_turn",
      message: "It is not your turn.",
    };
  }

  const move = submittedMove as Move;

  if (!isSquare(move?.from) || !isSquare(move?.to)) {
    return {
      ok: false,
      code: "invalid_move",
      message: "Move coordinates are invalid.",
    };
  }

  if (row.forced_piece && !sameSquare(row.forced_piece, move.from)) {
    return {
      ok: false,
      code: "forced_capture",
      message: "This capture chain must continue from the forced piece.",
    };
  }

  const board = row.board as any[][];
  const piece = board[move.from.row]?.[move.from.col];

  if (!piece || piece.player !== color) {
    return {
      ok: false,
      code: "invalid_move",
      message: "That piece cannot move for this player.",
    };
  }

  const mustCapture = getAllCaptureMoves(board, color).length > 0;
  const legalMoves = getLegalMovesForPiece(board, move.from.row, move.from.col, mustCapture);
  const canonicalMove = legalMoves.find((legalMove: Move) =>
    sameMoveIntent(legalMove, move)
  );

  if (!canonicalMove) {
    return {
      ok: false,
      code: "illegal_move",
      message: "That move is not legal in the current position.",
    };
  }

  const result = applyMove(board, canonicalMove);
  let nextCurrentPlayer = color;
  let nextForcedPiece: Square | null = null;
  let nextWinner: Player | null = null;
  let nextStatus: "active" | "finished" = "active";

  if (result.wasCapture) {
    const movedPiece = result.board[result.movedTo.row][result.movedTo.col];
    const followUpCaptures = getCaptureMoves(
      result.board,
      result.movedTo.row,
      result.movedTo.col,
      movedPiece
    );

    if (followUpCaptures.length > 0) {
      nextForcedPiece = result.movedTo;
    }
  }

  if (!nextForcedPiece) {
    const nextPlayer = getOpponent(color) as Player;
    const nextPlayerHasPieces = countPieces(result.board, nextPlayer) > 0;
    const nextPlayerHasMoves = getAllLegalMoves(result.board, nextPlayer).length > 0;

    if (!nextPlayerHasPieces || !nextPlayerHasMoves) {
      nextWinner = color;
      nextStatus = "finished";
      nextCurrentPlayer = color;
    } else {
      nextCurrentPlayer = nextPlayer;
    }
  }

  return {
    ok: true,
    canonicalMove,
    update: {
      board: result.board,
      currentPlayer: nextCurrentPlayer,
      forcedPiece: nextForcedPiece,
      winner: nextWinner,
      status: nextStatus,
    },
  };
}

export async function broadcastMatchState(row: MatchRow) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          topic: row.realtime_topic,
          event: "match_state",
          payload: {
            type: "match_state",
            state: sanitizeMatch(row),
          },
        },
      ],
    }),
  });
}

export { createInitialBoard, PLAYERS };
