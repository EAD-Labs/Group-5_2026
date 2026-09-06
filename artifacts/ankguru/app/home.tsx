import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  StatusBar, Dimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

export const toDevanagari = (str) => {
  if (str === undefined || str === null) return '';
  const digits = ['०','१','२','३','४','५','६','७','८','९'];
  return str.toString().replace(/[0-9]/g, match => digits[parseInt(match)]);
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function generateQuestion() {
  const answer = Math.floor(Math.random() * 99) + 1;
  return {
    answer,
    marathi: MARATHI_NUMBERS[answer - 1] || String(answer),
    answerMarathi: MARATHI_NUMBERS[answer - 1] || String(answer),
  };
}

function generateMCQOptions(correct) {
  const opts = new Set([correct]);
  while (opts.size < 4) {
    let rand = Math.floor(Math.random() * 99) + 1;
    opts.add(rand);
  }
  const arr = Array.from(opts);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('config'); // config, practice, score
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const startPractice = (total) => {
    const qs = Array.from({ length: total }, generateQuestion);
    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setCurrentScreen('practice');
  };

  const handleAnswer = (isCorrect) => {
    if (isCorrect) setScore(s => s + 1);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentScreen('score');
    }
  };

  if (currentScreen === 'config') {
    return <ConfigScreen onStart={startPractice} />;
  }

  if (currentScreen === 'score') {
    return (
      <ScoreScreen 
        score={score} 
        total={questions.length} 
        onRestart={() => setCurrentScreen('config')} 
      />
    );
  }

  return (
    <PracticeScreen
      question={questions[currentIndex]}
      qNumber={currentIndex + 1}
      total={questions.length}
      onAnswer={handleAnswer}
      onBack={() => setCurrentScreen('config')}
    />
  );
}

function ConfigScreen({ onStart }) {
  const [amountStr, setAmountStr] = useState('5');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true
    }).start();
  }, []);

  const handleStart = () => {
    const val = parseInt(amountStr, 10);
    if (!isNaN(val) && val > 0) {
      onStart(val);
    } else {
      onStart(5);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <View style={styles.container}>
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
            <View style={styles.logoBadge}>
              <Feather name="headphones" size={32} color="#0EA5E9" />
            </View>
            <Text style={styles.title}>Listen & Learn</Text>
            <Text style={styles.subtitle}>Practice Marathi Numbers</Text>
          </Animated.View>

          <View style={styles.configCard}>
            <Text style={styles.configTitle}>How many numbers to practice?</Text>
            <TextInput
              style={styles.configInput}
              keyboardType="number-pad"
              value={amountStr}
              onChangeText={setAmountStr}
              maxLength={3}
            />
            
            <View style={styles.presetRow}>
              {[5, 10, 20].map(val => (
                <Pressable 
                  key={val} 
                  style={[styles.presetBtn, amountStr === String(val) && styles.presetBtnActive]} 
                  onPress={() => setAmountStr(String(val))}
                >
                  <Text style={[styles.presetBtnText, amountStr === String(val) && styles.presetBtnTextActive]}>{toDevanagari(val)}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleStart} style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start Practice</Text>
              <Feather name="arrow-right" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PracticeScreen({ question, qNumber, total, onAnswer, onBack }) {
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const feedbackTimeout = useRef(null);

  useEffect(() => {
    setFeedback(null);
    return () => { if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current); };
  }, [question]);

  useEffect(() => {
    speakQuestion();
  }, [question]);

  const speakQuestion = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      Speech.speak(question.marathi, {
        language: 'mr-IN',
        rate: 0.85,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
        },
      });
    } catch (e) {
      setIsSpeaking(false);
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
          <Text style={[styles.practiceTitle, { color: '#0EA5E9' }]}>Listen & Choose</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressPct + '%', backgroundColor: '#0EA5E9' }]} />
        </View>
        <Text style={styles.progressText}>Question {toDevanagari(qNumber)} of {toDevanagari(total)}</Text>

        <View style={styles.questionCard}>
          <Text style={styles.qLabel}>Listen to the number</Text>
          <Pressable onPress={speakQuestion} style={styles.speakBtnLg}>
            <Feather name={isSpeaking ? 'volume-2' : 'play-circle'} size={48} color={isSpeaking ? '#0EA5E9' : '#8A969E'} />
            <Text style={[styles.speakTextLg, isSpeaking && { color: '#0EA5E9' }]}>
              {isSpeaking ? 'Speaking...' : 'Tap to hear'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.interactionArea} contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
          {!feedback && (
            <MCQPanel question={question} onSelect={submitAnswer} color="#0EA5E9" />
          )}

          {feedback && (
            <View style={[styles.feedbackCard, feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <Feather name={feedback.correct ? 'check-circle' : 'x-circle'} size={36} color="#FFF" />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.feedbackTitle}>{feedback.correct ? 'Correct! बरोबर!' : 'Wrong! चुकीचे!'}</Text>
                <Text style={styles.feedbackSub}>Answer: {toDevanagari(question.answer)} ({question.answerMarathi})</Text>
                {feedback.userAnswer !== undefined && !feedback.correct && (
                  <Text style={[styles.feedbackSub, { marginTop: 4, fontStyle: 'italic', opacity: 0.9, fontSize: 13 }]}>
                    (You selected: {toDevanagari(feedback.userAnswer)})
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

function ScoreScreen({ score, total, onRestart }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.scoreContainer}>
        <Feather name="award" size={80} color="#0EA5E9" style={{ marginBottom: 20 }} />
        <Text style={styles.scoreTitle}>Practice Complete!</Text>
        <Text style={styles.scoreText}>You got</Text>
        <Text style={styles.scoreBig}>{toDevanagari(score)} / {toDevanagari(total)}</Text>
        <Text style={styles.scoreText}>correct</Text>

        <Pressable onPress={onRestart} style={styles.restartBtn}>
          <Text style={styles.restartBtnText}>Practice Again</Text>
          <Feather name="rotate-ccw" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBadge: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#17324D', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  configCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4 },
  configTitle: { fontSize: 18, fontWeight: '700', color: '#17324D', marginBottom: 16, textAlign: 'center' },
  configInput: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', color: '#17324D', textAlign: 'center', marginBottom: 16 },
  presetRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  presetBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F1F5F9' },
  presetBtnActive: { backgroundColor: '#0EA5E9' },
  presetBtnText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  presetBtnTextActive: { color: '#FFF' },
  startBtn: { flexDirection: 'row', backgroundColor: '#0EA5E9', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  
  practiceContainer: { flex: 1, padding: 24 },
  practiceTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  practiceTitle: { fontSize: 18, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, color: '#8A969E', fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  
  questionCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, marginBottom: 24 },
  qLabel: { fontSize: 16, color: '#8A969E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 },
  speakBtnLg: { alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 20, backgroundColor: '#F8FAFC' },
  speakTextLg: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#8A969E' },
  
  interactionArea: { flex: 1 },
  mcqGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mcqOption: { width: '48%', backgroundColor: '#FFF', paddingVertical: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  mcqText: { fontSize: 40, fontWeight: '800', color: '#17324D', marginBottom: 4 },
  mcqMarathi: { fontSize: 18, color: '#64748B', fontWeight: '600' },
  
  feedbackCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginTop: 10 },
  feedbackCorrect: { backgroundColor: '#10B981' },
  feedbackWrong: { backgroundColor: '#EF4444' },
  feedbackTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  feedbackSub: { color: '#FFF', fontSize: 15, fontWeight: '600', opacity: 0.9 },
  
  scoreContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scoreTitle: { fontSize: 32, fontWeight: '800', color: '#17324D', marginBottom: 16 },
  scoreText: { fontSize: 18, color: '#64748B', fontWeight: '600' },
  scoreBig: { fontSize: 72, fontWeight: '800', color: '#0EA5E9', marginVertical: 8 },
  restartBtn: { flexDirection: 'row', backgroundColor: '#0EA5E9', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center', marginTop: 40 },
  restartBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});
