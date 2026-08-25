// Quadratische Kachel mit Vorschaubild für eine Quiz-Fotoquelle (Erinnerungsdeck-
// Startbildschirm) - angelehnt an die Bibliotheks-Ansicht der Apple Fotos-App,
// aber kompakter: Titel und Anzahl liegen direkt auf dem Vorschaubild.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, typography } from '../theme';

interface SourceTileProps {
  title: string;
  subtitle?: string;
  coverUri: string | null;
  onPress: () => void;
}

export function SourceTile({ title, subtitle, coverUri, onPress }: SourceTileProps) {
  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      <View style={styles.scrim} />
      <View style={styles.labelContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  placeholder: {
    backgroundColor: colors.border,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(26,26,46,0.55)',
  },
  labelContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
});
