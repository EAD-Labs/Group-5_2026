# AnkGuru (अंकगुरू) — Poster Presentation Content & Technical Rationale

**Application**: Offline AI-Powered Foundational Numeracy and Mental Math Learning App  
**Course**: ET 617 — Educational Application Development | IIT Bombay  
**Organization**: N+1 NGO ("One Story. One Idea. One Action")  
**Client Contact**: Mr. Amod Joshi  
**Student Team**: Lakshaditya Singh (23B2230), Aagam S Kasaliwal (23B2215), Aditya Anand Gupta (23B2144)  
**Application Version**: AnkGuru v3.2 Responsive Production Release (55.46 MB)  
**Target Users**: Grade 3–6 First-Generation Tribal Learners in Zilla Parishad & Ashram Schools, Palghar District  
**License**: Creative Commons Attribution 4.0 International (CC-BY-4.0)

---

## 01 Client Requirements & Problem Statement
*Tag: N+1 NGO • Rural Palghar Focus*

**Client Motto**: N+1 NGO — *"One Story. One Idea. One Action"*

### The Palghar Field Reality
- **First-generation tribal learners** (Classes 3 to 6) in Ashram and Zilla Parishad schools have little numeracy exposure at home.
- **Language & Sound Barrier**: Students struggle to link abstract numerical concepts to their spoken Marathi sounds and written Devanagari forms.
- **Large Multilingual Classes**: Teachers manage up to 40 students across multiple grades simultaneously and cannot provide continuous 1-on-1 monitoring.
- **Zero Internet Connectivity**: Deployment sites have no cellular data or Wi-Fi, rendering existing cloud-dependent EdTech apps unusable.

> **Core Problem Statement**: No personalised, interactive numeracy practice beyond class.

### Agreed Client Solution (HLD-V3)
1. **Spoken Marathi Multi-Modal Practice**: All prompts delivered in regional Marathi across 3 interactive modes (*Listen & Choose*, *Listen & Draw*, and *Speak & Verify*).
2. **100% Fully Offline Execution**: Standalone Android app — zero cloud APIs, zero internet, zero external hardware required.
3. **Encouraging Audio-Visual Feedback**: Instant auditory chime and encouraging Marathi voice response on every attempt, inviting immediate retry without negative penalty.
4. **Field-Tested MVP**: Developed across three structured milestones and pilot-tested with local tutoring students in collaboration with client Mr. Amod Joshi.

---

## 02 Target Learners & Personas
*Tags: Grades 3–6 • Marathi-First • First-Generation Learners*

### Primary Persona: Meera (Student)
- **Demographics**: Grade 4 student, 9–10 years old, rural Palghar district.
- **Profile**: First-generation learner; Marathi is her first language; limited prior smartphone exposure.
- **Goals**: Build number confidence (digits 1–100) and mental math fluency at her own pace, free from fear of embarrassment.
- **Needs**: Audio-first prompts and tactile drawing interactions that bypass reading barriers; large touch targets on a shared, low-cost Android phone.

### Facilitator Persona: Community Teacher / NGO Facilitator
- **Role**: Non-technical adult / community coordinator supporting classroom sessions for N+1 NGO.
- **Workload**: Manages large batches (~40 students) across multiple grades.
- **Goals**: Run clean, engaging numeracy practice sessions without getting bogged down by technical troubleshooting or manual paper grading.
- **Needs**: Reliable offline operation, zero login/password barriers, and effortless oral verification via the *Speak & Verify* mode.

### App Modalities Built Around the Personas
| Mode | In-App Marathi Title | Interaction Mechanic | Pedagogical Value |
| :--- | :--- | :--- | :--- |
| **Listen & Choose** | ऐका आणि निवडा | App speaks Marathi prompt aloud; student taps 1 of 4 randomized Devanagari cards. | Auditory number recognition and numeral matching for beginning learners. |
| **Listen & Draw** | ऐका आणि लिहा | App speaks number; student writes Devanagari digits on dual chalkboard slates (tens & units). | Tactile, activity-based motor memory connecting numeral sound directly to written stroke. |
| **Speak & Verify** | बोला आणि तपासा | Visual math prompt displayed; child speaks answer aloud, hears native Marathi audio, and verifies. | Pronunciation reinforcement, mental math articulation, and facilitator confirmation. |

---

## 03 Design & Development Process
*Tags: 3 Modes • Pilot-Tested • Iterated*

**Rationale**: To establish foundational numeracy, learners must connect a number's spoken sound to its mental quantity and written Devanagari form.

1. **Architecture & UI Mapping**: Designed the complete app layout, question count selector (5 to 20 questions), and 4 curriculum levels (1–10, 11–20, 21–50, 51–100).
2. **Milestone Decomposition**: Structured development into Milestone 1 (MCQ), Milestone 2 (Handwriting Scribble), and Milestone 3 (Spoken Oral Interaction).
3. **On-Device Marathi TTS**: Engineered a 3-tier cascading Devanagari speech engine (`mr-IN` → `hi-IN` → phonetic fallback) with Android 11+ package visibility query intents.
4. **Embedded Devanagari CNN**: Replaced naive stroke heuristics with a high-accuracy 156,000-parameter Convolutional Neural Network trained on handwritten Devanagari numerals (०–९).
5. **Offline ASR Bottleneck**: Benchmarked Whisper.rn, AI4Bharat IndicWav2Vec, and Sarvam. Running offline speech recognition on entry-level Android devices led to 6–15 second latency, severe thermal throttling, and massive APK bloat (>198 MB).
6. **Strategic Pivot to 'Speak & Verify'**: Improvised the oral interaction into an engaging "Speak & Verify" loop: prompts child articulation, plays pristine regional pronunciation, and enables facilitator confirmation with 0 ms latency.
7. **System Integration & Optimization**: Merged all engines into a single standalone React Native bare workflow APK, slashing binary size by 72.1% (from 198.4 MB down to 55.45 MB).
8. **Pilot Refinements for Tribal Learners**: Implemented 2D integral bounding-box normalization, enlarged dual slates to tall rectangular chalkboard geometries (220px), and added secondary runner-up probability acceptance ($\ge 20\%$) for ambiguous strokes.

> **Outcome**: A production-ready, 100% offline educational application (v3.2 Responsive, 55.46 MB) satisfying all core HLD requirements.

---

## 04 Current Status & Working Application
*Tags: 3 Modes Live • 100% Offline*

**Operational Status**: Final Release v3.2 (Responsive) is compiled, signed, and production-tested on Android API levels 24 to 35+ (Android 7.0 through Android 15). All three interactive modes are live, stable, and completely offline.

### Screen & Interface Breakdown
- **Home Screen (Choose a Mode)**: Practice level selector (1–4), interactive mode cards, and question count selector (5 to 20 questions) with smooth hardware back button navigation.
- **Listen & Choose (Basic Listening)**: High-contrast Devanagari answer cards; auto-plays audio prompt with settling-delay protection against sound clipping.
- **Listen & Draw (Dual Slate Scribble)**: Independent tall rectangular chalkboard slates for Tens (दशक) and Units (एकक) with offline CNN inference, responsive height clamping, and locked touch viewport preventing screen drift on compact phones.
- **Speak & Verify (Oral Practice)**: Clear math problem prompt, child articulation instruction, and instant Marathi pronunciation playback with facilitator confirmation.

**Live Release**: Listen & Choose (MCQ) + Listen & Draw (Dual Slates) + Speak & Verify (Oral Practice)  
**APK Download**: Download `AnkGuru-v3.2-Responsive.apk` (55.46 MB) directly via Google Drive: [Download APK v3.2](https://drive.google.com/file/d/1aKDtSQNlxlnIVq79fnIzRep6o6aBYD3f/view?usp=sharing)

---

## 05 Client Feedback & How We Acted
*Tags: 3 Modes Reviewed • Client-Approved*

**Feedback Source**: Mr. Amod Joshi (Tutoring Pilot Trials)

| Pipeline Component | Client Observation & Spoken Feedback | How the Engineering Team Acted |
| :--- | :--- | :--- |
| **1. Listen & Choose** *(MCQ Mode)* | Audio prompts and randomized MCQ cards functioned reliably during tutoring pilot sessions. | Maintained core flow and added a 3-tier Marathi audio fallback cascade (`mr-IN` → `hi-IN` → phonetics) for universal device compatibility. |
| **2. Listen & Draw** *(Scribble Mode)* | *"Students love the scribble mode because it's an activity-based item... but accuracy was initially poor on handwritten strokes."* — Mr. Amod Joshi | Collected synthetic Devanagari stroke variations, retuned the CNN, and added a $\ge 20\%$ secondary runner-up threshold for ambiguous strokes (१, २, ८, ९). Enlarged slates to 220px tall rectangles. |
| **3. Speaking Mode** *(Oral Practice)* | *"Out of the three modes... the third mode (talk mode) we couldn't complete in time [due to on-device ASR limits]."* — Mr. Amod Joshi | Pivoted from unreliable heavy ASR to "Speak & Verify" — prompts child articulation, plays pristine Marathi audio, and allows teacher validation with 0 ms latency. |

> **Outcome**: Client verified that the application is robust, highly engaging for children, and ready for school deployment.

---

## 06 Implementation & Future Scope
*Tags: 3 Next Steps • Offline-First*

**Roadmap**: *Speak It • Track It • Scale It*

1. **Dedicated Edge ASR for Devanagari Digits**: Train a lightweight quantized acoustic model (under 10 MB) specifically for Devanagari numeral keywords (०–९९) to automate oral scoring without heavy general-purpose ASR overhead.
2. **Offline Learner Profiles & Local SQLite Database**: Implement an on-device database to maintain per-student profiles, logging individual mastery, common stroke confusions, and accuracy trends over time without internet access.
3. **Quasi-Experimental Field Study in Palghar Schools**: *"The plan is to do a quasi-experimental study to see what sort of effect size and statistical significance do we see."* — Mr. Amod Joshi. Deploy across Palghar Zilla Parishad and Ashram schools to measure empirical learning gains against traditional instruction.
4. **Extended Curriculum Beyond 2-Digit Arithmetic**: Expand the problem generation engine from 2-digit numbers to 3-digit operations (९९ → ९९९+), word problems, and division foundations.

> **Ultimate Goal**: A personalized, 100% offline learning companion empowering every rural tribal learner in Maharashtra.
