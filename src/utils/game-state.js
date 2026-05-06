import {
  countPieces,
  getAllLegalMoves,
  getOpponent,
} from "../../logic";
import { COPY } from "../../translations";
import { MOVE_SOUND } from "../constants/game";

export function getDifficultyLabel(difficulty, copy) {
  return copy.difficulty[difficulty] ?? copy.difficulty.normal;
}

export function formatOnlineError(error, copy) {
  if (!error) {
    return "";
  }

  if (error.code === "missing_config") {
    return copy.errors.missingConfig;
  }

  return error.message && copy === COPY.en
    ? error.message
    : copy.errors.onlineRequestFailed;
}

export function sleep(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function getTurnWinner(nextBoard, completedPlayer) {
  const nextPlayer = getOpponent(completedPlayer);
  const nextPlayerHasPieces = countPieces(nextBoard, nextPlayer) > 0;
  const nextPlayerHasMoves = getAllLegalMoves(nextBoard, nextPlayer).length > 0;

  return !nextPlayerHasPieces || !nextPlayerHasMoves ? completedPlayer : null;
}

function didMovePromote(previousBoard, move, nextBoard) {
  const previousPiece = previousBoard?.[move.from.row]?.[move.from.col];
  const nextPiece = nextBoard?.[move.to.row]?.[move.to.col];

  return Boolean(previousPiece && !previousPiece.king && nextPiece?.king);
}

export function getMoveSoundKind(previousBoard, move, nextBoard, moveWinner = null) {
  if (moveWinner) {
    return MOVE_SOUND.WIN;
  }

  if (didMovePromote(previousBoard, move, nextBoard)) {
    return MOVE_SOUND.PROMOTE;
  }

  if (move.captured) {
    return MOVE_SOUND.CAPTURE;
  }

  return MOVE_SOUND.MOVE;
}

function isSamePiece(firstPiece, secondPiece) {
  return (
    firstPiece?.player === secondPiece?.player &&
    Boolean(firstPiece?.king) === Boolean(secondPiece?.king)
  );
}

function inferMoveFromBoards(previousBoard, nextBoard) {
  const removed = [];
  const added = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const previousPiece = previousBoard?.[row]?.[col] ?? null;
      const nextPiece = nextBoard?.[row]?.[col] ?? null;

      if (isSamePiece(previousPiece, nextPiece)) {
        continue;
      }

      if (previousPiece) {
        removed.push({ row, col, piece: previousPiece });
      }

      if (nextPiece) {
        added.push({ row, col, piece: nextPiece });
      }
    }
  }

  const movedTo = added.find((addedCell) =>
    removed.some((removedCell) => removedCell.piece.player === addedCell.piece.player)
  );

  if (!movedTo) {
    return null;
  }

  const movedFrom = removed.find(
    (removedCell) => removedCell.piece.player === movedTo.piece.player
  );
  const captured = removed.find(
    (removedCell) => removedCell.piece.player !== movedTo.piece.player
  );

  return {
    captured,
    promoted: Boolean(movedFrom && !movedFrom.piece.king && movedTo.piece.king),
  };
}

export function inferMoveSoundKind(previousBoard, nextBoard, moveWinner = null) {
  if (moveWinner) {
    return MOVE_SOUND.WIN;
  }

  const inferredMove = inferMoveFromBoards(previousBoard, nextBoard);
  if (!inferredMove) {
    return null;
  }

  if (inferredMove.promoted) {
    return MOVE_SOUND.PROMOTE;
  }

  if (inferredMove.captured) {
    return MOVE_SOUND.CAPTURE;
  }

  return MOVE_SOUND.MOVE;
}

export function getMoveNumber(state) {
  const moveNumber = Number(state?.moveNumber);
  return Number.isFinite(moveNumber) ? moveNumber : 0;
}

export function countPresencePlayers(presenceState) {
  return Object.values(presenceState).filter((presenceList) =>
    Array.isArray(presenceList) ? presenceList.length > 0 : false
  ).length;
}

export function getScreenFromPath(pathname) {
  if (pathname === "/settings") {
    return "settings";
  }

  if (pathname === "/game") {
    return "game";
  }

  if (pathname === "/online-lobby") {
    return "online-lobby";
  }

  return "intro";
}

export function getPathFromScreen(nextScreen) {
  if (nextScreen === "settings") {
    return "/settings";
  }

  if (nextScreen === "game") {
    return "/game";
  }

  if (nextScreen === "online-lobby") {
    return "/online-lobby";
  }

  return "/";
}
