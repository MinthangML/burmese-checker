import React from "react";
import { Pressable, View } from "react-native";
import { styles } from "../../styles";
import { AppText } from "./app-text";

export function ConfirmationDialog({
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}) {
  return (
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmDialog}>
        <AppText style={styles.confirmTitle}>{title}</AppText>
        <AppText style={styles.confirmMessage}>{message}</AppText>

        <View style={styles.confirmActions}>
          {cancelText && onCancel ? (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.confirmSecondaryButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <AppText style={styles.confirmSecondaryText}>{cancelText}</AppText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmPrimaryButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <AppText style={styles.confirmPrimaryText}>{confirmText}</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
