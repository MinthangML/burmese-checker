import React from "react";
import { Text as RNText } from "react-native";
import { getBurmeseTextStyle } from "../../styles";
import { useGame } from "../context/GameContext";

export function AppText({ style, ...props }) {
  const { fontsLoaded, isBurmese } = useGame();

  return (
    <RNText
      {...props}
      style={getBurmeseTextStyle(style, isBurmese, fontsLoaded)}
    />
  );
}
