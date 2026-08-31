// Foto-Memory-Bildschirm: lädt einen Foto-Pool aus der gewählten Quelle,
// ermittelt daraus die größtmögliche quadratische Rastergröße (siehe
// memoryGameService) und lässt 1 oder 2 Spieler das Spielfeld lösen
// (siehe PhotoMemoryBoard für die eigentliche Spiellogik).
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MEMORY_GRID_GAP, MemoryGameResult, PhotoMemoryBoard } from '../components/PhotoMemoryBoard';
import { buildMemoryCards, chooseMemoryGridSize, fetchMemoryPhotoPool, MemoryCardItem } from '../services/memoryGameService';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, typography, MIN_TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryGame'>;

const BOARD_HORIZONTAL_PADDING = spacing.lg * 2;

export function MemoryGameScreen({ route, navigation }: Props) {
  const { source, players } = route.params;
  const { width } = useWindowDimensions();
  const [cards, setCards] = useState<MemoryCardItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MemoryGameResult | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const loadGame = useCallback(async () => {
    setCards(null);
    setErrorMessage(null);
    setResult(null);

    try {
      const photoPool = await fetchMemoryPhotoPool(source);
      const availableWidth = width - BOARD_HORIZONTAL_PADDING;
      const gridSize = chooseMemoryGridSize(availableWidth, MEMORY_GRID_GAP, photoPool.length);

      if (gridSize === null) {
        setErrorMessage('Für Memory werden mindestens 2 unterschiedliche Fotos in dieser Quelle benötigt.');
        return;
      }

      setCards(buildMemoryCards(photoPool, gridSize));
    } catch (error) {
      console.error('Memory-Spielfeld konnte nicht geladen werden:', error);
      setErrorMessage('Deine Fotos konnten nicht geladen werden.');
    }
  }, [source, width]);

  useEffect(() => {
    loadGame();
  }, [loadGame, gameKey]);

  function handleRestart() {
    setGameKey((key) => key + 1);
  }

  // Ganz beenden: zurück zur Fotoquellen-Auswahl.
  function handleExit() {
    navigation.replace('PhotoSource');
  }

  // Nur das Spiel wechseln: dieselbe Fotoquelle behalten, zurück zur
  // Spielauswahl (dort lässt sich z. B. auch die Spieleranzahl neu wählen).
  function handleChangeGame() {
    navigation.replace('GameSelection', { source });
  }

  const isMultiplayer = players.length > 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {!cards && !errorMessage && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>Dein Memory wird vorbereitet …</Text>
          </>
        )}

        {errorMessage && (
          <>
            <Text style={styles.statusText}>{errorMessage}</Text>
            <Pressable style={styles.secondaryButton} onPress={handleExit} accessibilityRole="button" accessibilityLabel="Zurück zur Fotoquellen-Auswahl">
              <Text style={styles.secondaryButtonText}>Zurück</Text>
            </Pressable>
          </>
        )}

        {cards && !result && (
          <PhotoMemoryBoard key={gameKey} cards={cards} players={players} onFinished={setResult} />
        )}

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.heading}>
              {isMultiplayer
                ? result.winnerIndex !== null
                  ? `${players[result.winnerIndex].name} gewinnt!`
                  : 'Unentschieden!'
                : 'Geschafft!'}
            </Text>
            <View style={styles.resultScoreRow}>
              {players.map((player, index) => (
                <Text key={player.name + index} style={styles.resultScoreText}>
                  {player.name}: {result.scores[index]} {result.scores[index] === 1 ? 'Paar' : 'Paare'}
                </Text>
              ))}
            </View>
            {!isMultiplayer && (
              <Text style={styles.statusText}>
                {Math.round(result.elapsedMs / 1000)}s, {result.mismatchCount}{' '}
                {result.mismatchCount === 1 ? 'Fehlversuch' : 'Fehlversuche'}
              </Text>
            )}
            <Pressable style={styles.restartButton} onPress={handleRestart} accessibilityRole="button" accessibilityLabel="Nochmal spielen">
              <Text style={styles.restartButtonText}>Nochmal spielen</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleChangeGame} accessibilityRole="button" accessibilityLabel="Anderes Spiel starten">
              <Text style={styles.secondaryButtonText}>Anderes Spiel starten</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        style={styles.exitButton}
        onPress={handleExit}
        accessibilityRole="button"
        accessibilityLabel="Spiel beenden"
        hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.md, right: spacing.md }}
      >
        <Ionicons name="close" size={20} color={colors.textPrimary} />
        <Text style={styles.exitButtonText}>Beenden</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  resultBox: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resultScoreRow: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  resultScoreText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  restartButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
  },
  restartButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  secondaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  exitButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    zIndex: 20,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exitButtonText: {
    ...typography.button,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
