import ExpoModulesCore
import Vision
import ImageIO

// Wird geworfen, wenn sich aus der übergebenen URI kein Bild laden lässt
// (z. B. eine ph://-Referenz statt eines echten Dateipfads).
internal final class ImageLoadException: Exception {
  override var reason: String {
    "Could not load image data from the given local URI"
  }
}

// Die Bilderkennung braucht kein hochauflösendes Foto - ein kleines
// Vorschaubild reicht für die Klassifikation und lässt sich über ImageIO
// direkt beim Dekodieren erzeugen, ohne das Foto in voller Auflösung
// laden zu müssen. Das war der eigentliche Flaschenhals beim Laden einer
// Quizrunde, gerade bei "Eigene Auswahl" mit ihrem großen Fotopool.
private let maxThumbnailDimension: CGFloat = 320

public class ImageClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ImageClassifier")

    // Klassifiziert ein Foto komplett on-device über Apples eingebauten
    // Vision-Bildklassifikator (kein eigenes Modell, kein Netzwerkzugriff).
    // Liefert eine Liste von Labels mit Konfidenz (0-1), absteigend sortiert.
    AsyncFunction("classifyImage") { (localUri: String) -> [[String: Any]] in
      guard let url = URL(string: localUri),
        let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil)
      else {
        throw ImageLoadException()
      }

      let thumbnailOptions: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceThumbnailMaxPixelSize: maxThumbnailDimension,
        // Wendet die EXIF-Ausrichtung direkt an, damit das Vorschaubild
        // schon korrekt gedreht ist.
        kCGImageSourceCreateThumbnailWithTransform: true,
      ]

      guard
        let cgImage = CGImageSourceCreateThumbnailAtIndex(
          imageSource, 0, thumbnailOptions as CFDictionary)
      else {
        throw ImageLoadException()
      }

      let request = VNClassifyImageRequest()
      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try handler.perform([request])

      return (request.results ?? []).map { observation in
        ["identifier": observation.identifier, "confidence": observation.confidence]
      }
    }
  }
}
