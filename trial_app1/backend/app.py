"""
Marathi Speech-to-Text backend, powered by AI4Bharat's IndicConformer model.

This server:
  1. Loads the AI4Bharat Marathi ASR model once at startup (ai4bharat/indicconformer_stt_mr_hybrid_ctc_rnnt_large)
  2. Exposes POST /transcribe which accepts a WAV audio file and returns the Marathi transcription

Run locally with:
    uvicorn app:app --host 0.0.0.0 --port 8000

See README.md in this folder for full setup instructions.
"""

import os
import tempfile
import subprocess

import torch
import nemo.collections.asr as nemo_asr
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

MODEL_NAME = "ai4bharat/indicconformer_stt_mr_hybrid_rnnt_large"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="Marathi STT (AI4Bharat)")

# Allow the Android app to call this from anywhere. Tighten this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"Loading AI4Bharat Marathi ASR model on {DEVICE} ... (this can take a while the first time)")
model = nemo_asr.models.ASRModel.from_pretrained(MODEL_NAME)
model.freeze()
model = model.to(DEVICE)
model.cur_decoder = "rnnt"  # good accuracy/speed tradeoff; use "ctc" for the CTC head instead
print("Model loaded. Server ready.")


def ensure_16k_mono_wav(input_path: str) -> str:
    """
    The model expects 16kHz, mono, 16-bit PCM WAV audio.
    The Android app already records in that format, but we re-encode defensively
    with ffmpeg in case a different file ever gets uploaded.
    """
    output_path = input_path + "_16k.wav"
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ac", "1", "-ar", "16000", "-sample_fmt", "s16",
        output_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0 or not os.path.exists(output_path):
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode(errors='ignore')}")
    return output_path


@app.get("/health")
def health():
    return {"status": "ok", "device": str(DEVICE)}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.filename.lower().endswith((".wav", ".m4a", ".mp3", ".3gp")):
        raise HTTPException(status_code=400, detail="Please upload a .wav (or .m4a/.mp3/.3gp) audio file")

    suffix = os.path.splitext(audio.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        tmp_in.write(await audio.read())
        raw_path = tmp_in.name

    try:
        wav_path = ensure_16k_mono_wav(raw_path)
        with torch.no_grad():
            text = model.transcribe([wav_path], batch_size=1, language_id="mr")[0]
        # NeMo may return a Hypothesis object depending on decoder; normalize to plain string
        text = text.text if hasattr(text, "text") else str(text)
        return {"text": text}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")
    finally:
        for p in (raw_path, raw_path + "_16k.wav"):
            if os.path.exists(p):
                os.remove(p)
