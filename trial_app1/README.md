# Marathi Speech-to-Text App (AI4Bharat)

Record audio on your phone → get Marathi text on screen, powered by AI4Bharat's
`indicconformer_stt_mr_hybrid_ctc_rnnt_large` model.

## Why there are two folders

AI4Bharat's Marathi ASR model is a 120M-parameter deep learning model that runs on
PyTorch/NeMo. There's no way to embed that directly inside an Android APK — it needs
a proper machine (ideally with a GPU) to run efficiently. So the app works like this:

```
[Your phone: record audio] → [Android app] → HTTP upload → [Python backend running AI4Bharat model] → text back → [shown on screen]
```

- `backend/` — a small Python server that loads the AI4Bharat model and exposes it as an API.
- `android/` — the Android Studio project (Kotlin) — the actual app you'll turn into an APK.

---

## PART 1 — Run the backend

You need a computer (your laptop, or a cloud VM) with Python 3.10+.

1. **Install dependencies** (ffmpeg is also required):
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Install ffmpeg if you don't have it:
   - Mac: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
   - Windows: download from ffmpeg.org and add it to PATH

2. **Start the server**:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
   The first run will download the AI4Bharat model from Hugging Face (a few GB) —
   this can take several minutes. You'll see `Model loaded. Server ready.` when it's done.

3. **Test it's alive**: open `http://localhost:8000/health` in a browser — you should see
   `{"status":"ok",...}`.

4. **Make it reachable from your phone.** Pick one:
   - **Same Wi-Fi as your laptop (easiest for testing):** find your laptop's LAN IP
     (`ipconfig` on Windows / `ifconfig` or `ip addr` on Mac/Linux, something like `192.168.1.23`).
     You'll use `http://192.168.1.23:8000` in the app.
   - **ngrok (works from anywhere, no port forwarding):**
     ```bash
     ngrok http 8000
     ```
     Use the `https://xxxx.ngrok-free.app` URL it gives you.
   - **Deploy properly:** put the backend on a cloud VM (ideally with a GPU, e.g. AWS/GCP/RunPod)
     and use its public URL. This is the right long-term option if you want the app to work
     for other people, not just on your own Wi-Fi.

---

## PART 2 — Configure and build the Android app

1. **Install Android Studio** (free, from developer.android.com/studio) if you don't have it.

2. **Open the project**: Android Studio → Open → select the `android/` folder from this project.
   Let Gradle sync (it will download dependencies — needs internet).

3. **Point the app at your backend**: open
   `android/app/src/main/java/com/example/marathistt/ApiClient.kt`
   and change the `BASE_URL` constant:
   - Emulator + backend running on the same laptop → keep `http://10.0.2.2:8000`
   - Real phone + backend on your laptop's Wi-Fi → `http://<laptop-LAN-ip>:8000`
   - ngrok / cloud deployment → the `https://...` URL from that step

4. **Run it**:
   - Plug in an Android phone via USB with USB debugging enabled (Settings → About phone →
     tap "Build number" 7 times → Developer options → enable USB debugging), or use an emulator.
   - Click the green ▶ Run button in Android Studio, select your device.
   - Grant the microphone permission when the app asks.
   - Tap **Start Recording**, speak in Marathi, tap **Stop Recording** — the transcribed
     text appears below.

5. **Build a shareable APK** (once you're happy with it):
   - Android Studio menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - When it finishes, click the "locate" link in the notification, or find the file at:
     `android/app/build/outputs/apk/debug/app-debug.apk`
   - Copy that `.apk` file to your phone and install it (you may need to allow
     "install from unknown sources").

   For a proper release build to share more widely, use **Build → Generate Signed Bundle / APK**
   instead, which walks you through creating a signing key — required before publishing
   to the Play Store.

---

## Notes / things to know

- **Accuracy**: `indicconformer` is one of the strongest open Marathi ASR models available,
  but background noise, mixed Hindi/Marathi speech, or heavy accents will affect accuracy.
- **Latency**: on CPU, transcription can take several seconds per sentence. A GPU backend
  is much faster. For a snappier UX, consider a shorter recording (a sentence or two at a time).
- **Costs**: running the backend on a cloud GPU costs money. Running it on your own laptop
  is free but only reachable while your laptop is on and connected.
- **Alternative to self-hosting**: AI4Bharat also has a public API layer (Bhashini,
  bhashini.gov.in) you can register for and swap into `ApiClient.kt` instead of your own
  backend, if you'd rather not host the model yourself. It requires its own API key/auth setup.
