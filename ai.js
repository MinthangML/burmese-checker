import {
  BOARD_SIZE,
  PLAYERS,
  applyMove,
  countPieces,
  getAllLegalMoves,
  getCaptureMoves,
} from "./logic";

export const AI_DIFFICULTIES = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
};

const WIN_SCORE = 1000000;
const HARD_SEARCH_DEPTH = 7;
const HARD_NODE_LIMIT = 18000;
const HARD_BRANCH_LIMIT = 14;
const HARD_TIME_LIMIT_MS = 1200;

function getOpponent(player) {
  return player === PLAYERS.RED ? PLAYERS.BLUE : PLAYERS.RED;
}

function expandCaptureOptions(board, movedTo, moves) {
  const piece = board[movedTo.row][movedTo.col];
  if (!piece) {
    return [{ moves, board }];
  }

  const followUpCaptures = getCaptureMoves(
    board,
    movedTo.row,
    movedTo.col,
    piece
  );

  if (!followUpCaptures.length) {
    return [{ moves, board }];
  }

  return followUpCaptures.flatMap((move) => {
    const result = applyMove(board, move);
    return expandCaptureOptions(result.board, result.movedTo, [...moves, move]);
  });
}

function getTurnOptions(board, player) {
  return getAllLegalMoves(board, player).flatMap((move) => {
    const result = applyMove(board, move);

    if (!result.wasCapture) {
      return [{ moves: [move], board: result.board }];
    }

    return expandCaptureOptions(result.board, result.movedTo, [move]);
  });
}

export function getTurnSequences(board, player) {
  return getTurnOptions(board, player).map((option) => option.moves);
}

function scoreAdvancement(piece, row) {
  if (piece.king) {
    return 0;
  }

  return piece.player === PLAYERS.BLUE ? row : BOARD_SIZE - 1 - row;
}

function evaluateBoard(board, aiPlayer) {
  const opponent = getOpponent(aiPlayer);
  const aiPieces = countPieces(board, aiPlayer);
  const opponentPieces = countPieces(board, opponent);

  if (opponentPieces === 0 || getAllLegalMoves(board, opponent).length === 0) {
    return WIN_SCORE;
  }

  if (aiPieces === 0 || getAllLegalMoves(board, aiPlayer).length === 0) {
    return -WIN_SCORE;
  }

  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece) {
        continue;
      }

      const sign = piece.player === aiPlayer ? 1 : -1;
      const centerBonus =
        row >= 2 && row <= 5 && col >= 2 && col <= 5 ? 5 : 0;
      const edgePenalty = col === 0 || col === BOARD_SIZE - 1 ? -2 : 0;
      const value =
        (piece.king ? 185 : 100) +
        scoreAdvancement(piece, row) * 5 +
        centerBonus +
        edgePenalty;

      score += sign * value;
    }
  }

  const aiMobility = getAllLegalMoves(board, aiPlayer).length;
  const opponentMobility = getAllLegalMoves(board, opponent).length;

  return score + (aiMobility - opponentMobility) * 4;
}

function countCaptures(moves) {
  return moves.reduce((total, move) => total + (move.captured ? 1 : 0), 0);
}

function scoreTurnOption(option, aiPlayer, optionPlayer = aiPlayer) {
  const turnSign = optionPlayer === aiPlayer ? 1 : -1;

  return (
    evaluateBoard(option.board, aiPlayer) +
    turnSign * countCaptures(option.moves) * 18 +
    turnSign * option.moves.length * 3
  );
}

function chooseRandomOption(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function rankOptions(
  options,
  aiPlayer,
  optionPlayer = aiPlayer,
  descending = true
) {
  return options
    .map((option) => ({
      option,
      score: scoreTurnOption(option, aiPlayer, optionPlayer),
    }))
    .sort((a, b) => (descending ? b.score - a.score : a.score - b.score))
    .map((entry) => entry.option);
}

function minimax(board, playerToMove, aiPlayer, depth, alpha, beta, state) {
  state.nodes += 1;

  if (
    depth <= 0 ||
    state.nodes >= HARD_NODE_LIMIT ||
    Date.now() >= state.deadline
  ) {
    return evaluateBoard(board, aiPlayer);
  }

  const options = getTurnOptions(board, playerToMove);
  if (!options.length) {
    return playerToMove === aiPlayer ? -WIN_SCORE + depth : WIN_SCORE - depth;
  }

  const maximizing = playerToMove === aiPlayer;
  const rankedOptions = rankOptions(
    options,
    aiPlayer,
    playerToMove,
    maximizing
  ).slice(0, HARD_BRANCH_LIMIT);
  const nextPlayer = getOpponent(playerToMove);

  if (maximizing) {
    let bestScore = -Infinity;

    for (const option of rankedOptions) {
      bestScore = Math.max(
        bestScore,
        minimax(
          option.board,
          nextPlayer,
          aiPlayer,
          depth - 1,
          alpha,
          beta,
          state
        )
      );
      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha || state.nodes >= HARD_NODE_LIMIT) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const option of rankedOptions) {
    bestScore = Math.min(
      bestScore,
      minimax(option.board, nextPlayer, aiPlayer, depth - 1, alpha, beta, state)
    );
    beta = Math.min(beta, bestScore);

    if (beta <= alpha || state.nodes >= HARD_NODE_LIMIT) {
      break;
    }
  }

  return bestScore;
}

function chooseBestImmediateTurn(board, player) {
  const options = getTurnOptions(board, player);
  if (!options.length) {
    return [];
  }

  return rankOptions(options, player, player)[0].moves;
}

function chooseHardTurn(board, player) {
  const options = getTurnOptions(board, player);
  if (!options.length) {
    return [];
  }

  const rankedOptions = rankOptions(options, player, player).slice(
    0,
    HARD_BRANCH_LIMIT
  );
  const state = {
    nodes: 0,
    deadline: Date.now() + HARD_TIME_LIMIT_MS,
  };
  const nextPlayer = getOpponent(player);
  let bestOption = rankedOptions[0];
  let bestScore = scoreTurnOption(bestOption, player, player);

  for (let depth = 2; depth <= HARD_SEARCH_DEPTH; depth += 1) {
    let iterationBestOption = bestOption;
    let iterationBestScore = -Infinity;
    let completedIteration = true;

    for (const option of rankedOptions) {
      const score = minimax(
        option.board,
        nextPlayer,
        player,
        depth - 1,
        -Infinity,
        Infinity,
        state
      );

      if (score > iterationBestScore) {
        iterationBestScore = score;
        iterationBestOption = option;
      }

      if (state.nodes >= HARD_NODE_LIMIT || Date.now() >= state.deadline) {
        completedIteration = false;
        break;
      }
    }

    if (completedIteration || iterationBestScore > bestScore) {
      bestScore = iterationBestScore;
      bestOption = iterationBestOption;
    }

    if (!completedIteration) {
      break;
    }
  }

  return bestOption.moves;
}

export function chooseAiTurn(board, player, difficulty = AI_DIFFICULTIES.NORMAL) {
  const options = getTurnOptions(board, player);
  if (!options.length) {
    return [];
  }

  if (difficulty === AI_DIFFICULTIES.EASY) {
    return chooseRandomOption(options).moves;
  }

  if (difficulty === AI_DIFFICULTIES.HARD) {
    return chooseHardTurn(board, player);
  }

  return chooseBestImmediateTurn(board, player);
}
