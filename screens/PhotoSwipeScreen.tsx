// Quiz-Bildschirm. Aktueller Stand: zeigt das neueste Foto aus der Mediathek
// zusammen mit den ausgelesenen Metadaten (Aufnahmedatum, Ort).
// Damit ist bewiesen, dass wir an Fotos UND deren Daten herankommen –
// die eigentliche Quiz-Logik (Wann/Wo/Wer, Swipe-Gesten) folgt im nächsten Schritt.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ActionBar } from '../components/ActionBar';
import { getRecentPhotos } from '../services/mediaLibraryService';
import { LibraryPhoto } from '../types/Photo';
import { colors, spacing, radius, typography } from '../theme';

// Wandelt einen Zeitstempel in ein gut lesbares deutsches Datum um.
function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'Kein Aufnahmedatum hinterlegt';
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Zeigt die Koordinaten an, solange wir daraus noch keinen Ortsnamen machen.
function formatLocation(photo: LibraryPhoto): string {
  if (!photo.coordinates) return 'Kein Ort hinterlegt';
  const { latitude, longitude } = photo.coordinates;
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function PhotoSwipeScreen() {
  const [photo, setPhoto] = useState<LibraryPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Beim Öffnen des Bildschirms das neueste Foto laden.
  useEffect(() => {
    let isActive = true;

    getRecentPhotos(1)
      .then((photos) => {
        if (!isActive) return;
        setPhoto(photos[0] ?? null);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Fotos konnten nicht geladen werden:', error);
        setErrorMessage('Deine Fotos konnten nicht geladen werden.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    // Verhindert Zustandsänderungen, wenn der Bildschirm zwischenzeitlich verlassen wurde.
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {isLoading && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>Fotos werden geladen …</Text>
          </>
        )}

        {!isLoading && errorMessage && <Text style={styles.statusText}>{errorMessage}</Text>}

        {!isLoading && !errorMessage && !photo && (
          <Text style={styles.statusText}>
            In deiner Mediathek wurden keine Fotos gefunden.
          </Text>
        )}

        {!isLoading && photo && (
          <>
            <Image
              source={{ uri: photo.uri }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel="Ein Foto aus deiner Mediathek"
            />
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Aufgenommen am</Text>
              <Text style={styles.metaValue}>{formatDate(photo.creationTime)}</Text>
              <Text style={styles.metaLabel}>Ort</Text>
              <Text style={styles.metaValue}>{formatLocation(photo)}</Text>
            </View>
          </>
        )}
      </View>
      <ActionBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  metaBox: {
    width: '100%',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
