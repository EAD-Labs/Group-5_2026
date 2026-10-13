import React, { useRef, useState } from 'react';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ANKPATI_HTML } from '../utils/ankpatiHtml';

export default function DigitRecognitionScreen() {
  const webRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  const source = (!loadError && Platform.OS === 'android')
    ? { uri: 'file:///android_asset/ankpati.html' }
    : { html: ANKPATI_HTML, baseUrl: 'https://localhost' };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDE6D3" />
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={source}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        scalesPageToFit={false}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        setBuiltInZoomControls={false}
        overScrollMode="never"
        mixedContentMode="always"
        onError={() => {
          if (!loadError) setLoadError(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EDE6D3',
  },
  webview: {
    flex: 1,
    backgroundColor: '#EDE6D3',
  },
});
