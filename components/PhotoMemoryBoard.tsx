// Klassisches Foto-Memory: ein quadratisches Raster verdeckter Karten, je
// zwei zeigen dasselbe Foto. Unterstützt 1 Spieler (löst allein, Punkte sind
// die gefundenen Paare) oder 2 Spieler abwechselnd (klassische Memory-Regel:
// richtiges Paar = Punkt + nochmal dran, falsches Paar = nächster Spieler).
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MemoryCardItem } from '../services/memoryGameService';
import { MemoryPlayer } from '../types/games';
import { colors, radius, spacing, typography } from '../theme';

export interface MemoryGameResult {
  // Parallel zu players - gefundene Paare je Spieler.
  scores: number[];
  // Bei 2 Spielern: Index des Spielers mit den meisten Paaren, null bei
  // Gleichstand. Bei nur 1 Spieler immer null (kein Gegner zum Vergleichen).
  winnerIndex: number | null;
  moveCount: number;
  mismatchCount: number;
  elapsedMs: number;
}

interface PhotoMemoryBoardProps {
  cards: MemoryCardItem[];
  players: MemoryPlayer[];
  onFinished: (result: MemoryGameResult) => void;
}

// Kurze Pause, bevor zwei nicht passende Karten wieder verdeckt werden, damit
// man sie noch sehen kann.
const MISMATCH_DELAY_MS = 900;
// Bewusst enger Abstand zwischen den Karten (statt spacing.sm) - bei einem
// dichten Raster wie 6x6 zählt jeder Pixel, um noch eine ordentliche
// Kartengröße zu erreichen (siehe MIN_CARD_SIZE in memoryGameService).
export const MEMORY_GRID_GAP = spacing.xs;

export function PhotoMemoryBoard({ cards, players, onFinished }: PhotoMemoryBoardProps) {
  const gridSize = Math.round(Math.sqrt(cards.length));
  const totalPairs = cards.length / 2;

  const [containerWidth, setContainerWidth] = useState(0);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [scores, setScores] = useState<number[]>(() => players.map(() => 0));
  const moveCountRef = useRef(0);
  const mismatchCountRef = useRef(0);
  const startedAtRef = useRef(Date.now());
  const hasFinishedRef = useRef(false);

  const isMultiplayer = players.length > 1;
  const isComplete = matchedPairIds.size === totalPairs;

  useEffect(() => {
    if (isComplete && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      let winnerIndex: number | null = null;
      if (isMultiplayer) {
        const maxScore = Math.max(...scores);
        const leaders = scores.filter((score) => score === maxScore);
        winnerIndex = leaders.length === 1 ? scores.indexOf(maxScore) : null;
      }
      onFinished({
        scores,
        winnerIndex,
        moveCount: moveCountRef.current,
        mismatchCount: mismatchCountRef.current,
        elapsedMs: Date.now() - startedAtRef.current,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function handleCardPress(index: number) {
    if (isChecking || flippedIndices.includes(index)) return;
    if (matchedPairIds.has(cards[index].pairId)) return;
    if (flippedIndices.length >= 2) return;

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);
    if (nextFlipped.length < 2) return;

    moveCountRef.current += 1;
    const [firstIndex, secondIndex] = nextFlipped;
    const isMatch = cards[firstIndex].pairId === cards[secondIndex].pairId;

    if (isMatch) {
      setMatchedPairIds((previous) => new Set(previous).add(cards[firstIndex].pairId));
      setScores((previous) => previous.map((score, index) => (index === currentPlayerIndex ? score + 1 : score)));
      setFlippedIndices([]);
      // Richtig geraten: derselbe Spieler bleibt dran (klassische Memory-Regel).
    } else {
      mismatchCountRef.current += 1;
      setIsChecking(true);
      setTimeout(() => {
        setFlippedIndices([]);
        setIsChecking(false);
        if (isMultiplayer) {
          setCurrentPlayerIndex((previous) => (previous + 1) % players.length);
        }
      }, MISMATCH_DELAY_MS);
    }
  }

  const cellSize = containerWidth > 0 ? (containerWidth - (gridSize - 1) * MEMORY_GRID_GAP) / gridSize : 0;

  return (
    <View style={styles.container}>
      <View style={styles.scoreRow}>
        {players.map((player, index) => (
          <View
            key={player.name + index}
            style={[styles.playerBadge, isMultiplayer && index === currentPlayerIndex && styles.playerBadgeActive]}
          >
            <Text style={styles.playerName} numberOfLines={1}>
              {player.name}
            </Text>
            <Text style={styles.playerScore}>{scores[index]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid} onLayout={handleLayout}>
        {cellSize > 0 &&
          cards.map((card, index) => {
            const isMatched = matchedPairIds.has(card.pairId);
            const isFaceUp = isMatched || flippedIndices.includes(index);

            return (
              <Pressable
                key={card.id}
                style={[
                  styles.card,
                  { width: cellSize, height: cellSize },
                  isMatched && styles.cardMatched,
                ]}
                onPress={() => handleCardPress(index)}
                disabled={isFaceUp}
                accessibilityRole="button"
                accessibilityLabel={isFaceUp ? 'Aufgedeckte Karte' : 'Verdeckte Karte'}
              >
                {isFaceUp ? (
                  <Image source={{ uri: card.uri }} style={styles.cardImage} contentFit="cover" />
                ) : (
                  <View style={styles.cardBack}>
                    <Ionicons name="image-outline" size={Math.min(28, cellSize * 0.4)} color={colors.textSecondary} />
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  playerName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: 100,
  },
  playerScore: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MEMORY_GRID_GAP,
  },
  card: {
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
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
