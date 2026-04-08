export const BOARD_SIZE = 8;

export const PLAYERS = {
  RED: "red",
  BLUE: "blue",
};

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 0) {
        continue;
      }

      if (row < 3) {
        board[row][col] = { player: PLAYERS.BLUE, king: false };
      } else if (row > 4) {
        board[row][col] = { player: PLAYERS.RED, king: false };
      }
    }
  }

  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

const MOVE_DIRECTIONS = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  blue: [
    [1, -1],
    [1, 1],
  ],
  king: [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
};

const CAPTURE_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function getMoveDirections(piece) {
  return piece.king ? MOVE_DIRECTIONS.king : MOVE_DIRECTIONS[piece.player];
}

function getSimpleMoves(board, row, col, piece) {
  const moves = [];

  for (const [dRow, dCol] of getMoveDirections(piece)) {
    const toRow = row + dRow;
    const toCol = col + dCol;

    if (!isInsideBoard(toRow, toCol) || board[toRow][toCol]) {
      continue;
    }

    moves.push({
      from: { row, col },
      to: { row: toRow, col: toCol },
      captured: null,
    });
  }

  return moves;
}

export function getCaptureMoves(board, row, col, piece) {
  const moves = [];

  for (const [dRow, dCol] of CAPTURE_DIRECTIONS) {
    const middleRow = row + dRow;
    const middleCol = col + dCol;
    const toRow = row + dRow * 2;
    const toCol = col + dCol * 2;

    if (!isInsideBoard(middleRow, middleCol) || !isInsideBoard(toRow, toCol)) {
      continue;
    }

    const middlePiece = board[middleRow][middleCol];
    if (!middlePiece || middlePiece.player === piece.player) {
      continue;
    }

    if (board[toRow][toCol]) {
      continue;
    }

    moves.push({
      from: { row, col },
      to: { row: toRow, col: toCol },
      captured: { row: middleRow, col: middleCol },
    });
  }

  return moves;
}

export function getAllCaptureMoves(board, player) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) {
        continue;
      }

      moves.push(...getCaptureMoves(board, row, col, piece));
    }
  }

  return moves;
}

export function getLegalMovesForPiece(board, row, col, forceCapture) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  const captureMoves = getCaptureMoves(board, row, col, piece);
  if (forceCapture) {
    return captureMoves;
  }

  return [...captureMoves, ...getSimpleMoves(board, row, col, piece)];
}

export function getAllLegalMoves(board, player) {
  const captures = getAllCaptureMoves(board, player);
  if (captures.length > 0) {
    return captures;
  }

  const moves = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.player !== player) {
        continue;
      }

      moves.push(...getSimpleMoves(board, row, col, piece));
    }
  }

  return moves;
}

function shouldPromote(piece, row) {
  return (
    !piece.king &&
    ((piece.player === PLAYERS.RED && row === 0) ||
      (piece.player === PLAYERS.BLUE && row === BOARD_SIZE - 1))
  );
}

export function applyMove(board, move) {
  const nextBoard = cloneBoard(board);
  const movingPiece = nextBoard[move.from.row][move.from.col];
  nextBoard[move.from.row][move.from.col] = null;

  if (move.captured) {
    nextBoard[move.captured.row][move.captured.col] = null;
  }

  nextBoard[move.to.row][move.to.col] = {
    ...movingPiece,
    king: movingPiece.king || shouldPromote(movingPiece, move.to.row),
  };

  return {
    board: nextBoard,
    movedTo: { row: move.to.row, col: move.to.col },
    wasCapture: Boolean(move.captured),
  };
}

export function countPieces(board, player) {
  let count = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col]?.player === player) {
        count += 1;
      }
    }
  }

  return count;
}

export function formatSquare(square) {
  return `${String.fromCharCode(65 + square.col)}${BOARD_SIZE - square.row}`;
}
