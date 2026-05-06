import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import appConfig from "../../app.json";
import { styles } from "../../styles";
import { AI_DIFFICULTY_OPTIONS } from "../constants/game";
import { getDifficultyLabel } from "../utils/game-state";
import { AppIcon } from "../components/app-icon";
import { AppText } from "../components/app-text";
import { LanguageToggle } from "../components/language-toggle";
import { ScreenBackdrop } from "../components/screen-backdrop";
import { useGame } from "../context/GameContext";

const expoConfig = appConfig.expo ?? {};

const ABOUT_APP_DETAILS = [
  { label: "English name", value: "Burmese Checkers" },
  { label: "App name", value: expoConfig.name ?? "Burmese Checkers" },
  { label: "Version", value: expoConfig.version ?? "1.0.0" },
  { label: "Developer", value: "MinThang ML (Appician)" },
  { label: "User Name", value: "@appician" },
  { label: "Contact", value: "09 759 298 117" },
];

export default function SettingsScreen() {
  const {
    aiDifficulty,
    closeSettings,
    copy,
    currentDifficultyLabel,
    height,
    isBurmese,
    menuOptions,
    setAiDifficulty,
  } = useGame();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden style="light" animated />
      <ScreenBackdrop />

      <View style={[styles.gameFloatingTop, styles.gameTopBar]}>
        <Pressable
          onPress={closeSettings}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <AppIcon name="chevron-back" style={styles.backButtonIcon} />
          <AppText style={styles.backButtonText}>{copy.settings.back}</AppText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.settingsContent, { minHeight: height }]}
      >
        <View style={styles.settingsStage}>
          <View style={styles.header}>
            <AppText
              style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}
            >
              {copy.intro.kicker}
            </AppText>
            <AppText style={styles.title}>{copy.settings.title}</AppText>
          </View>

          <View style={styles.settingsPanel}>
            <View style={styles.settingsSection}>
              <AppText style={styles.settingsSectionTitle}>
                {copy.settings.languageTitle}
              </AppText>
              <AppText style={styles.settingsSectionText}>
                {copy.settings.languageDetail}
              </AppText>
              <LanguageToggle style={styles.settingsLanguageToggle} />
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsSection}>
              <View style={styles.difficultyHeader}>
                <View style={styles.settingHeaderCopy}>
                  <AppText style={styles.settingsSectionTitle}>
                    {copy.settings.aiTitle}
                  </AppText>
                  <AppText style={styles.settingsSectionText}>
                    {copy.settings.aiDetail}
                  </AppText>
                </View>
                <AppText style={styles.difficultyHint}>
                  {currentDifficultyLabel}
                </AppText>
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
                      <AppText
                        style={[
                          styles.difficultyButtonText,
                          isActive && styles.difficultyButtonTextActive,
                        ]}
                      >
                        {getDifficultyLabel(option.key, copy)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsSection}>
              <AppText style={styles.settingsSectionTitle}>
                {copy.settings.modesTitle}
              </AppText>
              <AppText style={styles.settingsSectionText}>
                {copy.settings.modesDetail}
              </AppText>
              <View style={styles.settingsModeList}>
                {menuOptions.map((option) => (
                  <View key={option.key} style={styles.settingsModeRow}>
                    <AppIcon
                      icon={option.icon}
                      style={styles.settingsModeIcon}
                    />
                    <View style={styles.settingHeaderCopy}>
                      <AppText style={styles.settingsModeTitle}>
                        {option.label}
                      </AppText>
                      <AppText style={styles.settingsSectionText}>
                        {option.detail}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsSection}>
              <AppText style={styles.settingsSectionTitle}>
                {copy.settings.onlineTitle}
              </AppText>
              <AppText style={styles.settingsSectionText}>
                {copy.settings.onlineDetail}
              </AppText>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsSection}>
              <AppText style={styles.settingsSectionTitle}>About app</AppText>
              <AppText style={styles.settingsSectionText}>
                Burmese Checkers is a traditional board game app with local, AI,
                and online match support.
              </AppText>

              <View style={styles.aboutAppList}>
                {ABOUT_APP_DETAILS.map((appDetail) => (
                  <View key={appDetail.label} style={styles.aboutAppRow}>
                    <AppText style={styles.aboutAppLabel}>
                      {appDetail.label}
                    </AppText>
                    <AppText style={styles.aboutAppValue}>
                      {appDetail.value}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
