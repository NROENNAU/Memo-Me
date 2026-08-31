// Markiert/entfernt ein Foto als Favorit direkt in der Apple Fotos-App
// (PhotoKit) - dieselbe Markierung, die man auch über das Herz-Symbol in
// der System-Fotos-App sieht. Auf Android aktuell nicht unterstützt (siehe
// supportsNativeFavorite): dort braucht das Setzen eines Favoriten seit
// Android 11 einen eigenen Bestätigungsdialog über einen Intent-Flow
// (MediaStore.createFavoriteRequest), keinen einfachen synchronen Aufruf.
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface MediaFavoriteNativeModule {
  setFavorite(assetId: string, isFavorite: boolean): Promise<void>;
}

const nativeModule =
  Platform.OS === 'ios' ? requireNativeModule<MediaFavoriteNativeModule>('MediaFavorite') : null;

export async function setNativeFavorite(assetId: string, isFavorite: boolean): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.setFavorite(assetId, isFavorite);
}

export const supportsNativeFavorite = Platform.OS === 'ios';
