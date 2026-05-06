import React from "react";
import { Animated, Pressable, View } from "react-native";
import { styles } from "../../styles";
import { CONFETTI_PIECES } from "../constants/game";
import { useGame } from "../context/GameContext";
import { AppText } from "./app-text";
import { AppIcon } from "./app-icon";
import { ConfirmationDialog } from "./confirmation-dialog";

function WinnerDialog() {
  const {
    closeWinnerDialog,
    confettiAnimations,
    copy,
    getPlayerLabel,
    height,
    startWinnerRematch,
    winner,
    winnerDialogVisible,
    winnerTheme,
  } = useGame();

  if (!winnerDialogVisible || !winnerTheme) {
    return null;
  }

  return (
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
          <AppIcon
            family="MaterialCommunityIcons"
            name="trophy-outline"
            style={[styles.winnerBadgeText, { color: winnerTheme.accent }]}
          />
        </View>

        <AppText style={styles.winnerTitle}>{copy.game.congratsTitle}</AppText>
        <AppText style={[styles.winnerMessage, { color: winnerTheme.accent }]}>
          {copy.game.congratsMessage(getPlayerLabel(winner))}
        </AppText>

        <View style={styles.confirmActions}>
          <Pressable
            onPress={closeWinnerDialog}
            style={({ pressed }) => [
              styles.confirmSecondaryButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppText style={styles.confirmSecondaryText}>
              {copy.game.congratsClose}
            </AppText>
          </Pressable>

          <Pressable
            onPress={startWinnerRematch}
            style={({ pressed }) => [
              styles.confirmPrimaryButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppText style={styles.confirmPrimaryText}>
              {copy.game.congratsRematch}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DrawDialog() {
  const {
    closeDrawDialog,
    copy,
    drawDialogVisible,
    startDrawRematch,
  } = useGame();

  if (!drawDialogVisible) {
    return null;
  }

  return (
    <ConfirmationDialog
      title={copy.game.drawTitle}
      message={copy.game.drawMessage}
      cancelText={copy.game.congratsClose}
      confirmText={copy.game.congratsRematch}
      onCancel={closeDrawDialog}
      onConfirm={startDrawRematch}
    />
  );
}

function LocalActionConfirmDialog() {
  const {
    cancelLocalActionConfirm,
    confirmLocalAction,
    copy,
    localActionConfirm,
    localActionConfirmButton,
    localActionConfirmMessage,
    localActionConfirmTitle,
  } = useGame();

  if (!localActionConfirm) {
    return null;
  }

  return (
    <ConfirmationDialog
      title={localActionConfirmTitle}
      message={localActionConfirmMessage}
      cancelText={copy.game.exitCancel}
      confirmText={localActionConfirmButton}
      onCancel={cancelLocalActionConfirm}
      onConfirm={confirmLocalAction}
    />
  );
}

function ExitConfirmDialog() {
  const {
    cancelExitGame,
    confirmExitGame,
    copy,
    exitConfirmVisible,
  } = useGame();

  if (!exitConfirmVisible) {
    return null;
  }

  return (
    <ConfirmationDialog
      title={copy.game.exitTitle}
      message={copy.game.exitMessage}
      cancelText={copy.game.exitCancel}
      confirmText={copy.game.exitConfirm}
      onCancel={cancelExitGame}
      onConfirm={confirmExitGame}
    />
  );
}

function OpponentLeftDialog() {
  const {
    confirmOpponentLeftExit,
    copy,
    onlineOpponentLabel,
    opponentLeftDialogVisible,
  } = useGame();

  if (!opponentLeftDialogVisible) {
    return null;
  }

  return (
    <ConfirmationDialog
      title={copy.game.opponentLeftTitle}
      message={copy.game.opponentLeftMessage(onlineOpponentLabel)}
      confirmText={copy.game.opponentLeftConfirm}
      onConfirm={confirmOpponentLeftExit}
    />
  );
}

export function GameDialogs() {
  return (
    <>
      <WinnerDialog />
      <DrawDialog />
      <LocalActionConfirmDialog />
      <ExitConfirmDialog />
      <OpponentLeftDialog />
    </>
  );
}
