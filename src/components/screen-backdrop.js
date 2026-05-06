import React from "react";
import { View } from "react-native";
import { styles } from "../../styles";

export function ScreenBackdrop() {
  return (
    <>
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbLeft]} />
      <View pointerEvents="none" style={[styles.backdropOrb, styles.backdropOrbRight]} />
    </>
  );
}
