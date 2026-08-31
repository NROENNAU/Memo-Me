// Willkommens-Bildschirm: erklärt kurz, was die App macht, betont den
// Datenschutz und fragt anschließend die Berechtigung für die Fotomediathek an.
// Aufbau orientiert sich am Mockup (siehe design/mockups/).
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PhotoPermissionStatus } from '../types/permissions';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

// Die drei Datenschutz-Zusagen unter der Illustration.
const PRIVACY_POINTS = [
  { icon: 'lock-closed-outline', text: 'Deine Fotos bleiben auf deinem Gerät' },
  { icon: 'shield-checkmark-outline', text: '100 % privat und sicher' },
  { icon: 'person-outline', text: 'Von dir gesteuert' },
] as const;

interface OnboardingScreenProps {
  // Aktueller Berechtigungsstatus – wird von App.tsx verwaltet, damit es
  // im ganzen Programm nur eine Wahrheit dazu gibt.
  status: PhotoPermissionStatus;
  isLoading: boolean;
  // Löst den System-Dialog aus. Sobald die Berechtigung erteilt ist,
  // wechselt App.tsx automatisch zum Quiz-Bildschirm.
  onRequestPermission: () => Promise<void>;
}

export function OnboardingScreen({
  status,
  isLoading,
  onRequestPermission,
}: OnboardingScreenProps) {
  // Der Nutzer hat den Zugriff abgelehnt – wir zeigen dann einen Hinweis
  // statt einer Sackgasse und bieten den Weg in die Systemeinstellungen an.
  const wasDenied = status === 'denied';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Willkommen bei
        </Text>
        <Text style={[styles.title, styles.titleBrand]}>Memo-Me</Text>

        <Text style={styles.subtitle}>
          Wir machen deine schönsten Momente zu einem interaktiven Quiz.
        </Text>

        {/* Angedeuteter Fotostapel als Illustration – bewusst ohne externe Grafik */}
        <View style={styles.illustration} accessible={false}>
          <View style={[styles.photoCard, styles.photoCardBack]} />
          <View style={[styles.photoCard, styles.photoCardFront]} />
          <View style={styles.questionBadge}>
            <Text style={styles.questionMark}>?</Text>
          </View>
        </View>

        <View style={styles.privacyList}>
          {PRIVACY_POINTS.map((point) => (
            <View key={point.text} style={styles.privacyRow}>
              <Ionicons name={point.icon} size={20} color={colors.textSecondary} />
              <Text style={styles.privacyText}>{point.text}</Text>
            </View>
          ))}
        </View>

        {/* Hinweis nach Ablehnung: erklärt, was fehlt, und bietet einen Ausweg */}
        {wasDenied && (
          <View style={styles.deniedBox}>
            <Text style={styles.deniedTitle}>Ohne Fotozugriff geht es leider nicht</Text>
            <Text style={styles.deniedText}>
              Memo-Me stellt dir Fragen zu deinen eigenen Fotos – dafür braucht die App
              Zugriff auf deine Mediathek. Du kannst den Zugriff jederzeit in den
              Einstellungen deines Geräts erlauben.
            </Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Einstellungen öffnen, um den Fotozugriff zu erlauben"
            >
              <Text style={styles.secondaryButtonText}>Einstellungen öffnen</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={onRequestPermission}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Los geht's – Fotozugriff erlauben"
          accessibilityState={{ disabled: isLoading }}
        >
          <Text style={styles.primaryButtonText}>
            {wasDenied ? 'Erneut versuchen' : "Los geht's"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  titleBrand: {
    color: colors.primary,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  illustration: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  photoCard: {
    position: 'absolute',
    width: 110,
    height: 130,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoCardBack: {
    transform: [{ rotate: '-8deg' }, { translateX: -34 }],
  },
  photoCardFront: {
    transform: [{ rotate: '8deg' }, { translateX: 34 }],
  },
  questionBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMark: {
    ...typography.heading,
    color: colors.primary,
  },
  privacyList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  deniedBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  deniedTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deniedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  secondaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
