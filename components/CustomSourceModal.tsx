// Popup für die "Eigene Auswahl"-Quelle: Nutzer beschreibt in eigenen
// Worten, was für Fotos im Quiz vorkommen sollen. Vorerst nur Texteingabe -
// eine Spracheingabe bräuchte echte on-device Spracherkennung (wie die
// Bildklassifikation ein eigenes natives Modul), das kommt in einem
// späteren Schritt.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface CustomSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
}

export function CustomSourceModal({ visible, onClose, onSubmit }: CustomSourceModalProps) {
  const [description, setDescription] = useState('');

  function handleSubmit() {
    const trimmed = description.trim();
    if (!trimmed) return;
    setDescription('');
    onSubmit(trimmed);
  }

  function handleClose() {
    setDescription('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Eigene Auswahl</Text>
          <Text style={styles.subtitle}>
            Beschreibe, was für Fotos du im Quiz sehen möchtest - z. B. "Fotos von meinem Hund" oder
            "Strandfotos".
          </Text>

          <TextInput
            style={styles.input}
            placeholder="z. B. Fotos von meinem Hund"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            autoFocus
            accessibilityLabel="Beschreibung der gewünschten Fotos"
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Abbrechen"
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.startButton, !description.trim() && styles.startButtonDisabled]}
              onPress={handleSubmit}
              disabled={!description.trim()}
              accessibilityRole="button"
              accessibilityLabel="Quiz mit dieser Beschreibung starten"
            >
              <Text style={styles.startButtonText}>Quiz starten</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    ...typography.body,
    minHeight: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  startButton: {
    flex: 2,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
