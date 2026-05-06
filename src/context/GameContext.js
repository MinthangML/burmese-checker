import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useFonts } from "expo-font";
import { usePathname, useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { AI_DIFFICULTIES, chooseAiTurn } from "../../ai";
import {
  applyMove,
  countPieces,
  createInitialBoard,
  getAllCaptureMoves,
  getCaptureMoves,
  getLegalMovesForPiece,
  getOpponent,
  PLAYERS,
} from "../../logic";
import {
  clearSavedOnlineSession,
  createOnlineMatch,
  getOnlineMatch,
  joinOnlineMatch,
  loadSavedOnlineSession,
  normalizeRoomCode,
  saveOnlineSession,
  subscribeToOnlineMatch,
  submitOnlineMatchAction,
  submitOnlineMove,
} from "../../online";
import { PLAYER_THEME, SURFACE } from "../../styles";
import { COPY, DEFAULT_LANGUAGE } from "../../translations";
import {
  AI_MOVE_DELAY,
  AI_THINK_DELAY,
  CONFETTI_PIECES,
  MENU_OPTIONS,
  MIN_SPLASH_MS,
  MOVE_SOUND,
  MOVE_SOUND_SOURCE,
  ONLINE_MODE,
  WIN_SOUND_DEDUPE_MS,
} from "../constants/game";
import {
  countPresencePlayers,
  formatOnlineError,
  getDifficultyLabel,
  getMoveNumber,
  getMoveSoundKind,
  getPathFromScreen,
  getScreenFromPath,
  getTurnWinner,
  inferMoveSoundKind,
  sleep,
} from "../utils/game-state";

const GameContext = createContext(null);

export function useGame() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error("useGame must be used inside GameProvider");
  }

  return context;
}

export function GameProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    "Padauk-Regular": require("../../assets/fonts/Padauk-Regular.ttf"),
    "Padauk-Bold": require("../../assets/fonts/Padauk-Bold.ttf"),
  });
  // Global match state lives here; route screens only render the state they read.
  const [splashDelayDone, setSplashDelayDone] = useState(false);
  const [screen, setScreen] = useState(() => getScreenFromPath(pathname));
  const [returnScreen, setReturnScreen] = useState("intro");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [matchMode, setMatchMode] = useState(MENU_OPTIONS[0]);
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.RED);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [forcedPiece, setForcedPiece] = useState(null);
  const [winner, setWinner] = useState(null);
  const [drawAccepted, setDrawAccepted] = useState(false);
  const [drawRequestPlayer, setDrawRequestPlayer] = useState(null);
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
  const [opponentLeftDialogVisible, setOpponentLeftDialogVisible] =
    useState(false);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [winnerDialogVisible, setWinnerDialogVisible] = useState(false);
  const [drawDialogVisible, setDrawDialogVisible] = useState(false);
  const [localActionConfirm, setLocalActionConfirm] = useState(null);

  const moveSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.MOVE]);
  const captureSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.CAPTURE]);
  const promoteSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.PROMOTE]);
  const winSound = useAudioPlayer(MOVE_SOUND_SOURCE[MOVE_SOUND.WIN]);

  const boardRef = useRef(board);
  const onlineMoveNumberRef = useRef(null);
  const opponentSeenRef = useRef(false);
  const lastCelebratedWinnerRef = useRef(null);
  const lastWinSoundAtRef = useRef(0);
  // Programmatic route changes complete asynchronously, so this avoids an old
  // pathname briefly forcing the provider back to the previous screen.
  const routeChangeTargetRef = useRef(null);
  const confettiAnimations = useRef(
    CONFETTI_PIECES.map(() => new Animated.Value(0))
  ).current;

  const { width, height } = useWindowDimensions();
  const copy = COPY[language] ?? COPY[DEFAULT_LANGUAGE];
  const isBurmese = language === "my";
  const assetsReady = fontsLoaded || Boolean(fontError);
  const showSplash = !assetsReady || !splashDelayDone;

  // Derived view-model values keep screens simple and avoid duplicated game math.
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
  const isSinglePlayer = matchMode.key === "single";
  const isOnline = matchMode.key === "online";
  const isLocalTwoPlayer = matchMode.key === "two-player";

  const isWide = width >= 900;
  const boardWidthLimit = isWide ? Math.min(width * 0.58, 680) : width - 80;
  const localTwoPlayerTopControlsHeight = isLocalTwoPlayer ? 44 : 0;
  const boardHeightLimit =
    height - (isWide ? 260 : 300) - localTwoPlayerTopControlsHeight;
  const boardSize = Math.max(230, Math.min(boardWidthLimit, boardHeightLimit));
  const seatWidth = Math.min(width - 24, boardSize + 48);
  const tileSize = boardSize / 8;

  const boardIntro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  function navigateToScreen(nextScreen, options = {}) {
    const nextPath = getPathFromScreen(nextScreen);

    routeChangeTargetRef.current = nextPath;
    setScreen(nextScreen);

    if (options.replace) {
      router.replace(nextPath);
      return;
    }

    router.push(nextPath);
  }

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
      // Sound effects are feedback only; failed audio must never block moves.
    }
  }

  // App-level effects: system UI, asset splash timing, audio, route sync, and input.
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    async function applyFullscreen() {
      try {
        NavigationBar.setStyle("light");
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {
        // Keep the game usable if a runtime does not expose navigation controls.
      }
    }

    applyFullscreen();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDelayDone(true);
    }, MIN_SPLASH_MS);

    return () => clearTimeout(timer);
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
      setOpponentLeftDialogVisible(false);
      setWinnerDialogVisible(false);
      setDrawDialogVisible(false);
      setLocalActionConfirm(null);
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
    if (
      screen !== "game" ||
      !winner ||
      isConfirmedOnlineMatchAction(onlineMatchState, matchMode)
    ) {
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
  }, [
    screen,
    winner,
    confettiAnimations,
    matchMode,
    onlineMatchState?.status,
    onlineMatchState?.finishedReason,
  ]);

  useEffect(() => {
    if (
      screen === "game" &&
      drawAccepted &&
      !isConfirmedOnlineMatchAction(onlineMatchState, matchMode)
    ) {
      setDrawDialogVisible(true);
    }
  }, [
    screen,
    drawAccepted,
    matchMode,
    onlineMatchState?.status,
    onlineMatchState?.finishedReason,
  ]);

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
  const isAiTurn =
    screen === "game" &&
    isSinglePlayer &&
    currentPlayer === PLAYERS.BLUE &&
    !drawAccepted &&
    !winner;
  const currentDifficultyLabel = getDifficultyLabel(aiDifficulty, copy);
  const onlineRoomCode = onlineMatchState?.roomCode ?? onlineSession?.roomCode;
  const onlineConnectedPlayers = countPresencePlayers(onlinePresence);
  const onlineOpponentPlayer = onlineSession?.color
    ? getOpponent(onlineSession.color)
    : null;
  const onlineOpponentLabel = onlineOpponentPlayer
    ? getPlayerLabel(onlineOpponentPlayer)
    : copy.players.fallback;
  const isOnlineActive = isOnline && onlineMatchState?.status === "active";
  const isOnlineMyTurn =
    isOnlineActive &&
    onlineSession?.color === currentPlayer &&
    !winner &&
    !drawAccepted;
  const isBoardFlipped = isOnline && onlineSession?.color === PLAYERS.BLUE;
  const statusColor =
    isOnline && onlineError
      ? "#ffb4a8"
      : drawAccepted
      ? SURFACE.button
      : winner
      ? playerThemes[winner].accent
      : currentTheme.accent;
  const winnerTheme = winner ? playerThemes[winner] : null;

  useEffect(() => {
    if (
      screen !== "game" ||
      !isOnline ||
      !isConfirmedOnlineMatchAction(onlineMatchState, matchMode)
    ) {
      return;
    }

    leaveFinishedOnlineActionMatch();
  }, [
    screen,
    isOnline,
    matchMode,
    onlineMatchState?.status,
    onlineMatchState?.finishedReason,
  ]);

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
    const routeChangeTarget = routeChangeTargetRef.current;

    if (routeChangeTarget) {
      if (pathname === routeChangeTarget) {
        routeChangeTargetRef.current = null;
      }

      return;
    }

    const nextScreen = getScreenFromPath(pathname);

    if (nextScreen !== screen) {
      setScreen(nextScreen);
    }
  }, [pathname, screen]);

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

  useEffect(() => {
    if (
      !isOnlineActive ||
      !onlineOpponentPlayer ||
      winner ||
      drawAccepted ||
      onlineConnection !== "SUBSCRIBED"
    ) {
      opponentSeenRef.current = false;
      setOpponentLeftDialogVisible(false);
      return undefined;
    }

    const opponentPresence = onlinePresence?.[onlineOpponentPlayer];
    const opponentPresent = Array.isArray(opponentPresence)
      ? opponentPresence.length > 0
      : false;

    if (opponentPresent) {
      opponentSeenRef.current = true;
      setOpponentLeftDialogVisible(false);
      return undefined;
    }

    if (!opponentSeenRef.current) {
      return undefined;
    }

    const disconnectTimer = setTimeout(() => {
      setOpponentLeftDialogVisible(true);
    }, 1800);

    return () => clearTimeout(disconnectTimer);
  }, [
    drawAccepted,
    isOnlineActive,
    onlineConnection,
    onlineOpponentPlayer,
    onlinePresence,
    winner,
  ]);

  // Game commands are exposed through context and called by screens/components.
  function resetGame() {
    const initialBoard = createInitialBoard();

    boardRef.current = initialBoard;
    setBoard(initialBoard);
    setCurrentPlayer(PLAYERS.RED);
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);
    setWinner(null);
    setDrawAccepted(false);
    setDrawRequestPlayer(null);
    setAiThinking(false);
    setWinnerDialogVisible(false);
    setDrawDialogVisible(false);
    setOpponentLeftDialogVisible(false);
    setLocalActionConfirm(null);
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
    setOpponentLeftDialogVisible(false);
    opponentSeenRef.current = false;
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
    const onlineDrawAccepted =
      state.status === "finished" && state.result === "draw";
    setDrawAccepted(onlineDrawAccepted);
    setDrawRequestPlayer(
      onlineDrawAccepted ? null : state.drawOfferPlayer ?? null
    );
    if (
      onlineDrawAccepted &&
      screen === "game" &&
      !isConfirmedOnlineMatchAction(state, matchMode)
    ) {
      setDrawDialogVisible(true);
    } else {
      setDrawDialogVisible(false);
    }
    setLocalActionConfirm(null);
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
    navigateToScreen("game", { replace: true });
  }

  function startMatch(mode) {
    if (mode.key === "online") {
      setMatchMode(mode);
      resetGame();
      resetOnlineRuntime();
      navigateToScreen("online-lobby");
      return;
    }

    resetOnlineRuntime();
    setMatchMode(mode);
    resetGame();
    navigateToScreen("game");
  }

  function goBackToMenu() {
    setExitConfirmVisible(false);
    resetGame();
    resetOnlineRuntime();
    navigateToScreen("intro", { replace: true });
  }

  function isConfirmedOnlineMatchAction(state, mode = matchMode) {
    if (mode.key !== "online" || state?.status !== "finished") {
      return false;
    }

    return (
      state.finishedReason === "resignation" ||
      state.finishedReason === "draw_agreement"
    );
  }

  function leaveFinishedOnlineActionMatch() {
    clearSavedOnlineSession().catch(() => {});
    setSavedOnlineSession(null);
    goBackToMenu();
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

  function confirmOpponentLeftExit() {
    setOpponentLeftDialogVisible(false);
    goBackToMenu();
  }

  function startWinnerRematch() {
    setWinnerDialogVisible(false);
    startMatch(matchMode);
  }

  function closeWinnerDialog() {
    setWinnerDialogVisible(false);
  }

  function startDrawRematch() {
    setDrawDialogVisible(false);
    startMatch(matchMode);
  }

  function closeDrawDialog() {
    setDrawDialogVisible(false);
  }

  function cancelLocalActionConfirm() {
    setLocalActionConfirm(null);
  }

  function clearLocalTurnState() {
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);
    setAiThinking(false);
  }

  function resignLocalMatch(player) {
    if (isOnline || winner || drawAccepted) {
      return;
    }

    clearLocalTurnState();
    setDrawRequestPlayer(null);
    setWinner(getOpponent(player));
  }

  function requestLocalDraw(player) {
    if (isOnline || winner || drawAccepted) {
      return;
    }

    clearLocalTurnState();

    if (isSinglePlayer || drawRequestPlayer === getOpponent(player)) {
      setDrawRequestPlayer(null);
      setDrawAccepted(true);
      setDrawDialogVisible(true);
      return;
    }

    setDrawRequestPlayer(player);
  }

  function requestLocalActionConfirmation(type, player) {
    if (winner || drawAccepted) {
      return;
    }

    if (isOnline && (!isOnlineActive || player !== onlineSession?.color)) {
      return;
    }

    setLocalActionConfirm({
      type,
      player,
      acceptsDraw: type === "draw" && drawRequestPlayer === getOpponent(player),
    });
  }

  function confirmLocalAction() {
    const action = localActionConfirm;

    if (!action) {
      return;
    }

    setLocalActionConfirm(null);

    if (isOnline) {
      submitOnlineAction(action.type);
      return;
    }

    if (action.type === "resign") {
      resignLocalMatch(action.player);
      return;
    }

    requestLocalDraw(action.player);
  }

  function openSettings() {
    setReturnScreen(screen);
    navigateToScreen("settings");
  }

  function closeSettings() {
    navigateToScreen(returnScreen, { replace: true });
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
    if (winner || drawAccepted || isAiTurn || aiThinking || onlineSubmitting) {
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

      setOnlineError(
        error.data?.state?.status === "finished"
          ? ""
          : formatOnlineError(error, copy)
      );
    } finally {
      setOnlineSubmitting(false);
    }
  }

  async function submitOnlineAction(actionType) {
    if (!onlineSession || !onlineMatchState || onlineSubmitting) {
      return;
    }

    setOnlineSubmitting(true);
    setOnlineError("");

    try {
      const result = await submitOnlineMatchAction(
        onlineSession,
        onlineMatchState,
        actionType
      );
      setOnlineSession(result.session);
      await saveOnlineSession(result.session);
      setSavedOnlineSession(result.session);
      applyOnlineState(result.state);
    } catch (error) {
      if (error.data?.state) {
        applyOnlineState(error.data.state);
      }

      setOnlineError(
        error.data?.state?.status === "finished"
          ? ""
          : formatOnlineError(error, copy)
      );
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

  const localMatchLine = drawAccepted
    ? copy.game.drawAccepted
    : winner
    ? copy.game.winnerLocal(getPlayerLabel(winner))
    : drawRequestPlayer
    ? copy.game.drawRequested(
        getPlayerLabel(drawRequestPlayer),
        getPlayerLabel(getOpponent(drawRequestPlayer))
      )
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
    : drawAccepted
    ? copy.game.drawAccepted
    : winner
    ? copy.game.winnerOnline(getPlayerLabel(winner))
    : drawRequestPlayer
    ? copy.game.drawRequested(
        getPlayerLabel(drawRequestPlayer),
        getPlayerLabel(getOpponent(drawRequestPlayer))
      )
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

  const localActionConfirmTitle =
    localActionConfirm?.type === "resign"
      ? copy.game.confirmResignTitle
      : localActionConfirm?.type === "draw"
      ? localActionConfirm.acceptsDraw
        ? copy.game.confirmAcceptDrawTitle
        : copy.game.confirmDrawTitle
      : "";
  const localActionConfirmMessage =
    localActionConfirm?.type === "resign"
      ? copy.game.confirmResignMessage(
          getPlayerLabel(localActionConfirm.player),
          getPlayerLabel(getOpponent(localActionConfirm.player))
        )
      : localActionConfirm?.type === "draw"
      ? localActionConfirm.acceptsDraw
        ? copy.game.confirmAcceptDrawMessage(getPlayerLabel(localActionConfirm.player))
        : copy.game.confirmDrawMessage(getPlayerLabel(localActionConfirm.player))
      : "";
  const localActionConfirmButton =
    localActionConfirm?.type === "resign"
      ? copy.game.confirmResign
      : localActionConfirm?.acceptsDraw
      ? copy.game.confirmAcceptDraw
      : copy.game.confirmDraw;

  const value = {
    aiDifficulty,
    aiThinking,
    bluePieces,
    board,
    boardIntro,
    boardSize,
    cancelExitGame,
    cancelLocalActionConfirm,
    captureSources,
    closeDrawDialog,
    closeSettings,
    closeWinnerDialog,
    confettiAnimations,
    confirmExitGame,
    confirmLocalAction,
    confirmOpponentLeftExit,
    copy,
    currentDifficultyLabel,
    currentPlayer,
    currentTheme,
    drawAccepted,
    drawDialogVisible,
    drawRequestPlayer,
    exitConfirmVisible,
    fontsLoaded,
    forcedPiece,
    getPlayerLabel,
    goBackToMenu,
    handleCellPress,
    handleClearSavedOnlineMatch,
    handleCreateOnlineMatch,
    handleJoinOnlineMatch,
    handleResumeOnlineMatch,
    height,
    introScale,
    introTranslateY,
    isBurmese,
    isBoardFlipped,
    isOnline,
    isOnlineActive,
    isOnlineMyTurn,
    isSinglePlayer,
    joinCode,
    language,
    legalMoves,
    localActionConfirm,
    localActionConfirmButton,
    localActionConfirmMessage,
    localActionConfirmTitle,
    matchLine,
    matchMode,
    menuOptions,
    modeBadgeText,
    onlineBusy,
    onlineConnectedPlayers,
    onlineConnection,
    onlineError,
    onlineMode,
    onlineOpponentLabel,
    onlineRoomCode,
    onlineSession,
    onlineSubmitting,
    opponentLeftDialogVisible,
    openSettings,
    playerThemes,
    pulseOpacity,
    pulseScale,
    redPieces,
    requestExitGame,
    requestLocalActionConfirmation,
    savedOnlineSession,
    screen,
    seatWidth,
    selected,
    setAiDifficulty,
    setJoinCode,
    setLanguage,
    showSplash,
    startDrawRematch,
    startMatch,
    startWinnerRematch,
    statusColor,
    targetOpacity,
    targetScale,
    tileSize,
    width,
    winner,
    winnerDialogVisible,
    winnerTheme,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
