import React from "react";
import { View } from "react-native";
import { styles } from "../../styles";
import { AppText } from "./app-text";

export function AdMobBanner({ style }) {
  return (
    <View style={[styles.adBannerSlot, styles.adBannerWebFallback, style]}>
      <AppText style={styles.adBannerLabel}>AdMob test banner</AppText>
    </View>
  );
}
