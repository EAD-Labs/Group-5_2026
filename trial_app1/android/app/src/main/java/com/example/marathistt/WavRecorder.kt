package com.example.marathistt

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import kotlin.concurrent.thread

/**
 * Records microphone audio directly as 16kHz, mono, 16-bit PCM WAV.
 * This is exactly the format the AI4Bharat ASR model expects, so no
 * conversion is needed before uploading to the backend.
 */
class WavRecorder(private val outputFile: File) {

    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT

    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    @Volatile private var isRecording = false

    @SuppressLint("MissingPermission")
    fun start() {
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            minBufferSize * 2
        )
        audioRecord?.startRecording()
        isRecording = true

        recordingThread = thread(start = true) {
            writeRawPcmData(minBufferSize)
        }
    }

    fun stop() {
        isRecording = false
        recordingThread?.join()
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        addWavHeader()
    }

    private fun writeRawPcmData(bufferSize: Int) {
        val data = ByteArray(bufferSize)
        FileOutputStream(outputFile).use { output ->
            while (isRecording) {
                val read = audioRecord?.read(data, 0, bufferSize) ?: 0
                if (read > 0) {
                    output.write(data, 0, read)
                }
            }
        }
    }

    /** Prepends a standard 44-byte WAV/RIFF header to the raw PCM data we just wrote. */
    private fun addWavHeader() {
        val pcmData = outputFile.readBytes()
        val totalDataLen = pcmData.size + 36
        val byteRate = sampleRate * 2 // 16-bit mono => 2 bytes per sample

        RandomAccessFile(outputFile, "rw").use { raf ->
            raf.setLength(0)
            val header = ByteArray(44)
            writeString(header, 0, "RIFF")
            writeInt(header, 4, totalDataLen)
            writeString(header, 8, "WAVE")
            writeString(header, 12, "fmt ")
            writeInt(header, 16, 16) // Subchunk1Size for PCM
            writeShort(header, 20, 1) // AudioFormat = 1 (PCM)
            writeShort(header, 22, 1) // NumChannels = 1 (mono)
            writeInt(header, 24, sampleRate)
            writeInt(header, 28, byteRate)
            writeShort(header, 32, 2) // BlockAlign
            writeShort(header, 34, 16) // BitsPerSample
            writeString(header, 36, "data")
            writeInt(header, 40, pcmData.size)

            raf.write(header)
            raf.write(pcmData)
        }
    }

    private fun writeString(b: ByteArray, offset: Int, value: String) {
        value.forEachIndexed { i, c -> b[offset + i] = c.code.toByte() }
    }

    private fun writeInt(b: ByteArray, offset: Int, value: Int) {
        b[offset] = (value and 0xff).toByte()
        b[offset + 1] = ((value shr 8) and 0xff).toByte()
        b[offset + 2] = ((value shr 16) and 0xff).toByte()
        b[offset + 3] = ((value shr 24) and 0xff).toByte()
    }

    private fun writeShort(b: ByteArray, offset: Int, value: Int) {
        b[offset] = (value and 0xff).toByte()
        b[offset + 1] = ((value shr 8) and 0xff).toByte()
    }
}
