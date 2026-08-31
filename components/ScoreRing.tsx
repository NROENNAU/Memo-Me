// Kreisdiagramm für das Quizergebnis (z. B. "4/5 richtig"), Stil-Vorbild:
// der Ergebnis-Screen aus den Mockups.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

interface ScoreRingProps {
  correct: number;
  total: number;
  size?: number;
}

const STROKE_WIDTH = 14;

export function ScoreRing({ correct, total, size = 180 }: ScoreRingProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? correct / total : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.success}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // Ring soll bei 12 Uhr beginnen statt bei 3 Uhr.
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.centerContent]}>
        <Text style={styles.scoreText} accessibilityLabel={`${correct} von ${total} richtig beantwortet`}>
          {correct}/{total}
        </Text>
        <Text style={styles.scoreLabel}>richtig</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.title,
    color: colors.textPrimary,
  },
  scoreLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
