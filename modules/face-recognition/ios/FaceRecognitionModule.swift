import ExpoModulesCore
import Vision
import ImageIO
import CoreGraphics

// Wird geworfen, wenn sich aus der übergebenen URI kein Bild laden lässt
// (z. B. eine ph://-Referenz statt eines echten Dateipfads).
internal final class ImageLoadException: Exception {
  override var reason: String {
    "Could not load image data from the given local URI"
  }
}

// Wird geworfen, wenn sich ein archivierter Fingerabdruck nicht wieder
// herstellen lässt (z. B. beschädigte oder falsch kodierte Daten).
internal final class EmbeddingDecodeException: Exception {
  override var reason: String {
    "Could not decode the given face embedding"
  }
}

// Gesichtserkennung braucht mehr Auflösung als die reine Bildklassifikation
// (siehe image-classifier), damit sowohl die Erkennung selbst als auch der
// aus dem zugeschnittenen Gesicht berechnete Fingerabdruck brauchbar bleiben.
private let maxThumbnailDimension: CGFloat = 640
// Wie viel Rand um die reine Gesichts-Bounding-Box beim Zuschneiden für den
// Fingerabdruck zusätzlich mitgenommen wird (gängige Praxis bei
// Gesichtserkennung: etwas Kontext um das Gesicht verbessert die Qualität).
private let faceCropPadding: CGFloat = 0.2
// Mehr Gesichter pro Foto zu verarbeiten bringt für unseren Anwendungsfall
// (eine benannte Person wiederfinden) keinen Mehrwert, kostet aber Zeit.
private let maxFacesPerPhoto = 5

private func loadThumbnail(from localUri: String) throws -> CGImage {
  guard let url = URL(string: localUri),
    let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil)
  else {
    throw ImageLoadException()
  }

  let thumbnailOptions: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceThumbnailMaxPixelSize: maxThumbnailDimension,
    kCGImageSourceCreateThumbnailWithTransform: true,
  ]

  guard
    let cgImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, thumbnailOptions as CFDictionary)
  else {
    throw ImageLoadException()
  }
  return cgImage
}

// Vision-Koordinaten sind normalisiert mit Ursprung unten links (y wächst
// nach oben) - für die Rückgabe nach außen und zum Zuschneiden des Bildes
// (Ursprung oben links, y wächst nach unten) wird umgerechnet.
private func topLeftBoundingBox(from visionBoundingBox: CGRect) -> CGRect {
  CGRect(
    x: visionBoundingBox.origin.x,
    y: 1 - visionBoundingBox.origin.y - visionBoundingBox.height,
    width: visionBoundingBox.width,
    height: visionBoundingBox.height
  )
}

private func cropToFace(_ image: CGImage, normalizedBox: CGRect) -> CGImage? {
  let width = CGFloat(image.width)
  let height = CGFloat(image.height)

  let paddedBox = normalizedBox.insetBy(
    dx: -normalizedBox.width * faceCropPadding,
    dy: -normalizedBox.height * faceCropPadding
  )

  let pixelRect = CGRect(
    x: paddedBox.origin.x * width,
    y: paddedBox.origin.y * height,
    width: paddedBox.width * width,
    height: paddedBox.height * height
  ).intersection(CGRect(x: 0, y: 0, width: width, height: height))

  guard !pixelRect.isEmpty else { return nil }
  return image.cropping(to: pixelRect)
}

private func computeFeaturePrint(for image: CGImage) throws -> VNFeaturePrintObservation? {
  let request = VNGenerateImageFeaturePrintRequest()
  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])
  return request.results?.first as? VNFeaturePrintObservation
}

private func encodeEmbedding(_ observation: VNFeaturePrintObservation) throws -> String {
  let data = try NSKeyedArchiver.archivedData(withRootObject: observation, requiringSecureCoding: true)
  return data.base64EncodedString()
}

private func decodeEmbedding(_ encoded: String) throws -> VNFeaturePrintObservation {
  guard let data = Data(base64Encoded: encoded),
    let observation = try NSKeyedUnarchiver.unarchivedObject(
      ofClass: VNFeaturePrintObservation.self, from: data)
  else {
    throw EmbeddingDecodeException()
  }
  return observation
}

public class FaceRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FaceRecognition")

    // Erkennt Gesichter in einem Foto (Apple Vision, kein eigenes Modell)
    // und berechnet für jedes erkannte Gesicht einen wiedererkennbaren
    // "Fingerabdruck" (VNFeaturePrintObservation, archiviert und Base64-kodiert,
    // da sich das Objekt selbst nicht direkt über die Bridge schicken lässt).
    AsyncFunction("detectFaces") { (localUri: String) -> [[String: Any]] in
      let image = try loadThumbnail(from: localUri)

      let request = VNDetectFaceRectanglesRequest()
      let handler = VNImageRequestHandler(cgImage: image, options: [:])
      try handler.perform([request])

      let observations = (request.results ?? [])
        .sorted { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }
        .prefix(maxFacesPerPhoto)

      return observations.compactMap { observation -> [String: Any]? in
        let topLeftBox = topLeftBoundingBox(from: observation.boundingBox)

        var embedding: String? = nil
        if let croppedFace = cropToFace(image, normalizedBox: observation.boundingBox),
          let featurePrint = try? computeFeaturePrint(for: croppedFace)
        {
          embedding = try? encodeEmbedding(featurePrint)
        }

        return [
          "boundingBox": [
            "x": topLeftBox.origin.x,
            "y": topLeftBox.origin.y,
            "width": topLeftBox.width,
            "height": topLeftBox.height,
          ],
          "embedding": embedding as Any,
        ]
      }
    }

    // Vergleicht zwei zuvor mit detectFaces gewonnene Fingerabdrücke. Je
    // kleiner der Rückgabewert, desto wahrscheinlicher dieselbe Person -
    // einen "richtigen" Schwellenwert gibt es nicht pauschal, das muss in
    // der App anhand echter Tests kalibriert werden.
    AsyncFunction("compareFaceEmbeddings") { (embeddingA: String, embeddingB: String) -> Double in
      let observationA = try decodeEmbedding(embeddingA)
      let observationB = try decodeEmbedding(embeddingB)

      var distance: Float = 0
      try observationA.computeDistance(&distance, to: observationB)
      return Double(distance)
    }
  }
}
