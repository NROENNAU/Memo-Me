// React-Hook rund um die Foto-Bibliothek-Berechtigung.
// Hinweis: Die eigentliche Onboarding-Oberfläche, die diesen Hook nutzt,
// um den Nutzer um Erlaubnis zu bitten, folgt in einem späteren Schritt.
import { useCallback, useEffect, useState } from 'react';
import { getPermissionStatus, requestPermission } from '../services/mediaLibraryService';
import { PhotoPermissionStatus } from '../types/permissions';

interface UsePhotoLibraryPermissionResult {
  status: PhotoPermissionStatus;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
}

export function usePhotoLibraryPermission(): UsePhotoLibraryPermissionResult {
  const [status, setStatus] = useState<PhotoPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  // Beim ersten Rendern den aktuellen Status abfragen, ohne den Nutzer zu stören.
  useEffect(() => {
    getPermissionStatus()
      .then(setStatus)
      .finally(() => setIsLoading(false));
  }, []);

  // Fordert die Berechtigung aktiv an (löst den System-Dialog aus).
  const request = useCallback(async () => {
    setIsLoading(true);
    const newStatus = await requestPermission();
    setStatus(newStatus);
    setIsLoading(false);
  }, []);

  return { status, isLoading, requestPermission: request };
}
