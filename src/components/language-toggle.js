import React from "react";
import { Pressable, View } from "react-native";
import { styles } from "../../styles";
import { LANGUAGE_OPTIONS } from "../../translations";
import { useGame } from "../context/GameContext";
import { AppText } from "./app-text";

export function LanguageToggle({ style }) {
  const { copy, language, setLanguage } = useGame();

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
            <AppText
              style={[
                styles.languageOptionText,
                isActive && styles.languageOptionTextActive,
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
