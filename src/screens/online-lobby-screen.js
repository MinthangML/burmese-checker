import React from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles, SURFACE } from "../../styles";
import { normalizeRoomCode } from "../../online";
import { ONLINE_MODE } from "../constants/game";
import { AppIcon } from "../components/app-icon";
import { AppText } from "../components/app-text";
import { ScreenBackdrop } from "../components/screen-backdrop";
import { SettingsButton } from "../components/settings-button";
import { useGame } from "../context/GameContext";

export default function OnlineLobbyScreen() {
  const {
    copy,
    getPlayerLabel,
    goBackToMenu,
    handleClearSavedOnlineMatch,
    handleCreateOnlineMatch,
    handleJoinOnlineMatch,
    handleResumeOnlineMatch,
    height,
    isBurmese,
    joinCode,
    onlineBusy,
    onlineError,
    onlineMode,
    savedOnlineSession,
    setJoinCode,
  } = useGame();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden style="light" animated />
      <ScreenBackdrop />

      <View style={[styles.gameFloatingTop, styles.gameTopBar]}>
        <Pressable
          onPress={goBackToMenu}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <AppIcon name="chevron-back" style={styles.backButtonIcon} />
          <AppText style={styles.backButtonText}>{copy.game.menu}</AppText>
        </Pressable>

        {/* <View style={styles.modeBadge}>
              <AppIcon
                icon={onlineMode?.icon ?? ONLINE_MODE.icon}
                style={styles.modeBadgeIcon}
              />
              <AppText style={styles.modeBadgeText}>
                {copy.menu.online.label}
              </AppText>
            </View> */}

        <SettingsButton showLabel={false} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.introContent, { minHeight: height }]}
      >
        <View style={styles.introStage}>
          <View style={styles.header}>
            <AppText
              style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}
            >
              {copy.onlineLobby.kicker}
            </AppText>
            <AppText style={styles.title}>{copy.onlineLobby.title}</AppText>
          </View>

          <View style={styles.onlineLobbyActions}>
            <View style={styles.onlineActionPanel}>
              <View style={styles.onlineActionHeader}>
                <View style={styles.onlineActionIcon}>
                  <AppIcon
                    family="MaterialCommunityIcons"
                    name="plus-circle-outline"
                    style={styles.onlineActionIconText}
                  />
                </View>
                <View style={styles.onlineActionCopy}>
                  <AppText style={styles.onlineActionTitle}>
                    {copy.onlineLobby.createTitle}
                  </AppText>
                  <AppText style={styles.onlineActionDetail}>
                    {copy.onlineLobby.createDetail}
                  </AppText>
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
                <AppText style={styles.onlinePrimaryButtonText}>
                  {onlineBusy
                    ? copy.onlineLobby.working
                    : copy.onlineLobby.createRoom}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.onlineActionPanel}>
              <View style={styles.onlineActionHeader}>
                <View style={styles.onlineActionIcon}>
                  <AppIcon
                    family="MaterialCommunityIcons"
                    name="keyboard-outline"
                    style={styles.onlineActionIconText}
                  />
                </View>
                <View style={styles.onlineActionCopy}>
                  <AppText style={styles.onlineActionTitle}>
                    {copy.onlineLobby.joinTitle}
                  </AppText>
                  <AppText style={styles.onlineActionDetail}>
                    {copy.onlineLobby.joinDetail}
                  </AppText>
                </View>
              </View>

              <View style={styles.onlineJoinRow}>
                <TextInput
                  value={joinCode}
                  onChangeText={(value) =>
                    setJoinCode(normalizeRoomCode(value))
                  }
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
                  <AppText style={styles.onlineJoinButtonText}>
                    {copy.onlineLobby.join}
                  </AppText>
                </Pressable>
              </View>
            </View>

            {savedOnlineSession ? (
              <View style={styles.onlineResumeBlock}>
                <AppText
                  style={[
                    styles.onlineSectionLabel,
                    isBurmese && styles.burmeseEyebrow,
                  ]}
                >
                  {copy.onlineLobby.savedRoom}
                </AppText>
                <AppText style={styles.onlineResumeText} selectable>
                  {savedOnlineSession.roomCode} -{" "}
                  {getPlayerLabel(savedOnlineSession.color)}
                </AppText>
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
                    <AppText style={styles.onlineSecondaryButtonText}>
                      {copy.onlineLobby.resume}
                    </AppText>
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
                    <AppText style={styles.onlineGhostButtonText}>
                      {copy.onlineLobby.forget}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {onlineError ? (
              <AppText style={styles.onlineErrorText}>{onlineError}</AppText>
            ) : null}
          </View>

          <View style={styles.rulesBlock}>
            <AppText style={styles.rulesTitle}>
              {copy.onlineLobby.rulesTitle}
            </AppText>
            {copy.onlineLobby.rules.map((rule, index) => (
              <View key={rule} style={styles.ruleRow}>
                <AppText style={styles.ruleIndex}>{`0${index + 1}`}</AppText>
                <AppText style={styles.ruleText}>{rule}</AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
