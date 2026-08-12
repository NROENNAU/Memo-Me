// Popup zum Zuordnen eines Fotos zu einem Album: "Neues Album anlegen" steht
// ganz oben, danach das aktuelle Album (falls das Foto schon zugeordnet ist)
// oder ein Vorschlag (Datum-Heuristik), danach die übrigen bestehenden Alben.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlbumAssignment } from '../db/albumAssignmentRepository';
import {
  AlbumSummary,
  addPhotoToAlbum,
  createAlbumWithPhoto,
  getAlbums,
  suggestAlbumForPhoto,
} from '../services/mediaLibraryService';
import { LibraryPhoto } from '../types/Photo';
import { colors, spacing, radius, typography, MIN_TOUCH_TARGET } from '../theme';

interface AlbumPickerModalProps {
  visible: boolean;
  photo: LibraryPhoto;
  currentAlbum: AlbumAssignment | null;
  onClose: () => void;
  onDone: (albumId: string, albumTitle: string) => void;
}

export function AlbumPickerModal({ visible, photo, currentAlbum, onClose, onDone }: AlbumPickerModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [suggestedAlbum, setSuggestedAlbum] = useState<AlbumSummary | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  useEffect(() => {
    if (!visible) return;
    let isActive = true;
    setIsLoading(true);
    setIsSaving(false);
    setIsCreatingNew(false);
    setNewAlbumName('');

    // Ein Vorschlag ist nur nötig, wenn wir das aktuelle Album des Fotos
    // noch nicht kennen – sonst zeigen wir direkt das echte aktuelle Album.
    Promise.all([getAlbums(), currentAlbum ? Promise.resolve(null) : suggestAlbumForPhoto(photo)])
      .then(([allAlbums, suggestion]) => {
        if (!isActive) return;
        setAlbums(allAlbums);
        setSuggestedAlbum(suggestion);
      })
      .catch((error) => {
        console.error('Alben konnten nicht geladen werden:', error);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [visible, photo, currentAlbum]);

  async function handleSelectExisting(album: AlbumSummary | AlbumAssignment) {
    const albumId = 'id' in album ? album.id : album.albumId;
    const albumTitle = 'id' in album ? album.title : album.albumTitle;
    setIsSaving(true);
    try {
      await addPhotoToAlbum(photo.assetId, albumId);
      onDone(albumId, albumTitle);
    } catch (error) {
      console.error('Foto konnte nicht zum Album hinzugefügt werden:', error);
      setIsSaving(false);
    }
  }

  async function handleCreateNew() {
    const name = newAlbumName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      const newAlbumId = await createAlbumWithPhoto(name, photo.assetId);
      onDone(newAlbumId, name);
    } catch (error) {
      console.error('Album konnte nicht angelegt werden:', error);
      setIsSaving(false);
    }
  }

  const highlightedAlbumId = currentAlbum?.albumId ?? suggestedAlbum?.id;
  const otherAlbums = albums.filter((album) => album.id !== highlightedAlbumId);
  const isBusy = isLoading || isSaving;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Zu Album hinzufügen</Text>

          {isBusy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}

          {!isBusy && (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!isCreatingNew && (
                <Pressable
                  style={[styles.row, styles.newAlbumRow]}
                  onPress={() => setIsCreatingNew(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Neues Album anlegen"
                >
                  <Text style={styles.newAlbumText}>+ Neues Album anlegen</Text>
                </Pressable>
              )}

              {isCreatingNew && (
                <View style={styles.newAlbumForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Name des Albums"
                    placeholderTextColor={colors.textSecondary}
                    value={newAlbumName}
                    onChangeText={setNewAlbumName}
                    autoFocus
                    accessibilityLabel="Name des neuen Albums"
                  />
                  <Pressable
                    style={styles.createButton}
                    onPress={handleCreateNew}
                    accessibilityRole="button"
                    accessibilityLabel="Album anlegen und Foto hinzufügen"
                  >
                    <Text style={styles.createButtonText}>Anlegen</Text>
                  </Pressable>
                </View>
              )}

              {currentAlbum && (
                <Pressable
                  style={[styles.row, styles.currentRow]}
                  onPress={() => handleSelectExisting(currentAlbum)}
                  accessibilityRole="button"
                  accessibilityLabel={`Aktuelles Album: ${currentAlbum.albumTitle}, zum Umsortieren antippen`}
                >
                  <Text style={styles.currentLabel}>Aktuelles Album</Text>
                  <Text style={styles.rowTitle}>{currentAlbum.albumTitle}</Text>
                </Pressable>
              )}

              {!currentAlbum && suggestedAlbum && (
                <Pressable
                  style={[styles.row, styles.suggestedRow]}
                  onPress={() => handleSelectExisting(suggestedAlbum)}
                  accessibilityRole="button"
                  accessibilityLabel={`Vorschlag: ${suggestedAlbum.title}`}
                >
                  <Text style={styles.suggestedLabel}>Vorschlag</Text>
                  <Text style={styles.rowTitle}>{suggestedAlbum.title}</Text>
                </Pressable>
              )}

              {otherAlbums.map((album) => (
                <Pressable
                  key={album.id}
                  style={styles.row}
                  onPress={() => handleSelectExisting(album)}
                  accessibilityRole="button"
                  accessibilityLabel={album.title}
                >
                  <Text style={styles.rowTitle}>{album.title}</Text>
                </Pressable>
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
  list: {
    gap: spacing.sm,
  },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  newAlbumRow: {
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  currentRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  currentLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  suggestedRow: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  suggestedLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  rowTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  newAlbumText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  newAlbumForm: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
  },
  createButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  createButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
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
