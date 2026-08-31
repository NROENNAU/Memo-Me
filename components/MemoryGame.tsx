// Pärchen-Memory: mehrere zugedeckte Karten, von denen je zwei ein
// gemeinsames Merkmal teilen (siehe MemoryCard.groupKey) - beim Aufdecken
// wird das Merkmal (Jahr, Ort oder Name) angezeigt statt eines identischen
// Bildes, gemerkt werden muss also das Merkmal, nicht das Foto selbst.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MemoryCard } from '../services/quizService';
import { colors, radius, spacing, typography } from '../theme';

interface MemoryGameProps {
  cards: MemoryCard[];
  // mismatchCount = Anzahl der nicht zusammenpassenden Kartenpaare, Grundlage
  // für den Versuche-Bonus der Punkteberechnung (siehe PhotoSwipeScreen).
  onComplete: (isCorrect: boolean, mismatchCount: number) => void;
  disabled?: boolean;
}

// Kurze Pause, bevor zwei nicht zusammenpassende Karten wieder zugedeckt
// werden, damit der Nutzer sie noch sehen kann.
const MISMATCH_DELAY_MS = 800;

export function MemoryGame({ cards, onComplete, disabled = false }: MemoryGameProps) {
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedGroupKeys, setMatchedGroupKeys] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [mismatchCount, setMismatchCount] = useState(0);
  const hasCompletedRef = useRef(false);

  const totalPairs = cards.length / 2;
  const isComplete = matchedGroupKeys.size === totalPairs;
  const isRevealed = disabled || isComplete;

  useEffect(() => {
    if (isRevealed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete(isComplete, mismatchCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed]);

  function handleCardPress(index: number) {
    if (isRevealed || isChecking) return;
    if (flippedIndices.includes(index) || matchedGroupKeys.has(cards[index].groupKey)) return;
    if (flippedIndices.length >= 2) return;

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const [firstIndex, secondIndex] = nextFlipped;
      if (cards[firstIndex].groupKey === cards[secondIndex].groupKey) {
        setMatchedGroupKeys((previous) => new Set(previous).add(cards[firstIndex].groupKey));
        setFlippedIndices([]);
      } else {
        setMismatchCount((previous) => previous + 1);
        setIsChecking(true);
        setTimeout(() => {
          setFlippedIndices([]);
          setIsChecking(false);
        }, MISMATCH_DELAY_MS);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {isComplete ? 'Alle Pärchen gefunden!' : 'Finde die Bildpaare mit demselben Merkmal.'}
      </Text>
      <View style={styles.grid}>
        {cards.map((card, index) => {
          const isMatched = matchedGroupKeys.has(card.groupKey);
          const isFaceUp = isMatched || flippedIndices.includes(index) || isRevealed;

          return (
            <Pressable
              key={`${card.uri}-${index}`}
              style={[styles.card, isMatched && styles.cardMatched]}
              onPress={() => handleCardPress(index)}
              disabled={isRevealed || isMatched}
              accessibilityRole="button"
              accessibilityLabel={isFaceUp ? `Karte: ${card.attributeLabel}` : 'Verdeckte Karte'}
            >
              {isFaceUp ? (
                <>
                  <Image source={{ uri: card.uri }} style={styles.cardImage} contentFit="cover" />
                  <View style={styles.labelBadge}>
                    <Text style={styles.labelText} numberOfLines={1}>
                      {card.attributeLabel}
                    </Text>
                  </View>
                  {isMatched && (
                    <View style={styles.matchedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.cardBack}>
                  <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
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
  card: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMatched: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  cardBack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  labelBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,26,46,0.72)',
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
  },
  labelText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
});
