/**
 * OTPScreen.tsx - AM_Faculty
 *
 * Step 4: OTP Display and Real-time Verification.
 * Large 4-digit OTP display.
 * 2-minute countdown timer.
 * Automatic rejection/re-request logic for students.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import FacultyBLEModule, { ConnectedStudent } from '../ble/FacultyBLEModule';
import { COLORS } from '../constants/theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'OTP'>;
  route: RouteProp<RootStackParamList, 'OTP'>;
};

export default function OTPScreen({ navigation, route }: Props) {
  const { uid, name, classInfo } = route.params;
  const [otp, setOtp] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Initial OTP Generation ---
  useEffect(() => {
    const freshOtp = FacultyBLEModule.generateOTP();
    setOtp(freshOtp);
    setTimeLeft(FacultyBLEModule.getOTPRemainingSeconds());
    setStudents(FacultyBLEModule.getConnectedStudents());

    // Tell students to enter OTP
    FacultyBLEModule.broadcastOTPRequest();

    // Start UI timer
    timerRef.current = setInterval(() => {
      const remaining = FacultyBLEModule.getOTPRemainingSeconds();
      setTimeLeft(remaining);
      if (remaining === 0) {
        setOtp(''); // Clear from UI visually
      }
    }, 1000);

    // Update list on verification events
    FacultyBLEModule.startSession({
      onStudentJoined: student => {
        setStudents(FacultyBLEModule.getConnectedStudents());
        // If student joins after OTP was broadcasted, they already get the OTP_REQUEST in the module's handleJOIN
      },
      onStudentOTPVerified: () => {
        setStudents(FacultyBLEModule.getConnectedStudents());
      },
      onOTPExpired: () => {
        setOtp('');
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleRegenerate = () => {
    const freshOtp = FacultyBLEModule.generateOTP();
    setOtp(freshOtp);
    setTimeLeft(FacultyBLEModule.getOTPRemainingSeconds());
    FacultyBLEModule.broadcastOTPRequest();
    Alert.alert('New OTP Generated', 'Tell students to use the new code.');
  };

  const handleFinish = () => {
    const finalStudents = FacultyBLEModule.getConnectedStudents();
    const confirmedCount = finalStudents.filter(s => s.status === 'confirmed').length;

    Alert.alert(
      'Finish Session?',
      `You have ${confirmedCount} confirmed students. Finish and save?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            navigation.navigate('Result', {
              uid,
              name,
              classInfo,
              students: finalStudents,
            });
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }: { item: ConnectedStudent }) => (
    <View style={styles.studentRow}>
      <View style={[styles.statusDot, statusDotColor(item.status)]} />
      <Text style={styles.studentUid}>{item.uid}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeTxt}>{statusLabel(item.status)}</Text>
      </View>
      {item.otpAttempts > 0 && item.status !== 'confirmed' && (
        <Text style={styles.attemptTxt}>{item.otpAttempts}/3</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.subjectLabel}>{classInfo.subject}</Text>
        <Text style={styles.phaseTitle}>OTP HANDSHAKE</Text>
      </View>

      {/* Large OTP Display */}
      <View style={styles.otpCard}>
        <Text style={styles.otpLabel}>Verification Code</Text>
        {otp ? (
          <View style={styles.otpContainer}>
            {otp.split('').map((digit, index) => (
              <View key={index} style={styles.otpDigitBox}>
                <Text style={styles.otpDigit}>{digit}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.expiredBox}>
            <Text style={styles.expiredTxt}>EXPIRED</Text>
          </View>
        )}

        <View style={styles.timerRow}>
          <Text style={[styles.timerTxt, timeLeft < 30 && { color: COLORS.error }]}>
            ⏱ {formatTime(timeLeft)}
          </Text>
          {timeLeft === 0 && (
            <TouchableOpacity onPress={handleRegenerate}>
              <Text style={styles.regenTxt}>REGENERATE OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Stats */}
      <View style={styles.statsRow}>
        <StatItem
          label="JOINED"
          value={students.length}
          color={COLORS.textSecondary}
        />
        <StatItem
          label="VERIFIED"
          value={students.filter(s => s.status === 'confirmed').length}
          color={COLORS.success}
        />
        <StatItem
          label="PENDING"
          value={students.filter(s => s.status === 'otp_sent' || s.status === 'pending').length}
          color={COLORS.warning}
        />
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        keyExtractor={s => s.uid}
        renderItem={renderStudent}
        style={styles.list}
        ListHeaderComponent={<Text style={styles.listHeader}>Recent Activity</Text>}
      />

      <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
        <Text style={styles.finishBtnTxt}>FINISH & SAVE ATTENDANCE</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function statusLabel(s: ConnectedStudent['status']) {
  switch (s) {
    case 'confirmed': return 'Verified';
    case 'rejected':  return 'Rejected';
    case 'otp_sent':  return 'Waiting...';
    default:          return 'Joined';
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
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24, alignItems: 'center' },
  subjectLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  phaseTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  otpCard: { backgroundColor: COLORS.surface, marginHorizontal: 24, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  otpLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 20 },
  otpContainer: { flexDirection: 'row', gap: 12 },
  otpDigitBox: { backgroundColor: 'rgba(255,255,255,0.05)', width: 54, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  otpDigit: { color: '#fff', fontSize: 42, fontWeight: '900' },
  expiredBox: { height: 72, justifyContent: 'center' },
  expiredTxt: { color: COLORS.error, fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  timerTxt: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  regenTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4 },
  list: { flex: 1, paddingHorizontal: 24 },
  listHeader: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  studentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  studentUid: { color: '#fff', fontSize: 14, flex: 1, fontWeight: '600' },
  badge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeTxt: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  attemptTxt: { color: COLORS.error, fontSize: 10, fontWeight: '800', marginLeft: 8 },
  finishBtn: { backgroundColor: COLORS.success, margin: 24, borderRadius: 16, padding: 18, alignItems: 'center' },
  finishBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});
