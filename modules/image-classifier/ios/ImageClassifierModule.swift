import ExpoModulesCore
import Vision
import CoreImage

// Wird geworfen, wenn sich aus der übergebenen URI kein Bild laden lässt
// (z. B. eine ph://-Referenz statt eines echten Dateipfads).
internal final class ImageLoadException: Exception {
  override var reason: String {
    "Could not load image data from the given local URI"
  }
}

public class ImageClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ImageClassifier")

    // Klassifiziert ein Foto komplett on-device über Apples eingebauten
    // Vision-Bildklassifikator (kein eigenes Modell, kein Netzwerkzugriff).
    // Liefert eine Liste von Labels mit Konfidenz (0-1), absteigend sortiert.
    AsyncFunction("classifyImage") { (localUri: String) -> [[String: Any]] in
      guard let url = URL(string: localUri), let data = try? Data(contentsOf: url),
        let ciImage = CIImage(data: data)
      else {
        throw ImageLoadException()
      }

      let request = VNClassifyImageRequest()
      let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
      try handler.perform([request])

      return (request.results ?? []).map { observation in
        ["identifier": observation.identifier, "confidence": observation.confidence]
      }
    }
  }
}
