package expo.modules.imageclassifier

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

// Die Bilderkennung braucht kein hochauflösendes Foto - ein kleines
// Vorschaubild reicht für die Klassifikation. Fotos in voller Auflösung zu
// dekodieren war der eigentliche Flaschenhals beim Laden einer Quizrunde,
// gerade bei "Eigene Auswahl" mit ihrem großen Fotopool.
private const val MAX_THUMBNAIL_DIMENSION = 320

// Dekodiert nur ein heruntergesampeltes Bitmap statt der vollen Auflösung -
// deutlich schneller und speicherschonender, da BitmapFactory die
// Verkleinerung direkt beim Dekodieren vornimmt.
private fun decodeSampledBitmap(context: Context, uri: Uri, maxDimension: Int): Bitmap? {
  val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  context.contentResolver.openInputStream(uri)?.use { stream ->
    BitmapFactory.decodeStream(stream, null, boundsOptions)
  } ?: return null

  var sampleSize = 1
  var width = boundsOptions.outWidth
  var height = boundsOptions.outHeight
  while (width / 2 >= maxDimension || height / 2 >= maxDimension) {
    width /= 2
    height /= 2
    sampleSize *= 2
  }

  val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
  return context.contentResolver.openInputStream(uri)?.use { stream ->
    BitmapFactory.decodeStream(stream, null, decodeOptions)
  }
}

// BitmapFactory dreht nicht automatisch nach EXIF - das muss hier manuell
// nachgeholt werden, sonst könnte die Ausrichtung die Klassifikation verfälschen.
private fun rotationDegreesFromExif(context: Context, uri: Uri): Int {
  return try {
    context.contentResolver.openInputStream(uri)?.use { stream ->
      when (
        ExifInterface(stream).getAttributeInt(
          ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL
        )
      ) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
      }
    } ?: 0
  } catch (error: Exception) {
    0
  }
}

private fun rotateBitmapIfNeeded(bitmap: Bitmap, degrees: Int): Bitmap {
  if (degrees == 0) return bitmap
  val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
  return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}

class ImageClassifierModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ImageClassifier")

    // Klassifiziert ein Foto komplett on-device über Google ML Kit Image
    // Labeling (eingebautes Basismodell, kein eigenes Modell, kein
    // Netzwerkzugriff). Liefert eine Liste von Labels mit Konfidenz (0-1).
    AsyncFunction("classifyImage") { localUri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val uri = Uri.parse(localUri)

      val image = try {
        val sampled = decodeSampledBitmap(context, uri, MAX_THUMBNAIL_DIMENSION)
          ?: throw IllegalStateException("Bitmap decoding returned null")
        val rotated = rotateBitmapIfNeeded(sampled, rotationDegreesFromExif(context, uri))
        InputImage.fromBitmap(rotated, 0)
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
