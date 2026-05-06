import React from "react";
import { Animated, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { getOpponent, PLAYERS } from "../../logic";
import { styles } from "../../styles";
import { AdMobBanner } from "../components/admob-banner";
import { AppIcon } from "../components/app-icon";
import { AppText } from "../components/app-text";
import { CheckerBoard } from "../components/checker-board";
import { GameDialogs } from "../components/game-dialogs";
import { LocalMatchActions } from "../components/local-match-actions";
import { PlayerStrip } from "../components/player-strip";
import { ScreenBackdrop } from "../components/screen-backdrop";
import { useGame } from "../context/GameContext";

const GAME_BOARD_BANNER_AD_UNIT_ID = "ca-app-pub-8518084536991465/3226860373";

export default function GameScreen() {
  const {
    boardIntro,
    bluePieces,
    copy,
    currentPlayer,
    drawAccepted,
    drawRequestPlayer,
    height,
    introScale,
    introTranslateY,
    isBurmese,
    isBoardFlipped,
    isOnline,
    isSinglePlayer,
    matchLine,
    matchMode,
    modeBadgeText,
    onlineConnectedPlayers,
    onlineConnection,
    onlineRoomCode,
    playerThemes,
    pulseOpacity,
    pulseScale,
    redPieces,
    requestExitGame,
    seatWidth,
    startMatch,
    statusColor,
    winner,
  } = useGame();
  const topDockPlayer = isBoardFlipped ? PLAYERS.RED : PLAYERS.BLUE;
  const bottomDockPlayer = isBoardFlipped ? PLAYERS.BLUE : PLAYERS.RED;
  const localActionPlayer = drawRequestPlayer
    ? getOpponent(drawRequestPlayer)
    : isSinglePlayer
    ? PLAYERS.RED
    : currentPlayer;
  const showLocalBottomActions = !isOnline && !winner && !drawAccepted;
  const pieceCounts = {
    [PLAYERS.RED]: redPieces,
    [PLAYERS.BLUE]: bluePieces,
  };

  function renderPlayerDockItem(player) {
    return (
      <View style={styles.playerDockItem}>
        <PlayerStrip
          theme={playerThemes[player]}
          remainingPieces={pieceCounts[player]}
          isActive={!winner && !drawAccepted && currentPlayer === player}
          isWinner={winner === player}
          pulseScale={pulseScale}
          pulseOpacity={pulseOpacity}
          labels={copy.players}
          textComponent={AppText}
          compact
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.gameScreen}>
      <StatusBar hidden style="light" animated />
      <ScreenBackdrop />

      <View style={styles.gameFloatingTop}>
        <View style={[styles.gameTopBar, { width: seatWidth }]}>
          <Pressable
            onPress={requestExitGame}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppIcon name="chevron-back" style={styles.backButtonIcon} />
            <AppText style={styles.backButtonText}>{copy.game.menu}</AppText>
          </Pressable>

          <View style={styles.modeBadge}>
            <AppIcon icon={matchMode.icon} style={styles.modeBadgeIcon} />
            <AppText style={styles.modeBadgeText}>{modeBadgeText}</AppText>
          </View>
        </View>
      </View>

      <View style={styles.gameFloatingStatus}>
        <View style={[styles.stateCluster, { width: seatWidth }]}>
          <AppText style={[styles.stateLabel, isBurmese && styles.burmeseEyebrow]}>
            {copy.game.matchState}
          </AppText>
          <Pressable
            onPress={winner || drawAccepted ? () => startMatch(matchMode) : undefined}
            style={({ pressed }) => [
              styles.statusPill,
              { borderColor: statusColor },
              (winner || drawAccepted) && pressed && styles.actionButtonPressed,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusColor,
                  opacity: winner || drawAccepted ? 1 : pulseOpacity,
                  transform: [{ scale: winner || drawAccepted ? 1 : pulseScale }],
                },
              ]}
            />
            <AppText style={[styles.statusPillText, { color: statusColor }]}>
              {matchLine}
            </AppText>
          </Pressable>
        </View>

        {isOnline ? (
          <View style={[styles.onlineGameMeta, { width: seatWidth }]}>
            <AppText style={styles.onlineGameMetaText} selectable>
              {copy.game.room} {onlineRoomCode ?? "------"}
            </AppText>
            <AppText style={styles.onlineGameMetaText}>
              {onlineConnection === "SUBSCRIBED"
                ? copy.game.connected
                : onlineConnection}
            </AppText>
            <AppText style={styles.onlineGameMetaText}>
              {onlineConnectedPlayers}/2 {copy.game.online}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.gameCenterStage}>
        <Animated.View
          style={[
            {
              opacity: boardIntro,
              transform: [{ translateY: introTranslateY }, { scale: introScale }],
            },
          ]}
        >
          <View style={styles.gameBoardWithAd}>
            <CheckerBoard />
            <AdMobBanner
              placement="game-board"
              unitId={GAME_BOARD_BANNER_AD_UNIT_ID}
              style={styles.gameBoardAdBanner}
            />
          </View>
        </Animated.View>
      </View>

      <View style={styles.gamePlayerDock}>
        {showLocalBottomActions ? (
          <View style={[styles.gameBottomActionSlot, { width: seatWidth }]}>
            <LocalMatchActions player={localActionPlayer} status />
          </View>
        ) : null}
        <View style={[styles.gamePlayerDockInner, { width: seatWidth }]}>
          {renderPlayerDockItem(topDockPlayer)}
          {renderPlayerDockItem(bottomDockPlayer)}
        </View>
      </View>

      <GameDialogs height={height} />
    </SafeAreaView>
  );
}
