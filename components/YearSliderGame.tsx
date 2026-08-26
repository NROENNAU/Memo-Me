// Jahres-Regler: das Aufnahmejahr per Schieberegler statt per
// Multiple-Choice schätzen - fühlt sich spielerischer an. Eigener,
// PanResponder-basierter Regler statt einer nativen Slider-Bibliothek,
// damit dafür kein zusätzliches natives Modul (und kein neuer Build) nötig ist.
import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface YearSliderGameProps {
  minYear: number;
  maxYear: number;
  correctYear: number;
  onSubmit: (guessedYear: number, isCorrect: boolean) => void;
  disabled?: boolean;
}

const THUMB_SIZE = 28;

export function YearSliderGame({ minYear, maxYear, correctYear, onSubmit, disabled = false }: YearSliderGameProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [guessYear, setGuessYear] = useState(Math.round((minYear + maxYear) / 2));
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View>(null);

  const isRevealed = disabled || hasSubmitted;
  const yearSpan = maxYear - minYear;

  function yearFromOffset(offsetX: number): number {
    if (trackWidth <= 0 || yearSpan <= 0) return guessYear;
    const fraction = Math.min(1, Math.max(0, offsetX / trackWidth));
    return Math.round(minYear + fraction * yearSpan);
  }

  function xFromYear(year: number): number {
    if (trackWidth <= 0 || yearSpan <= 0) return 0;
    return ((year - minYear) / yearSpan) * trackWidth;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRevealed,
      onMoveShouldSetPanResponder: () => !isRevealed,
      onPanResponderGrant: (_, gestureState) => {
        setGuessYear(yearFromOffset(gestureState.x0 - trackPageXRef.current));
      },
      onPanResponderMove: (_, gestureState) => {
        setGuessYear(yearFromOffset(gestureState.moveX - trackPageXRef.current));
      },
      onPanResponderRelease: () => {
        setHasSubmitted(true);
        setGuessYear((currentGuess) => {
          onSubmit(currentGuess, currentGuess === correctYear);
          return currentGuess;
        });
      },
    })
  ).current;

  function handleLayout() {
    setTrackWidth(0);
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      setTrackWidth(width);
      trackPageXRef.current = pageX;
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.yearLabel}>{guessYear}</Text>
      <View ref={trackRef} style={styles.track} onLayout={handleLayout} {...panResponder.panHandlers}>
        <View style={styles.trackLine} />
        {isRevealed && (
          <View style={[styles.correctMarker, { left: xFromYear(correctYear) - 2 }]} />
        )}
        <View
          style={[
            styles.thumb,
            { left: xFromYear(guessYear) - THUMB_SIZE / 2 },
            isRevealed && (guessYear === correctYear ? styles.thumbCorrect : styles.thumbWrong),
          ]}
        />
      </View>
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabelText}>{minYear}</Text>
        <Text style={styles.rangeLabelText}>{maxYear}</Text>
      </View>
      {isRevealed && (
        <Text style={styles.resultText}>
          {guessYear === correctYear ? 'Genau richtig!' : `Richtig gewesen wäre ${correctYear}.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  yearLabel: {
    ...typography.heading,
    fontSize: 40,
    color: colors.primary,
  },
  track: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
  },
  trackLine: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  thumbCorrect: {
    backgroundColor: colors.success,
  },
  thumbWrong: {
    backgroundColor: colors.danger,
  },
  correctMarker: {
    position: 'absolute',
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  rangeLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resultText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
