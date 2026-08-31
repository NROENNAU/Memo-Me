// Foto-Puzzle: das Bild wird in gridSize x gridSize Teile zerlegt und
// gemischt. Tippt der Nutzer zwei Teile nacheinander an, tauschen sie ihre
// Position - sobald alle Teile wieder an ihrem ursprünglichen Platz sind,
// ist das Puzzle gelöst. Jedes Teil zeigt dasselbe Foto in Originalgröße,
// nur um den passenden Versatz verschoben und per overflow:hidden
// zugeschnitten (kein natives Zuschneiden nötig).
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '../theme';

interface PuzzleGameProps {
  photoUri: string;
  gridSize: number;
  // moveCount = Anzahl der getauschten Teile-Paare bis zur Lösung, Grundlage
  // für den Versuche-Bonus der Punkteberechnung (siehe PhotoSwipeScreen).
  onSolved: (moveCount: number) => void;
  // Von außen erzwungenes Sperren (z. B. weil der Timer abgelaufen ist),
  // auch wenn das Puzzle noch nicht gelöst ist.
  disabled?: boolean;
}

function createShuffledOrder(pieceCount: number): number[] {
  const identity = Array.from({ length: pieceCount }, (_, index) => index);
  let shuffled = identity;
  // Neu mischen, falls durch Zufall die bereits gelöste Reihenfolge herauskommt.
  do {
    shuffled = [...identity];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  } while (shuffled.every((value, index) => value === index));
  return shuffled;
}

export function PuzzleGame({ photoUri, gridSize, onSolved, disabled = false }: PuzzleGameProps) {
  const pieceCount = gridSize * gridSize;
  const [order, setOrder] = useState<number[]>(() => createShuffledOrder(pieceCount));
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setContainerSize(event.nativeEvent.layout.width);
  }

  function handleTilePress(position: number) {
    if (isSolved || disabled) return;

    if (selectedPosition === null) {
      setSelectedPosition(position);
      return;
    }
    if (selectedPosition === position) {
      setSelectedPosition(null);
      return;
    }

    const nextOrder = [...order];
    [nextOrder[selectedPosition], nextOrder[position]] = [nextOrder[position], nextOrder[selectedPosition]];
    setOrder(nextOrder);
    setSelectedPosition(null);
    const nextMoveCount = moveCount + 1;
    setMoveCount(nextMoveCount);

    if (nextOrder.every((value, index) => value === index)) {
      setIsSolved(true);
      onSolved(nextMoveCount);
    }
  }

  const pieceSize = containerSize > 0 ? containerSize / gridSize : 0;
  // Läuft die Zeit ab, bevor das Puzzle gelöst ist, wird statt der
  // durcheinandergewürfelten Teile das fertige Foto gezeigt - sonst bliebe
  // für den Nutzer unklar, wie es hätte aussehen sollen.
  const showSolution = disabled && !isSolved;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {showSolution ? (
        <Image source={{ uri: photoUri }} style={styles.solutionImage} contentFit="cover" />
      ) : (
        containerSize > 0 &&
        order.map((pieceIndex, position) => {
          const positionRow = Math.floor(position / gridSize);
          const positionCol = position % gridSize;
          const pieceRow = Math.floor(pieceIndex / gridSize);
          const pieceCol = pieceIndex % gridSize;

          return (
            <Pressable
              key={position}
              style={[
                styles.tile,
                {
                  width: pieceSize,
                  height: pieceSize,
                  left: positionCol * pieceSize,
                  top: positionRow * pieceSize,
                },
                selectedPosition === position && styles.tileSelected,
              ]}
              onPress={() => handleTilePress(position)}
              disabled={isSolved || disabled}
              accessibilityRole="button"
              accessibilityLabel={`Puzzleteil an Position ${position + 1}`}
            >
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: containerSize,
                  height: containerSize,
                  position: 'absolute',
                  left: -pieceCol * pieceSize,
                  top: -pieceRow * pieceSize,
                }}
                contentFit="cover"
              />
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  tile: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.surface,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  solutionImage: {
    width: '100%',
    height: '100%',
  },
});
