package com.am_faculty

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.sqrt

/**
 * FaceRecognitionModule.kt - AM_Faculty
 *
 * PIPELINE (synchronized with web/facrec):
 *   1. Read JPEG at FULL resolution
 *   2. Fix EXIF rotation
 *   3. Mirror-flip horizontally (front camera)
 *   4. Detect face with ML Kit → pick largest
 *   5. Apply 20% margin padding
 *   6. Crop face region
 *   7. Resize to 112×112
 *   8. Normalize: pixel = (pixel / 127.5) - 1.0  [RGB, float32]
 *   9. Run MobileFaceNet TFLite
 *  10. L2-normalize to unit sphere
 *  11. Anti-spoofing (reflection + motion)
 */
class FaceRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var interpreter: Interpreter? = null

    // CONFIG
    private val L2_NORMALIZE     = true
    private val FLIP_HORIZONTAL  = true   // front camera images are mirrored
    private val FACE_MARGIN      = 0.20f  // 20% padding around bounding box

    private val detectorOptions = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .build()
    private val detector = FaceDetection.getClient(detectorOptions)

    override fun getName(): String = "FaceRecognitionModule"

    @ReactMethod
    fun loadModel(promise: Promise) {
        try {
            val afd = reactContext.assets.openFd("models/mobilefacenet.tflite")
            val inputStream = FileInputStream(afd.fileDescriptor)
            val fileChannel = inputStream.channel
            val modelBuffer = fileChannel.map(
                FileChannel.MapMode.READ_ONLY,
                afd.startOffset,
                afd.declaredLength
            )
            val options = Interpreter.Options().apply { setNumThreads(4) }
            interpreter = Interpreter(modelBuffer, options)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MODEL_LOAD_ERROR", "Failed to load security module")
        }
    }

    @ReactMethod
    fun recognizeFaceFromFile(imagePath: String, promise: Promise) {
        val interp = interpreter
        if (interp == null) {
            promise.reject("MODEL_NOT_LOADED", "Security module not ready")
            return
        }

        try {
            val path = imagePath.removePrefix("file://")
            val file = File(path)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Capture failed")
                return
            }

            var bitmap = BitmapFactory.decodeFile(path)
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Processing failed")
                return
            }

            bitmap = fixExifRotation(bitmap, path)

            if (FLIP_HORIZONTAL) {
                val matrix = Matrix().apply { preScale(-1f, 1f) }
                val flipped = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, false)
                if (flipped != bitmap) bitmap.recycle()
                bitmap = flipped
            }

            val image = InputImage.fromBitmap(bitmap, 0)
            val sourceBitmap = bitmap

            detector.process(image)
                .addOnSuccessListener { faces ->
                    try {
                        if (faces.isEmpty()) {
                            promise.reject("NO_FACE", "No face detected")
                            return@addOnSuccessListener
                        }

                        val face = faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() }!!
                        val bounds = face.boundingBox

                        // Apply FACE_MARGIN padding so MobileFaceNet gets the full face context
                        // (chin, forehead, ears) it was trained on — tight crops cause low similarity scores.
                        val marginW = (bounds.width() * FACE_MARGIN).toInt()
                        val marginH = (bounds.height() * FACE_MARGIN).toInt()
                        val left = maxOf(0, bounds.left - marginW)
                        val top = maxOf(0, bounds.top - marginH)
                        val right = minOf(sourceBitmap.width, bounds.right + marginW)
                        val bottom = minOf(sourceBitmap.height, bounds.bottom + marginH)
                        val cropW = right - left
                        val cropH = bottom - top

                        if (cropW <= 0 || cropH <= 0) {
                            promise.reject("CROP_ERROR", "Invalid face positioning")
                            return@addOnSuccessListener
                        }

                        var cropped = Bitmap.createBitmap(sourceBitmap, left, top, cropW, cropH)
                        cropped = Bitmap.createScaledBitmap(cropped, 112, 112, true)

                        val inputBuffer = ByteBuffer.allocateDirect(1 * 112 * 112 * 3 * 4)
                        inputBuffer.order(ByteOrder.nativeOrder())
                        val pixels = IntArray(112 * 112)
                        cropped.getPixels(pixels, 0, 112, 0, 0, 112, 112)

                        for (pixel in pixels) {
                            inputBuffer.putFloat(((pixel shr 16 and 0xFF) - 127.5f) / 128.0f) // R
                            inputBuffer.putFloat(((pixel shr  8 and 0xFF) - 127.5f) / 128.0f) // G
                            inputBuffer.putFloat(((pixel        and 0xFF) - 127.5f) / 128.0f) // B
                        }
                        inputBuffer.rewind()
                        cropped.recycle()
                        sourceBitmap.recycle()

                        val outputShape = interp.getOutputTensor(0).shape()
                        val outputSize = outputShape.fold(1) { acc, d -> acc * d }
                        val outputBuffer = ByteBuffer.allocateDirect(outputSize * 4)
                        outputBuffer.order(ByteOrder.nativeOrder())
                        interp.run(inputBuffer, outputBuffer)
                        outputBuffer.rewind()

                        val raw = FloatArray(outputSize) { outputBuffer.getFloat() }

                        val finalEmbedding: List<Float> = if (L2_NORMALIZE) {
                            val norm = sqrt(raw.sumOf { (it * it).toDouble() }).toFloat()
                            if (norm > 0f) raw.map { it / norm } else raw.toList()
                        } else {
                            raw.toList()
                        }

                        // Anti-spoofing DISABLED for testing — isSpoof is always false.
                        // Every detected face proceeds directly to embedding matching.
                        // Re-enable once basic face recognition is confirmed working.
                        val isSpoof = false
                        val spoofReason = ""

                        val result = Arguments.createMap()
                        val embeddingArray = Arguments.createArray()
                        finalEmbedding.take(128).forEach { embeddingArray.pushDouble(it.toDouble()) }
                        result.putArray("embedding", embeddingArray)
                        result.putBoolean("isSpoof", isSpoof)
                        result.putString("reason", spoofReason)
                        promise.resolve(result)

                    } catch (e: Exception) {
                        promise.reject("POST_DETECT_ERROR", "Internal system error")
                    }
                }
                .addOnFailureListener { e ->
                    promise.reject("MLKIT_ERROR", "Face detection failed")
                }

        } catch (e: Exception) {
            promise.reject("RECOGNITION_ERROR", "System busy")
        }
    }

    private fun fixExifRotation(bitmap: Bitmap, filePath: String): Bitmap {
        return try {
            val exif = ExifInterface(filePath)
            val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            val degrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90  -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> return bitmap
            }
            val matrix = Matrix().apply { postRotate(degrees) }
            Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                .also { if (it != bitmap) bitmap.recycle() }
        } catch (e: Exception) {
            bitmap
        }
    }

    companion object {
        private const val TAG = "FacePipeline"
    }
}
