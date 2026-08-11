// Fragt den Nutzer nach eigenen Geschichte zu einem Foto (Name, Anekdote,
// ...), während im Hintergrund der Rest der Quizrunde vorbereitet wird –
// so wird die sonst tote Ladezeit sinnvoll genutzt. Diese Eingaben bilden die
// Grundlage für persönlichere Quizfragen, die mit der Zeit entstehen.
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
import { Image } from 'expo-image';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface MemoryPromptProps {
  photoUri: string;
  onSubmit: (text: string) => void;
  onSkip: () => void;
}

export function MemoryPrompt({ photoUri, onSubmit, onSkip }: MemoryPromptProps) {
  const [text, setText] = useState('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) {
      onSkip();
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Dein Quiz wird vorbereitet …</Text>
        <Text style={styles.subtitle}>
          Erzähl uns in der Zwischenzeit kurz etwas zu diesem Foto – ein Name, eine kleine
          Geschichte. Das nutzen wir für spannendere Fragen.
        </Text>

        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          contentFit="cover"
          accessibilityLabel="Dein Foto"
        />

        <TextInput
          style={styles.input}
          placeholder="z. B. „Das ist Lisa am Strand von Amalfi“"
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          accessibilityLabel="Deine Geschichte zu diesem Foto"
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.skipButton}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Überspringen"
          >
            <Text style={styles.skipButtonText}>Überspringen</Text>
          </Pressable>
          <Pressable
            style={styles.saveButton}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Speichern und weiter zum Quiz"
          >
            <Text style={styles.saveButtonText}>Speichern & weiter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  input: {
    ...typography.body,
    width: '100%',
    minHeight: 72,
    maxHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
