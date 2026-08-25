// Erinnerungsdeck: der Home-Screen der App, zu dem man immer zurückkehrt.
// Zeigt die verfügbaren Foto-Quellen als quadratische Kacheln - angelehnt an
// die Bibliotheks-Ansicht der Apple Fotos-App, aber kompakt gehalten. Nutzt
// bewusst feste Icons statt echter Vorschaubilder (siehe SourceTile) - die
// kommen in einem späteren, performanteren Anlauf. Eine Quelle muss aktiv
// gewählt werden, um ins Quiz zu starten.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { countPhotosForSource } from '../services/mediaLibraryService';
import { SourceTile } from '../components/SourceTile';
import { AlbumSourceModal } from '../components/AlbumSourceModal';
import { CustomSourceModal } from '../components/CustomSourceModal';
import { PhotoSource } from '../types/PhotoSource';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSource'>;

interface Counts {
  recent: number;
  lastYear: number;
}

export function PhotoSourceScreen({ navigation }: Props) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    Promise.all([countPhotosForSource({ type: 'recent' }), countPhotosForSource({ type: 'lastYear' })])
      .then(([recent, lastYear]) => {
        if (isActive) setCounts({ recent, lastYear });
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Erinnerungsdeck konnte nicht geladen werden:', error);
        setErrorMessage('Deine Fotoquellen konnten nicht geladen werden.');
      });

    return () => {
      isActive = false;
    };
  }, []);

  function selectSource(source: PhotoSource) {
    navigation.replace('PhotoSwipe', { source });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Dein Erinnerungsdeck
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Einstellungen öffnen"
            hitSlop={spacing.sm}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {errorMessage && <Text style={styles.statusText}>{errorMessage}</Text>}

        {!errorMessage && !counts && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}

        {!errorMessage && counts && (
          <View style={styles.grid}>
            <SourceTile
              title="Letzte Fotos"
              subtitle={`${counts.recent} verfügbar`}
              icon="time-outline"
              onPress={() => selectSource({ type: 'recent' })}
            />
            <SourceTile
              title="Letztes Jahr"
              subtitle={`${counts.lastYear} verfügbar`}
              icon="calendar-outline"
              onPress={() => selectSource({ type: 'lastYear' })}
            />
            <SourceTile title="Eigene Alben" icon="albums-outline" onPress={() => setIsAlbumModalOpen(true)} />
            <SourceTile
              title="Eigene Auswahl"
              subtitle="Text-Beschreibung"
              icon="sparkles-outline"
              onPress={() => setIsCustomModalOpen(true)}
            />
          </View>
        )}
      </ScrollView>

      <AlbumSourceModal
        visible={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        onSelect={(source) => {
          setIsAlbumModalOpen(false);
          selectSource(source);
        }}
      />

      <CustomSourceModal
        visible={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSubmit={(description) => {
          setIsCustomModalOpen(false);
          selectSource({ type: 'custom', description });
        }}
      />
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    fontSize: 24,
    color: colors.textPrimary,
  },
  loadingIndicator: {
    marginTop: spacing.xl,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
