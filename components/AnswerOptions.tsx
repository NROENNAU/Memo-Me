// Liste antippbarer Antwort-Optionen für eine Multiple-Choice-Quizfrage.
// Bewusst generisch über string-Labels gehalten, damit dieselbe Komponente
// später auch für die Wo- und Wer-Frage wiederverwendet werden kann.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../theme';

interface AnswerOptionsProps {
  options: string[];
  selectedOption: string | null;
  correctOption: string;
  // Nach dem Bestätigen wird die richtige Antwort grün und eine falsch
  // gewählte Antwort rot hervorgehoben.
  isRevealed: boolean;
  onSelect: (option: string) => void;
}

export function AnswerOptions({
  options,
  selectedOption,
  correctOption,
  isRevealed,
  onSelect,
}: AnswerOptionsProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option === selectedOption;
        const isCorrectOption = option === correctOption;
        const isWrongSelected = isRevealed && isSelected && !isCorrectOption;
        const isCorrectRevealed = isRevealed && isCorrectOption;

        return (
          <Pressable
            key={option}
            style={[
              styles.option,
              isSelected && !isRevealed && styles.selectedOption,
              isCorrectRevealed && styles.correctOption,
              isWrongSelected && styles.wrongOption,
            ]}
            onPress={() => onSelect(option)}
            disabled={isRevealed}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option}
            hitSlop={spacing.xs}
          >
            <Text
              style={[
                styles.optionText,
                isSelected && !isRevealed && styles.selectedOptionText,
                isCorrectRevealed && styles.correctOptionText,
                isWrongSelected && styles.wrongOptionText,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {option}
              {isRevealed && isCorrectOption ? ' ✓' : ''}
              {isRevealed && isSelected && !isCorrectOption ? ' ✗' : ''}
            </Text>
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
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  optionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectedOptionText: {
    color: colors.primaryDark,
  },
  correctOption: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  correctOptionText: {
    color: colors.textOnPrimary,
  },
  wrongOption: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },
  wrongOptionText: {
    color: colors.textOnPrimary,
  },
});
