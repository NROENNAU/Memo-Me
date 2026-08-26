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

interface TimelineGameProps {
  items: TimelineItem[];
  onSubmit: (isCorrect: boolean) => void;
}

export function TimelineGame({ items, onSubmit }: TimelineGameProps) {
  const [assignedOrder, setAssignedOrder] = useState<number[]>([]);
  const hasSubmittedRef = useRef(false);

  const isComplete = assignedOrder.length === items.length;
  const correctOrder = items
    .map((_, index) => index)
    .sort((a, b) => items[a].timestamp - items[b].timestamp);

  useEffect(() => {
    if (isComplete && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      const isCorrect = assignedOrder.every((itemIndex, position) => itemIndex === correctOrder[position]);
      onSubmit(isCorrect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  function handleTap(itemIndex: number) {
    if (isComplete || assignedOrder.includes(itemIndex)) return;
    setAssignedOrder((previous) => [...previous, itemIndex]);
  }

  function handleReset() {
    if (isComplete) return;
    setAssignedOrder([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {isComplete
          ? 'Richtige Reihenfolge:'
          : 'Tippe die Fotos in der zeitlichen Reihenfolge an – ältestes zuerst.'}
      </Text>
      <View style={styles.grid}>
        {items.map((item, itemIndex) => {
          const position = assignedOrder.indexOf(itemIndex);
          const correctPosition = correctOrder.indexOf(itemIndex);
          const isCorrectSpot = isComplete && position === correctPosition;

          return (
            <Pressable
              key={item.uri}
              style={[styles.tile, isComplete && (isCorrectSpot ? styles.tileCorrect : styles.tileWrong)]}
              onPress={() => handleTap(itemIndex)}
              disabled={isComplete}
              accessibilityRole="button"
              accessibilityLabel={`Foto ${itemIndex + 1}${position !== -1 ? `, Position ${position + 1}` : ''}`}
            >
              <Image source={{ uri: item.uri }} style={styles.tileImage} contentFit="cover" />
              {position !== -1 && !isComplete && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{position + 1}</Text>
                </View>
              )}
              {isComplete && (
                <View style={[styles.resultOverlay, isCorrectSpot ? styles.resultCorrect : styles.resultWrong]}>
                  <Ionicons
                    name={isCorrectSpot ? 'checkmark-circle' : 'close-circle'}
                    size={22}
                    color={colors.textOnPrimary}
                  />
                  <Text style={styles.yearLabel}>{item.year}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {!isComplete && assignedOrder.length > 0 && (
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
