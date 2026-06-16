import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { faceService } from '../services/faceService';

const NOTHING_RED = '#E53935';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'FaceScan'> };

export default function FaceScanScreen({ navigation }: Props) {
  const [hasPermission, setHasPermission] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  const device = useCameraDevice('front');
  const format = useCameraFormat(device, [
    { photoResolution: { width: 640, height: 480 } },
    { videoResolution: { width: 640, height: 480 } },
  ]);

  const { cameraRef, isModelsLoaded, isScanning, setIsScanning, scanResult } =
    useFaceRecognition();

  const doSync = async () => {
    setSyncStatus('syncing');
    try {
      await faceService.syncFacultyEmbeddings();
      setSyncStatus('ok');
    } catch (e: any) {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      await doSync();
    })();
  }, []);

  useEffect(() => {
    if (scanResult?.success && scanResult.facultyId) {
      setTimeout(() => {
        navigation.replace('Timetable', {
          uid: scanResult.facultyId!,
          name: scanResult.facultyName || 'Faculty',
        });
      }, 1500);
    }
  }, [scanResult, navigation]);

  if (!hasPermission) return <View style={styles.darkBg}><Text style={styles.errorTxt}>Camera Access Required</Text></View>;
  if (!device) return <View style={styles.darkBg}><Text style={styles.errorTxt}>Camera Not Found</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Identity Verification</Text>
          {!isModelsLoaded || syncStatus === 'syncing' ? (
            <Text style={styles.subtitle}>Loading AI Models…</Text>
          ) : (
            <Text style={styles.subtitle}>Position your face in the centre</Text>
          )}
        </View>

        {syncStatus === 'error' && (
          <View style={styles.syncErrorBanner}>
            <Text style={styles.syncErrorTitle}>⚠️ Sync Failed</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={doSync} disabled={syncStatus === 'syncing'}>
              <Text style={styles.retryBtnText}>🔄 Retry Sync</Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.frameBox,
            scanResult?.success && styles.frameBoxSuccess,
            { overflow: 'hidden' }
          ]}
        >
          <Camera
            style={StyleSheet.absoluteFill}
            ref={cameraRef}
            device={device}
            format={format}
            isActive={!scanResult?.success}
            photo
            resizeMode="cover"
          />
        </View>

        <View style={styles.footer}>
          {scanResult?.success && (
            <View style={[styles.resultBox, styles.resultSuccess]}>
              <Text style={styles.resultText}>{scanResult.message}</Text>
            </View>
          )}

          {!scanResult?.success && (
            <View style={{ width: '100%' }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  (!isModelsLoaded || isScanning || syncStatus !== 'ok') && styles.buttonDisabled,
                ]}
                disabled={!isModelsLoaded || isScanning || syncStatus !== 'ok'}
                onPress={() => setIsScanning(true)}
              >
                {isScanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Start Scan</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorTxt: { color: NOTHING_RED, fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
    zIndex: 10,
  },
  header: { alignItems: 'center', marginTop: 40 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 8 },
  frameBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 20,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  frameBoxSuccess: { borderColor: '#00FF00', borderWidth: 4 },
  footer: { width: '100%', paddingBottom: 40, alignItems: 'center' },
  resultBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  resultSuccess: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#00FF00',
  },
  resultText: { color: '#fff', fontWeight: 'bold' },
  button: {
    backgroundColor: NOTHING_RED,
    width: '100%',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#555' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  syncErrorBanner: {
    backgroundColor: 'rgba(200, 0, 0, 0.85)',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  syncErrorTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#cc0000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
