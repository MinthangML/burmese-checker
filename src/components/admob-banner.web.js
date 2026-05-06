import React from "react";
import { View } from "react-native";
import { styles } from "../../styles";
import { AppText } from "./app-text";

export function AdMobBanner({ style, unitId }) {
  return (
    <View style={[styles.adBannerSlot, styles.adBannerWebFallback, style]}>
      <AppText style={styles.adBannerLabel}>
        {unitId ? "AdMob banner" : "AdMob test banner"}
      </AppText>
    </View>
  );
}
