package expo.modules.imageclassifier

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ImageClassifierModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ImageClassifier")

    // Klassifiziert ein Foto komplett on-device über Google ML Kit Image
    // Labeling (eingebautes Basismodell, kein eigenes Modell, kein
    // Netzwerkzugriff). Liefert eine Liste von Labels mit Konfidenz (0-1).
    AsyncFunction("classifyImage") { localUri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      val image = try {
        InputImage.fromFilePath(context, Uri.parse(localUri))
      } catch (error: Exception) {
        promise.reject("ERR_IMAGE_LOAD", "Could not load image at $localUri", error)
        return@AsyncFunction
      }

      val labeler = ImageLabeling.getClient(ImageLabelerOptions.DEFAULT_OPTIONS)
      labeler.process(image)
        .addOnSuccessListener { labels ->
          val results = labels.map { label ->
            mapOf("identifier" to label.text, "confidence" to label.confidence)
          }
          promise.resolve(results)
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_CLASSIFY", error.message ?: "Image classification failed", error)
        }
    }
  }
}
