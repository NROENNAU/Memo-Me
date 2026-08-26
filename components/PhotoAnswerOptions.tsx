// Wie AnswerOptions, aber die Optionen sind Fotos zum Antippen statt Text -
// für Fragen wie "Welches Foto ist das älteste?" oder "Welches Foto ist aus
// Barcelona?".
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

interface PhotoAnswerOptionsProps {
  options: string[];
  selectedOption: string | null;
  correctOption: string;
  isRevealed: boolean;
  onSelect: (option: string) => void;
}

export function PhotoAnswerOptions({
  options,
  selectedOption,
  correctOption,
  isRevealed,
  onSelect,
}: PhotoAnswerOptionsProps) {
  return (
    <View style={styles.container}>
      {options.map((uri) => {
        const isSelected = uri === selectedOption;
        const isCorrectOption = uri === correctOption;
        const isWrongSelected = isRevealed && isSelected && !isCorrectOption;
        const isCorrectRevealed = isRevealed && isCorrectOption;

        return (
          <Pressable
            key={uri}
            style={[
              styles.option,
              isSelected && !isRevealed && styles.selectedOption,
              isCorrectRevealed && styles.correctOption,
              isWrongSelected && styles.wrongOption,
            ]}
            onPress={() => onSelect(uri)}
            disabled={isRevealed}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel="Foto auswählen"
          >
            <Image source={{ uri }} style={styles.image} contentFit="cover" />
            {(isCorrectRevealed || isWrongSelected) && (
              <View style={styles.badge}>
                <Ionicons
                  name={isCorrectRevealed ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={isCorrectRevealed ? colors.success : colors.danger}
                />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  selectedOption: {
    borderColor: colors.primary,
  },
  correctOption: {
    borderColor: colors.success,
  },
  wrongOption: {
    borderColor: colors.danger,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
});
