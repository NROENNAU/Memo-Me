import ExpoModulesCore
import Photos

// Wird geworfen, wenn sich zu der übergebenen Asset-ID kein Foto in der
// Mediathek mehr finden lässt (z. B. zwischenzeitlich gelöscht).
internal final class AssetNotFoundException: Exception {
  override var reason: String {
    "Could not find a Photos asset with the given local identifier"
  }
}

// Wird geworfen, wenn PhotoKit die Änderung ablehnt (z. B. fehlende
// Schreibrechte).
internal final class FavoriteUpdateException: Exception {
  override var reason: String {
    "Could not update the favorite status for the given asset"
  }
}

public class MediaFavoriteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaFavorite")

    // Markiert/entfernt ein Foto als Favorit direkt in der Apple Fotos-App
    // (PHAssetChangeRequest) - dieselbe Markierung, die dort über das
    // Herz-Symbol sichtbar ist. Braucht Schreibzugriff auf die Mediathek,
    // den die App bereits für Löschen/Album-Zuordnung anfordert.
    AsyncFunction("setFavorite") { (assetId: String, isFavorite: Bool) in
      let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
      guard let asset = fetchResult.firstObject else {
        throw AssetNotFoundException()
      }

      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        PHPhotoLibrary.shared().performChanges({
          let request = PHAssetChangeRequest(for: asset)
          request.isFavorite = isFavorite
        }, completionHandler: { success, error in
          if success {
            continuation.resume(returning: ())
          } else {
            continuation.resume(throwing: error ?? FavoriteUpdateException())
          }
        })
      }
    }
  }
}
