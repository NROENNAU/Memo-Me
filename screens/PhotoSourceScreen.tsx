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
import { countPhotosForSource, getAlbums } from '../services/mediaLibraryService';
import { SourceTile } from '../components/SourceTile';
import { PhotoSource } from '../types/PhotoSource';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSource'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  source: PhotoSource;
}

export function PhotoSourceScreen({ navigation }: Props) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        const [recentCount, lastYearCount, albums] = await Promise.all([
          countPhotosForSource({ type: 'recent' }),
          countPhotosForSource({ type: 'lastYear' }),
          getAlbums(),
        ]);
        if (!isActive) return;

        setTiles([
          {
            key: 'recent',
            title: 'Letzte Fotos',
            subtitle: `${recentCount} verfügbar`,
            icon: 'time-outline',
            source: { type: 'recent' },
          },
          {
            key: 'lastYear',
            title: 'Letztes Jahr',
            subtitle: `${lastYearCount} verfügbar`,
            icon: 'calendar-outline',
            source: { type: 'lastYear' },
          },
          ...albums.map(
            (album): Tile => ({
              key: `album-${album.id}`,
              title: album.title,
              subtitle: `${album.assetCount} Fotos`,
              icon: 'albums-outline',
              source: { type: 'album', albumId: album.id, albumTitle: album.title },
            })
          ),
        ]);
      } catch (error) {
        if (!isActive) return;
        console.error('Erinnerungsdeck konnte nicht geladen werden:', error);
        setErrorMessage('Deine Fotoquellen konnten nicht geladen werden.');
      }
    }

    load();
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

        {!errorMessage && !tiles && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}

        {!errorMessage && tiles && (
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <SourceTile
                key={tile.key}
                title={tile.title}
                subtitle={tile.subtitle}
                icon={tile.icon}
                onPress={() => selectSource(tile.source)}
              />
            ))}
          </View>
        )}
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
