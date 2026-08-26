// Ersetzt nach dem Beantworten die Frage-Überschrift: Favorisieren, Löschen
// oder zu einem Album hinzufügen, bevor per Wisch-Geste zum nächsten Foto
// gegangen wird.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface PhotoActionsProps {
  onDelete: () => void;
  onAddToAlbum: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  // Name des Albums, falls das Foto schon einem zugeordnet ist – ersetzt
  // dann die Beschriftung "Zu Album".
  albumLabel?: string | null;
}

export function PhotoActions({ onDelete, onAddToAlbum, onToggleFavorite, isFavorite, albumLabel }: PhotoActionsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.button}
        onPress={onToggleFavorite}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Als Favorit markieren'}
        hitSlop={spacing.sm}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={colors.favorite} />
        <Text style={[styles.buttonLabel, styles.favoriteLabel]}>Favorit</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Foto löschen"
        hitSlop={spacing.sm}
      >
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
        <Text style={[styles.buttonLabel, styles.deleteLabel]}>Löschen</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.albumButton]}
        onPress={onAddToAlbum}
        accessibilityRole="button"
        accessibilityLabel={albumLabel ? `Album: ${albumLabel}, zum Umsortieren antippen` : 'Zu Album hinzufügen'}
        hitSlop={spacing.sm}
      >
        <Ionicons name="albums-outline" size={22} color={colors.primary} />
        <Text style={styles.buttonLabel} numberOfLines={1}>
          {albumLabel ?? 'Zu Album'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  albumButton: {
    flexShrink: 1,
    maxWidth: '60%',
  },
  buttonLabel: {
    ...typography.button,
    fontSize: 15,
    color: colors.primary,
  },
  deleteLabel: {
    color: colors.danger,
  },
  favoriteLabel: {
    color: colors.favorite,
  },
});
