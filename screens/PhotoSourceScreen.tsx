// Fotoquelle-Auswahl: Nutzer entscheidet, welcher Foto-Pool als Grundlage
// für die Quizrunde dient. Stil-Vorbild: "Dein Erinnerungsdeck" aus den
// Mockups (siehe design/mockups/).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AlbumSummary, countPhotosForSource, getAlbums } from '../services/mediaLibraryService';
import { PhotoSource } from '../types/PhotoSource';
import { RootStackParamList } from '../types/navigation';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoSource'>;

export function PhotoSourceScreen({ navigation }: Props) {
  const [recentCount, setRecentCount] = useState<number | null>(null);
  const [lastYearCount, setLastYearCount] = useState<number | null>(null);
  const [isAlbumListOpen, setIsAlbumListOpen] = useState(false);
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);

  useEffect(() => {
    let isActive = true;
    countPhotosForSource({ type: 'recent' }).then((count) => isActive && setRecentCount(count));
    countPhotosForSource({ type: 'lastYear' }).then((count) => isActive && setLastYearCount(count));
    return () => {
      isActive = false;
    };
  }, []);

  function selectSource(source: PhotoSource) {
    navigation.replace('PhotoSwipe', { source });
  }

  async function toggleAlbumList() {
    if (isAlbumListOpen) {
      setIsAlbumListOpen(false);
      return;
    }
    setIsAlbumListOpen(true);
    if (!albums) {
      const result = await getAlbums();
      setAlbums(result);
    }
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
        <Text style={styles.subtitle}>Welche Fotos möchtest du für dein Quiz verwenden?</Text>

        <View style={styles.list}>
          <SourceRow
            title="Letzte Fotos"
            subtitle={recentCount !== null ? `${recentCount} verfügbar` : undefined}
            onPress={() => selectSource({ type: 'recent' })}
          />
          <SourceRow
            title="Letztes Jahr"
            subtitle={lastYearCount !== null ? `${lastYearCount} verfügbar` : undefined}
            onPress={() => selectSource({ type: 'lastYear' })}
          />
          <SourceRow title="Eigenes Album" isExpandable onPress={toggleAlbumList} />

          {isAlbumListOpen && (
            <View style={styles.albumList}>
              {!albums && <ActivityIndicator color={colors.primary} />}
              {albums?.length === 0 && (
                <Text style={styles.emptyAlbumsText}>Keine eigenen Alben gefunden.</Text>
              )}
              {albums?.map((album) => (
                <SourceRow
                  key={album.id}
                  title={album.title}
                  subtitle={`${album.assetCount} Fotos`}
                  onPress={() => selectSource({ type: 'album', albumId: album.id, albumTitle: album.title })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SourceRowProps {
  title: string;
  subtitle?: string;
  isExpandable?: boolean;
  onPress: () => void;
}

function SourceRow({ title, subtitle, isExpandable, onPress }: SourceRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={spacing.xs}
    >
      <View style={styles.rowTextGroup}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.rowChevron}>{isExpandable ? '⌄' : '›'}</Text>
    </Pressable>
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  rowTextGroup: {
    flexShrink: 1,
  },
  rowTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowChevron: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  albumList: {
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  emptyAlbumsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
