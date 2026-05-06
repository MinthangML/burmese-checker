import React from "react";
import { StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SURFACE } from "../../styles";

const ICON_FAMILIES = {
  Ionicons,
  MaterialCommunityIcons,
};

export function AppIcon({
  icon,
  family = "Ionicons",
  name,
  size = 20,
  color = SURFACE.button,
  style,
}) {
  const iconConfig = typeof icon === "string" ? { name: icon } : icon ?? {};
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const IconComponent =
    ICON_FAMILIES[iconConfig.family ?? family] ?? Ionicons;

  return (
    <IconComponent
      name={iconConfig.name ?? name}
      size={iconConfig.size ?? flattenedStyle.fontSize ?? size}
      color={iconConfig.color ?? flattenedStyle.color ?? color}
      style={style}
    />
  );
}
