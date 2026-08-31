// Kleiner Abspiel-Button für eine aufgenommene Sprachnachricht. Wird sowohl
// direkt nach der Aufnahme (Vorschau) als auch beim späteren Erinnern an
// eine gespeicherte Sprachnachricht verwendet.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface AudioPlayButtonProps {
  uri: string;
  label?: string;
}

export function AudioPlayButton({ uri, label = 'Sprachnachricht anhören' }: AudioPlayButtonProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  function handlePress() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || status.currentTime >= status.duration) {
      player.seekTo(0);
    }
    player.play();
  }

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Wiedergabe pausieren' : label}
    >
      <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.primary} />
      <Text style={styles.label}>{status.playing ? 'Wird abgespielt …' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  label: {
    ...typography.button,
    fontSize: 15,
    color: colors.primary,
  },
});
