// Fragt den Nutzer nach einer eigenen Geschichte zu einem Foto (Name,
// Anekdote, ...), während im Hintergrund der Rest der Quizrunde vorbereitet
// wird – so wird die sonst tote Ladezeit sinnvoll genutzt. Diese Eingaben
// bilden die Grundlage für persönlichere Quizfragen, die mit der Zeit
// entstehen. Text und Mikro teilen sich eine Eingabezeile (Chat-Stil):
// Mikro-Tap nimmt eine Sprachnachricht auf, die Aufnahme wird danach zur
// Kontrolle angezeigt, statt live transkribiert zu werden (das bräuchte
// Spracherkennung außerhalb von Expo Go).
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { AudioPlayButton } from './AudioPlayButton';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface MemoryPromptProps {
  photoUri: string;
  onSubmit: (memory: { text: string | null; audioUri: string | null }) => void;
  onSkip: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function MemoryPrompt({ photoUri, onSubmit, onSkip }: MemoryPromptProps) {
  const [text, setText] = useState('');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  // Pulsierender roter Punkt während der Aufnahme läuft.
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!recorderState.isRecording) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [recorderState.isRecording, pulseAnim]);

  async function handleStartRecording() {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Mikrofonzugriff benötigt',
        'Um eine Sprachnachricht aufzunehmen, braucht Memo-Me Zugriff auf dein Mikrofon.'
      );
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setRecordedUri(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function handleStopRecording() {
    setRecordedSeconds(Math.floor((recorderState.durationMillis ?? 0) / 1000));
    await recorder.stop();
    setRecordedUri(recorder.uri);
  }

  function handleDiscardRecording() {
    setRecordedUri(null);
  }

  function handleSubmit() {
    if (recordedUri) {
      onSubmit({ text: null, audioUri: recordedUri });
      return;
    }
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit({ text: trimmed, audioUri: null });
      return;
    }
    onSkip();
  }

  const liveDurationSeconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

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

        <View style={styles.composeBar}>
          {recorderState.isRecording ? (
            <>
              <View style={styles.recordingIndicator}>
                <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
                <Text style={styles.recordingTimer}>Aufnahme … {formatDuration(liveDurationSeconds)}</Text>
              </View>
              <Pressable
                style={styles.stopButton}
                onPress={handleStopRecording}
                accessibilityRole="button"
                accessibilityLabel="Aufnahme beenden"
              >
                <Ionicons name="stop" size={18} color={colors.textOnPrimary} />
              </Pressable>
            </>
          ) : recordedUri ? (
            <>
              <Pressable
                style={styles.discardButton}
                onPress={handleDiscardRecording}
                accessibilityRole="button"
                accessibilityLabel="Aufnahme verwerfen"
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
              <View style={styles.playbackArea}>
                <AudioPlayButton uri={recordedUri} label={`Sprachnachricht · ${formatDuration(recordedSeconds)}`} />
              </View>
            </>
          ) : (
            <>
              <TextInput
                style={styles.composeInput}
                placeholder="Erzähl uns etwas …"
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={setText}
                multiline
                accessibilityLabel="Deine Geschichte zu diesem Foto"
              />
              <Pressable
                style={styles.micButton}
                onPress={handleStartRecording}
                accessibilityRole="button"
                accessibilityLabel="Sprachnachricht aufnehmen"
              >
                <Ionicons name="mic" size={20} color={colors.textOnPrimary} />
              </Pressable>
            </>
          )}
        </View>

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
  composeBar: {
    width: '100%',
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  composeInput: {
    ...typography.body,
    flex: 1,
    maxHeight: 100,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingTimer: {
    ...typography.body,
    color: colors.textPrimary,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  discardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackArea: {
    flex: 1,
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
