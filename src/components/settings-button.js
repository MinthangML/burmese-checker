import React from "react";
import { Pressable } from "react-native";
import { styles } from "../../styles";
import { useGame } from "../context/GameContext";
import { AppText } from "./app-text";
import { AppIcon } from "./app-icon";

export function SettingsButton({ style, showLabel = true }) {
  const { copy, openSettings } = useGame();

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
      <AppIcon name="settings-outline" style={styles.settingsButtonIcon} />
      {showLabel ? (
        <AppText style={styles.settingsButtonText}>{copy.settings.button}</AppText>
      ) : null}
    </Pressable>
  );
}
