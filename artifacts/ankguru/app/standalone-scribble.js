import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import SignatureScreen from 'react-native-signature-canvas';
import { WebView } from 'react-native-webview';
import { getMlHtml } from './mlHtml';

// ─── Constants ───────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = Dimensions.get('window').height * 0.38;

// ─── Dynamic Math Generation ──────────────────────────────────────────
const MARATHI_NUMBERS = ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'];
function generateQuestion() {
  const a = Math.floor(Math.random() * 5); // 0 to 4
  const b = Math.floor(Math.random() * 5); // 0 to 4
  const expected = a + b;
  return {
    display: `${a} + ${b} = ?`,
    marathi: `${MARATHI_NUMBERS[a]} अधिक ${MARATHI_NUMBERS[b]}`,
    expected
  };
}

// ─── Offline Neural Network Inference ─────────────────────────────────
// Inference is handled by the hidden WebView to utilize HTML5 Canvas pixels

// ─── Signature Canvas WebView Style ─────────────────────────────────
const canvasWebStyle = `.m-signature-pad {
  box-shadow: none;
  border: none;
  margin: 0;
  padding: 0;
}
.m-signature-pad--body {
  border: none;
}
.m-signature-pad--footer { display: none; }
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
canvas {
  width: 100% !important;
  height: 100% !important;
}`;

// ─── Main Component ──────────────────────────────────────────────────
export default function StandaloneScribble() {
  // ── State ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultOverlay, setResultOverlay] = useState(null); // { correct: bool, detected: number }
  const [hasDrawn, setHasDrawn] = useState(false);
  const [question, setQuestion] = useState(generateQuestion);

  // ── Refs ──
  const signatureRef = useRef(null);
  const mlWebViewRef = useRef(null);

  // ── Animations ──
  const playBtnScale = useRef(new Animated.Value(1)).current;
  const submitBtnScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale = useRef(new Animated.Value(0.5)).current;
  const speakerPulse = useRef(new Animated.Value(1)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;

  // ── Pulse animation for speaking state ──
  useEffect(() => {
    if (isSpeaking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(speakerPulse, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(speakerPulse, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      speakerPulse.setValue(1);
    }
  }, [isSpeaking]);

  // ── Gentle header glow loop ──
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(headerGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  // ── Button press animation helper ──
  const animatePress = useCallback((scale) => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
    ]).start();
  }, []);

  // ── Show result overlay ──
  const showOverlay = useCallback(
    (correct, detected) => {
      setResultOverlay({ correct, detected });
      overlayOpacity.setValue(0);
      overlayScale.setValue(0.5);

      Animated.parallel([
        Animated.spring(overlayScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 2.5s
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(overlayScale, {
            toValue: 0.5,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => setResultOverlay(null));
      }, 2500);
    },
    [overlayOpacity, overlayScale]
  );

  // ── TTS Handler ──
  const handlePlayQuestion = useCallback(() => {
    if (isSpeaking) return;
    animatePress(playBtnScale);
    setIsSpeaking(true);

    Speech.speak(question.marathi, {
      language: 'mr-IN',
      rate: 0.85,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking, animatePress, playBtnScale, question]);

  // ── Submit Handler ──
  const handleSubmit = useCallback(() => {
    if (isProcessing || !hasDrawn) return;
    animatePress(submitBtnScale);

    // Trigger readSignature — the result comes via onOK callback
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
  }, [isProcessing, hasDrawn, animatePress, submitBtnScale]);

  // ── Signature Callbacks ──
  const handleSignatureOK = useCallback((signature) => {
    setIsProcessing(true);
    if (mlWebViewRef.current) {
      mlWebViewRef.current.postMessage(signature);
    } else {
      setIsProcessing(false);
    }
  }, []);

  const handleMlMessage = useCallback((event) => {
    setIsProcessing(false);
    try {
      const result = JSON.parse(event.nativeEvent.data);
      if (result.type === 'prediction') {
        const detectedNumber = result.digit;
        if (detectedNumber === -1) {
          console.log('No ink detected');
          return;
        }
        const isCorrect = detectedNumber === question.expected;
        showOverlay(isCorrect, detectedNumber);
        
        if (isCorrect) {
          setTimeout(() => {
            setQuestion(generateQuestion());
            handleClear();
          }, 2500);
        }
      } else if (result.type === 'error') {
        console.error('ML WebView Error:', result.message);
      }
    } catch(err) {
      console.error('Failed to parse ML response:', err);
    }
  }, [question, showOverlay]);

  const handleSignatureEmpty = useCallback(() => {
    setHasDrawn(false);
  }, []);

  const handleSignatureBegin = useCallback(() => {
    setHasDrawn(true);
  }, []);

  // ── Clear Canvas ──
  const handleClear = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setHasDrawn(false);
  }, []);

  // ── Header glow interpolation ──
  const glowColor = headerGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 183, 77, 0.0)', 'rgba(255, 183, 77, 0.25)'],
  });

  // ── Render ──
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <SafeAreaView style={styles.safeArea}>
        <WebView 
          ref={mlWebViewRef}
          source={{ html: getMlHtml() }}
          onMessage={handleMlMessage}
          style={{ display: 'none', width: 0, height: 0 }}
        />
        {/* ─── Header ─── */}
        <Animated.View style={[styles.header, { backgroundColor: glowColor }]}>
          <Text style={styles.headerEmoji}>✏️</Text>
          <Text style={styles.headerTitle}>Scribble Mode</Text>
          <Text style={styles.headerSubtitle}>Listen • Draw • Submit</Text>
        </Animated.View>

        {/* ─── Question Display ─── */}
        <View style={styles.questionBadge}>
          <Text style={styles.questionText}>{question.display}</Text>
        </View>

        {/* ─── Play Question Button ─── */}
        <Animated.View
          style={[styles.playBtnWrapper, { transform: [{ scale: playBtnScale }] }]}
        >
          <Pressable
            onPress={handlePlayQuestion}
            disabled={isSpeaking}
            style={({ pressed }) => [
              styles.playBtn,
              isSpeaking && styles.playBtnSpeaking,
              pressed && styles.playBtnPressed,
            ]}
          >
            <Animated.Text
              style={[
                styles.playBtnIcon,
                { transform: [{ scale: speakerPulse }] },
              ]}
            >
              🔊
            </Animated.Text>
            <Text style={styles.playBtnText}>
              {isSpeaking ? 'Speaking…' : 'Play Question'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ─── Canvas Area ─── */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvasLabel}>
            <Text style={styles.canvasLabelText}>✍️ Draw your answer here</Text>
          </View>
          <View style={styles.canvasWrapper}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignatureOK}
              onEmpty={handleSignatureEmpty}
              onBegin={handleSignatureBegin}
              webStyle={canvasWebStyle}
              backgroundColor="white"
              penColor="#1a1a2e"
              minWidth={4}
              maxWidth={8}
              dotSize={6}
              style={styles.canvas}
            />
          </View>

          {/* ─── Clear Button ─── */}
          <Pressable onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>🗑️ Clear Canvas</Text>
          </Pressable>
        </View>

        {/* ─── Submit Button ─── */}
        <Animated.View
          style={[styles.submitBtnWrapper, { transform: [{ scale: submitBtnScale }] }]}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={isProcessing || !hasDrawn}
            style={({ pressed }) => [
              styles.submitBtn,
              (!hasDrawn || isProcessing) && styles.submitBtnDisabled,
              pressed && styles.submitBtnPressed,
            ]}
          >
            <Text style={styles.submitBtnText}>
              {isProcessing ? '⏳ Processing…' : '✅ Submit Answer'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ─── Processing Overlay ─── */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#FFB74D" />
              <Text style={styles.processingText}>Processing…</Text>
              <Text style={styles.processingSubtext}>
                Detecting your handwriting
              </Text>
            </View>
          </View>
        )}

        {/* ─── Result Overlay ─── */}
        {resultOverlay && (
          <View style={styles.resultOverlay}>
            <Animated.View
              style={[
                styles.resultCard,
                resultOverlay.correct
                  ? styles.resultCardCorrect
                  : styles.resultCardWrong,
                {
                  opacity: overlayOpacity,
                  transform: [{ scale: overlayScale }],
                },
              ]}
            >
              <Text style={styles.resultEmoji}>
                {resultOverlay.correct ? '🎉' : '🤔'}
              </Text>
              <Text style={styles.resultTitle}>
                {resultOverlay.correct ? 'Correct!' : 'Try Again'}
              </Text>
              <Text style={styles.resultDetected}>
                Detected: {resultOverlay.detected}
              </Text>
              <Text style={styles.resultExpected}>
                Expected: {question.expected}
              </Text>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // ── Question Badge ──
  questionBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFB74D',
    textAlign: 'center',
  },

  // ── Play Button ──
  playBtnWrapper: {
    marginBottom: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E65100',
    paddingVertical: 16,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    gap: 12,
  },
  playBtnSpeaking: {
    backgroundColor: '#BF360C',
  },
  playBtnPressed: {
    opacity: 0.9,
  },
  playBtnIcon: {
    fontSize: 30,
  },
  playBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Canvas ──
  canvasContainer: {
    flex: 1,
    marginBottom: 10,
  },
  canvasLabel: {
    marginBottom: 6,
  },
  canvasLabelText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  canvasWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  canvas: {
    flex: 1,
  },

  // ── Clear Button ──
  clearBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  clearBtnText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Submit Button ──
  submitBtnWrapper: {
    marginBottom: 16,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 18,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
    elevation: 0,
  },
  submitBtnPressed: {
    opacity: 0.9,
  },
  submitBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Processing Overlay ──
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
    gap: 12,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFB74D',
    marginTop: 4,
  },
  processingSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // ── Result Overlay ──
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  resultCard: {
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 52,
    alignItems: 'center',
    borderWidth: 2,
    gap: 6,
  },
  resultCardCorrect: {
    backgroundColor: 'rgba(27, 94, 32, 0.95)',
    borderColor: '#66BB6A',
  },
  resultCardWrong: {
    backgroundColor: 'rgba(183, 28, 28, 0.95)',
    borderColor: '#EF5350',
  },
  resultEmoji: {
    fontSize: 56,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultDetected: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  resultExpected: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});
