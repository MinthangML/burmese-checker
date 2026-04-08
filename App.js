import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import {
  applyMove,
  countPieces,
  createInitialBoard,
  getAllCaptureMoves,
  getAllLegalMoves,
  getCaptureMoves,
  getLegalMovesForPiece,
  PLAYERS,
} from "./logic";
import { PLAYER_THEME, styles, SURFACE } from "./styles";
import { PlayerStrip } from "./ui";

const RULES = [
  "South seat moves first and can advance one diagonal step when no capture is open.",
  "Captures are mandatory. If a jump exists, quiet moves are blocked.",
  "A piece that can continue capturing must finish the full chain in the same turn.",
  "Pieces crown into kings on the far edge and can move diagonally in both directions.",
];

function playerLabel(player) {
  return PLAYER_THEME[player].label;
}

export default function App() {
  const [screen, setScreen] = useState("intro");
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.RED);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [forcedPiece, setForcedPiece] = useState(null);
  const [winner, setWinner] = useState(null);
  const { width, height } = useWindowDimensions();

  const isWide = width >= 900;
  const boardWidthLimit = isWide ? Math.min(width * 0.62, 720) : width - 32;
  const boardHeightLimit = height * (isWide ? 0.56 : 0.44);
  const boardSize = Math.max(240, Math.min(boardWidthLimit, boardHeightLimit));
  const seatWidth = Math.min(width - 24, boardSize + 28);
  const tileSize = boardSize / 8;

  const boardIntro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

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

  const currentTheme = PLAYER_THEME[currentPlayer];
  const statusColor = winner ? PLAYER_THEME[winner].accent : currentTheme.accent;

  function resetGame() {
    setBoard(createInitialBoard());
    setCurrentPlayer(PLAYERS.RED);
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);
    setWinner(null);
  }

  function startMatch() {
    resetGame();
    setScreen("game");
  }

  function clearSelectionUnlessForced() {
    if (!forcedPiece) {
      setSelected(null);
      setLegalMoves([]);
    }
  }

  function finishTurn(nextBoard) {
    const nextPlayer =
      currentPlayer === PLAYERS.RED ? PLAYERS.BLUE : PLAYERS.RED;
    const nextPlayerHasPieces = countPieces(nextBoard, nextPlayer) > 0;
    const nextPlayerHasMoves = getAllLegalMoves(nextBoard, nextPlayer).length > 0;

    setBoard(nextBoard);
    setSelected(null);
    setLegalMoves([]);
    setForcedPiece(null);

    if (!nextPlayerHasPieces || !nextPlayerHasMoves) {
      setWinner(currentPlayer);
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
    if (winner) {
      return;
    }

    if (selected) {
      const chosenMove = legalMoves.find(
        (move) => move.to.row === row && move.to.col === col
      );

      if (chosenMove) {
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
            setBoard(result.board);
            setSelected(result.movedTo);
            setLegalMoves(followUpCaptures);
            setForcedPiece(result.movedTo);
            return;
          }
        }

        finishTurn(result.board);
        return;
      }
    }

    const changedSelection = trySelectPiece(row, col);
    if (!changedSelection) {
      clearSelectionUnlessForced();
    }
  }

  const matchLine = winner
    ? `${playerLabel(winner)} controls the table. Tap here for a new match.`
    : forcedPiece
    ? `${playerLabel(currentPlayer)} must continue the capture chain.`
    : mustCapture
    ? `${playerLabel(currentPlayer)} must take the open jump.`
    : `${playerLabel(currentPlayer)} may make a quiet diagonal move.`;

  if (screen === "intro") {
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
            <View style={styles.header}>
              <Text style={styles.kicker}>Traditional Table</Text>
              <Text style={styles.title}>Burmese Checkers</Text>
              <Text style={styles.introLead}>
                A full-screen board game flow with a rules screen first and the
                live match isolated on the next screen.
              </Text>
              <Text style={styles.introBody}>
                Start from here, review the rules once, then enter a cleaner
                table view where only the match state, north seat, south seat,
                and board remain on screen.
              </Text>
            </View>

            <View style={styles.rulesBlock}>
              <Text style={styles.rulesTitle}>Rules</Text>
              {RULES.map((rule, index) => (
                <View key={rule} style={styles.ruleRow}>
                  <Text style={styles.ruleIndex}>{`0${index + 1}`}</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={startMatch}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>Enter Match</Text>
            </Pressable>
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
        <View style={[styles.stateCluster, { width: seatWidth }]}>
          <Text style={styles.stateLabel}>Match state</Text>
          <Pressable
            onPress={winner ? startMatch : undefined}
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

        <PlayerStrip
          theme={PLAYER_THEME.blue}
          remainingPieces={bluePieces}
          isActive={!winner && currentPlayer === PLAYERS.BLUE}
          isWinner={winner === PLAYERS.BLUE}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
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
                    const pieceTheme = piece ? PLAYER_THEME[piece.player] : null;

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
          theme={PLAYER_THEME.red}
          remainingPieces={redPieces}
          isActive={!winner && currentPlayer === PLAYERS.RED}
          isWinner={winner === PLAYERS.RED}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
          style={[styles.seatSpacerBottom, { width: seatWidth }]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
