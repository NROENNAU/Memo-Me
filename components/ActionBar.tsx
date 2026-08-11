// Persistente Aktionsleiste am unteren Bildschirmrand.
// Aktuell nur ein Platzhalter für die spätere Swipe-Quiz-Logik (Bestätigen /
// Überspringen / Hinweis). Rein präsentationelle Komponente ohne eigene Logik.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface ActionBarProps {
  onConfirm?: () => void;
  onSkip?: () => void;
  onHint?: () => void;
  confirmLabel?: string;
}

// Wichtig für Barrierefreiheit: Feedback (z. B. richtig/falsch) darf später
// niemals nur über Farbe vermittelt werden, sondern immer zusätzlich über
// Text oder Icon – das gilt auch für zukünftige Erweiterungen dieser Leiste.
export function ActionBar({ onConfirm, onSkip, onHint, confirmLabel = 'Bestätigen' }: ActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <Pressable
        style={styles.button}
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Frage überspringen"
        hitSlop={spacing.sm}
      >
        <Text style={styles.buttonText}>Überspringen</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={onHint}
        accessibilityRole="button"
        accessibilityLabel="Hinweis anzeigen"
        hitSlop={spacing.sm}
      >
        <Text style={styles.buttonText}>Hinweis</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.confirmButton]}
        onPress={onConfirm}
        accessibilityRole="button"
        accessibilityLabel="Antwort bestätigen"
        hitSlop={spacing.sm}
      >
        <Text style={[styles.buttonText, styles.confirmButtonText]}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  button: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET, // Mindest-Touch-Ziel für Barrierefreiheit
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    ...typography.button,
    fontSize: 15,
    color: colors.textPrimary,
  },
  confirmButtonText: {
    color: colors.textOnPrimary,
  },
});
