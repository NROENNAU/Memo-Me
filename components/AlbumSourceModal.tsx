// Popup zur Auswahl eines eigenen Albums als Quiz-Fotoquelle - dieselben
// Kacheln wie im Erinnerungsdeck, nur als Liste in einem Sheet statt fest im
// Grid, da die Anzahl eigener Alben stark schwanken kann.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlbumSummary, getAlbums } from '../services/mediaLibraryService';
import { SourceTile } from './SourceTile';
import { PhotoSource } from '../types/PhotoSource';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface AlbumSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: PhotoSource) => void;
}

export function AlbumSourceModal({ visible, onClose, onSelect }: AlbumSourceModalProps) {
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    let isActive = true;
    setAlbums(null);

    getAlbums()
      .then((result) => {
        if (isActive) setAlbums(result);
      })
      .catch((error) => {
        console.error('Alben konnten nicht geladen werden:', error);
        if (isActive) setAlbums([]);
      });

    return () => {
      isActive = false;
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Eigene Alben</Text>

          {!albums && <ActivityIndicator color={colors.primary} style={styles.spinner} />}

          {albums && albums.length === 0 && <Text style={styles.emptyText}>Keine eigenen Alben gefunden.</Text>}

          {albums && albums.length > 0 && (
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {albums.map((album) => (
                <SourceTile
                  key={album.id}
                  title={album.title}
                  subtitle={`${album.assetCount} Fotos`}
                  icon="albums-outline"
                  onPress={() => onSelect({ type: 'album', albumId: album.id, albumTitle: album.title })}
                />
              ))}
            </ScrollView>
          )}

          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Abbrechen"
          >
            <Text style={styles.cancelButtonText}>Abbrechen</Text>
          </Pressable>
        </View>
      </View>
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
    maxHeight: '80%',
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
  spinner: {
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cancelButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
