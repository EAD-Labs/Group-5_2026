import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator,
  StatusBar, Dimensions, ScrollView, Platform, PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import SignatureScreen from 'react-native-signature-canvas';
import { WebView } from 'react-native-webview';
import { initWhisper } from 'whisper.rn';
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { getMlHtml } from '../utils/mlHtml';

// ─── Constants ───────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = Dimensions.get('window').height * 0.32;
const NUM_QUESTIONS = 5;
const MODEL_ASSET = require('../assets/models/ggml-base.bin');

// ─── Marathi Numbers (0-99) ──────────────────────────────────────────
const MARATHI_DIGITS = ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नउ'];
const MARATHI_NUMBERS = [
  "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नउ", "दहा",
  "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस", "वीस",
  "एकवीस", "बावीस", "तेवीस", "चोवीस", "पंचवीस", "सव्वीस", "सत्तावीस", "अठ्ठावीस", "एकोणतीस", "तीस",
  "एकतीस", "बत्तीस", "तेहतीस", "चौतीस", "पस्तीस", "छत्तीस", "सदतीस", "अडतीस", "एकोणचाळीस", "चाळीस",
  "एकेचाळीस", "बेचाळीस", "त्रेचाळीस", "चव्वेचाळीस", "पंचेचाळीस", "शेहेचाळीस", "सत्तेचाळीस", "अठ्ठेचाळीस", "एकोणपन्नास", "पन्नास",
  "एकावन्न", "बावन", "त्रेपन्न", "चोपन्न", "पंचावन्न", "छप्पन्न", "सत्तावन्न", "अठ्ठावन्न", "एकोणसाठ", "साठ",
  "एकसष्ट", "बासष्ट", "त्रेसष्ट", "चौसष्ट", "पासष्ट", "सहासष्ट", "सदुसष्ट", "अडुसष्ट", "एकोणसत्तर", "सत्तर",
  "एकाहत्तर", "बहात्तर", "त्र्याहत्तर", "चौऱ्याहत्तर", "पंच्याहत्तर", "शहात्तर", "सत्याहत्तर", "अठ्ठ्याहत्तर", "एकोणऐंशी", "ऐंशी",
  "एकाऐंशी", "ब्याऐंशी", "त्र्याऐंशी", "चौऱ्याऐंशी", "पंच्याऐंशी", "शहाऐंशी", "सत्याऐंशी", "अठ्ठ्याऐंशी", "एकोणनव्वद", "नव्वद",
  "एक्याण्णव", "ब्याण्णव", "त्र्याण्णव", "चौऱ्याण्णव", "पंचाण्णव", "शहाण्णव", "सत्याण्णव", "अठ्ठ्याण्णव", "नव्व्याण्णव",
];

// ─── English Number Words → Numeric ─────────────────────────────────
const ENGLISH_WORD_MAP = {};
const ENGLISH_WORDS = [
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty',
  'twenty one','twenty two','twenty three','twenty four','twenty five','twenty six','twenty seven','twenty eight','twenty nine','thirty',
  'thirty one','thirty two','thirty three','thirty four','thirty five','thirty six','thirty seven','thirty eight','thirty nine','forty',
  'forty one','forty two','forty three','forty four','forty five','forty six','forty seven','forty eight','forty nine','fifty',
  'fifty one','fifty two','fifty three','fifty four','fifty five','fifty six','fifty seven','fifty eight','fifty nine','sixty',
  'sixty one','sixty two','sixty three','sixty four','sixty five','sixty six','sixty seven','sixty eight','sixty nine','seventy',
  'seventy one','seventy two','seventy three','seventy four','seventy five','seventy six','seventy seven','seventy eight','seventy nine','eighty',
  'eighty one','eighty two','eighty three','eighty four','eighty five','eighty six','eighty seven','eighty eight','eighty nine','ninety',
  'ninety one','ninety two','ninety three','ninety four','ninety five','ninety six','ninety seven','ninety eight','ninety nine',
];
ENGLISH_WORDS.forEach((w, i) => { ENGLISH_WORD_MAP[w] = i + 1; });
// Also add hyphenated versions
ENGLISH_WORDS.forEach((w, i) => { ENGLISH_WORD_MAP[w.replace(/ /g, '-')] = i + 1; });

function parseEnglishNumber(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim();
  // Try direct number
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= 99) return num;
  // Try word map
  if (ENGLISH_WORD_MAP[clean] !== undefined) return ENGLISH_WORD_MAP[clean];
  // Try each word
  const words = clean.split(/\s+/);
  for (const w of words) {
    if (ENGLISH_WORD_MAP[w] !== undefined) return ENGLISH_WORD_MAP[w];
    const n = parseInt(w, 10);
    if (!isNaN(n) && n >= 1 && n <= 99) return n;
  }
  return null;
}

// ─── Dynamic Math Generation ─────────────────────────────────────────
function generateQuestion(maxAnswer = 99) {
  const answer = Math.floor(Math.random() * maxAnswer) + 1; // 1 to maxAnswer
  const a = Math.floor(Math.random() * answer);
  const b = answer - a;
  const tens_a = Math.floor(a / 10);
  const ones_a = a % 10;
  const tens_b = Math.floor(b / 10);
  const ones_b = b % 10;

  // Build Marathi spoken form for TTS
  const marathiA = a === 0 ? MARATHI_DIGITS[0] : (MARATHI_NUMBERS[a - 1] || String(a));
  const marathiB = b === 0 ? MARATHI_DIGITS[0] : (MARATHI_NUMBERS[b - 1] || String(b));

  return {
    display: a + ' + ' + b + ' = ?',
    marathi: marathiA + ' अधिक ' + marathiB,
    answer,
    answerMarathi: MARATHI_NUMBERS[answer - 1] || String(answer),
  };
}

function generateMCQOptions(correct) {
  const options = new Set([correct]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    let opt = correct + offset;
    if (opt < 1) opt = Math.floor(Math.random() * 99) + 1;
    if (opt > 99) opt = Math.floor(Math.random() * 99) + 1;
    options.add(opt);
  }
  return [...options].sort(() => Math.random() - 0.5);
}

// ─── Screens ─────────────────────────────────────────────────────────
const MODE_DATA = [
  { key: 'mcq', title: 'Listen & Choose', subtitle: 'ऐका आणि निवडा', desc: 'App speaks Marathi, pick the right answer', icon: 'grid', color: '#F6A64A', bg: '#FFF8EE' },
  { key: 'scribble', title: 'Listen & Draw', subtitle: 'ऐका आणि लिहा', desc: 'App speaks, you draw the number', icon: 'edit-2', color: '#48A995', bg: '#EEFBF7' },
  { key: 'voice', title: 'Look & Speak', subtitle: 'पहा आणि बोला', desc: 'See question, speak answer in English (offline)', icon: 'mic', color: '#7184E6', bg: '#F0F0FF' },
];

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function AnkGuruHome() {
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState('mcq');
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);

  const startGame = (selectedMode) => {
    setMode(selectedMode);
    const qs = Array.from({ length: NUM_QUESTIONS }, () => generateQuestion(99));
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setScreen('practice');
  };

  const handleAnswer = (correct) => {
    if (correct) setScore(s => s + 1);
    if (qIndex + 1 >= NUM_QUESTIONS) {
      setScreen('summary');
    } else {
      setQIndex(i => i + 1);
    }
  };

  if (screen === 'home') return <HomeScreen onStart={startGame} />;
  if (screen === 'summary') return <SummaryScreen score={score} total={NUM_QUESTIONS} onRestart={() => startGame(mode)} onGoHome={() => setScreen('home')} />;

  const q = questions[qIndex];
  if (!q) return null;

  return (
    <PracticeScreen
      mode={mode}
      question={q}
      qNumber={qIndex + 1}
      total={NUM_QUESTIONS}
      onAnswer={handleAnswer}
      onBack={() => setScreen('home')}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═════════════════════════════════════════════════════════════════════
function HomeScreen({ onStart }) {
  const cardAnims = useRef(MODE_DATA.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(120, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 })
    )).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.homeContainer}>
        <View style={styles.homeHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Feather name="sun" size={22} color="#FFF" />
            </View>
            <Text style={styles.brandText}>AnkGuru</Text>
          </View>
          <Text style={styles.homeSubtitle}>गणित शिका • Learn Math • 100% Offline</Text>
        </View>

        <View style={styles.cardsContainer}>
          {MODE_DATA.map((m, i) => {
            const translateY = cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
            const opacity = cardAnims[i];
            return (
              <Animated.View key={m.key} style={{ opacity, transform: [{ translateY }] }}>
                <Pressable
                  onPress={() => onStart(m.key)}
                  style={({ pressed }) => [
                    styles.modeCard,
                    { backgroundColor: m.bg, borderColor: m.color },
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={[styles.modeIconCircle, { backgroundColor: m.color }]}>
                    <Feather name={m.icon} size={26} color="#FFF" />
                  </View>
                  <View style={styles.modeCardText}>
                    <Text style={[styles.modeTitle, { color: m.color }]}>{m.title}</Text>
                    <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                  </View>
                  <Feather name="chevron-right" size={22} color={m.color} />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.footerText}>Tap a mode to start • 5 questions • Numbers 1-99</Text>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PRACTICE SCREEN
// ═════════════════════════════════════════════════════════════════════
function PracticeScreen({ mode, question, qNumber, total, onAnswer, onBack }) {
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const feedbackTimeout = useRef(null);
  const modeInfo = MODE_DATA.find(m => m.key === mode);

  useEffect(() => {
    setFeedback(null);
    return () => { if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current); };
  }, [question]);

  useEffect(() => {
    if (mode !== 'voice') speakQuestion();
  }, [question, mode]);

  const speakQuestion = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    // Try Marathi first, fallback to English reading of the expression
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const hasMarathi = voices.some(v => v.language && v.language.startsWith('mr'));
      if (hasMarathi) {
        Speech.speak(question.marathi, {
          language: 'mr-IN',
          rate: 0.85,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => {
            // Fallback to English
            Speech.speak(question.display.replace('?', 'what'), {
              language: 'en-IN',
              rate: 0.85,
              onDone: () => setIsSpeaking(false),
              onStopped: () => setIsSpeaking(false),
              onError: () => setIsSpeaking(false),
            });
          },
        });
      } else {
        // No Marathi TTS available, use English
        Speech.speak(question.display.replace('?', 'what'), {
          language: 'en-IN',
          rate: 0.85,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (e) {
      Speech.speak(question.display.replace('?', 'what'), {
        language: 'en-IN',
        rate: 0.85,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const submitAnswer = (userAnswer) => {
    if (feedback) return;
    const correct = userAnswer === question.answer;
    setFeedback({ correct, userAnswer });
    feedbackTimeout.current = setTimeout(() => onAnswer(correct), 1800);
  };

  const progressPct = (qNumber / total) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.practiceContainer}>
        <View style={styles.practiceTopBar}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#17324D" />
          </Pressable>
          <Text style={[styles.practiceTitle, { color: modeInfo.color }]}>{modeInfo.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressPct + '%', backgroundColor: modeInfo.color }]} />
        </View>
        <Text style={styles.progressText}>Question {qNumber} of {total}</Text>

        <View style={styles.questionCard}>
          {mode === 'voice' ? (
            <>
              <Text style={styles.qLabel}>What is:</Text>
              <Text style={styles.qText}>{question.display}</Text>
              <Text style={styles.qHint}>Speak the answer in English</Text>
            </>
          ) : (
            <>
              <Text style={styles.qLabel}>{mode === 'scribble' ? 'Solve & Draw the answer:' : 'Listen to the question'}</Text>
              <Text style={styles.qText}>{question.display}</Text>
              <Pressable onPress={speakQuestion} style={styles.speakBtn}>
                <Feather name={isSpeaking ? 'volume-2' : 'play-circle'} size={28} color={isSpeaking ? modeInfo.color : '#8A969E'} />
                <Text style={[styles.speakText, isSpeaking && { color: modeInfo.color }]}>
                  {isSpeaking ? 'Speaking...' : 'Tap to hear'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <ScrollView style={styles.interactionArea} contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
          {mode === 'mcq' && !feedback && (
            <MCQPanel question={question} onSelect={submitAnswer} color={modeInfo.color} />
          )}
          {mode === 'scribble' && !feedback && (
            <ScribblePanel question={question} onResult={submitAnswer} color={modeInfo.color} />
          )}
          {mode === 'voice' && !feedback && (
            <VoicePanel question={question} onResult={submitAnswer} color={modeInfo.color} />
          )}

          {feedback && (
            <View style={[styles.feedbackCard, feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <Feather name={feedback.correct ? 'check-circle' : 'x-circle'} size={36} color="#FFF" />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.feedbackTitle}>{feedback.correct ? 'Correct! बरोबर!' : 'Wrong! चुकीचे!'}</Text>
                <Text style={styles.feedbackSub}>Answer: {question.answer} ({question.answerMarathi})</Text>
                {feedback.userAnswer !== undefined && (
                  <Text style={[styles.feedbackSub, { marginTop: 4, fontStyle: 'italic', opacity: 0.9, fontSize: 13 }]}>
                    (Detected: {feedback.userAnswer})
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MCQ PANEL
// ═════════════════════════════════════════════════════════════════════

const toDevanagari = (num) => {
  const digits = ['०','१','२','३','४','५','६','७','८','९'];
  return num.toString().split('').map(d => digits[parseInt(d)]).join('');
};

function MCQPanel({ question, onSelect, color }) {
  const options = React.useMemo(() => generateMCQOptions(question.answer), [question]);
  return (
    <View style={styles.mcqGrid}>
      {options.map((opt, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect(opt)}
          style={({ pressed }) => [
            styles.mcqOption,
            pressed && { backgroundColor: color, transform: [{ scale: 0.95 }] },
          ]}
        >
          <Text style={styles.mcqText}>{toDevanagari(opt)}</Text>
          <Text style={styles.mcqMarathi}>{MARATHI_NUMBERS[opt - 1] || opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCRIBBLE PANEL (2-digit support)
// ═════════════════════════════════════════════════════════════════════
function ScribblePanel({ question, onResult, color }) {
  const sigRef1 = useRef(null);
  const sigRef2 = useRef(null);
  const mlWebViewRef = useRef(null);
  const [hasDrawn1, setHasDrawn1] = useState(false);
  const [hasDrawn2, setHasDrawn2] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // queue holds refs to process: ['ref1', 'ref2']
  const processingQueue = useRef([]);
  const firstDigit = useRef(null);
  
  const isTwoDigit = question.answer >= 10;
  const canSubmit = isTwoDigit ? (hasDrawn1 && hasDrawn2) : hasDrawn1;

  useEffect(() => {
    setHasDrawn1(false);
    setHasDrawn2(false);
    setIsProcessing(false);
    processingQueue.current = [];
    firstDigit.current = null;
    if (sigRef1.current) sigRef1.current.clearSignature();
    if (sigRef2.current) sigRef2.current.clearSignature();
  }, [question]);

  const handleSubmit = () => {
    if (isProcessing || !canSubmit) return;
    setIsProcessing(true);
    
    if (isTwoDigit) {
      processingQueue.current = ['ref2']; // next to process after ref1
      sigRef1.current.readSignature(); // start with first digit
    } else {
      processingQueue.current = [];
      sigRef1.current.readSignature();
    }
  };

  const handleSignatureOK = (signature) => {
    if (mlWebViewRef.current) mlWebViewRef.current.postMessage(signature);
  };

  const handleMlMessage = (event) => {
    try {
      const result = JSON.parse(event.nativeEvent.data);
      if (result.type === 'prediction') {
        const digit = result.digit;
        if (digit === -1) {
          setIsProcessing(false);
          return;
        }

        if (processingQueue.current.length > 0) {
          // Finished first digit of a two-digit number
          firstDigit.current = digit;
          const nextRefStr = processingQueue.current.shift();
          if (nextRefStr === 'ref2' && sigRef2.current) {
             sigRef2.current.readSignature();
          }
        } else {
          // Finished last digit (or only digit)
          setIsProcessing(false);
          if (isTwoDigit && firstDigit.current !== null) {
            onResult(firstDigit.current * 10 + digit);
          } else {
            onResult(digit);
          }
        }
      }
    } catch (err) {
      console.error('ML parse error:', err);
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    if (sigRef1.current) sigRef1.current.clearSignature();
    if (sigRef2.current) sigRef2.current.clearSignature();
    setHasDrawn1(false);
    setHasDrawn2(false);
  };

  const canvasWebStyle = '.m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; } .m-signature-pad--body { border: none; } .m-signature-pad--footer { display: none; } body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #F8FAFC; } canvas { width: 100% !important; height: 100% !important; }';

  return (
    <View>
      <WebView
        ref={mlWebViewRef}
        source={{ html: getMlHtml() }}
        onMessage={handleMlMessage}
        style={{ width: 0, height: 0, position: 'absolute' }}
      />

      {isTwoDigit && (
        <View style={styles.digitStepRow}>
          <View style={[styles.digitStepBadge, { flex: 1, marginRight: 4, alignItems: 'center' }]}>
            <Text style={styles.digitStepText}>10s Digit (Tens)</Text>
          </View>
          <View style={[styles.digitStepBadge, { flex: 1, marginLeft: 4, alignItems: 'center' }]}>
            <Text style={styles.digitStepText}>1s Digit (Units)</Text>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', width: '100%', height: CANVAS_HEIGHT, borderColor: color, borderWidth: 2, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
        <View style={{ flex: 1, borderRightWidth: isTwoDigit ? 2 : 0, borderRightColor: '#E2E8F0' }}>
          <SignatureScreen
            ref={sigRef1}
            onOK={handleSignatureOK}
            onBegin={() => setHasDrawn1(true)}
            onEmpty={() => setHasDrawn1(false)}
            webStyle={canvasWebStyle}
            backgroundColor="#F8FAFC"
            penColor="#17324D"
            minWidth={4}
            maxWidth={8}
            dotSize={6}
            trimWhitespace={true}
          />
        </View>
        {isTwoDigit && (
          <View style={{ flex: 1 }}>
            <SignatureScreen
              ref={sigRef2}
              onOK={handleSignatureOK}
              onBegin={() => setHasDrawn2(true)}
              onEmpty={() => setHasDrawn2(false)}
              webStyle={canvasWebStyle}
              backgroundColor="#F8FAFC"
              penColor="#17324D"
              minWidth={4}
              maxWidth={8}
              dotSize={6}
              trimWhitespace={true}
            />
          </View>
        )}
      </View>

      <View style={styles.canvasBtnRow}>
        <Pressable onPress={handleClear} style={[styles.canvasBtn, { borderColor: '#E95757' }]}>
          <Feather name="trash-2" size={18} color="#E95757" />
          <Text style={[styles.canvasBtnText, { color: '#E95757' }]}>Clear All</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          style={[styles.canvasBtn, styles.canvasSubmitBtn, { backgroundColor: canSubmit ? color : '#CCC' }]}
          disabled={!canSubmit || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Feather name="check" size={18} color="#FFF" />
              <Text style={[styles.canvasBtnText, { color: '#FFF' }]}>Submit</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// VOICE PANEL (Whisper Offline English)
// ═════════════════════════════════════════════════════════════════════
function VoicePanel({ question, onResult, color }) {
  const [whisperCtx, setWhisperCtx] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const audioChunks = useRef([]);
  const isTranscribingRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Load Whisper model
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log('[ASR] Loading Whisper Base model...');
        const ctx = await initWhisper({ filePath: MODEL_ASSET });
        if (!cancelled) {
          setWhisperCtx(ctx);
          setIsLoading(false);
          console.log('[ASR] Whisper Base loaded successfully');
        }
      } catch (err) {
        console.error('[ASR] Whisper load error:', err);
        setError('Failed to load AI model');
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Mic permission
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }
  }, []);

  // Pulse animation
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(0);
  }, [isRecording]);

  const startRecording = async () => {
    if (!whisperCtx || isRecording || isProcessing) return;
    Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true }).start();

    audioChunks.current = [];
    setTranscript('');
    setError('');

    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
    });

    LiveAudioStream.on('data', (data) => {
      audioChunks.current.push(data);
    });

    LiveAudioStream.start();
    setIsRecording(true);
    console.log('[ASR] Recording started');
  };

  const stopRecording = async () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    if (!isRecording) return;

    LiveAudioStream.stop();
    setIsRecording(false);
    setIsProcessing(true);
    console.log('[ASR] Recording stopped, chunks:', audioChunks.current.length);

    try {
      // Convert base64 PCM chunks to WAV file
      const pcmBuffers = audioChunks.current.map(b64 => Buffer.from(b64, 'base64'));
      const totalLength = pcmBuffers.reduce((sum, buf) => sum + buf.length, 0);
      const pcmData = Buffer.concat(pcmBuffers, totalLength);

      // Create WAV header
      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + pcmData.length, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(1, 22);
      wavHeader.writeUInt32LE(16000, 24);
      wavHeader.writeUInt32LE(32000, 28);
      wavHeader.writeUInt16LE(2, 32);
      wavHeader.writeUInt16LE(16, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(pcmData.length, 40);

      const wavBuffer = Buffer.concat([wavHeader, pcmData]);
      const wavPath = FileSystem.cacheDirectory + 'voice_input.wav';
      await FileSystem.writeAsStringAsync(wavPath, wavBuffer.toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Transcribe with Whisper (English)
      // Wait if another transcription is still running
      if (isTranscribingRef.current) {
        console.log('[ASR] Waiting for previous transcription to finish...');
        let retries = 0;
        while (isTranscribingRef.current && retries < 30) {
          await new Promise(r => setTimeout(r, 200));
          retries++;
        }
      }
      isTranscribingRef.current = true;
      console.log('[ASR] Transcribing with Whisper...');
      let result;
      try {
        const transcribeRes = whisperCtx.transcribe(wavPath, {
          language: 'en',
          tokenTimestamps: false,
        });
        result = await transcribeRes.promise;
      } finally {
        isTranscribingRef.current = false;
      }

      console.log('[ASR] Full Whisper result object:', JSON.stringify(result));
      const rawText = (result?.result || '').trim();
      console.log('[ASR] Whisper result:', rawText);
      setTranscript(rawText);

      // Parse the English result
      const parsed = parseEnglishNumber(rawText);
      if (parsed !== null) {
        console.log('[ASR] Parsed number:', parsed);
        setTimeout(() => onResult(parsed), 500);
      } else {
        setError('Could not understand. Try again.');
      }
    } catch (err) {
      console.error('[ASR] Transcription error:', err);
      setError('Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  if (isLoading) {
    return (
      <View style={styles.voiceContainer}>
        <ActivityIndicator size="large" color={color} />
        <Text style={styles.voiceHint}>Loading AI Model...</Text>
      </View>
    );
  }

  return (
    <View style={styles.voiceContainer}>
      <Text style={styles.voiceHint}>
        {isProcessing ? '⚙️ Processing...' : isRecording ? '🎤 Listening... Release to stop' : error ? '❌ ' + error : '🎤 Hold the button & speak in English'}
      </Text>

      <View style={styles.micWrapper}>
        {isRecording && (
          <Animated.View style={[styles.pulseRing, { opacity: pulseOpacity, backgroundColor: color }]} />
        )}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            style={[styles.micButton, { backgroundColor: isRecording ? '#4CAF50' : isProcessing ? '#888' : color }]}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <>
                <Feather name={isRecording ? 'radio' : 'mic'} size={42} color="#FFF" />
                <Text style={styles.micLabel}>{isRecording ? 'Listening...' : 'Hold to Speak'}</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Whisper heard:</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}

      <View style={styles.offlineBadge}>
        <Feather name="wifi-off" size={14} color="#48A995" />
        <Text style={styles.offlineText}>100% Offline • No internet needed</Text>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SUMMARY SCREEN
// ═════════════════════════════════════════════════════════════════════
function SummaryScreen({ score, total, onRestart, onGoHome }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 60 ? '🎉' : '💪';
  const message = pct === 100 ? 'Perfect! शाबास!' : pct >= 60 ? 'Great Job! छान!' : 'Keep Practicing! पुन्हा प्रयत्न करा!';

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F0F9FF' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F9FF" />
      <View style={styles.summaryContainer}>
        <Animated.View style={[styles.summaryCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.summaryEmoji}>{emoji}</Text>
          <Text style={styles.summaryTitle}>Session Complete!</Text>
          <Text style={styles.summaryMessage}>{message}</Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{total}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={[styles.statNum, { color: '#48A995' }]}>{score}</Text>
              <Text style={styles.statLabel}>Correct ✓</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={[styles.statNum, { color: '#E95757' }]}>{total - score}</Text>
              <Text style={styles.statLabel}>Wrong ✗</Text>
            </View>
          </View>

          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: pct + '%' }]} />
          </View>
          <Text style={styles.scorePct}>{pct}% Accuracy</Text>
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: 14, width: '100%' }}>
          <Pressable onPress={onGoHome} style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.8 }]}>
            <Feather name="home" size={22} color="#17324D" style={{ marginRight: 8 }} />
            <Text style={styles.homeBtnText}>Home</Text>
          </Pressable>
          <Pressable onPress={onRestart} style={({ pressed }) => [styles.restartBtn, { flex: 1 }, pressed && { opacity: 0.8 }]}>
            <Feather name="refresh-cw" size={22} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.restartText}>Play Again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  homeContainer: { flex: 1, paddingHorizontal: 22 },
  homeHeader: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F6A64A', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 28, fontWeight: '800', color: '#17324D' },
  homeSubtitle: { fontSize: 15, color: '#7A8994', marginTop: 4, fontWeight: '600' },
  cardsContainer: { flex: 1, justifyContent: 'center', gap: 16 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20,
    borderWidth: 2, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  modeIconCircle: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modeCardText: { flex: 1 },
  modeTitle: { fontSize: 18, fontWeight: '800' },
  modeSubtitle: { fontSize: 13, color: '#7A8994', fontWeight: '600', marginTop: 1 },
  modeDesc: { fontSize: 12, color: '#A1ADB4', marginTop: 3 },
  footerText: { textAlign: 'center', color: '#A1ADB4', fontSize: 13, paddingBottom: 16, fontWeight: '600' },

  practiceContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  practiceTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' },
  practiceTitle: { fontSize: 18, fontWeight: '800' },
  progressBar: { height: 6, backgroundColor: '#EEF2F6', borderRadius: 99, marginHorizontal: 18, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  progressText: { fontSize: 13, color: '#7A8994', textAlign: 'center', marginTop: 6, fontWeight: '600' },
  questionCard: {
    margin: 18, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#17324D', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  qLabel: { fontSize: 14, color: '#7A8994', fontWeight: '700', marginBottom: 6 },
  qText: { fontSize: 42, fontWeight: '800', color: '#17324D', letterSpacing: 1 },
  qHint: { fontSize: 13, color: '#A1ADB4', marginTop: 8, fontWeight: '600' },
  speakBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  speakText: { fontSize: 16, color: '#8A969E', fontWeight: '700' },
  interactionArea: { flex: 1, paddingHorizontal: 18 },

  mcqGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  mcqOption: {
    width: '47%', backgroundColor: '#FFF', height: 90, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#17324D', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  mcqText: { fontSize: 28, fontWeight: '800', color: '#17324D' },
  mcqMarathi: { fontSize: 13, color: '#7A8994', marginTop: 2, fontWeight: '600' },

  digitStepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  digitStepBadge: { backgroundColor: '#EEF2F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  digitStepText: { fontSize: 13, fontWeight: '700', color: '#17324D' },
  canvasContainer: { borderWidth: 2, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  canvasBtnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  canvasBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 16, borderWidth: 2, borderColor: '#DDE7EE',
  },
  canvasSubmitBtn: { borderWidth: 0 },
  canvasBtnText: { fontSize: 16, fontWeight: '700' },

  voiceContainer: { alignItems: 'center', paddingTop: 8 },
  voiceHint: { fontSize: 14, color: '#7A8994', fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  micWrapper: { position: 'relative', width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  pulseRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  micButton: {
    width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowColor: '#7184E6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
  },
  micLabel: { fontSize: 12, fontWeight: '700', color: '#FFF', marginTop: 4 },
  transcriptBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, width: '100%', marginBottom: 16 },
  transcriptLabel: { fontSize: 12, color: '#7A8994', fontWeight: '700' },
  transcriptText: { fontSize: 24, fontWeight: '800', color: '#17324D', marginTop: 4 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEFBF7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  offlineText: { fontSize: 12, color: '#48A995', fontWeight: '600' },

  feedbackCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginTop: 16 },
  feedbackCorrect: { backgroundColor: '#48A995' },
  feedbackWrong: { backgroundColor: '#E95757' },
  feedbackTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  feedbackSub: { fontSize: 14, color: '#FFF', opacity: 0.9, marginTop: 2 },

  summaryContainer: { flex: 1, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 32, padding: 28, alignItems: 'center',
    shadowColor: '#17324D', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8, marginBottom: 28,
  },
  summaryEmoji: { fontSize: 72, marginBottom: 10 },
  summaryTitle: { fontSize: 30, fontWeight: '800', color: '#17324D' },
  summaryMessage: { fontSize: 16, color: '#5C6B76', marginTop: 8, marginBottom: 22, textAlign: 'center' },
  statRow: { flexDirection: 'row', width: '100%', backgroundColor: '#F8FAFC', borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: '#DDE7EE' },
  statNum: { fontSize: 30, fontWeight: '800', color: '#17324D' },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#8A969E', marginTop: 3 },
  scoreBar: { width: '100%', height: 8, backgroundColor: '#EEF2F6', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  scoreBarFill: { height: '100%', backgroundColor: '#48A995', borderRadius: 99 },
  scorePct: { fontSize: 14, fontWeight: '700', color: '#7A8994' },
  restartBtn: {
    width: '100%', height: 64, borderRadius: 20, backgroundColor: '#F6A64A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F6A64A', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  restartText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  homeBtn: {
    height: 64, borderRadius: 20, backgroundColor: '#EEF2F6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  homeBtnText: { fontSize: 18, fontWeight: '800', color: '#17324D' },
});

