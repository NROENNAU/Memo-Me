// Einstellungen-Bildschirm: aktuell nur Spitzname und Profilbild. Beides
// bleibt komplett lokal auf dem Gerät (SQLite), es gibt keinen Cloud-Sync.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getProfile, saveProfile } from '../db/profileRepository';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const AVATAR_SIZE = 120;
// In diesen Schritten lässt sich der Timer verstellen, von 0 (aus) bis 60s.
const TIMER_STEP_SECONDS = 5;
const MAX_TIMER_SECONDS = 60;

export function SettingsScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let isActive = true;
    getProfile().then((profile) => {
      if (!isActive) return;
      setNickname(profile.nickname ?? '');
      setAvatarUri(profile.avatarUri);
      setTimerSeconds(profile.timerSeconds);
      setIsLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, []);

  function handleAdjustTimer(delta: number) {
    setTimerSeconds((previous) => Math.max(0, Math.min(MAX_TIMER_SECONDS, previous + delta)));
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Zugriff benötigt',
        'Um ein Profilbild auszuwählen, braucht Memo-Me Zugriff auf deine Fotos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    try {
      await saveProfile({ nickname: nickname.trim() || null, avatarUri, timerSeconds });
      navigation.goBack();
    } catch (error) {
      console.error('Profil konnte nicht gespeichert werden:', error);
      Alert.alert('Fehler', 'Deine Einstellungen konnten nicht gespeichert werden.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          hitSlop={spacing.sm}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <View style={styles.content}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            accessibilityRole="button"
            accessibilityLabel="Profilbild auswählen"
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera-outline" size={16} color={colors.textOnPrimary} />
            </View>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>Spitzname</Text>
            <TextInput
              style={styles.input}
              placeholder="Wie sollen wir dich nennen?"
              placeholderTextColor={colors.textSecondary}
              value={nickname}
              onChangeText={setNickname}
              accessibilityLabel="Dein Spitzname"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Zeit pro Quizfrage</Text>
            <View style={styles.timerRow}>
              <Pressable
                style={styles.timerButton}
                onPress={() => handleAdjustTimer(-TIMER_STEP_SECONDS)}
                accessibilityRole="button"
                accessibilityLabel="Timer verkürzen"
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.timerValue}>{timerSeconds === 0 ? 'Aus' : `${timerSeconds}s`}</Text>
              <Pressable
                style={styles.timerButton}
                onPress={() => handleAdjustTimer(TIMER_STEP_SECONDS)}
                accessibilityRole="button"
                accessibilityLabel="Timer verlängern"
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Einstellungen speichern"
          >
            <Text style={styles.saveButtonText}>Speichern</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 26,
  },
  loading: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  avatarWrapper: {
    marginTop: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.background,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  field: {
    width: '100%',
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    width: '100%',
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  timerButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerValue: {
    ...typography.heading,
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
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
