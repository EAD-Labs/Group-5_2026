package com.example.marathistt

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * IMPORTANT: change BASE_URL to wherever you are running backend/app.py.
 *   - Testing on an emulator, backend on the same machine -> "http://10.0.2.2:8000"
 *   - Testing on a real phone, backend on your laptop on the same Wi-Fi -> "http://<your-laptop-LAN-ip>:8000"
 *   - Backend deployed to a server / exposed via ngrok -> "https://your-ngrok-or-server-url"
 */
object ApiClient {

    const val BASE_URL = "http://10.0.2.2:8000"

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /** Uploads the WAV file and returns the transcribed Marathi text (blocking call — run off the main thread). */
    fun transcribe(wavFile: File): String {
        val requestBody = wavFile.asRequestBody("audio/wav".toMediaTypeOrNull())
        val multipartBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("audio", wavFile.name, requestBody)
            .build()

        val request = Request.Builder()
            .url("$BASE_URL/transcribe")
            .post(multipartBody)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw RuntimeException("Server error ${response.code}: ${response.body?.string()}")
            }
            val json = JSONObject(response.body?.string() ?: "{}")
            return json.optString("text", "")
        }
    }
}
