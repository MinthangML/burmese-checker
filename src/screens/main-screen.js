import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "../../styles";
import { AppIcon } from "../components/app-icon";
import { AdMobBanner } from "../components/admob-banner";
import { AppText } from "../components/app-text";
import { ScreenBackdrop } from "../components/screen-backdrop";
import { SettingsButton } from "../components/settings-button";
import { useGame } from "../context/GameContext";

export default function MainScreen() {
  const { copy, height, isBurmese, menuOptions, startMatch } = useGame();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden style="light" animated />
      <ScreenBackdrop />
      <SettingsButton style={styles.introSettingsButton} showLabel={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.introContent, { minHeight: height }]}
      >
        <View style={styles.introStage}>
          <View style={styles.introTopArea}>
            <View style={styles.header}>
              <AppText style={[styles.kicker, isBurmese && styles.burmeseEyebrow]}>
                {copy.intro.kicker}
              </AppText>
              <AppText style={styles.title}>{copy.intro.title}</AppText>
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
                    <AppIcon icon={option.icon} style={styles.menuIcon} />
                  </View>
                  <View style={styles.menuCopy}>
                    <AppText style={styles.menuLabel}>{option.label}</AppText>
                    <AppText style={styles.menuDetail}>{option.detail}</AppText>
                  </View>
                  <AppIcon name="chevron-forward" style={styles.menuArrow} />
                </Pressable>
              ))}
            </View>
            <AdMobBanner placement="main-menu" style={styles.mainMenuAdBanner} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
