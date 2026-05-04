import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text as RNText,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { AI_DIFFICULTIES, chooseAiTurn } from "./ai";
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
} from "./logic";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import {
  clearSavedOnlineSession,
  createOnlineMatch,
  getOnlineMatch,
  joinOnlineMatch,
  loadSavedOnlineSession,
  normalizeRoomCode,
  saveOnlineSession,
  subscribeToOnlineMatch,
  submitOnlineMove,
} from "./online";
import { getBurmeseTextStyle, PLAYER_THEME, styles, SURFACE } from "./styles";
import { COPY, DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from "./translations";
import { PlayerStrip } from "./ui";

const MENU_OPTIONS = [
  {
    key: "single",
    icon: "👤",
  },
  {
    key: "two-player",
    icon: "👥",
  },
  {
    key: "online",
    icon: "🌐",
  },
];

const AI_THINK_DELAY = 420;
const AI_MOVE_DELAY = 340;
const ONLINE_MODE = MENU_OPTIONS.find((option) => option.key === "online");
const WIN_SOUND_DEDUPE_MS = 1200;
const MOVE_SOUND = {
  MOVE: "move",
  CAPTURE: "capture",
  PROMOTE: "promote",
  WIN: "win",
};
const MOVE_SOUND_SOURCE = {
  [MOVE_SOUND.MOVE]: require("./assets/sounds/piece-move.wav"),
  [MOVE_SOUND.CAPTURE]: require("./assets/sounds/piece-capture.wav"),
  [MOVE_SOUND.PROMOTE]: require("./assets/sounds/piece-promote.wav"),
  [MOVE_SOUND.WIN]: require("./assets/sounds/game-win.wav"),
};
const CONFETTI_COLORS = [
  "#79dbc7",
  "#f4ca6f",
  "#ff8fa3",
  "#8bb8ff",
  "#ead2a2",
  "#dcfff6",
];
const CONFETTI_PIECES = Array.from({ length: 28 }).map((_, index) => ({
  key: `confetti-${index}`,
  left: `${(index * 37) % 100}%`,
  delay: (index % 7) * 90,
  duration: 1350 + (index % 5) * 140,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  size: 7 + (index % 4) * 2,
  rotate: index % 2 === 0 ? "28deg" : "-32deg",
}));

const AI_DIFFICULTY_OPTIONS = [
  { key: AI_DIFFICULTIES.EASY },
  { key: AI_DIFFICULTIES.NORMAL },
  { key: AI_DIFFICULTIES.HARD },
];

function getDifficultyLabel(difficulty, copy) {
  return copy.difficulty[difficulty] ?? copy.difficulty.normal;
}

function formatOnlineError(error, copy) {
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

function sleep(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function getTurnWinner(nextBoard, completedPlayer) {
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

function getMoveSoundKind(previousBoard, move, nextBoard, moveWinner = null) {
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

function inferMoveSoundKind(previousBoard, nextBoard, moveWinner = null) {
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

function getMoveNumber(state) {
  const moveNumber = Number(state?.moveNumber);
  return Number.isFinite(moveNumber) ? moveNumber : 0;
}

function countPresencePlayers(presenceState) {
  return Object.values(presenceState).filter((presenceList) =>
    Array.isArray(presenceList) ? presenceList.length > 0 : false
  ).length;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Padauk-Regular": require("./assets/fonts/Padauk-Regular.ttf"),
    "Padauk-Bold": require("./assets/fonts/Padauk-Bold.ttf"),
  });
  const [screen, setScreen] = useState("intro");
  const [returnScreen, setReturnScreen] = useState("intro");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [matchMode, setMatchMode] = useState(MENU_OPTIONS[0]);
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.RED);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [forcedPiece, setForcedPiece] = useState(null);
  const [winner, setWinner] = useState(null);
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTIES.NORMAL);
  const [aiThinking, setAiThinking] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [savedOnlineSession, setSavedOnlineSession] = useState(null);
  const [onlineSession, setOnlineSession] = useState(null);
  const [onlineMatchState, setOnlineMatchState] = useState(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineSubmitting, setOnlineSubmitting] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [onlineConnection, setOnlineConnection] = useState("idle");
  const [onlinePresence, setOnlinePresence] = useState({});
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [winnerDialogVisible, setWinnerDialogVisible] = useState(false);
  const moveSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.MOVE]);
  const captureSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.CAPTURE]);
  const promoteSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.PROMOTE]);
  const winSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.WIN]);
  const boardRef = useRef(board);
  const onlineMoveNumberRef = useRef(null);
  const lastCelebratedWinnerRef = useRef(null);
  const lastWinSoundAtRef = useRef(0);
  const confettiAnimations = useRef(
    CONFETTI_PIECES.map(() => new Animated.Value(0))
  ).current;
  const { width, height } = useWindowDimensions();
  const copy = COPY[language] ?? COPY[DEFAULT_LANGUAGE];
  const isBurmese = language === "my";

  function Text({ style, ...props }) {
    return (
      <RNText
        {...props}
        style={getBurmeseTextStyle(style, isBurmese, fontsLoaded)}
      />
    );
  }
  const playerThemes = useMemo(
    () => ({
      [PLAYERS.RED]: {
        ...PLAYER_THEME[PLAYERS.RED],
        label: copy.players.red.label,
        seat: copy.players.red.seat,
      },
      [PLAYERS.BLUE]: {
        ...PLAYER_THEME[PLAYERS.BLUE],
        label: copy.players.blue.label,
        seat: copy.players.blue.seat,
      },
    }),
    [copy]
  );
  const menuOptions = useMemo(
    () =>
      MENU_OPTIONS.map((option) => ({
        ...option,
        label: copy.menu[option.key].label,
        detail: copy.menu[option.key].detail,
      })),
    [copy]
  );
  const onlineMode = menuOptions.find((option) => option.key === "online");
  const getPlayerLabel = (player) =>
    playerThemes[player]?.label ?? copy.players.fallback;

  const isWide = width >= 900;
  const boardWidthLimit = isWide ? Math.min(width * 0.62, 720) : width - 32;
  const boardHeightLimit = height * (isWide ? 0.56 : 0.44);
  const boardSize = Math.max(240, Math.min(boardWidthLimit, boardHeightLimit));
  const seatWidth = Math.min(width - 24, boardSize + 28);
  const tileSize = boardSize / 8;

  const boardIntro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  function playMoveSound(soundKind) {
    const soundPlayer = {
      [MOVE_SOUND.MOVE]: moveSound,
      [MOVE_SOUND.CAPTURE]: captureSound,
      [MOVE_SOUND.PROMOTE]: promoteSound,
      [MOVE_SOUND.WIN]: winSound,
    }[soundKind];

    if (!soundPlayer) {
      return;
    }

    try {
      const seekResult = soundPlayer.seekTo(0);
      seekResult?.catch?.(() => {});
      soundPlayer.play();
      if (soundKind === MOVE_SOUND.WIN) {
        lastWinSoundAtRef.current = Date.now();
      }
    } catch {
      // Sound effects should never block a move.
    }
  }

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    async function applyFullscreen() {
      try {
        NavigationBar.setStyle("light");
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {
        // Ignore platform/runtime inconsistencies and keep the app usable.
      }
    }

    applyFullscreen();
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    moveSound.volume = 0.38;
    captureSound.volume = 0.48;
    promoteSound.volume = 0.42;
    winSound.volume = 0.44;
  }, [moveSound, captureSound, promoteSound, winSound]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (screen !== "game") {
      setExitConfirmVisible(false);
      setWinnerDialogVisible(false);
      boardIntro.setValue(0);
      return;
    }

    Animated.timing(boardIntro, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [boardIntro, screen]);

  useEffect(() => {
    if (screen !== "game" || !winner) {
      return;
    }

    if (lastCelebratedWinnerRef.current === winner) {
      return;
    }

    lastCelebratedWinnerRef.current = winner;
    setWinnerDialogVisible(true);

    confettiAnimations.forEach((animation) => {
      animation.setValue(0);
    });

    Animated.stagger(
      34,
      confettiAnimations.map((animation, index) =>
        Animated.timing(animation, {
          toValue: 1,
          duration: CONFETTI_PIECES[index].duration,
          delay: CONFETTI_PIECES[index].delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();

    if (Date.now() - lastWinSoundAtRef.current > WIN_SOUND_DEDUPE_MS) {
      playMoveSound(MOVE_SOUND.WIN);
    }
  }, [screen, winner, confettiAnimations]);

  useEffect(() => {
    if (screen !== "game") {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setExitConfirmVisible(true);
        return true;
      }
    );

    return () => subscription.remove();
  }, [screen]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 1],
  });
  const targetScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.1],
  });
  const targetOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });
  const introTranslateY = boardIntro.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const introScale = boardIntro.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const redPieces = countPieces(board, PLAYERS.RED);
  const bluePieces = countPieces(board, PLAYERS.BLUE);
  const allCaptures = useMemo(
    () => getAllCaptureMoves(board, currentPlayer),
    [board, currentPlayer]
  );
  const mustCapture = allCaptures.length > 0;
  const captureSources = useMemo(
    () => new Set(allCaptures.map((move) => `${move.from.row}:${move.from.col}`)),
    [allCaptures]
  );

  const currentTheme = playerThemes[currentPlayer];
  const isSinglePlayer = matchMode.key === "single";
  const isOnline = matchMode.key === "online";
  const isAiTurn =
    screen === "game" &&
    isSinglePlayer &&
    currentPlayer === PLAYERS.BLUE &&
    !winner;
  const currentDifficultyLabel = getDifficultyLabel(aiDifficulty, copy);
  const onlineRoomCode = onlineMatchState?.roomCode ?? onlineSession?.roomCode;
  const onlineConnectedPlayers = countPresencePlayers(onlinePresence);
  const isOnlineActive = isOnline && onlineMatchState?.status === "active";
  const isOnlineMyTurn =
    isOnlineActive && onlineSession?.color === currentPlayer && !winner;
  const statusColor =
    isOnline && onlineError
      ? "#ffb4a8"
      : winner
      ? playerThemes[winner].accent
      : currentTheme.accent;
  const winnerTheme = winner ? playerThemes[winner] : null;

  useEffect(() => {
    let mounted = true;

    loadSavedOnlineSession().then((session) => {
      if (mounted) {
        setSavedOnlineSession(session);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setOnlineError("");
  }, [language]);

  useEffect(() => {
    if (!onlineSession?.realtimeTopic) {
      return undefined;
    }

    return subscribeToOnlineMatch(onlineSession, {
      onState: (state) => {
        applyOnlineState(state, { playMoveSound: true });
        setOnlineError("");
      },
      onPresence: setOnlinePresence,
      onStatus: setOnlineConnection,
      onError: (error) => {
        setOnlineError(formatOnlineError(error, copy));
      },
    });
  }, [onlineSession?.matchId, onlineSession?.realtimeTopic, onlineSession?.color, copy]);

  function resetGame() {
    const initialBoard = createInitialBoard();

    boardRef.current = initialBoard;
    setBoard(initialBoard);
    setCurrentPlayer(PLAYERS.RED);
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);
    setWinner(null);
    setAiThinking(false);
    setWinnerDialogVisible(false);
    lastCelebratedWinnerRef.current = null;
  }

  function resetOnlineRuntime() {
    setOnlineSession(null);
    setOnlineMatchState(null);
    setOnlineSubmitting(false);
    setOnlineBusy(false);
    setOnlineError("");
    setOnlineConnection("idle");
    setOnlinePresence({});
    onlineMoveNumberRef.current = null;
  }

  function applyOnlineState(state, options = {}) {
    if (!state) {
      return;
    }

    const previousMoveNumber = onlineMoveNumberRef.current;
    const nextMoveNumber = getMoveNumber(state);
    const nextBoard = state.board ?? createInitialBoard();

    if (
      options.playMoveSound &&
      previousMoveNumber !== null &&
      nextMoveNumber > previousMoveNumber
    ) {
      const soundKind = inferMoveSoundKind(
        boardRef.current,
        nextBoard,
        state.winner
      );
      playMoveSound(soundKind);
    }

    boardRef.current = nextBoard;
    onlineMoveNumberRef.current = nextMoveNumber;
    setOnlineMatchState(state);
    setBoard(nextBoard);
    setCurrentPlayer(state.currentPlayer ?? PLAYERS.RED);
    setForcedPiece(state.forcedPiece ?? null);
    setWinner(state.winner ?? null);
    setSelected(null);
    setLegalMoves([]);
    setAiThinking(false);
  }

  async function enterOnlineMatch(result) {
    setMatchMode(ONLINE_MODE);
    setOnlineSession(result.session);
    applyOnlineState(result.state);
    setOnlineError("");
    setOnlineSubmitting(false);
    setOnlineBusy(false);
    await saveOnlineSession(result.session);
    setSavedOnlineSession(result.session);
    setScreen("game");
  }

  function startMatch(mode) {
    if (mode.key === "online") {
      setMatchMode(mode);
      resetGame();
      resetOnlineRuntime();
      setScreen("online-lobby");
      return;
    }

    resetOnlineRuntime();
    setMatchMode(mode);
    resetGame();
    setScreen("game");
  }

  function goBackToMenu() {
    setExitConfirmVisible(false);
    resetGame();
    resetOnlineRuntime();
    setScreen("intro");
  }

  function requestExitGame() {
    setExitConfirmVisible(true);
  }

  function cancelExitGame() {
    setExitConfirmVisible(false);
  }

  function confirmExitGame() {
    goBackToMenu();
  }

  function startWinnerRematch() {
    setWinnerDialogVisible(false);
    startMatch(matchMode);
  }

  function closeWinnerDialog() {
    setWinnerDialogVisible(false);
  }

  function openSettings() {
    setReturnScreen(screen);
    setScreen("settings");
  }

  function closeSettings() {
    setScreen(returnScreen);
  }

  async function handleCreateOnlineMatch() {
    if (onlineBusy) {
      return;
    }

    setOnlineBusy(true);
    setOnlineError("");

    try {
      const result = await createOnlineMatch();
      await enterOnlineMatch(result);
    } catch (error) {
      setOnlineError(formatOnlineError(error, copy));
    } finally {
      setOnlineBusy(false);
    }
  }

  async function handleJoinOnlineMatch() {
    if (onlineBusy) {
      return;
    }

    const normalizedCode = normalizeRoomCode(joinCode);
    if (normalizedCode.length !== 6) {
      setOnlineError(copy.errors.invalidRoomCode);
      return;
    }

    setOnlineBusy(true);
    setOnlineError("");

    try {
      const result = await joinOnlineMatch(normalizedCode);
      await enterOnlineMatch(result);
    } catch (error) {
      setOnlineError(formatOnlineError(error, copy));
    } finally {
      setOnlineBusy(false);
    }
  }

  async function handleResumeOnlineMatch() {
    if (!savedOnlineSession || onlineBusy) {
      return;
    }

    setOnlineBusy(true);
    setOnlineError("");

    try {
      const result = await getOnlineMatch(savedOnlineSession);
      await enterOnlineMatch(result);
    } catch (error) {
      setOnlineError(formatOnlineError(error, copy));
    } finally {
      setOnlineBusy(false);
    }
  }

  async function handleClearSavedOnlineMatch() {
    await clearSavedOnlineSession();
    setSavedOnlineSession(null);
    resetOnlineRuntime();
  }

  function clearSelectionUnlessForced() {
    if (!forcedPiece) {
      setSelected(null);
      setLegalMoves([]);
    }
  }

  function finishTurn(nextBoard, completedPlayer = currentPlayer) {
    const nextPlayer = getOpponent(completedPlayer);
    const turnWinner = getTurnWinner(nextBoard, completedPlayer);

    boardRef.current = nextBoard;
    setBoard(nextBoard);
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);

    if (turnWinner) {
      setWinner(turnWinner);
      return;
    }

    setCurrentPlayer(nextPlayer);
  }

  function trySelectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.player !== currentPlayer) {
      return false;
    }

    if (forcedPiece && (forcedPiece.row !== row || forcedPiece.col !== col)) {
      return false;
    }

    const moves = getLegalMovesForPiece(board, row, col, mustCapture);
    if (!moves.length) {
      return false;
    }

    setSelected({ row, col });
    setLegalMoves(moves);
    return true;
  }

  function handleCellPress(row, col) {
    if (winner || isAiTurn || aiThinking || onlineSubmitting) {
      return;
    }

    if (isOnline && onlineMatchState?.status !== "active") {
      setOnlineError(copy.game.waitingSecondPlayer);
      return;
    }

    if (isOnline && !isOnlineMyTurn) {
      setOnlineError(copy.game.waitingMove(getPlayerLabel(currentPlayer)));
      return;
    }

    if (isOnline) {
      setOnlineError("");
    }

    if (selected) {
      const chosenMove = legalMoves.find(
        (move) => move.to.row === row && move.to.col === col
      );

      if (chosenMove) {
        if (isOnline) {
          submitOnlineChosenMove(chosenMove);
          return;
        }

        const result = applyMove(board, chosenMove);

        if (result.wasCapture) {
          const movedPiece = result.board[result.movedTo.row][result.movedTo.col];
          const followUpCaptures = getCaptureMoves(
            result.board,
            result.movedTo.row,
            result.movedTo.col,
            movedPiece
          );

          if (followUpCaptures.length > 0) {
            boardRef.current = result.board;
            setBoard(result.board);
            playMoveSound(getMoveSoundKind(board, chosenMove, result.board));
            setSelected(result.movedTo);
            setLegalMoves(followUpCaptures);
            setForcedPiece(result.movedTo);
            return;
          }
        }

        const moveWinner = getTurnWinner(result.board, currentPlayer);
        playMoveSound(
          getMoveSoundKind(board, chosenMove, result.board, moveWinner)
        );
        finishTurn(result.board, currentPlayer);
        return;
      }
    }

    const changedSelection = trySelectPiece(row, col);
    if (!changedSelection) {
      clearSelectionUnlessForced();
    }
  }

  async function submitOnlineChosenMove(chosenMove) {
    if (!onlineSession || !onlineMatchState) {
      return;
    }

    setOnlineSubmitting(true);
    setOnlineError("");

    try {
      const previousMoveNumber = onlineMoveNumberRef.current;
      const result = await submitOnlineMove(
        onlineSession,
        onlineMatchState,
        chosenMove
      );
      setOnlineSession(result.session);
      await saveOnlineSession(result.session);
      setSavedOnlineSession(result.session);
      if (getMoveNumber(result.state) > (previousMoveNumber ?? -1)) {
        const nextBoard = result.state?.board ?? boardRef.current;
        playMoveSound(
          getMoveSoundKind(
            boardRef.current,
            chosenMove,
            nextBoard,
            result.state?.winner
          )
        );
      }
      applyOnlineState(result.state);
    } catch (error) {
      if (error.data?.state) {
        applyOnlineState(error.data.state);
      }

      setOnlineError(formatOnlineError(error, copy));
    } finally {
      setOnlineSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isAiTurn) {
      return undefined;
    }

    let cancelled = false;

    async function playAiTurn() {
      setAiThinking(true);
      setSelected(null);
      setLegalMoves([]);
      setForcedPiece(null);

      await sleep(AI_THINK_DELAY);
      if (cancelled) {
        return;
      }

      const aiMoves = chooseAiTurn(board, PLAYERS.BLUE, aiDifficulty);
      if (!aiMoves.length) {
        setAiThinking(false);
        setWinner(PLAYERS.RED);
        return;
      }

      let nextBoard = board;

      for (let index = 0; index < aiMoves.length; index += 1) {
        const move = aiMoves[index];

        setSelected(move.from);
        setLegalMoves([move]);
        setForcedPiece(index > 0 ? move.from : null);

        await sleep(index === 0 ? AI_MOVE_DELAY * 0.65 : AI_MOVE_DELAY);
        if (cancelled) {
          return;
        }

        const previousBoard = nextBoard;
        const result = applyMove(nextBoard, move);
        nextBoard = result.board;
        boardRef.current = nextBoard;
        setBoard(nextBoard);
        playMoveSound(
          getMoveSoundKind(
            previousBoard,
            move,
            nextBoard,
            index === aiMoves.length - 1
              ? getTurnWinner(nextBoard, PLAYERS.BLUE)
              : null
          )
        );

        if (index < aiMoves.length - 1) {
          setSelected(result.movedTo);
          setLegalMoves([aiMoves[index + 1]]);
          setForcedPiece(result.movedTo);

          await sleep(AI_MOVE_DELAY);
          if (cancelled) {
            return;
          }
        }
      }

      if (cancelled) {
        return;
      }

      setAiThinking(false);
      finishTurn(nextBoard, PLAYERS.BLUE);
    }

    playAiTurn();

    return () => {
      cancelled = true;
    };
  }, [screen, isAiTurn, aiDifficulty]);

  const localMatchLine = winner
    ? copy.game.winnerLocal(getPlayerLabel(winner))
    : aiThinking
    ? copy.game.aiThinking(getPlayerLabel(PLAYERS.BLUE), currentDifficultyLabel)
    : forcedPiece
    ? copy.game.continueCapture(getPlayerLabel(currentPlayer))
    : mustCapture
    ? copy.game.mustCapture(getPlayerLabel(currentPlayer))
    : copy.game.quietMove(getPlayerLabel(currentPlayer));
  const onlineMatchLine = onlineError
    ? onlineError
    : onlineSubmitting
    ? copy.game.submittingMove
    : onlineMatchState?.status === "waiting"
    ? copy.game.waitingRoom(onlineRoomCode, getPlayerLabel(PLAYERS.BLUE))
    : winner
    ? copy.game.winnerOnline(getPlayerLabel(winner))
    : isOnlineMyTurn
    ? forcedPiece
      ? copy.game.continueCapture(getPlayerLabel(currentPlayer))
      : mustCapture
      ? copy.game.mustCapture(getPlayerLabel(currentPlayer))
      : copy.game.quietMove(getPlayerLabel(currentPlayer))
    : copy.game.waitingMove(getPlayerLabel(currentPlayer));
  const matchLine = isOnline ? onlineMatchLine : localMatchLine;
  const modeBadgeText = isSinglePlayer
    ? `${copy.menu[matchMode.key].label} - ${currentDifficultyLabel}`
    : isOnline && onlineSession
    ? `${copy.menu[matchMode.key].label} - ${getPlayerLabel(onlineSession.color)}`
    : copy.menu[matchMode.key].label;

  function renderLanguageToggle(style) {
    return (
      <View style={[styles.languageToggle, style]}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.key === language;

          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={`${copy.language}: ${option.label}`}
              onPress={() => setLanguage(option.key)}
              style={({ pressed }) => [
                styles.languageOption,
                isActive && styles.languageOptionActive,
                pressed && styles.languageOptionPressed,
              ]}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  isActive && styles.languageOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderSettingsButton(style, showLabel = true) {
    return (
      <Pressable
        onPress={openSettings}
        accessibilityRole="button"
        accessibilityLabel={copy.settings.button}
        style={({ pressed }) => [
          styles.settingsButton,
          style,
          pressed && styles.actionButtonPressed,
        ]}
      >
        <Text style={styles.settingsButtonIcon}>⚙</Text>
        {showLabel ? (
          <Text style={styles.settingsButtonText}>{copy.settings.button}</Text>
        ) : null}
      </Pressable>
    );
  }

  if (screen === "settings") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar hidden style="light" animated />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.settingsContent, { minHeight: height }]}
        >
          <View style={styles.settingsStage}>
            <View style={styles.gameTopBar}>
              <Pressable
                onPress={closeSettings}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.backButtonIcon}>{"<"}</Text>
                <Text style={styles.backButtonText}>{copy.settings.back}</Text>
              </Pressable>
            </View>

            <View style={styles.header}>
              <Text style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}>
                {copy.intro.kicker}
              </Text>
              <Text style={styles.title}>{copy.settings.title}</Text>
            </View>

            <View style={styles.settingsPanel}>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>
                  {copy.settings.languageTitle}
                </Text>
                <Text style={styles.settingsSectionText}>
                  {copy.settings.languageDetail}
                </Text>
                {renderLanguageToggle(styles.settingsLanguageToggle)}
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsSection}>
                <View style={styles.difficultyHeader}>
                  <View style={styles.settingHeaderCopy}>
                    <Text style={styles.settingsSectionTitle}>
                      {copy.settings.aiTitle}
                    </Text>
                    <Text style={styles.settingsSectionText}>
                      {copy.settings.aiDetail}
                    </Text>
                  </View>
                  <Text style={styles.difficultyHint}>{currentDifficultyLabel}</Text>
                </View>

                <View style={styles.difficultyRow}>
                  {AI_DIFFICULTY_OPTIONS.map((option) => {
                    const isActive = option.key === aiDifficulty;

                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => setAiDifficulty(option.key)}
                        style={({ pressed }) => [
                          styles.difficultyButton,
                          isActive && styles.difficultyButtonActive,
                          pressed && styles.difficultyButtonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyButtonText,
                            isActive && styles.difficultyButtonTextActive,
                          ]}
                        >
                          {getDifficultyLabel(option.key, copy)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>
                  {copy.settings.modesTitle}
                </Text>
                <Text style={styles.settingsSectionText}>
                  {copy.settings.modesDetail}
                </Text>
                <View style={styles.settingsModeList}>
                  {menuOptions.map((option) => (
                    <View key={option.key} style={styles.settingsModeRow}>
                      <Text style={styles.settingsModeIcon}>{option.icon}</Text>
                      <View style={styles.settingHeaderCopy}>
                        <Text style={styles.settingsModeTitle}>{option.label}</Text>
                        <Text style={styles.settingsSectionText}>{option.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>
                  {copy.settings.onlineTitle}
                </Text>
                <Text style={styles.settingsSectionText}>
                  {copy.settings.onlineDetail}
                </Text>
              </View>
            </View>

            <View style={styles.rulesBlock}>
              <Text style={styles.rulesTitle}>{copy.rulesTitle}</Text>
              <Text style={styles.settingsSectionText}>
                {copy.settings.rulesDetail}
              </Text>
              {copy.rules.map((rule, index) => (
                <View key={rule} style={styles.ruleRow}>
                  <Text style={styles.ruleIndex}>{`0${index + 1}`}</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "online-lobby") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar hidden style="light" animated />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.introContent, { minHeight: height }]}
        >
          <View style={styles.introStage}>
            <View style={styles.gameTopBar}>
              <Pressable
                onPress={goBackToMenu}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.backButtonIcon}>{"<"}</Text>
                <Text style={styles.backButtonText}>{copy.game.menu}</Text>
              </Pressable>

              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeIcon}>{onlineMode?.icon ?? ONLINE_MODE.icon}</Text>
                <Text style={styles.modeBadgeText}>{copy.menu.online.label}</Text>
              </View>

              {renderSettingsButton(null, false)}
            </View>

            <View style={styles.header}>
              <Text style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}>
                {copy.onlineLobby.kicker}
              </Text>
              <Text style={styles.title}>{copy.onlineLobby.title}</Text>
            </View>

            <View style={styles.onlineLobbyActions}>
              <View style={styles.onlineActionPanel}>
                <View style={styles.onlineActionHeader}>
                  <View style={styles.onlineActionIcon}>
                    <Text style={styles.onlineActionIconText}>+</Text>
                  </View>
                  <View style={styles.onlineActionCopy}>
                    <Text style={styles.onlineActionTitle}>
                      {copy.onlineLobby.createTitle}
                    </Text>
                    <Text style={styles.onlineActionDetail}>
                      {copy.onlineLobby.createDetail}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleCreateOnlineMatch}
                  disabled={onlineBusy}
                  style={({ pressed }) => [
                    styles.onlinePrimaryButton,
                    pressed && styles.actionButtonPressed,
                    onlineBusy && styles.onlineButtonDisabled,
                  ]}
                >
                  <Text style={styles.onlinePrimaryButtonText}>
                    {onlineBusy
                      ? copy.onlineLobby.working
                      : copy.onlineLobby.createRoom}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.onlineActionPanel}>
                <View style={styles.onlineActionHeader}>
                  <View style={styles.onlineActionIcon}>
                    <Text style={styles.onlineActionIconText}>#</Text>
                  </View>
                  <View style={styles.onlineActionCopy}>
                    <Text style={styles.onlineActionTitle}>
                      {copy.onlineLobby.joinTitle}
                    </Text>
                    <Text style={styles.onlineActionDetail}>
                      {copy.onlineLobby.joinDetail}
                    </Text>
                  </View>
                </View>

                <View style={styles.onlineJoinRow}>
                  <TextInput
                    value={joinCode}
                    onChangeText={(value) => setJoinCode(normalizeRoomCode(value))}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    placeholder="ABC123"
                    placeholderTextColor={SURFACE.muted}
                    style={styles.onlineCodeInput}
                  />
                  <Pressable
                    onPress={handleJoinOnlineMatch}
                    disabled={onlineBusy}
                    style={({ pressed }) => [
                      styles.onlineJoinButton,
                      pressed && styles.actionButtonPressed,
                      onlineBusy && styles.onlineButtonDisabled,
                    ]}
                  >
                    <Text style={styles.onlineJoinButtonText}>
                      {copy.onlineLobby.join}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {savedOnlineSession ? (
                <View style={styles.onlineResumeBlock}>
                  <Text
                    style={[
                      styles.onlineSectionLabel,
                      isBurmese && styles.burmeseEyebrow,
                    ]}
                  >
                    {copy.onlineLobby.savedRoom}
                  </Text>
                  <Text style={styles.onlineResumeText} selectable>
                    {savedOnlineSession.roomCode} -{" "}
                    {getPlayerLabel(savedOnlineSession.color)}
                  </Text>
                  <View style={styles.onlineResumeActions}>
                    <Pressable
                      onPress={handleResumeOnlineMatch}
                      disabled={onlineBusy}
                      style={({ pressed }) => [
                        styles.onlineSecondaryButton,
                        pressed && styles.actionButtonPressed,
                        onlineBusy && styles.onlineButtonDisabled,
                      ]}
                    >
                      <Text style={styles.onlineSecondaryButtonText}>
                        {copy.onlineLobby.resume}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleClearSavedOnlineMatch}
                      disabled={onlineBusy}
                      style={({ pressed }) => [
                        styles.onlineGhostButton,
                        pressed && styles.actionButtonPressed,
                        onlineBusy && styles.onlineButtonDisabled,
                      ]}
                    >
                      <Text style={styles.onlineGhostButtonText}>
                        {copy.onlineLobby.forget}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {onlineError ? (
                <Text style={styles.onlineErrorText}>{onlineError}</Text>
              ) : null}
            </View>

            <View style={styles.rulesBlock}>
              <Text style={styles.rulesTitle}>{copy.onlineLobby.rulesTitle}</Text>
              {copy.onlineLobby.rules.map((rule, index) => (
                <View key={rule} style={styles.ruleRow}>
                  <Text style={styles.ruleIndex}>{`0${index + 1}`}</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "intro") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar hidden style="light" animated />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
        <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />
        {renderSettingsButton(styles.introSettingsButton, false)}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.introContent, { minHeight: height }]}
        >
          <View style={styles.introStage}>
            <View style={styles.introTopArea}>
              <View style={styles.header}>
                <Text style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}>
                  {copy.intro.kicker}
                </Text>
                <Text style={styles.title}>{copy.intro.title}</Text>
              </View>
            </View>

            <View style={styles.introMenuArea}>
              <View style={styles.menuBlock}>
                {menuOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => startMatch(option)}
                    style={({ pressed }) => [
                      styles.menuOption,
                      pressed && styles.menuOptionPressed,
                    ]}
                  >
                    <View style={styles.menuIconBubble}>
                      <Text style={styles.menuIcon}>{option.icon}</Text>
                    </View>
                    <View style={styles.menuCopy}>
                      <Text style={styles.menuLabel}>{option.label}</Text>
                      <Text style={styles.menuDetail}>{option.detail}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden style="light" animated />
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.gameContent, { minHeight: height }]}
      >
        <View style={[styles.gameTopBar, { width: seatWidth }]}>
          <Pressable
            onPress={requestExitGame}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Text style={styles.backButtonIcon}>‹</Text>
            <Text style={styles.backButtonText}>{copy.game.menu}</Text>
          </Pressable>

          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeIcon}>{matchMode.icon}</Text>
            <Text style={styles.modeBadgeText}>{modeBadgeText}</Text>
          </View>
        </View>

        <View style={[styles.stateCluster, { width: seatWidth }]}>
          <Text style={[styles.stateLabel, isBurmese && styles.burmeseEyebrow]}>
            {copy.game.matchState}
          </Text>
          <Pressable
            onPress={winner ? () => startMatch(matchMode) : undefined}
            style={({ pressed }) => [
              styles.statusPill,
              { borderColor: statusColor },
              winner && pressed && styles.actionButtonPressed,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusColor,
                  opacity: winner ? 1 : pulseOpacity,
                  transform: [{ scale: winner ? 1 : pulseScale }],
                },
              ]}
            />
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {matchLine}
            </Text>
          </Pressable>
        </View>

        {isOnline ? (
          <View style={[styles.onlineGameMeta, { width: seatWidth }]}>
            <Text style={styles.onlineGameMetaText} selectable>
              {copy.game.room} {onlineRoomCode ?? "------"}
            </Text>
            <Text style={styles.onlineGameMetaText}>
              {onlineConnection === "SUBSCRIBED"
                ? copy.game.connected
                : onlineConnection}
            </Text>
            <Text style={styles.onlineGameMetaText}>
              {onlineConnectedPlayers}/2 {copy.game.online}
            </Text>
          </View>
        ) : null}

        <PlayerStrip
          theme={playerThemes.blue}
          remainingPieces={bluePieces}
          isActive={!winner && currentPlayer === PLAYERS.BLUE}
          isWinner={winner === PLAYERS.BLUE}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
          labels={copy.players}
          textComponent={Text}
          style={[styles.seatSpacerTop, { width: seatWidth }]}
        />

        <Animated.View
          style={[
            {
              opacity: boardIntro,
              transform: [{ translateY: introTranslateY }, { scale: introScale }],
            },
          ]}
        >
          <View style={styles.boardShell}>
            <View style={styles.boardFrame}>
              <View style={[styles.board, { width: boardSize, height: boardSize }]}>
                {board.map((rowCells, row) =>
                  rowCells.map((piece, col) => {
                    const key = `${row}:${col}`;
                    const squareIsDark = (row + col) % 2 === 1;
                    const isSelected =
                      selected?.row === row && selected?.col === col;
                    const isMoveTarget = legalMoves.some(
                      (move) => move.to.row === row && move.to.col === col
                    );
                    const isCaptureSource = captureSources.has(key);
                    const isForcedPiece =
                      forcedPiece?.row === row && forcedPiece?.col === col;
                    const pieceTheme = piece ? playerThemes[piece.player] : null;

                    return (
                      <Pressable
                        key={key}
                        onPress={() => handleCellPress(row, col)}
                        style={[
                          styles.tile,
                          {
                            width: tileSize,
                            height: tileSize,
                            backgroundColor: squareIsDark
                              ? SURFACE.tileDark
                              : SURFACE.tileLight,
                          },
                        ]}
                      >
                        <View style={styles.tileTint} />
                        {isCaptureSource && !isSelected ? (
                          <View
                            style={[
                              styles.captureSourceHalo,
                              { borderColor: currentTheme.accent },
                            ]}
                          />
                        ) : null}
                        {isSelected ? (
                          <View
                            style={[
                              styles.selectionHalo,
                              {
                                borderColor: currentTheme.accent,
                                backgroundColor: currentTheme.wash,
                              },
                            ]}
                          />
                        ) : null}
                        {isForcedPiece ? <View style={styles.forcedHalo} /> : null}
                        {isMoveTarget ? (
                          <Animated.View
                            style={[
                              styles.moveTarget,
                              {
                                borderColor: currentTheme.accent,
                                opacity: targetOpacity,
                                transform: [{ scale: targetScale }],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.moveTargetCore,
                                { backgroundColor: currentTheme.accent },
                              ]}
                            />
                          </Animated.View>
                        ) : null}
                        {piece ? (
                          <View
                            style={[
                              styles.piece,
                              {
                                width: tileSize * 0.74,
                                height: tileSize * 0.74,
                                borderRadius: tileSize * 0.37,
                                backgroundColor: pieceTheme.piece,
                                borderColor: pieceTheme.pieceEdge,
                                shadowColor: pieceTheme.accent,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.pieceSheen,
                                { backgroundColor: pieceTheme.pieceEdge },
                              ]}
                            />
                            <View
                              style={[
                                styles.pieceCore,
                                {
                                  width: tileSize * 0.28,
                                  height: tileSize * 0.28,
                                  borderRadius: tileSize * 0.14,
                                  backgroundColor: pieceTheme.pieceCore,
                                },
                              ]}
                            />
                            {piece.king ? (
                              <View
                                style={[
                                  styles.kingBadge,
                                  { borderColor: pieceTheme.pieceEdge },
                                ]}
                              >
                                <Text style={styles.kingText}>K</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        <PlayerStrip
          theme={playerThemes.red}
          remainingPieces={redPieces}
          isActive={!winner && currentPlayer === PLAYERS.RED}
          isWinner={winner === PLAYERS.RED}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
          labels={copy.players}
          textComponent={Text}
          style={[styles.seatSpacerBottom, { width: seatWidth }]}
        />
      </ScrollView>

      {winnerDialogVisible && winnerTheme ? (
        <View style={styles.winnerOverlay}>
          <View pointerEvents="none" style={styles.confettiLayer}>
            {CONFETTI_PIECES.map((piece, index) => {
              const translateY = confettiAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [-140, height * 0.72],
              });
              const translateX = confettiAnimations[index].interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, index % 2 === 0 ? 18 : -18, 0],
              });
              const opacity = confettiAnimations[index].interpolate({
                inputRange: [0, 0.12, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              });
              const rotate = confettiAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", piece.rotate],
              });

              return (
                <Animated.View
                  key={piece.key}
                  style={[
                    styles.confettiPiece,
                    {
                      left: piece.left,
                      width: piece.size,
                      height: piece.size * 1.7,
                      backgroundColor: piece.color,
                      opacity,
                      transform: [{ translateY }, { translateX }, { rotate }],
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.winnerDialog}>
            <View
              style={[
                styles.winnerBadge,
                {
                  borderColor: winnerTheme.accent,
                  backgroundColor: winnerTheme.wash,
                },
              ]}
            >
              <Text style={[styles.winnerBadgeText, { color: winnerTheme.accent }]}>
                ★
              </Text>
            </View>

            <Text style={styles.winnerTitle}>{copy.game.congratsTitle}</Text>
            <Text style={[styles.winnerMessage, { color: winnerTheme.accent }]}>
              {copy.game.congratsMessage(getPlayerLabel(winner))}
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={closeWinnerDialog}
                style={({ pressed }) => [
                  styles.confirmSecondaryButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.confirmSecondaryText}>
                  {copy.game.congratsClose}
                </Text>
              </Pressable>

              <Pressable
                onPress={startWinnerRematch}
                style={({ pressed }) => [
                  styles.confirmPrimaryButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.confirmPrimaryText}>
                  {copy.game.congratsRematch}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {exitConfirmVisible ? (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>{copy.game.exitTitle}</Text>
            <Text style={styles.confirmMessage}>{copy.game.exitMessage}</Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={cancelExitGame}
                style={({ pressed }) => [
                  styles.confirmSecondaryButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.confirmSecondaryText}>
                  {copy.game.exitCancel}
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmExitGame}
                style={({ pressed }) => [
                  styles.confirmPrimaryButton,
                  pressed && styles.actionButtonPressed,
                ]}
              >
                <Text style={styles.confirmPrimaryText}>
                  {copy.game.exitConfirm}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
