// Erinnerungsdeck: der Home-Screen der App, zu dem man immer zurückkehrt.
// Zeigt die verfügbaren Foto-Quellen als quadratische Kacheln mit
// Vorschaubild - angelehnt an die Bibliotheks-Ansicht der Apple Fotos-App,
// aber kompakt gehalten. Eine Quelle muss aktiv gewählt werden, um ins Quiz
// zu starten.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { countPhotosForSource, getAlbums, getCoverPhotoUri } from '../services/mediaLibraryService';
import { SourceTile } from '../components/SourceTile';
import { PhotoSource } from '../types/PhotoSource';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSource'>;

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  coverUri: string | null;
  source: PhotoSource;
}

export function PhotoSourceScreen({ navigation }: Props) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load() {
      const [recentCount, recentCover, lastYearCount, lastYearCover, albums] = await Promise.all([
        countPhotosForSource({ type: 'recent' }),
        getCoverPhotoUri({ type: 'recent' }),
        countPhotosForSource({ type: 'lastYear' }),
        getCoverPhotoUri({ type: 'lastYear' }),
        getAlbums(),
      ]);
      if (!isActive) return;

      const albumTiles = await Promise.all(
        albums.map(async (album): Promise<Tile> => {
          const source: PhotoSource = { type: 'album', albumId: album.id, albumTitle: album.title };
          const coverUri = await getCoverPhotoUri(source);
          return {
            key: `album-${album.id}`,
            title: album.title,
            subtitle: `${album.assetCount} Fotos`,
            coverUri,
            source,
          };
        })
      );
      if (!isActive) return;

      setTiles([
        {
          key: 'recent',
          title: 'Letzte Fotos',
          subtitle: `${recentCount} verfügbar`,
          coverUri: recentCover,
          source: { type: 'recent' },
        },
        {
          key: 'lastYear',
          title: 'Letztes Jahr',
          subtitle: `${lastYearCount} verfügbar`,
          coverUri: lastYearCover,
          source: { type: 'lastYear' },
        },
        ...albumTiles,
      ]);
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

        {!tiles && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}

        {tiles && (
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <SourceTile
                key={tile.key}
                title={tile.title}
                subtitle={tile.subtitle}
                coverUri={tile.coverUri}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
