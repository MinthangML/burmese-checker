import React from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { styles } from "../../styles";

export function AdMobBanner({ placement = "default", style, unitId = TestIds.BANNER }) {
  return (
    <View style={[styles.adBannerSlot, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        key={placement}
      />
    </View>
  );
}
