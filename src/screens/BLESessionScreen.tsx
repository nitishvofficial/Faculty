/**
 * BLESessionScreen.tsx - AM_Faculty
 *
 * Step 3: Start BLE peripheral broadcasting.
 * Shows pulsing animation while students scan & connect.
 * Lists joining students in real-time.
 * "Generate OTP" button -> OTPScreen
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import FacultyBLEModule, { ConnectedStudent } from '../ble/FacultyBLEModule';
import { COLORS } from '../constants/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'BLESession'>;
  route: RouteProp<RootStackParamList, 'BLESession'>;
};

type BLEPhase = 'initializing' | 'broadcasting' | 'error';

export default function BLESessionScreen({ navigation, route }: Props) {
  const { uid, name, classInfo } = route.params;
  const [phase, setPhase] = useState<BLEPhase>('initializing');
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // --- Pulse animation ---
  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
  }, []);

  // --- BLE Init ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Request Bluetooth permissions (Android 12+)
        if (Platform.OS === 'android') {
          const apiLevel = parseInt(Platform.Version.toString(), 10);
          if (apiLevel >= 31) {
            const result = await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            const allGranted = Object.values(result).every(
              r => r === PermissionsAndroid.RESULTS.GRANTED,
            );
            if (!allGranted) {
              throw new Error('Bluetooth permissions not granted.');
            }
          } else {
             await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          }
        }

        await FacultyBLEModule.initialize();

        // Start advertising session
        await FacultyBLEModule.startAdvertising(classInfo);

        // Start listening for student JOIN messages
        FacultyBLEModule.startSession({
          onStudentJoined: student => {
            if (mounted) {
              setStudents(FacultyBLEModule.getConnectedStudents());
            }
          },
          onStudentOTPVerified: (_uid, _success) => {
            if (mounted) {
              setStudents(FacultyBLEModule.getConnectedStudents());
            }
          },
          onError: err => {
            console.error('[BLESessionScreen] session error:', err);
          },
        });

        if (mounted) {
          setPhase('broadcasting');
          startPulse();
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMsg(err.message || 'Failed to start BLE broadcasting');
          setPhase('error');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      stopPulse();
      FacultyBLEModule.stopSession();
      FacultyBLEModule.stopAdvertising().catch(() => {});
    };
  }, [classInfo, startPulse, stopPulse]);

  const handleGenerateOTP = () => {
    if (students.length === 0) {
      Alert.alert(
        'No Students Yet',
        'Wait for at least one student to connect before generating OTP.',
      );
      return;
    }
    navigation.navigate('OTP', { uid, name, classInfo });
  };

  const handleEndSession = () => {
    Alert.alert('End Session', 'Stop broadcasting and go to results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: () => {
          const finalStudents = FacultyBLEModule.getConnectedStudents();
          FacultyBLEModule.stopSession();
          FacultyBLEModule.stopAdvertising().catch(() => {});
          navigation.navigate('Result', {
            uid,
            name,
            classInfo,
            students: finalStudents,
          });
        },
      },
    ]);
  };

  const renderStudent = ({ item }: { item: ConnectedStudent }) => (
    <View style={styles.studentRow}>
      <View style={[styles.statusDot, statusDotColor(item.status)]} />
      <Text style={styles.studentUid}>{item.uid}</Text>
      <Text style={styles.studentStatus}>{statusLabel(item.status)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.subject}>{classInfo.subject}</Text>
        <Text style={styles.meta}>
          {classInfo.branch} · Sem {classInfo.semester} · Sec {classInfo.section}
        </Text>
      </View>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbRing, { transform: [{ scale: pulseAnim }], opacity: 0.25 }]} />
        <Animated.View
          style={[styles.orbRing, { transform: [{ scale: Animated.multiply(pulseAnim, 0.78) }], opacity: 0.45 }]}
        />
        <View style={styles.orb}>
          <Text style={styles.orbInitial}>{name.charAt(0).toUpperCase()}</Text>
          <Text style={styles.orbRole}>Faculty Host</Text>
        </View>
      </View>

      {phase === 'initializing' && (
        <Text style={styles.phaseLabel}>Initializing BLE...</Text>
      )}
      {phase === 'broadcasting' && (
        <Text style={[styles.phaseLabel, { color: COLORS.success }]}>
          📡 Broadcasting · {students.length} student{students.length !== 1 ? 's' : ''} joined
        </Text>
      )}
      {phase === 'error' && (
        <Text style={[styles.phaseLabel, { color: COLORS.error }]}>❌ {errorMsg}</Text>
      )}

      <FlatList
        data={students}
        keyExtractor={s => s.uid}
        renderItem={renderStudent}
        style={styles.list}
        contentContainerStyle={students.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <Text style={styles.emptyTxt}>
            Waiting for students to scan...{'\n'}Make sure Bluetooth is ON on student devices.
          </Text>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.otpBtn, (students.length === 0 || phase !== 'broadcasting') && styles.otpBtnDisabled]}
          onPress={handleGenerateOTP}
          disabled={students.length === 0 || phase !== 'broadcasting'}
        >
          <Text style={styles.otpBtnTxt}>GENERATE OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
          <Text style={styles.endBtnTxt}>END SESSION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function statusLabel(s: ConnectedStudent['status']) {
  switch (s) {
    case 'pending':   return 'OTP Pending';
    case 'otp_sent':  return 'OTP Sent';
    case 'confirmed': return '✓ Confirmed';
    case 'rejected':  return '✗ Rejected';
  }
}

function statusDotColor(s: ConnectedStudent['status']) {
  switch (s) {
    case 'confirmed': return { backgroundColor: COLORS.success };
    case 'rejected':  return { backgroundColor: COLORS.error };
    case 'otp_sent':  return { backgroundColor: COLORS.warning };
    default:          return { backgroundColor: COLORS.primary };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: 'center', marginTop: 56, paddingHorizontal: 24 },
  subject: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  orbContainer: { alignItems: 'center', justifyContent: 'center', height: 260, marginTop: 8 },
  orbRing: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: COLORS.primary },
  orb: { width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', elevation: 10 },
  orbInitial: { fontSize: 52, fontWeight: '900', color: '#fff' },
  orbRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  phaseLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  list: { flex: 1, marginHorizontal: 24 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 22 },
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  studentUid: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  studentStatus: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  actions: { padding: 24, gap: 10 },
  otpBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 18, alignItems: 'center' },
  otpBtnDisabled: { backgroundColor: '#2a2a3e' },
  otpBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  endBtn: { padding: 14, alignItems: 'center' },
  endBtnTxt: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});
