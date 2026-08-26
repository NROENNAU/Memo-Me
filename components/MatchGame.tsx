// Zuordnungs-Frage: mehrere Fotos und die dazugehörigen Namen werden
// gleichzeitig gezeigt (jeweils separat gemischt) - erst ein Foto antippen,
// dann einen Namen, um sie zu verbinden. Ein bereits verbundenes Foto lässt
// sich durch erneutes Antippen wieder lösen (Korrektur, wie bei der
// früheren Zeitleiste). Ausgewertet wird automatisch, sobald jedes Foto
// einen Namen zugewiesen bekommen hat.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MatchPair, shuffle } from '../services/quizService';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../theme';

interface MatchGameProps {
  pairs: MatchPair[];
  onComplete: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export function MatchGame({ pairs, onComplete, disabled = false }: MatchGameProps) {
  const photos = useMemo(() => shuffle(pairs), [pairs]);
  const names = useMemo(() => shuffle(pairs.map((pair) => pair.name)), [pairs]);

  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const hasCompletedRef = useRef(false);

  const isComplete = Object.keys(assignments).length === pairs.length;
  const isRevealed = disabled || isComplete;

  useEffect(() => {
    if (isRevealed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      const isCorrect = pairs.every((pair) => assignments[pair.uri] === pair.name);
      onComplete(isCorrect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealed]);

  function handlePhotoPress(uri: string) {
    if (isRevealed) return;
    if (assignments[uri]) {
      // Erneutes Antippen einer bereits verbundenen Karte löst die
      // Verbindung wieder - so lässt sich ein Fehltipp korrigieren.
      setAssignments((previous) => {
        const next = { ...previous };
        delete next[uri];
        return next;
      });
      return;
    }
    setSelectedPhotoUri((previous) => (previous === uri ? null : uri));
  }

  function handleNamePress(name: string) {
    if (isRevealed || !selectedPhotoUri) return;
    const isNameUsed = Object.values(assignments).includes(name);
    if (isNameUsed) return;

    setAssignments((previous) => ({ ...previous, [selectedPhotoUri]: name }));
    setSelectedPhotoUri(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {isRevealed
          ? 'Richtige Zuordnung:'
          : 'Tippe ein Foto an, dann den passenden Namen, um sie zu verbinden.'}
      </Text>

      <View style={styles.photoGrid}>
        {photos.map((pair) => {
          const assignedName = assignments[pair.uri];
          const isSelected = selectedPhotoUri === pair.uri;
          const isCorrectAssignment = isRevealed && assignedName === pair.name;
          const isWrongAssignment = isRevealed && !!assignedName && assignedName !== pair.name;

          return (
            <Pressable
              key={pair.uri}
              style={[
                styles.photoCard,
                isSelected && styles.photoCardSelected,
                isCorrectAssignment && styles.photoCardCorrect,
                isWrongAssignment && styles.photoCardWrong,
              ]}
              onPress={() => handlePhotoPress(pair.uri)}
              disabled={isRevealed}
              accessibilityRole="button"
              accessibilityLabel={assignedName ? `Foto, zugeordnet zu ${assignedName}` : 'Foto, noch nicht zugeordnet'}
            >
              <Image source={{ uri: pair.uri }} style={styles.photoImage} contentFit="cover" />
              <View style={styles.assignmentBadge}>
                <Text style={styles.assignmentBadgeText} numberOfLines={1}>
                  {assignedName ?? '?'}
                </Text>
              </View>
              {isWrongAssignment && (
                <View style={styles.correctLabelBadge}>
                  <Text style={styles.correctLabelText} numberOfLines={1}>
                    {pair.name}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.nameRow}>
        {names.map((name) => {
          const isUsed = Object.values(assignments).includes(name);
          return (
            <Pressable
              key={name}
              style={[styles.nameChip, isUsed && styles.nameChipUsed]}
              onPress={() => handleNamePress(name)}
              disabled={isRevealed || isUsed}
              accessibilityRole="button"
              accessibilityLabel={name}
            >
              <Text style={[styles.nameChipText, isUsed && styles.nameChipTextUsed]}>{name}</Text>
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  photoCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  photoCardSelected: {
    borderColor: colors.primary,
  },
  photoCardCorrect: {
    borderColor: colors.success,
  },
  photoCardWrong: {
    borderColor: colors.danger,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  assignmentBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,26,46,0.72)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  assignmentBadgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  correctLabelBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  correctLabelText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  nameChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nameChipUsed: {
    opacity: 0.4,
  },
  nameChipText: {
    ...typography.button,
    fontSize: 15,
    color: colors.textPrimary,
  },
  nameChipTextUsed: {
    color: colors.textSecondary,
  },
});
