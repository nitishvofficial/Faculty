/**
 * FaceScanScreen.tsx — AM_Faculty
 *
 * Updated with detailed debug logging to troubleshoot 0% match scores.
 */
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
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  useSharedValue 
} from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFaceRecognition } from '../hooks/useFaceRecognition';
import { faceService } from '../services/faceService';
import { COLORS } from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width * 0.85; // Increased for better capture

const NOTHING_RED = '#E53935';
const FONT_MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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

  const scanLineY = useSharedValue(0);

  useEffect(() => {
    if (isScanning) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(SCAN_SIZE, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1
      );
    } else {
      scanLineY.value = 0;
    }
  }, [isScanning, scanLineY]);

  const animatedLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: isScanning ? 1 : 0,
  }));

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
      
      <Camera
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        device={device}
        format={format}
        isActive={!scanResult?.success}
        photo
        resizeMode="cover"
      />

      <View style={styles.overlayContainer}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            
            <Animated.View style={[styles.scanLine, animatedLineStyle]}>
              <LinearGradient
                colors={['transparent', NOTHING_RED, 'transparent']}
                start={{x: 0, y: 0.5}}
                end={{x: 1, y: 0.5}}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>ACADEMIC MONITOR</Text>
          <Text style={styles.title}>Secure Sign-in</Text>
        </View>

        <View style={styles.statusContainer}>
          {!isModelsLoaded || syncStatus === 'syncing' ? (
            <View style={styles.glassPill}>
              <ActivityIndicator size="small" color={NOTHING_RED} />
              <Text style={styles.statusTxt}>Initializing Security Pipeline...</Text>
            </View>
          ) : scanResult?.message ? (
            <View style={[styles.glassPill, scanResult.success && styles.successPill]}>
              <Text style={[styles.statusTxt, scanResult.success && styles.successTxt]}>
                {scanResult.message}
              </Text>
            </View>
          ) : (
            <Text style={styles.hintTxt}>Position your face within the frame</Text>
          )}
        </View>

        <View style={styles.footer}>
          {!scanResult?.success && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.primaryBtn, 
                (!isModelsLoaded || isScanning || syncStatus !== 'ok') && styles.btnDisabled
              ]}
              disabled={!isModelsLoaded || isScanning || syncStatus !== 'ok'}
              onPress={() => setIsScanning(true)}
            >
              {isScanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnTxt}>VERIFY IDENTITY</Text>
              )}
            </TouchableOpacity>
          )}
          
          {syncStatus === 'error' && (
            <TouchableOpacity onPress={doSync} style={styles.retryBtn}>
              <Text style={styles.retryBtnTxt}>Network Error: Tap to Retry Sync</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  darkBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorTxt: { color: NOTHING_RED, fontSize: 16, fontFamily: FONT_MONO },

  overlayContainer: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  overlayMiddle: { height: SCAN_SIZE, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  overlayBottom: { flex: 2, backgroundColor: 'rgba(0,0,0,0.85)' },
  
  scanTarget: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: NOTHING_RED,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  
  scanLine: {
    width: '100%',
    height: 4,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },

  corner: { position: 'absolute', width: 40, height: 40, borderColor: NOTHING_RED },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 },

  content: { ...StyleSheet.absoluteFillObject, padding: 30, justifyContent: 'space-between' },
  header: { marginTop: 60, alignItems: 'center' },
  brand: { color: NOTHING_RED, fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 8, fontFamily: FONT_MONO, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: 2 },

  statusContainer: { alignItems: 'center' },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: NOTHING_RED,
  },
  successPill: { backgroundColor: '#fff', borderColor: '#000' },
  statusTxt: { color: '#fff', fontSize: 13, fontWeight: '900', marginLeft: 10, fontFamily: FONT_MONO, textTransform: 'uppercase' },
  successTxt: { color: '#000' },
  hintTxt: { color: '#aaa', fontSize: 13, textAlign: 'center', fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: 1 },

  footer: { marginBottom: 40, width: '100%' },
  primaryBtn: {
    backgroundColor: '#fff',
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  btnDisabled: { backgroundColor: '#222', borderColor: '#222' },
  btnTxt: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_MONO, textTransform: 'uppercase' },
  
  retryBtn: { marginTop: 20, alignSelf: 'center', padding: 10, borderWidth: 1, borderColor: NOTHING_RED, borderRadius: 20 },
  retryBtnTxt: { color: NOTHING_RED, fontSize: 12, fontWeight: '900', fontFamily: FONT_MONO, textTransform: 'uppercase' },
});
