import assert from "node:assert/strict";
import {
  applyMove,
  BOARD_SIZE,
  countPieces,
  createInitialBoard,
  getAllLegalMoves,
  getCaptureMoves,
  PLAYERS,
} from "../logic.js";

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

function hasMove(moves, from, to, captured = null) {
  return moves.some((move) => {
    const sameFrom = move.from.row === from.row && move.from.col === from.col;
    const sameTo = move.to.row === to.row && move.to.col === to.col;
    const sameCapture =
      (!captured && !move.captured) ||
      (captured &&
        move.captured?.row === captured.row &&
        move.captured?.col === captured.col);

    return sameFrom && sameTo && sameCapture;
  });
}

function testInitialBoard() {
  const board = createInitialBoard();

  assert.equal(countPieces(board, PLAYERS.RED), 12);
  assert.equal(countPieces(board, PLAYERS.BLUE), 12);
  assert.ok(hasMove(getAllLegalMoves(board, PLAYERS.RED), { row: 5, col: 0 }, { row: 4, col: 1 }));
}

function testMandatoryCapture() {
  const board = emptyBoard();
  board[5][0] = { player: PLAYERS.RED, king: false };
  board[4][1] = { player: PLAYERS.BLUE, king: false };

  const moves = getAllLegalMoves(board, PLAYERS.RED);

  assert.equal(moves.length, 1);
  assert.ok(
    hasMove(
      moves,
      { row: 5, col: 0 },
      { row: 3, col: 2 },
      { row: 4, col: 1 }
    )
  );
}

function testCaptureChain() {
  const board = emptyBoard();
  board[5][0] = { player: PLAYERS.RED, king: false };
  board[4][1] = { player: PLAYERS.BLUE, king: false };
  board[2][3] = { player: PLAYERS.BLUE, king: false };

  const firstMove = getAllLegalMoves(board, PLAYERS.RED)[0];
  const firstResult = applyMove(board, firstMove);
  const movedPiece = firstResult.board[3][2];
  const followUps = getCaptureMoves(firstResult.board, 3, 2, movedPiece);

  assert.ok(
    hasMove(
      followUps,
      { row: 3, col: 2 },
      { row: 1, col: 4 },
      { row: 2, col: 3 }
    )
  );
}

function testPromotion() {
  const board = emptyBoard();
  board[1][2] = { player: PLAYERS.RED, king: false };

  const [move] = getAllLegalMoves(board, PLAYERS.RED);
  const result = applyMove(board, move);

  assert.equal(result.board[0][1].king, true);
}

function testQueenCapture() {
  const board = emptyBoard();
  board[5][0] = { player: PLAYERS.RED, king: true };
  board[3][2] = { player: PLAYERS.BLUE, king: false };

  const moves = getAllLegalMoves(board, PLAYERS.RED);

  assert.ok(
    hasMove(
      moves,
      { row: 5, col: 0 },
      { row: 2, col: 3 },
      { row: 3, col: 2 }
    )
  );
  assert.ok(
    hasMove(
      moves,
      { row: 5, col: 0 },
      { row: 0, col: 5 },
      { row: 3, col: 2 }
    )
  );
}

testInitialBoard();
testMandatoryCapture();
testCaptureChain();
testPromotion();
testQueenCapture();

console.log("Shared rule tests passed.");
