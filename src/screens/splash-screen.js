import React from "react";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "../../styles";
import { APP_ICON_SOURCE } from "../constants/game";
import { useGame } from "../context/GameContext";
import { AppText } from "../components/app-text";
import { ScreenBackdrop } from "../components/screen-backdrop";

export default function SplashScreen() {
  const { copy } = useGame();

  return (
    <SafeAreaView style={styles.splashScreen}>
      <StatusBar hidden style="light" animated />
      <ScreenBackdrop />
      <View style={styles.splashContent}>
        <View style={styles.splashIconFrame}>
          <Image
            source={APP_ICON_SOURCE}
            style={styles.splashIcon}
            resizeMode="cover"
          />
        </View>
        <AppText style={styles.splashTitle}>{copy.intro.title}</AppText>
      </View>
    </SafeAreaView>
  );
}
