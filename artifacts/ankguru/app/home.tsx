import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  StatusBar, Dimensions, ScrollView, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { WebView } from 'react-native-webview';
import { getScribbleEngineHtml } from '../utils/scribbleEngineHtml';

export const toDevanagari = (str: any): string => {
  if (str === undefined || str === null) return '';
  const digits = ['०','१','२','३','४','५','६','७','८','९'];
  return str.toString().replace(/[0-9]/g, (match: string) => digits[parseInt(match, 10)]);
};

// ─── Marathi Numbers (0-99) ──────────────────────────────────────────
const MARATHI_DIGITS = ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'];
const MARATHI_NUMBERS = [
  "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ", "दहा",
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


const MARATHI_PHONETICS: string[] = [
  "shunya", "ek", "don", "teen", "chaar", "paach", "saha", "saat", "aath", "nau",
  "daha", "akara", "baara", "tera", "chauda", "pandhara", "sola", "satra", "athara", "ekonis", "vis",
  "ekvis", "baavis", "tevis", "chovis", "panchvis", "savvis", "sattavis", "atthavis", "ekontis", "tis",
  "ektis", "battis", "tehtis", "chautis", "pastis", "chhattis", "sadtis", "adtis", "ekonchalis", "chalis",
  "ekechalis", "bechalis", "trechalis", "chavvechalis", "panchechalis", "shehechalis", "sattechalis", "aththechalis", "ekonpannas", "pannas",
  "ekaavanna", "baavan", "trepann", "chopann", "panchaavanna", "chhappann", "sattaavann", "atthaavann", "ekonsaath", "saath",
  "eksasht", "baasasht", "tresasht", "chausasht", "paasasht", "sahaasasht", "sadusasht", "adusasht", "ekonsattar", "sattar",
  "ekaahattar", "bahaattar", "tryaahattar", "chauryaahattar", "panchyaahattar", "shahaattar", "sattyaahattar", "aththyaahattar", "ekonainshi", "ainshi",
  "ekaainshi", "byaainshi", "tryaainshi", "chauryaainshi", "panchyaainshi", "shahaainshi", "sattyaainshi", "aththyaainshi", "ekonnavvad", "navvad",
  "ekyaanNav", "byaanNav", "tryaanNav", "chauryaanNav", "panchaanNav", "shahaanNav", "sattyaanNav", "aththyaanNav", "navvyaanNav", "shambhar"
];

function getMarathiPhonetic(num: number): string {
  if (num >= 0 && num < MARATHI_PHONETICS.length) return MARATHI_PHONETICS[num];
  return String(num);
}

const MARATHI_OPS_PHONETIC: Record<string, string> = { "+": "adhik", "-": "vaja", "×": "gunile" };
function getMarathiWord(num: number): string {
  if (num === 0) return MARATHI_DIGITS[0];
  if (num >= 1 && num <= 99) return MARATHI_NUMBERS[num - 1];
  if (num === 100) return 'शंभर';
  return String(num);
}

export interface Question {
  display: string;
  marathi: string;
  phonetic: string;
  answer: number;
  answerMarathi: string;
}

export interface FeedbackState {
  correct: boolean;
  userAnswer: number;
  matchType: 'exact' | 'accepted_runner_up' | 'mismatch';
  question: Question;
  details?: any;
}

// ─── Difficulty Levels ───────────────────────────────────────────────
const LEVEL_DATA = [
  { key: 1, title: 'Level 1', subtitle: 'पातळी १', desc: 'Single-digit Addition (० ते ९ बेरीज)', ops: ['+'], maxNum: 9, icon: 'star', color: '#4CAF50', bg: '#E8F5E9' },
  { key: 2, title: 'Level 2', subtitle: 'पातळी २', desc: 'Addition & Subtraction (बेरीज व वजाबाकी)', ops: ['+', '-'], maxNum: 50, icon: 'trending-up', color: '#FF9800', bg: '#FFF3E0' },
  { key: 3, title: 'Level 3', subtitle: 'पातळी ३', desc: 'Add, Subtract & Multiply (गुणाकारसहित)', ops: ['+', '-', '×'], maxNum: 99, icon: 'zap', color: '#E91E63', bg: '#FCE4EC' },
];

const MARATHI_OPS: Record<string, string> = { '+': 'अधिक', '-': 'वजा', '×': 'गुणिले' };

// ─── Dynamic Math Generation ─────────────────────────────────────────
function generateQuestion(level = 1): Question {
  const lvl = LEVEL_DATA.find(l => l.key === level) || LEVEL_DATA[0];
  const ops = lvl.ops;
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number;

  if (level === 1) {
    // Level 1: single digit answers (0 to 9)
    answer = Math.floor(Math.random() * 9) + 1; // 1 to 9
    a = Math.floor(Math.random() * answer);
    b = answer - a;
  } else if (op === '+') {
    answer = Math.floor(Math.random() * Math.min(lvl.maxNum, 99)) + 1;
    a = Math.floor(Math.random() * answer);
    b = answer - a;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    answer = a - b;
    if (answer < 1 || answer > 99) { a = 15; b = 7; answer = 8; }
  } else {
    // Multiplication
    const pairs: [number, number][] = [];
    for (let i = 2; i <= 9; i++) {
      for (let j = 2; j <= 9; j++) {
        if (i * j <= 99) pairs.push([i, j]);
      }
    }
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    a = pair[0];
    b = pair[1];
    answer = a * b;
  }

  const marathiA = a === 0 ? MARATHI_DIGITS[0] : (MARATHI_NUMBERS[a - 1] || String(a));
  const marathiB = b === 0 ? MARATHI_DIGITS[0] : (MARATHI_NUMBERS[b - 1] || String(b));
  const marathiOp = MARATHI_OPS[op] || op;

  const phoneticA = getMarathiPhonetic(a);
  const phoneticB = getMarathiPhonetic(b);
  const phoneticOp = MARATHI_OPS_PHONETIC[op] || op;

  return {
    display: `${a} ${op} ${b} = ?`,
    marathi: `${marathiA} ${marathiOp} ${marathiB}`,
    phonetic: `${phoneticA} ${phoneticOp} ${phoneticB}`,
    answer,
    answerMarathi: getMarathiWord(answer),
  };
}

function generateMCQOptions(correct: number): number[] {
  const options = new Set<number>([correct]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    let opt = correct + offset;
    if (opt < 0) opt = Math.floor(Math.random() * 9) + 1;
    if (opt > 99) opt = Math.floor(Math.random() * 99) + 1;
    options.add(opt);
  }
  return [...options].sort(() => Math.random() - 0.5);
}

// ─── 2 Core Modes (Voice mode removed as requested) ──────────────────
const MODE_DATA = [
  {
    key: 'mcq',
    title: 'Listen & Choose',
    subtitle: 'ऐका आणि निवडा',
    desc: 'App speaks Marathi question, choose the right answer',
    icon: 'grid' as const,
    color: '#F6A64A',
    bg: '#FFF8EE',
  },
  {
    key: 'scribble',
    title: 'Listen & Draw',
    subtitle: 'ऐका आणि लिहा',
    desc: 'App speaks, draw your answer in Devanagari on slate',
    icon: 'edit-2' as const,
    color: '#48A995',
    bg: '#EEFBF7',
  },
  {
    key: 'speak',
    title: 'Speak & Verify',
    subtitle: 'बोला आणि तपासा',
    desc: 'Speak answer aloud, listen to correct Marathi audio & verify',
    icon: 'mic' as const,
    color: '#6C5CE7',
    bg: '#F5F3FF',
  },
];

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function AnkGuruHome() {
  const [screen, setScreen] = useState<'home' | 'level' | 'practice' | 'summary'>('home');
  const [mode, setMode] = useState<string>('mcq');
  const [level, setLevel] = useState<number>(1);
  const [numQuestions, setNumQuestions] = useState<number>(10); // 5 to 20 configurable
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    const onBackPress = () => {
      if (screen === 'practice') {
        Speech.stop().catch(() => {});
        setScreen('level');
        return true;
      }
      if (screen === 'level' || screen === 'summary') {
        Speech.stop().catch(() => {});
        setScreen('home');
        return true;
      }
      return false; // Exit app on home screen
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [screen]);

  const selectMode = (selectedMode: string) => {
    setMode(selectedMode);
    setScreen('level');
  };

  const startGame = (selectedLevel: number, chosenCount: number = numQuestions) => {
    setLevel(selectedLevel);
    const validCount = Math.min(20, Math.max(5, chosenCount));
    const qs = Array.from({ length: validCount }, () => generateQuestion(selectedLevel));
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setScreen('practice');
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);
    if (qIndex + 1 >= questions.length) {
      setScreen('summary');
    } else {
      setQIndex(i => i + 1);
    }
  };

  if (screen === 'home') {
    return <HomeScreen onStart={selectMode} />;
  }

  if (screen === 'level') {
    return (
      <LevelScreen
        mode={mode}
        numQuestions={numQuestions}
        onSetNumQuestions={setNumQuestions}
        onSelect={(lvl: number) => startGame(lvl, numQuestions)}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'summary') {
    return (
      <SummaryScreen
        score={score}
        total={questions.length}
        level={level}
        mode={mode}
        onRestart={() => startGame(level, numQuestions)}
        onGoHome={() => setScreen('home')}
      />
    );
  }

  const q = questions[qIndex];
  if (!q) return null;

  return (
    <PracticeScreen
      key={`practice-${mode}-${level}-${qIndex}`}
      mode={mode}
      level={level}
      question={q}
      qNumber={qIndex + 1}
      total={questions.length}
      onAnswer={handleAnswer}
      onBack={() => { Speech.stop().catch(() => {}); setScreen('level'); }}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═════════════════════════════════════════════════════════════════════
function HomeScreen({ onStart }: { onStart: (mode: string) => void }) {
  const cardAnims = useRef(MODE_DATA.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(120, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 })
    )).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.homeContainer}>
          <View style={styles.homeHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Feather name="sun" size={22} color="#FFF" />
              </View>
              <Text style={styles.brandText}>AnkGuru</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>v3.1</Text>
              </View>
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
                      <Feather name={m.icon as any} size={26} color="#FFF" />
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

          <View style={styles.offlinePill}>
            <Feather name="check-circle" size={14} color="#48A995" />
            <Text style={styles.offlinePillText}>3 Interactive Modes • 100% Offline • No Internet Needed</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// LEVEL & QUESTION COUNT SELECTION SCREEN
// ═════════════════════════════════════════════════════════════════════
function LevelScreen({
  mode,
  numQuestions,
  onSetNumQuestions,
  onSelect,
  onBack,
}: {
  mode: string;
  numQuestions: number;
  onSetNumQuestions: (n: number | ((prev: number) => number)) => void;
  onSelect: (lvl: number) => void;
  onBack: () => void;
}) {
  const cardAnims = useRef(LEVEL_DATA.map(() => new Animated.Value(0))).current;
  const modeInfo = MODE_DATA.find(m => m.key === mode) || MODE_DATA[0];

  useEffect(() => {
    Animated.stagger(100, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 })
    )).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.homeContainer}>
          <View style={styles.levelHeader}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#17324D" />
            </Pressable>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={[styles.modeIconCircle, { backgroundColor: modeInfo.color, width: 38, height: 38, borderRadius: 12 }]}>
                <Feather name={modeInfo.icon as any} size={20} color="#FFF" />
              </View>
              <Text style={[styles.brandText, { fontSize: 22, marginTop: 6 }]}>{modeInfo.title}</Text>
              <Text style={styles.homeSubtitle}>कठिणता आणि प्रश्न संख्या निवडा</Text>
            </View>
            <View style={styles.versionBadgeSmall}>
              <Text style={styles.versionBadgeTextSmall}>v3.1</Text>
            </View>
          </View>

          {/* Question Count Selector (5 to 20 questions) */}
          <View style={styles.questionSelectorCard}>
            <View style={styles.selectorTitleRow}>
              <Feather name="list" size={18} color="#17324D" />
              <Text style={styles.selectorTitle}>प्रश्नांची संख्या (Number of Questions)</Text>
              <Text style={styles.selectorValueBadge}>{toDevanagari(numQuestions)} प्रश्न</Text>
            </View>

            <View style={styles.selectorControlsRow}>
              {/* Presets: 5, 10, 15, 20 */}
              <View style={styles.presetGroup}>
                {[5, 10, 15, 20].map((count) => {
                  const active = numQuestions === count;
                  return (
                    <Pressable
                      key={count}
                      onPress={() => onSetNumQuestions(count)}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                    >
                      <Text style={[styles.presetText, active && styles.presetTextActive]}>
                        {toDevanagari(count)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Stepper +/- */}
              <View style={styles.stepperBox}>
                <Pressable
                  onPress={() => onSetNumQuestions((n: number) => Math.max(5, n - 1))}
                  style={styles.stepperBtn}
                >
                  <Feather name="minus" size={16} color="#17324D" />
                </Pressable>
                <Text style={styles.stepperNumber}>{toDevanagari(numQuestions)}</Text>
                <Pressable
                  onPress={() => onSetNumQuestions((n: number) => Math.min(20, n + 1))}
                  style={styles.stepperBtn}
                >
                  <Feather name="plus" size={16} color="#17324D" />
                </Pressable>
              </View>
            </View>
            <Text style={styles.selectorHint}>५ ते २० दरम्यान कितीही प्रश्न निवडू शकता.</Text>
          </View>

          {/* Difficulty Levels */}
          <Text style={styles.sectionHeader}>कठिणता पातळी निवडा (Select Difficulty):</Text>
          <View style={styles.cardsContainer}>
            {LEVEL_DATA.map((lv, i) => {
              const translateY = cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
              const opacity = cardAnims[i];
              return (
                <Animated.View key={lv.key} style={{ opacity, transform: [{ translateY }] }}>
                  <Pressable
                    onPress={() => onSelect(lv.key)}
                    style={({ pressed }) => [
                      styles.modeCard,
                      { backgroundColor: lv.bg, borderColor: lv.color },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: lv.color }]}>
                      <Feather name={lv.icon as any} size={24} color="#FFF" />
                    </View>
                    <View style={styles.modeCardText}>
                      <Text style={[styles.modeTitle, { color: lv.color }]}>{lv.title}</Text>
                      <Text style={styles.modeSubtitle}>{lv.subtitle}</Text>
                      <Text style={styles.modeDesc}>{lv.desc}</Text>
                    </View>
                    <Feather name="chevron-right" size={22} color={lv.color} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PRACTICE SCREEN
// ═════════════════════════════════════════════════════════════════════
function PracticeScreen({
  mode,
  level,
  question,
  qNumber,
  total,
  onAnswer,
  onBack,
}: {
  mode: string;
  level: number;
  question: Question;
  qNumber: number;
  total: number;
  onAnswer: (correct: boolean) => void;
  onBack: () => void;
}) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const speechTimerRef = useRef<any>(null);
  const playDelayRef = useRef<any>(null);
  const modeInfo = MODE_DATA.find(m => m.key === mode) || MODE_DATA[0];

  const stopSpeaking = async () => {
    if (playDelayRef.current) {
      clearTimeout(playDelayRef.current);
      playDelayRef.current = null;
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    try {
      await Speech.stop();
    } catch (_) {}
    setIsSpeaking(false);
  };

  const speakQuestion = async () => {
    if (playDelayRef.current) {
      clearTimeout(playDelayRef.current);
      playDelayRef.current = null;
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    try {
      await Speech.stop();
    } catch (_) {}

    setIsSpeaking(true);

    // Watchdog timer: automatically reset isSpeaking after 4.5 seconds in case TTS callback drops
    speechTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, 4500);

    const onFinish = () => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }
      setIsSpeaking(false);
    };

    const speakPhonetic = () => {
      Speech.speak(question.phonetic, {
        language: "en-IN",
        rate: 0.85,
        onDone: onFinish,
        onStopped: onFinish,
        onError: onFinish,
      });
    };

    const speakHindi = () => {
      Speech.speak(question.marathi, {
        language: "hi-IN",
        rate: 0.85,
        onDone: onFinish,
        onStopped: onFinish,
        onError: () => speakPhonetic(),
      });
    };

    try {
      const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      const marathiVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith("mr"));
      const hindiVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith("hi"));

      if (marathiVoice) {
        Speech.speak(question.marathi, {
          language: marathiVoice.language || "mr-IN",
          voice: marathiVoice.identifier,
          rate: 0.85,
          onDone: onFinish,
          onStopped: onFinish,
          onError: () => speakHindi(),
        });
        return;
      }

      if (hindiVoice) {
        Speech.speak(question.marathi, {
          language: hindiVoice.language || "hi-IN",
          voice: hindiVoice.identifier,
          rate: 0.85,
          onDone: onFinish,
          onStopped: onFinish,
          onError: () => speakPhonetic(),
        });
        return;
      }

      Speech.speak(question.marathi, {
        language: "mr-IN",
        rate: 0.85,
        onDone: onFinish,
        onStopped: onFinish,
        onError: () => speakHindi(),
      });
    } catch (e) {
      speakHindi();
    }
  };

  // Auto-play question audio with a 320ms delay so screen transition & audio subsystem are 100% ready
  useEffect(() => {
    setFeedback(null);
    stopSpeaking();

    playDelayRef.current = setTimeout(() => {
      speakQuestion();
    }, 320);

    return () => {
      if (playDelayRef.current) clearTimeout(playDelayRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      Speech.stop().catch(() => {});
    };
  }, [question]);

  const submitAnswer = (userAnswer: number, details: any = null) => {
    if (feedback) return;
    stopSpeaking();

    if (mode === "mcq") {
      const correct = userAnswer === question.answer;
      setFeedback({
        correct,
        userAnswer,
        matchType: correct ? "exact" : "mismatch",
        question, // Locked snapshot!
        details: null,
      });
      return;
    }

    if (mode === "speak") {
      const isCorrect = userAnswer === 1;
      setFeedback({
        correct: isCorrect,
        userAnswer: question.answer,
        matchType: isCorrect ? "exact" : "mismatch",
        question, // Locked snapshot!
        details: {
          isOral: true,
          explanation: isCorrect
            ? `शिक्षकांनी तोंडी उत्तर अचूक प्रमाणित केले: ${toDevanagari(question.answer)} (${question.answerMarathi})`
            : `अचूक उत्तर: ${toDevanagari(question.answer)} (${question.answerMarathi}) — पुन्हा तोंडी सराव करा!`,
        },
      });
      return;
    }

    // Scribble Mode with Secondary Probability Matching
    setFeedback({
      correct: details ? details.correct : (userAnswer === question.answer),
      userAnswer,
      matchType: details ? details.matchType : (userAnswer === question.answer ? "exact" : "mismatch"),
      question, // Locked snapshot!
      details,
    });
  };

  const progressPct = (qNumber / total) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.practiceContainer}>
        <View style={styles.practiceTopBar}>
          <Pressable onPress={() => { stopSpeaking(); onBack(); }} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#17324D" />
          </Pressable>
          <Text style={[styles.practiceTitle, { color: modeInfo.color }]}>{modeInfo.title} • L{level}</Text>
          <View style={styles.versionBadgeSmall}>
            <Text style={styles.versionBadgeTextSmall}>v3.1</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: modeInfo.color }]} />
        </View>
        <Text style={styles.progressText}>प्रश्न {toDevanagari(qNumber)} / {toDevanagari(total)} (Question {qNumber} of {total})</Text>

        <View style={styles.questionCard}>
          <Text style={styles.qLabel}>
            {mode === "scribble"
              ? "पाटीवर देवनागरी अंक लिहा (Draw the answer in Devanagari):"
              : mode === "speak"
              ? "आधी उत्तर तोंडी बोला, मग ऐकून तपासा (Speak aloud, then verify):"
              : "योग्य पर्याय निवडा (Choose the right answer):"}
          </Text>
          <Text style={styles.qText}>{toDevanagari(question.display)}</Text>
          <Pressable onPress={isSpeaking ? stopSpeaking : speakQuestion} style={styles.speakBtn}>
            <Feather name={isSpeaking ? "square" : "play-circle"} size={22} color={isSpeaking ? modeInfo.color : "#8A969E"} />
            <Text style={[styles.speakText, isSpeaking && { color: modeInfo.color, fontWeight: "700" }]}>
              {isSpeaking ? "थांबवा (Tap to stop)" : "ऐकण्यासाठी दाबा (Tap to hear)"}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.interactionArea} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
          {feedback ? (
            <View style={styles.feedbackContainer}>
              {/* Feedback Banner */}
              <View style={[
                styles.feedbackBanner,
                feedback.matchType === 'exact' ? styles.bannerCorrect :
                feedback.matchType === 'accepted_runner_up' ? styles.bannerAccepted :
                styles.bannerWrong
              ]}>
                <Feather
                  name={feedback.correct ? 'check-circle' : 'x-circle'}
                  size={32}
                  color="#FFF"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.bannerTitle}>
                    {feedback.matchType === 'exact' ? 'Correct! • बरोबर!' :
                     feedback.matchType === 'accepted_runner_up' ? 'Correct! • बरोबर (स्वीकारले)!' :
                     'Wrong! • चुकीचे!'}
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    {feedback.matchType === 'exact' ? 'अचूक ओळखले (Exact Match)' :
                     feedback.matchType === 'accepted_runner_up' ? 'दुसऱ्या क्रमांकावर जुळले (Accepted Match ≥20%)' :
                     'पुन्हा प्रयत्न करा (Keep practicing)'}
                  </Text>
                </View>
              </View>

              {/* Accuracy & Breakdown Card */}
              <View style={styles.feedbackDetailCard}>
                <View style={styles.feedbackMetaRow}>
                  <Text style={styles.feedbackMetaText}>तपासणी निकाल (Accuracy Inspection):</Text>
                  <Text style={[
                    styles.feedbackResultBadge,
                    { color: feedback.correct ? '#48A995' : '#E95757' }
                  ]}>
                    {feedback.matchType === 'exact' ? '✓ EXACT' :
                     feedback.matchType === 'accepted_runner_up' ? '✓ ACCEPTED' :
                     '✗ MISMATCH'}
                  </Text>
                </View>

                {/* Actual Expected Answer */}
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>अपेक्षित उत्तर (Expected Answer):</Text>
                  <View style={styles.feedbackValueRow}>
                    <Text style={[styles.feedbackValueBold, { color: '#48A995' }]}>
                      {toDevanagari(feedback.question.answer)} ({feedback.question.answer})
                    </Text>
                    <View style={styles.feedbackWordBadge}>
                      <Text style={styles.feedbackWordBadgeText}>{feedback.question.answerMarathi}</Text>
                    </View>
                  </View>
                </View>

                {/* Detected Input & Probabilities */}
                <View style={styles.feedbackDivider} />
                <View style={styles.feedbackItem}>
                  <Text style={styles.feedbackLabel}>ओळखलेले उत्तर (Detected Input):</Text>
                  <View style={styles.feedbackValueRow}>
                    <Text style={[
                      styles.feedbackValueBold,
                      { color: feedback.correct ? '#48A995' : '#E95757' }
                    ]}>
                      {feedback.userAnswer !== undefined && feedback.userAnswer !== null
                        ? `${toDevanagari(feedback.userAnswer)} (${feedback.userAnswer})`
                        : 'काहीही नाही'}
                    </Text>
                    {feedback.userAnswer !== undefined && feedback.userAnswer !== null && (
                      <View style={[styles.feedbackWordBadge, { backgroundColor: feedback.correct ? '#EEFBF7' : '#FEECEC' }]}>
                        <Text style={[styles.feedbackWordBadgeText, { color: feedback.correct ? '#48A995' : '#E95757' }]}>
                          {getMarathiWord(feedback.userAnswer)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Scribble Probability Breakdown Info */}
                  {feedback.details && feedback.details.explanation && (
                    <View style={styles.explanationBox}>
                      <Feather name="info" size={14} color="#17324D" style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={styles.explanationText}>{feedback.details.explanation}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Next Question / Proceed Button (Waits for tap, never auto-advances) */}
              <Pressable
                onPress={() => {
                  const isCorrect = feedback.correct;
                  setFeedback(null);
                  stopSpeaking();
                  onAnswer(isCorrect);
                }}
                style={({ pressed }) => [
                  styles.nextQuestionBtn,
                  { backgroundColor: modeInfo.color },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.nextQuestionBtnText}>
                  {qNumber < total ? 'पुढचा प्रश्न (Next Question) ➔' : 'निकाल पहा (View Results) ➔'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {mode === 'mcq' && (
                <MCQPanel question={question} onSelect={submitAnswer} color={modeInfo.color} />
              )}
              {mode === 'scribble' && (
                <ScribblePanel question={question} onResult={submitAnswer} color={modeInfo.color} />
              )}
              {mode === 'speak' && (
                <SpeakVerifyPanel question={question} onVerify={(isCorrect) => submitAnswer(isCorrect ? 1 : 0)} color={modeInfo.color} />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MCQ PANEL
// ═════════════════════════════════════════════════════════════════════
function MCQPanel({
  question,
  onSelect,
  color,
}: {
  question: Question;
  onSelect: (opt: number) => void;
  color: string;
}) {
  const options = useMemo(() => generateMCQOptions(question.answer), [question]);
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
          <Text style={styles.mcqMarathi}>{getMarathiWord(opt)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCRIBBLE PANEL (Powered by AnkGuru Offline CNN Canvas)
// ═════════════════════════════════════════════════════════════════════
function ScribblePanel({
  question,
  onResult,
  color,
}: {
  question: Question;
  onResult: (userAnswer: number, details?: any) => void;
  color: string;
}) {
  const webRef = useRef<any>(null);
  const isTwoDigit = question.answer >= 10;
  const htmlContent = useMemo(() => getScribbleEngineHtml(isTwoDigit), [isTwoDigit]);

  useEffect(() => {
    webRef.current?.injectJavaScript('if(window.resetBoard) window.resetBoard(); true;');
  }, [question]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'prediction') {
        const THRESHOLD = 0.20; // 20% minimum threshold for 2nd probability acceptance

        if (!data.isTwoDigit) {
          // Single digit evaluation
          const target = question.answer;
          const top1 = data.top1;
          const top2 = data.top2;
          const targetProb = data.probs[target] || 0;
          const top1Exact = top1.digit === target;
          const runnerUpAccepted = top2.digit === target && targetProb >= THRESHOLD;

          let matchType: 'exact' | 'accepted_runner_up' | 'mismatch' = 'mismatch';
          let isCorrect = false;
          let explanation = '';

          if (top1Exact) {
            isCorrect = true;
            matchType = 'exact';
            explanation = `पहिला अंदाज: ${toDevanagari(top1.digit)} (${(top1.prob * 100).toFixed(0)}%) — अचूक जुळले!`;
          } else if (runnerUpAccepted) {
            isCorrect = true;
            matchType = 'accepted_runner_up';
            explanation = `मॉडेलचा मुख्य अंदाज ${toDevanagari(top1.digit)} (${(top1.prob * 100).toFixed(0)}%) आला, पण तुमचे अचूक उत्तर ${toDevanagari(target)} हे दुसऱ्या क्रमांकावर ${(targetProb * 100).toFixed(0)}% संभाव्यतेसह ओळखले गेले — स्वीकारले!`;
          } else {
            isCorrect = false;
            matchType = 'mismatch';
            explanation = `मॉडेल अंदाज: १ला = ${toDevanagari(top1.digit)} (${(top1.prob * 100).toFixed(0)}%), २रा = ${toDevanagari(top2.digit)} (${(top2.prob * 100).toFixed(0)}%)`;
          }

          onResult(top1.digit, {
            correct: isCorrect,
            matchType,
            top1: top1.digit,
            top2: top2.digit,
            targetProb,
            explanation,
          });
        } else {
          // Two-digit evaluation (Tens and Units)
          const targetTens = Math.floor(question.answer / 10);
          const targetUnits = question.answer % 10;
          const tens = data.tens;
          const units = data.units;

          const tensTargetProb = tens.probs[targetTens] || 0;
          const unitsTargetProb = units.probs[targetUnits] || 0;

          const tensExact = tens.top1.digit === targetTens;
          const tensRunnerUp = tens.top2.digit === targetTens && tensTargetProb >= THRESHOLD;
          const tensMatch = tensExact || tensRunnerUp;

          const unitsExact = units.top1.digit === targetUnits;
          const unitsRunnerUp = units.top2.digit === targetUnits && unitsTargetProb >= THRESHOLD;
          const unitsMatch = unitsExact || unitsRunnerUp;

          const detectedNumber = tens.top1.digit * 10 + units.top1.digit;
          const isCorrect = tensMatch && unitsMatch;
          const matchType: 'exact' | 'accepted_runner_up' | 'mismatch' = isCorrect
            ? (tensExact && unitsExact ? 'exact' : 'accepted_runner_up')
            : 'mismatch';

          let explanation = '';
          if (matchType === 'exact') {
            explanation = `दोन्ही अंक अचूक ओळखले: दशक ${toDevanagari(targetTens)}, एकक ${toDevanagari(targetUnits)}`;
          } else if (matchType === 'accepted_runner_up') {
            explanation = `अंक जुळले (स्वीकारले): दशक ${tensMatch ? '✓' : '✗'} (${(tensTargetProb * 100).toFixed(0)}%), एकक ${unitsMatch ? '✓' : '✗'} (${(unitsTargetProb * 100).toFixed(0)}%)`;
          } else {
            explanation = `ओळखलेले: दशक ${toDevanagari(tens.top1.digit)} (${(tens.top1.prob * 100).toFixed(0)}%), एकक ${toDevanagari(units.top1.digit)} (${(units.top1.prob * 100).toFixed(0)}%)`;
          }

          onResult(detectedNumber, {
            correct: isCorrect,
            matchType,
            detectedNumber,
            explanation,
          });
        }
      }
    } catch (err) {
      console.error('Error handling prediction message:', err);
    }
  };

  return (
    <View style={styles.scribbleCard}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        style={styles.scribbleWebView}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SPEAK & VERIFY PANEL (Oral Pronunciation & Teacher Verification)
// ═════════════════════════════════════════════════════════════════════
function SpeakVerifyPanel({
  question,
  onVerify,
  color,
}: {
  question: Question;
  onVerify: (isCorrect: boolean) => void;
  color: string;
}) {
  const [isSpeakingAnswer, setIsSpeakingAnswer] = useState(false);
  const [hasPlayedAnswer, setHasPlayedAnswer] = useState(false);

  useEffect(() => {
    setIsSpeakingAnswer(false);
    setHasPlayedAnswer(false);
  }, [question]);

  const speakAnswer = async () => {
    if (isSpeakingAnswer) return;
    setIsSpeakingAnswer(true);
    setHasPlayedAnswer(true);

    const phoneticWord = getMarathiPhonetic(question.answer);

    const speakPhonetic = () => {
      Speech.speak(phoneticWord, {
        language: "en-IN",
        rate: 0.85,
        onDone: () => setIsSpeakingAnswer(false),
        onStopped: () => setIsSpeakingAnswer(false),
        onError: () => setIsSpeakingAnswer(false),
      });
    };

    const speakHindi = () => {
      Speech.speak(question.answerMarathi, {
        language: "hi-IN",
        rate: 0.85,
        onDone: () => setIsSpeakingAnswer(false),
        onStopped: () => setIsSpeakingAnswer(false),
        onError: () => speakPhonetic(),
      });
    };

    try {
      const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
      const marathiVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith("mr"));
      const hindiVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith("hi"));

      if (marathiVoice) {
        Speech.speak(question.answerMarathi, {
          language: marathiVoice.language || "mr-IN",
          voice: marathiVoice.identifier,
          rate: 0.85,
          onDone: () => setIsSpeakingAnswer(false),
          onStopped: () => setIsSpeakingAnswer(false),
          onError: () => speakHindi(),
        });
        return;
      }

      if (hindiVoice) {
        Speech.speak(question.answerMarathi, {
          language: hindiVoice.language || "hi-IN",
          voice: hindiVoice.identifier,
          rate: 0.85,
          onDone: () => setIsSpeakingAnswer(false),
          onStopped: () => setIsSpeakingAnswer(false),
          onError: () => speakPhonetic(),
        });
        return;
      }

      Speech.speak(question.answerMarathi, {
        language: "mr-IN",
        rate: 0.85,
        onDone: () => setIsSpeakingAnswer(false),
        onStopped: () => setIsSpeakingAnswer(false),
        onError: () => speakHindi(),
      });
    } catch (e) {
      speakHindi();
    }
  };

  return (
    <View style={styles.speakVerifyCard}>
      {/* Step 1: Student Oral Instruction Card */}
      <View style={styles.speakStepBox}>
        <View style={styles.speakStepHeader}>
          <View style={[styles.speakStepBadge, { backgroundColor: color }]}>
            <Text style={styles.speakStepBadgeText}>१</Text>
          </View>
          <Text style={styles.speakStepTitle}>विद्यार्थ्याचे तोंडी उत्तर (Student Speaks)</Text>
        </View>
        <Text style={styles.speakStepDesc}>
          प्रथम विद्यार्थ्याने स्वतः मनात विचार करून मोठ्याने उत्तर उच्चारावे.
        </Text>
        <View style={styles.speakMicPulseRow}>
          <View style={[styles.speakMicPulseCircle, { backgroundColor: "#F5F3FF", borderColor: color }]}>
            <Feather name="mic" size={24} color={color} />
          </View>
          <Text style={styles.speakMicHint}>
            "आधी उत्तर मोठ्याने बोला..."
          </Text>
        </View>
      </View>

      {/* Step 2: Play Answer Button (Spoken, not shown on screen!) */}
      <View style={styles.speakStepBox}>
        <View style={styles.speakStepHeader}>
          <View style={[styles.speakStepBadge, { backgroundColor: color }]}>
            <Text style={styles.speakStepBadgeText}>२</Text>
          </View>
          <Text style={styles.speakStepTitle}>अचूक उत्तर ऐका (Listen to Answer)</Text>
        </View>
        <Text style={styles.speakStepDesc}>
          विद्यार्थी बोलल्यावर खालील बटण दाबा; ॲप मराठीत योग्य उत्तर उच्चारेल:
        </Text>
        
        <Pressable
          onPress={speakAnswer}
          style={({ pressed }) => [
            styles.playAnswerBtn,
            { backgroundColor: color },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            isSpeakingAnswer && { backgroundColor: "#5642D8" },
          ]}
        >
          <Feather
            name={isSpeakingAnswer ? "volume-2" : hasPlayedAnswer ? "rotate-cw" : "play-circle"}
            size={24}
            color="#FFF"
          />
          <Text style={styles.playAnswerBtnText}>
            {isSpeakingAnswer
              ? "उत्तर बोलत आहे..."
              : hasPlayedAnswer
              ? "उत्तर पुन्हा ऐका (Play Again)"
              : "उत्तर ऐका (Play Answer)"}
          </Text>
        </Pressable>
      </View>

      {/* Step 3: Teacher / Parent Evaluation */}
      <View style={styles.speakVerifyActionBox}>
        <Text style={styles.speakVerifyPrompt}>
          ३. विद्यार्थ्याचा तोंडी उच्चार बरोबर होता का? (Teacher Verification):
        </Text>

        <View style={styles.verifyBtnRow}>
          <Pressable
            onPress={() => onVerify(true)}
            style={({ pressed }) => [
              styles.verifyBtn,
              styles.verifyBtnCorrect,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Feather name="check-circle" size={22} color="#FFF" />
            <Text style={styles.verifyBtnText}>बरोबर ✓</Text>
            <Text style={styles.verifyBtnSub}>Correct</Text>
          </Pressable>

          <Pressable
            onPress={() => onVerify(false)}
            style={({ pressed }) => [
              styles.verifyBtn,
              styles.verifyBtnWrong,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Feather name="x-circle" size={22} color="#FFF" />
            <Text style={styles.verifyBtnText}>चूक ✗</Text>
            <Text style={styles.verifyBtnSub}>Needs Practice</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SUMMARY SCREEN
// ═════════════════════════════════════════════════════════════════════
function SummaryScreen({
  score,
  total,
  level,
  mode,
  onRestart,
  onGoHome,
}: {
  score: number;
  total: number;
  level: number;
  mode: string;
  onRestart: () => void;
  onGoHome: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 60 ? '🎉' : '💪';
  const message = pct === 100 ? 'Perfect! शाबास!' : pct >= 60 ? 'Great Job! छान!' : 'Keep Practicing! पुन्हा प्रयत्न करा!';
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.summaryContainer}>
        <Animated.View style={[styles.summaryCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.summaryEmoji}>{emoji}</Text>
          <Text style={styles.summaryTitle}>सत्र पूर्ण! (Session Complete)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: '#7A8994', fontWeight: '600' }}>
              Level {level} • {MODE_DATA.find(m => m.key === mode)?.title} • {total} प्रश्न
            </Text>
            <View style={styles.versionBadgeSmall}>
              <Text style={styles.versionBadgeTextSmall}>v3.1</Text>
            </View>
          </View>
          <Text style={styles.summaryMessage}>{message}</Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{toDevanagari(score)}</Text>
              <Text style={styles.statLabel}>बरोबर (Correct)</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={styles.statNum}>{toDevanagari(total - score)}</Text>
              <Text style={styles.statLabel}>चुकीचे (Incorrect)</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={styles.statNum}>{toDevanagari(pct)}%</Text>
              <Text style={styles.statLabel}>अचूकता (Accuracy)</Text>
            </View>
          </View>

          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
          </View>

          <Pressable onPress={onRestart} style={styles.restartBtn}>
            <Feather name="rotate-ccw" size={20} color="#FFF" />
            <Text style={styles.restartText}>पुन्हा खेळा (Play Again)</Text>
          </Pressable>

          <Pressable onPress={onGoHome} style={styles.homeBtn}>
            <Feather name="home" size={20} color="#17324D" />
            <Text style={styles.homeBtnText}>मुख्य पान (Home)</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  homeContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  homeHeader: { marginBottom: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#F6A64A',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  brandText: { fontSize: 28, fontWeight: '800', color: '#17324D' },
  homeSubtitle: { fontSize: 14, color: '#7A8994', marginTop: 4, fontWeight: '600' },
  cardsContainer: { gap: 14 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 14 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
    borderWidth: 2, gap: 14,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  modeIconCircle: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeCardText: { flex: 1 },
  modeTitle: { fontSize: 18, fontWeight: '800' },
  modeSubtitle: { fontSize: 13, color: '#7A8994', fontWeight: '600', marginTop: 2 },
  modeDesc: { fontSize: 12, color: '#9AA7B0', marginTop: 4 },
  offlinePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EEFBF7', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, marginTop: 24,
  },
  offlinePillText: { fontSize: 12, color: '#48A995', fontWeight: '700' },

  // Question Selector
  questionSelectorCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDE7EE',
    shadowColor: '#17324D',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selectorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  selectorTitle: { fontSize: 14, fontWeight: '700', color: '#17324D', flex: 1 },
  selectorValueBadge: {
    backgroundColor: '#EEF2F6',
    color: '#17324D',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectorControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetGroup: { flexDirection: 'row', gap: 8 },
  presetChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#DDE7EE',
    alignItems: 'center', justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#48A995',
    borderColor: '#48A995',
  },
  presetText: { fontSize: 15, fontWeight: '700', color: '#5C6B76' },
  presetTextActive: { color: '#FFF' },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDE7EE',
    overflow: 'hidden',
  },
  stepperBtn: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepperNumber: { fontSize: 15, fontWeight: '800', color: '#17324D', paddingHorizontal: 8 },
  selectorHint: { fontSize: 11, color: '#9AA7B0', marginTop: 8 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#17324D', marginBottom: 10, marginTop: 4 },

  // Practice
  practiceContainer: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  practiceTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  practiceTitle: { fontSize: 18, fontWeight: '800' },
  progressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 99, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  progressText: { fontSize: 12, color: '#7A8994', fontWeight: '600', marginTop: 6, textAlign: 'center' },

  questionCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginTop: 12,
    alignItems: 'center',
    shadowColor: '#17324D', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  qLabel: { fontSize: 13, color: '#7A8994', fontWeight: '600', textAlign: 'center' },
  qText: { fontSize: 32, fontWeight: '800', color: '#17324D', marginVertical: 8 },
  speakBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 12 },
  speakText: { fontSize: 13, color: '#8A969E', fontWeight: '600' },

  interactionArea: { flex: 1, marginTop: 14 },

  // MCQ
  mcqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  mcqOption: {
    width: (SCREEN_WIDTH - 48) / 2, paddingVertical: 20,
    backgroundColor: '#FFF', borderRadius: 20, alignItems: 'center',
    borderWidth: 2, borderColor: '#DDE7EE',
    elevation: 2,
  },
  mcqText: { fontSize: 30, fontWeight: '800', color: '#17324D' },
  mcqMarathi: { fontSize: 14, color: '#7A8994', fontWeight: '600', marginTop: 4 },

  // Scribble
  scribbleCard: {
    height: 440,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE7EE',
    shadowColor: '#17324D',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  scribbleWebView: { flex: 1, backgroundColor: '#F8FAFC' },

  // Feedback
  feedbackContainer: { width: '100%', paddingTop: 4 },
  feedbackBanner: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 18, marginBottom: 10,
  },
  bannerCorrect: { backgroundColor: '#48A995' },
  bannerAccepted: { backgroundColor: '#0288D1' },
  bannerWrong: { backgroundColor: '#E95757' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  bannerSubtitle: { fontSize: 12, color: '#FFF', opacity: 0.95, marginTop: 2 },

  feedbackDetailCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 16,
    shadowColor: '#17324D', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, marginBottom: 14,
  },
  feedbackMetaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', marginBottom: 8,
  },
  feedbackMetaText: { fontSize: 12, color: '#7A8994', fontWeight: '700' },
  feedbackResultBadge: { fontSize: 12, fontWeight: '800' },
  feedbackItem: { marginVertical: 2 },
  feedbackLabel: { fontSize: 12, color: '#7A8994', fontWeight: '600', marginBottom: 4 },
  feedbackValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedbackValueBold: { fontSize: 22, fontWeight: '800' },
  feedbackWordBadge: { backgroundColor: '#EEFBF7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  feedbackWordBadgeText: { fontSize: 14, fontWeight: '700', color: '#17324D' },
  feedbackDivider: { height: 1, backgroundColor: '#EEF2F6', marginVertical: 8 },
  explanationBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  explanationText: { fontSize: 12, color: '#475569', lineHeight: 18, flex: 1 },

  nextQuestionBtn: {
    width: '100%', height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  nextQuestionBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },

  // Summary
  summaryContainer: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 28, padding: 24, alignItems: 'center',
    shadowColor: '#17324D', shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  summaryEmoji: { fontSize: 60, marginBottom: 8 },
  summaryTitle: { fontSize: 26, fontWeight: '800', color: '#17324D' },
  summaryMessage: { fontSize: 15, color: '#5C6B76', marginTop: 6, marginBottom: 18, textAlign: 'center' },
  statRow: { flexDirection: 'row', width: '100%', backgroundColor: '#F8FAFC', borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: '#DDE7EE' },
  statNum: { fontSize: 26, fontWeight: '800', color: '#17324D' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#8A969E', marginTop: 2 },
  scoreBar: { width: '100%', height: 8, backgroundColor: '#EEF2F6', borderRadius: 99, overflow: 'hidden', marginBottom: 16 },
  scoreBarFill: { height: '100%', backgroundColor: '#48A995', borderRadius: 99 },
  restartBtn: {
    width: '100%', height: 56, borderRadius: 18, backgroundColor: '#F6A64A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  restartText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  homeBtn: {
    height: 50, borderRadius: 18, backgroundColor: '#EEF2F6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%',
  },
  homeBtnText: { fontSize: 16, fontWeight: '800', color: '#17324D' },

  // Speak & Verify
  speakVerifyCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDE7EE",
    shadowColor: "#17324D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
  },
  speakStepBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  speakStepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  speakStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  speakStepBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  speakStepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#17324D",
  },
  speakStepDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginTop: 2,
  },
  speakMicPulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  speakMicPulseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  speakMicHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    fontStyle: "italic",
  },
  playAnswerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  playAnswerBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  speakVerifyActionBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingTop: 4,
  },
  speakVerifyPrompt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17324D",
    marginBottom: 10,
    textAlign: "center",
  },
  verifyBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  verifyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnCorrect: {
    backgroundColor: "#48A995",
  },
  verifyBtnWrong: {
    backgroundColor: "#E95757",
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 2,
  },
  verifyBtnSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
    opacity: 0.9,
    marginTop: 2,
  },

  // Badges
  versionBadge: {
    backgroundColor: '#7184E6', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, marginLeft: 8,
  },
  versionBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  versionBadgeSmall: {
    backgroundColor: '#EEF2F6', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#DDE7EE',
  },
  versionBadgeTextSmall: { color: '#17324D', fontSize: 11, fontWeight: '700' },
});
