import React from "react";
import { Pressable, View } from "react-native";
import { styles } from "../../styles";
import { getOpponent } from "../../logic";
import { useGame } from "../context/GameContext";
import { AppText } from "./app-text";
import { AppIcon } from "./app-icon";

export function LocalMatchActions({ player, status = false, rotated = false }) {
  const {
    copy,
    drawAccepted,
    drawRequestPlayer,
    getPlayerLabel,
    requestLocalActionConfirmation,
    winner,
  } = useGame();
  const isDisabled = Boolean(winner || drawAccepted);
  const drawRequestedBySelf = drawRequestPlayer === player;
  const drawWillAccept = Boolean(drawRequestPlayer && drawRequestPlayer !== player);
  const drawButtonText = drawWillAccept
    ? copy.game.acceptDraw
    : copy.game.requestDraw;

  return (
    <View
      style={[
        styles.matchActionRow,
        status && styles.matchActionRowStatus,
        rotated && styles.matchActionRowRotated,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${getPlayerLabel(player)} ${copy.game.resign}`}
        disabled={isDisabled}
        onPress={() => requestLocalActionConfirmation("resign", player)}
        style={({ pressed }) => [
          styles.statusIconButton,
          pressed && styles.actionButtonPressed,
          isDisabled && styles.onlineButtonDisabled,
        ]}
      >
        <AppIcon
          family="MaterialCommunityIcons"
          name="flag-outline"
          style={styles.statusIconButtonIcon}
        />
        <AppText style={styles.statusIconButtonText}>{copy.game.resign}</AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${getPlayerLabel(player)} ${drawButtonText}`}
        disabled={isDisabled || drawRequestedBySelf}
        onPress={() => requestLocalActionConfirmation("draw", player)}
        style={({ pressed }) => [
          styles.statusIconButton,
          drawRequestedBySelf && styles.statusIconButtonPending,
          pressed && styles.actionButtonPressed,
          (isDisabled || drawRequestedBySelf) && styles.onlineButtonDisabled,
        ]}
      >
        <AppIcon
          family="MaterialCommunityIcons"
          name="handshake-outline"
          style={styles.statusIconButtonIcon}
        />
        <AppText style={styles.statusIconButtonText}>
          {drawRequestedBySelf ? copy.game.drawPending : drawButtonText}
        </AppText>
      </Pressable>
    </View>
  );
}
