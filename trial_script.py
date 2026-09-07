"""
Standalone Marathi speech-to-text script, powered by AI4Bharat's IndicConformer model.

Usage:
    python transcribe.py path/to/audio.wav
    python transcribe.py path/to/audio.m4a   (or .mp3, .3gp — will be auto-converted)

Setup (one-time):
    pip install torch nemo_toolkit[asr]==2.0.0 soundfile
    Also install ffmpeg and make sure it's on your PATH:
        Windows: winget install ffmpeg   (or download from ffmpeg.org)
        Mac:     brew install ffmpeg
        Linux:   sudo apt install ffmpeg

First run will download the model (a few GB) from Hugging Face — this can take
a while. Subsequent runs reuse the cached model and are much faster to start.
"""

import os
import sys
import subprocess
import tempfile
import signal

# NeMo's exp_manager module references signal.SIGKILL at import time.
# SIGKILL doesn't exist on Windows (it's POSIX-only), which crashes the
# import with: AttributeError: module 'signal' has no attribute 'SIGKILL'.
# Patch it in with the closest Windows equivalent before importing nemo.
if not hasattr(signal, "SIGKILL"):
    signal.SIGKILL = signal.SIGTERM

import torch
import nemo.collections.asr as nemo_asr

MODEL_NAME = "ai4bharat/indicconformer_stt_mr_hybrid_rnnt_large"


def ensure_16k_mono_wav(input_path: str) -> str:
    """
    The model expects 16kHz, mono, 16-bit PCM WAV audio.
    Re-encodes the input file with ffmpeg to guarantee that format,
    regardless of what format the input actually is.
    """
    fd, output_path = tempfile.mkstemp(suffix="_16k.wav")
    os.close(fd)

    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ac", "1", "-ar", "16000", "-sample_fmt", "s16",
        output_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed to convert audio:\n{result.stderr.decode(errors='ignore')}")
    return output_path


def load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading AI4Bharat Marathi ASR model on {device} ... (first run downloads a few GB, be patient)")
    model = nemo_asr.models.ASRModel.from_pretrained(MODEL_NAME)
    model.freeze()
    model = model.to(device)
    model.cur_decoder = "rnnt"  # good accuracy/speed tradeoff; use "ctc" for the CTC head instead
    print("Model loaded.")
    return model


def transcribe(model, audio_path: str) -> str:
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"No such file: {audio_path}")

    wav_path = ensure_16k_mono_wav(audio_path)
    try:
        with torch.no_grad():
            result = model.transcribe([wav_path], batch_size=1, language_id="mr")[0]
        # NeMo may return a Hypothesis object depending on decoder; normalize to plain string
        text = result.text if hasattr(result, "text") else str(result)
        return text
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)


def main():
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py path/to/audio_file")
        sys.exit(1)

    audio_path = sys.argv[1]
    model = load_model()
    text = transcribe(model, audio_path)

    print("\n--- Transcription ---")
    print(text if text.strip() else "(No speech detected)")


if __name__ == "__main__":
    main()
