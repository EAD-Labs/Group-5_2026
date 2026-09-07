package com.example.marathistt

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var recordButton: Button
    private lateinit var statusText: TextView
    private lateinit var resultText: TextView
    private lateinit var progressBar: ProgressBar

    private var recorder: WavRecorder? = null
    private var isRecording = false
    private lateinit var audioFile: File

    private val RECORD_AUDIO_PERMISSION_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        recordButton = findViewById(R.id.recordButton)
        statusText = findViewById(R.id.statusText)
        resultText = findViewById(R.id.resultText)
        progressBar = findViewById(R.id.progressBar)

        audioFile = File(cacheDir, "recording.wav")

        recordButton.setOnClickListener {
            if (!hasMicPermission()) {
                requestMicPermission()
                return@setOnClickListener
            }
            if (isRecording) stopRecordingAndTranscribe() else startRecording()
        }
    }

    private fun hasMicPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    private fun requestMicPermission() {
        ActivityCompat.requestPermissions(
            this, arrayOf(Manifest.permission.RECORD_AUDIO), RECORD_AUDIO_PERMISSION_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == RECORD_AUDIO_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startRecording()
            } else {
                Toast.makeText(this, "Microphone permission is required to record audio", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun startRecording() {
        recorder = WavRecorder(audioFile)
        recorder?.start()
        isRecording = true
        recordButton.text = "⏹ Stop Recording"
        statusText.text = "Recording... बोला"
        resultText.text = ""
    }

    private fun stopRecordingAndTranscribe() {
        recorder?.stop()
        isRecording = false
        recordButton.text = "🎤 Start Recording"
        statusText.text = "Transcribing..."
        progressBar.visibility = View.VISIBLE
        recordButton.isEnabled = false

        thread(start = true) {
            try {
                val text = ApiClient.transcribe(audioFile)
                runOnUiThread {
                    resultText.text = text.ifBlank { "(No speech detected — try again)" }
                    statusText.text = "Done"
                    progressBar.visibility = View.GONE
                    recordButton.isEnabled = true
                }
            } catch (e: Exception) {
                runOnUiThread {
                    statusText.text = "Error"
                    resultText.text = "Could not transcribe: ${e.message}\n\nCheck that the backend server is running and ApiClient.BASE_URL is correct."
                    progressBar.visibility = View.GONE
                    recordButton.isEnabled = true
                }
            }
        }
    }
}
