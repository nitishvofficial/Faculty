import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
} from 'react-native-vision-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { faceService } from '../services/faceService';
<<<<<<< HEAD

const NOTHING_RED = '#E53935';
=======
>>>>>>> eb6efcd ( new changes applied)

type Props = { navigation: StackNavigationProp<RootStackParamList, 'FaceScan'> };

export default function FaceScanScreen({ navigation }: Props) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const device = useCameraDevice('front');
  
  const format = useCameraFormat(device, [
    { photoResolution: { width: 640, height: 480 } },
    { videoResolution: { width: 640, height: 480 } },
    { fps: 30 },
  ]);

  const {
    cameraRef,
    isModelsLoaded,
    error,
    isScanning,
    setIsScanning,
    scanResult,
  } = useFaceRecognition();

<<<<<<< HEAD
  const doSync = async () => {
    setSyncStatus('syncing');
=======
  const handleForceSync = async () => {
    setIsForceSyncing(true);
    setLastSyncStatus('idle');
>>>>>>> eb6efcd ( new changes applied)
    try {
      const result = await faceService.syncFacultyEmbeddings();
      setLastSyncStatus('success');
      Alert.alert('Sync Successful', `Faculty database updated (${result.count} embeddings loaded).`);
    } catch (err: any) {
      setLastSyncStatus('error');
      console.log('Force sync failed:', err);
      Alert.alert('Sync Failed', err.message || 'Could not sync faculty database. Check network and try again.');
    } finally {
      setIsForceSyncing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      // Auto sync on mount
      handleForceSync();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          Camera permission is required to verify identity.
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No front camera found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
<<<<<<< HEAD
      
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

=======
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Identity Verification</Text>
          {error ? (
            <Text style={[styles.subtitle, styles.errorText]}>
              AI Error: {error}
            </Text>
          ) : !isModelsLoaded ? (
            <Text style={styles.subtitle}>Loading AI Models…</Text>
          ) : (
            <Text style={styles.subtitle}>
              Position your face in the centre
            </Text>
          )}
        </View>

        {/* Manual Force Sync (Escape Hatch) */}
        <TouchableOpacity
          style={styles.adminSyncBtn}
          onPress={handleForceSync}
          disabled={isForceSyncing}
        >
          <Text style={styles.adminSyncBtnText}>
            {isForceSyncing ? '🔄 Syncing...' : '🔄 Force Sync'}
          </Text>
        </TouchableOpacity>

        {/* Face framing box - NOW ISOLATES THE CAMERA FEED */}
>>>>>>> eb6efcd ( new changes applied)
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
<<<<<<< HEAD
            photo
=======
            photo={true}
>>>>>>> eb6efcd ( new changes applied)
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
<<<<<<< HEAD
                  (!isModelsLoaded || isScanning || syncStatus !== 'ok') && styles.buttonDisabled,
                ]}
                disabled={!isModelsLoaded || isScanning || syncStatus !== 'ok'}
=======
                  (!isModelsLoaded || isScanning || isForceSyncing) && styles.buttonDisabled,
                ]}
                disabled={!isModelsLoaded || isScanning || isForceSyncing}
>>>>>>> eb6efcd ( new changes applied)
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
<<<<<<< HEAD
  darkBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorTxt: { color: NOTHING_RED, fontSize: 16 },
=======
>>>>>>> eb6efcd ( new changes applied)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
    zIndex: 10,
  },
  header: { alignItems: 'center', marginTop: 40 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 8 },
<<<<<<< HEAD
=======
  errorText: { color: '#ff5555' },
>>>>>>> eb6efcd ( new changes applied)
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
<<<<<<< HEAD
  resultText: { color: '#fff', fontWeight: 'bold' },
  button: {
    backgroundColor: NOTHING_RED,
=======
  resultFail: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  resultText: { color: '#fff', fontWeight: 'bold' },
  button: {
    backgroundColor: '#E53935',
>>>>>>> eb6efcd ( new changes applied)
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
<<<<<<< HEAD
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
=======
  adminSyncBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
  },
  adminSyncBtnText: {
    color: '#ccc',
    fontSize: 12,
  },
  text: { color: '#fff', textAlign: 'center', padding: 20 },
>>>>>>> eb6efcd ( new changes applied)
});
