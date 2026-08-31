package expo.modules.facerecognition

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream

// Gesichtserkennung braucht mehr Auflösung als die reine Bildklassifikation
// (siehe image-classifier), damit auch kleinere Gesichter im Bild noch
// zuverlässig gefunden werden.
private const val MAX_THUMBNAIL_DIMENSION = 640

// Mehr Gesichter pro Foto zu verarbeiten bringt für unseren Anwendungsfall
// (eine benannte Person wiederfinden) keinen Mehrwert, kostet aber Zeit.
private const val MAX_FACES_PER_PHOTO = 5

// Wie viel Rand um die reine Gesichts-Bounding-Box beim Zuschneiden für das
// Vorschaubild zusätzlich mitgenommen wird (siehe iOS-Pendant).
private const val FACE_CROP_PADDING = 0.2

// Schneidet das Gesicht (mit etwas Rand) aus dem Bitmap aus, für die
// Vorschau beim Benennen mehrerer Personen auf einem Foto.
private fun cropToFace(bitmap: Bitmap, box: Rect): Bitmap? {
  val paddingX = (box.width() * FACE_CROP_PADDING).toInt()
  val paddingY = (box.height() * FACE_CROP_PADDING).toInt()
  val left = (box.left - paddingX).coerceIn(0, bitmap.width)
  val top = (box.top - paddingY).coerceIn(0, bitmap.height)
  val right = (box.right + paddingX).coerceIn(0, bitmap.width)
  val bottom = (box.bottom + paddingY).coerceIn(0, bitmap.height)
  val width = right - left
  val height = bottom - top
  if (width <= 0 || height <= 0) return null
  return Bitmap.createBitmap(bitmap, left, top, width, height)
}

// Kleines JPEG des zugeschnittenen Gesichts, Base64-kodiert - damit die App
// bei mehreren Personen auf einem Foto anzeigen kann, welches Gesicht
// gerade benannt wird, statt raten zu müssen.
private fun encodeThumbnail(bitmap: Bitmap): String {
  val stream = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.JPEG, 70, stream)
  return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
}

// Wird geworfen, wenn compareFaceEmbeddings auf Android aufgerufen wird -
// hier gibt es (anders als auf iOS mit Apples Vision-Framework) keine
// eingebaute API, um aus einem Gesicht einen vergleichbaren Fingerabdruck zu
// berechnen. ML Kit erkennt nur, wo ein Gesicht ist, nicht, ob es dieselbe
// Person wie auf einem anderen Foto ist. Der JS-seitige `supportsFaceMatching`-
// Guard soll verhindern, dass diese Funktion hier überhaupt aufgerufen wird.
private class FaceMatchingUnsupportedException :
  CodedException("Face matching is not supported on Android in this version")

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
// nachgeholt werden, sonst wären sowohl die Erkennung als auch die
// zurückgegebene Bounding Box falsch ausgerichtet.
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

class FaceRecognitionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FaceRecognition")

    // Erkennt Gesichter in einem Foto über Google ML Kit Face Detection
    // (eingebautes Basismodell, kein eigenes Modell, kein Netzwerkzugriff).
    // Liefert nur Bounding Boxes zurück - `embedding` ist immer null, da ML
    // Kit im Gegensatz zu Apples Vision-Framework keine Wiedererkennung
    // zwischen Fotos anbietet (siehe FaceMatchingUnsupportedException oben).
    AsyncFunction("detectFaces") { localUri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val uri = Uri.parse(localUri)

      val bitmap = try {
        val sampled = decodeSampledBitmap(context, uri, MAX_THUMBNAIL_DIMENSION)
          ?: throw IllegalStateException("Bitmap decoding returned null")
        rotateBitmapIfNeeded(sampled, rotationDegreesFromExif(context, uri))
      } catch (error: Exception) {
        promise.reject("ERR_IMAGE_LOAD", "Could not load image at $localUri", error)
        return@AsyncFunction
      }

      val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .build()
      val detector = FaceDetection.getClient(options)

      detector.process(InputImage.fromBitmap(bitmap, 0))
        .addOnSuccessListener { faces ->
          val results = faces
            .sortedByDescending { it.boundingBox.width().toLong() * it.boundingBox.height().toLong() }
            .take(MAX_FACES_PER_PHOTO)
            .map { face ->
              val box = face.boundingBox
              val cropped = cropToFace(bitmap, box)
              mapOf(
                "boundingBox" to mapOf(
                  "x" to (box.left.toDouble() / bitmap.width).coerceIn(0.0, 1.0),
                  "y" to (box.top.toDouble() / bitmap.height).coerceIn(0.0, 1.0),
                  "width" to (box.width().toDouble() / bitmap.width),
                  "height" to (box.height().toDouble() / bitmap.height)
                ),
                "embedding" to null,
                "thumbnail" to cropped?.let { encodeThumbnail(it) }
              )
            }
          promise.resolve(results)
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_DETECT", error.message ?: "Face detection failed", error)
        }
    }

    // Auf Android nicht unterstützt (siehe FaceMatchingUnsupportedException) -
    // die App soll das über `supportsFaceMatching` in JS bereits abfangen,
    // bevor diese Funktion überhaupt aufgerufen wird.
    AsyncFunction("compareFaceEmbeddings") { _: String, _: String ->
      throw FaceMatchingUnsupportedException()
    }
  }
}
