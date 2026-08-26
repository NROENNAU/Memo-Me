// Zeitleisten-Spiel: mehrere Fotos werden in zufälliger Reihenfolge gezeigt,
// der Nutzer tippt sie in der vermuteten zeitlichen Reihenfolge an (ältestes
// zuerst). Sobald alle Fotos eine Nummer haben, wird sofort ausgewertet -
// kein extra Bestätigen-Schritt, passend zum Rest der App.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { TimelineItem } from '../services/quizService';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../theme';

// Volles Datum statt nur Jahr, damit beim Auswerten auch bei Fotos aus
// demselben Jahr klar ist, welches wirklich früher/später aufgenommen wurde.
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface TimelineGameProps {
  items: TimelineItem[];
  onSubmit: (isCorrect: boolean) => void;
  // Von außen erzwungene Auswertung (z. B. weil der Timer abgelaufen ist),
  // auch wenn noch nicht alle Fotos einsortiert wurden.
  forceReveal?: boolean;
}

export function TimelineGame({ items, onSubmit, forceReveal = false }: TimelineGameProps) {
  const [assignedOrder, setAssignedOrder] = useState<number[]>([]);
  const hasSubmittedRef = useRef(false);

  const isComplete = assignedOrder.length === items.length;
  const isRevealed = isComplete || forceReveal;
  const correctOrder = items
    .map((_, index) => index)
    .sort((a, b) => items[a].timestamp - items[b].timestamp);

  useEffect(() => {
    if (isRevealed && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      const isCorrect =
        isComplete && assignedOrder.every((itemIndex, position) => itemIndex === correctOrder[position]);
      onSubmit(isCorrect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed]);

  // Tippt man ein bereits einsortiertes Foto erneut an, wird es wieder
  // herausgenommen - so lässt sich ein Fehltipp korrigieren, ohne die ganze
  // Reihenfolge zurückzusetzen.
  function handleTap(itemIndex: number) {
    if (isRevealed) return;
    setAssignedOrder((previous) =>
      previous.includes(itemIndex) ? previous.filter((index) => index !== itemIndex) : [...previous, itemIndex]
    );
  }

  function handleReset() {
    if (isRevealed) return;
    setAssignedOrder([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {isRevealed
          ? 'Richtige Reihenfolge:'
          : 'Tippe die Fotos in der zeitlichen Reihenfolge an – ältestes zuerst. Nochmal antippen korrigiert.'}
      </Text>
      <View style={styles.grid}>
        {items.map((item, itemIndex) => {
          const position = assignedOrder.indexOf(itemIndex);
          const correctPosition = correctOrder.indexOf(itemIndex);
          const isCorrectSpot = isRevealed && position !== -1 && position === correctPosition;

          return (
            <Pressable
              key={item.uri}
              style={[
                styles.tile,
                isRevealed && position !== -1 && (isCorrectSpot ? styles.tileCorrect : styles.tileWrong),
              ]}
              onPress={() => handleTap(itemIndex)}
              disabled={isRevealed}
              accessibilityRole="button"
              accessibilityLabel={`Foto ${itemIndex + 1}${position !== -1 ? `, Position ${position + 1}` : ''}`}
            >
              <Image source={{ uri: item.uri }} style={styles.tileImage} contentFit="cover" />
              {position !== -1 && !isRevealed && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{position + 1}</Text>
                </View>
              )}
              {isRevealed && (
                <View
                  style={[
                    styles.resultOverlay,
                    position === -1 ? styles.resultNeutral : isCorrectSpot ? styles.resultCorrect : styles.resultWrong,
                  ]}
                >
                  {position !== -1 && (
                    <Ionicons
                      name={isCorrectSpot ? 'checkmark-circle' : 'close-circle'}
                      size={22}
                      color={colors.textOnPrimary}
                    />
                  )}
                  <Text style={styles.yearLabel}>{formatDate(item.timestamp)}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {!isRevealed && assignedOrder.length > 0 && (
        <Pressable
          style={styles.resetButton}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reihenfolge zurücksetzen"
        >
          <Text style={styles.resetButtonText}>Zurücksetzen</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  tile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  tileCorrect: {
    borderWidth: 3,
    borderColor: colors.success,
  },
  tileWrong: {
    borderWidth: 3,
    borderColor: colors.danger,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  resultCorrect: {
    backgroundColor: 'rgba(34,164,93,0.85)',
  },
  resultWrong: {
    backgroundColor: 'rgba(225,35,78,0.85)',
  },
  resultNeutral: {
    backgroundColor: 'rgba(107,114,128,0.85)',
  },
  yearLabel: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  resetButton: {
    alignSelf: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
