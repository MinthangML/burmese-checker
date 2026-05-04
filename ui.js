import React from "react";
import { Animated, Text, View } from "react-native";
import { styles } from "./styles";

export function PlayerStrip({
  theme,
  remainingPieces,
  isActive,
  isWinner,
  pulseScale,
  pulseOpacity,
  labels,
  style,
}) {
  const highlight = isActive || isWinner;
  const stateLabel = isWinner
    ? labels?.winner ?? "winner"
    : isActive
    ? labels?.onMove ?? "on move"
    : theme.seat;
  const piecesLabel = labels?.pieces ?? "pieces";

  return (
    <View style={[styles.playerStrip, style]}>
      <View style={styles.playerStripHeader}>
        <View style={styles.playerIdentity}>
          <Animated.View
            style={[
              styles.playerPulse,
              {
                backgroundColor: theme.accent,
                opacity: highlight ? pulseOpacity : 0.25,
                transform: [{ scale: highlight ? pulseScale : 1 }],
              },
            ]}
          />

          <View>
            <Text style={styles.playerSeat}>{theme.seat}</Text>
            <Text style={[styles.playerName, { color: theme.accent }]}>
              {theme.label}
            </Text>
          </View>
        </View>

        <View style={styles.playerCount}>
          <Text style={styles.playerCountValue}>{remainingPieces}</Text>
          <Text style={styles.playerCountLabel}>{piecesLabel}</Text>
        </View>
      </View>

      <View style={styles.trackRow}>
        {Array.from({ length: 12 }).map((_, idx) => (
          <View
            key={`${theme.label}-${idx}`}
            style={[
              styles.trackSegment,
              idx < remainingPieces
                ? {
                    backgroundColor: theme.accent,
                    opacity: highlight ? 0.95 : 0.72,
                  }
                : styles.trackSegmentMuted,
            ]}
          />
        ))}
      </View>

      <Text
        style={[
          styles.playerMetaText,
          styles.seatState,
          highlight && { color: theme.accent },
          isWinner && styles.playerMetaWinner,
        ]}
      >
        {stateLabel}
      </Text>
    </View>
  );
}

export function InfoSection({ label, value, accent, style }) {
  return (
    <View style={[styles.infoSection, style]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}
