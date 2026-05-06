import React from "react";
import { Stack } from "expo-router";
import { GameProvider, useGame } from "../src/context/GameContext";
import SplashScreen from "../src/screens/splash-screen";

function RootStack() {
  const { showSplash } = useGame();

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GameProvider>
      <RootStack />
    </GameProvider>
  );
}
