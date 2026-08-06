// Persistente Aktionsleiste am unteren Bildschirmrand.
// Aktuell nur ein Platzhalter für die spätere Swipe-Quiz-Logik (Bestätigen /
// Überspringen / Hinweis). Rein präsentationelle Komponente ohne eigene Logik.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActionBarProps {
  onConfirm?: () => void;
  onSkip?: () => void;
  onHint?: () => void;
}

// Wichtig für Barrierefreiheit: Feedback (z. B. richtig/falsch) darf später
// niemals nur über Farbe vermittelt werden, sondern immer zusätzlich über
// Text oder Icon – das gilt auch für zukünftige Erweiterungen dieser Leiste.
export function ActionBar({ onConfirm, onSkip, onHint }: ActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      <Pressable
        style={styles.button}
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Frage überspringen"
        hitSlop={8}
      >
        <Text style={styles.buttonText}>Überspringen</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={onHint}
        accessibilityRole="button"
        accessibilityLabel="Hinweis anzeigen"
        hitSlop={8}
      >
        <Text style={styles.buttonText}>Hinweis</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.confirmButton]}
        onPress={onConfirm}
        accessibilityRole="button"
        accessibilityLabel="Antwort bestätigen"
        hitSlop={8}
      >
        <Text style={[styles.buttonText, styles.confirmButtonText]}>Bestätigen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
  },
  button: {
    flex: 1,
    minHeight: 44, // Mindest-Touch-Ziel für Barrierefreiheit
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFEFEF',
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
