// Zwischenschritt nach der Fotoquellen-Auswahl: welches Spiel gespielt wird
// (aktuell nur Memory, weitere Kacheln kommen später dazu) und mit wie
// vielen Spielern - 1 Spieler löst allein, 2 Spieler spielen abwechselnd
// gegeneinander, jeweils mit eigenem Namen für die Punkteanzeige im Spiel.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GameId, MemoryPlayer } from '../types/games';
import { RootStackParamList } from '../types/navigation';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GameSelection'>;

interface GameOption {
  id: GameId;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

// Weitere Spiele werden hier einfach als zusätzlicher Eintrag ergänzt.
const GAMES: GameOption[] = [{ id: 'memory', title: 'Memory', icon: 'grid-outline' }];

type PlayerCount = 1 | 2;

export function GameSelectionScreen({ route, navigation }: Props) {
  const { source } = route.params;
  const [selectedGame, setSelectedGame] = useState<GameId>(GAMES[0].id);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(1);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  function handleStart() {
    const players: MemoryPlayer[] = [{ name: player1Name.trim() || 'Spieler 1' }];
    if (playerCount === 2) {
      players.push({ name: player2Name.trim() || 'Spieler 2' });
    }

    if (selectedGame === 'memory') {
      navigation.navigate('MemoryGame', { source, players });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Zurück zur Fotoquellen-Auswahl"
              hitSlop={spacing.sm}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              Welches Spiel?
            </Text>
            <View style={styles.titleSpacer} />
          </View>

          <View style={styles.gameGrid}>
            {GAMES.map((game) => {
              const isSelected = game.id === selectedGame;
              return (
                <Pressable
                  key={game.id}
                  style={[styles.gameTile, isSelected && styles.gameTileSelected]}
                  onPress={() => setSelectedGame(game.id)}
                  accessibilityRole="button"
                  accessibilityLabel={game.title}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                    <Ionicons name={game.icon} size={28} color={isSelected ? colors.textOnPrimary : colors.primary} />
                  </View>
                  <Text style={styles.gameTileTitle}>{game.title}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.playerSection}>
            <Text style={styles.sectionLabel}>Spieleranzahl</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segment, playerCount === 1 && styles.segmentActive]}
                onPress={() => setPlayerCount(1)}
                accessibilityRole="button"
                accessibilityLabel="1 Spieler"
                accessibilityState={{ selected: playerCount === 1 }}
              >
                <Text style={[styles.segmentText, playerCount === 1 && styles.segmentTextActive]}>1 Spieler</Text>
              </Pressable>
              <Pressable
                style={[styles.segment, playerCount === 2 && styles.segmentActive]}
                onPress={() => setPlayerCount(2)}
                accessibilityRole="button"
                accessibilityLabel="2 Spieler"
                accessibilityState={{ selected: playerCount === 2 }}
              >
                <Text style={[styles.segmentText, playerCount === 2 && styles.segmentTextActive]}>2 Spieler</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Spieler 1"
              placeholderTextColor={colors.textSecondary}
              value={player1Name}
              onChangeText={setPlayer1Name}
              accessibilityLabel="Name von Spieler 1"
              returnKeyType="done"
            />
            {playerCount === 2 && (
              <TextInput
                style={styles.input}
                placeholder="Spieler 2"
                placeholderTextColor={colors.textSecondary}
                value={player2Name}
                onChangeText={setPlayer2Name}
                accessibilityLabel="Name von Spieler 2"
                returnKeyType="done"
              />
            )}
          </View>

          <Pressable
            style={styles.startButton}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Spiel starten"
          >
            <Text style={styles.startButtonText}>Spiel starten</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    fontSize: 24,
    color: colors.textPrimary,
  },
  titleSpacer: {
    width: 24,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gameTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  gameTileSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  gameTileTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  playerSection: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs / 2,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.button,
    fontSize: 15,
    color: colors.textPrimary,
  },
  segmentTextActive: {
    color: colors.textOnPrimary,
  },
  input: {
    ...typography.body,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
  },
  startButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  startButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
