/**
 * TimetableScreen.tsx — AM_Faculty
 *
 * Step 2: Fetch timetable from faculties.timetable_json, auto-suggest current class.
 * Faculty can confirm the suggestion or enter manually.
 * On proceed → BLESessionScreen
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  timetableService,
  TimetableSuggestion,
} from '../services/timetableService';
import {COLORS} from '../constants/theme';
import dayjs from 'dayjs';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Timetable'>;
  route: RouteProp<RootStackParamList, 'Timetable'>;
};

const FIELDS = ['subject', 'branch', 'semester', 'section'] as const;

export default function TimetableScreen({navigation, route}: Props) {
  const {uid, name} = route.params;

  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<TimetableSuggestion | null>(
    null,
  );
  const [isManual, setIsManual] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: '',
    branch: '',
    semester: '',
    section: '',
  });

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const slots = await timetableService.fetchTimetable(uid);
      const s = timetableService.getSuggestion(slots);
      setSuggestion(s);
      if (s) {
        setForm({
          subject: s.slot.subject,
          branch: s.slot.branch,
          semester: s.slot.semester,
          section: s.slot.section,
        });
      }
    } catch (e: any) {
      console.warn('[TimetableScreen] fetch failed, entering manual mode:', e.message);
      setSyncError(e.message || 'Network error');
      setIsManual(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    const {subject, branch, semester, section} = form;
    if (!subject || !branch || !semester || !section) {
      Alert.alert(
        'Missing Fields',
        'Please fill all class details before starting.',
      );
      return;
    }
    navigation.navigate('BLESession', {uid, name, classInfo: form});
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTxt}>Fetching your schedule…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {getGreeting()},</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.dateLabel}>
          {dayjs().format('dddd, D MMM YYYY')}
        </Text>
      </View>

      {/* Suggestion card */}
      {suggestion && !isManual ? (
        <View style={styles.card}>
          <View
            style={[
              styles.cardBadge,
              suggestion.isLive ? styles.badgeLive : styles.badgeUpcoming,
            ]}>
            <Text style={styles.badgeTxt}>
              {suggestion.isLive ? '🟢  LIVE NOW' : '🕐  UPCOMING'}
            </Text>
          </View>

          <Text style={styles.cardSubject}>{suggestion.slot.subject}</Text>
          <Text style={styles.cardTime}>{suggestion.timeLabel}</Text>

          <View style={styles.chipRow}>
            <Chip label={`Sem ${suggestion.slot.semester}`} />
            <Chip label={suggestion.slot.branch} />
            <Chip label={`Sec ${suggestion.slot.section}`} />
          </View>

          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedBtnTxt}>START SESSION →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualLink}
            onPress={() => setIsManual(true)}>
            <Text style={styles.manualLinkTxt}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Manual entry */
        <View style={styles.card}>
          {syncError && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerTxt}>⚠️ Timetable offline ({syncError})</Text>
            </View>
          )}
          <Text style={styles.manualTitle}>Manual Class Entry</Text>
          {FIELDS.map(field => (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </Text>
              <TextInput
                style={styles.input}
                value={(form as any)[field]}
                onChangeText={val => setForm({...form, [field]: val})}
                placeholder={`Enter ${field}`}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedBtnTxt}>START SESSION →</Text>
          </TouchableOpacity>
          {suggestion && (
            <TouchableOpacity
              style={styles.manualLink}
              onPress={() => setIsManual(false)}>
              <Text style={styles.manualLinkTxt}>← Back to Suggestion</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Chip({label}: {label: string}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipTxt}>{label}</Text>
    </View>
  );
}

function getGreeting() {
  const h = dayjs().hour();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {padding: 24, paddingBottom: 60},
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTxt: {color: COLORS.textSecondary, marginTop: 16, fontSize: 14},

  header: {marginTop: 40, marginBottom: 32},
  greeting: {fontSize: 14, color: COLORS.textSecondary},
  name: {fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2},
  dateLabel: {fontSize: 12, color: COLORS.textSecondary, marginTop: 6},

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },

  cardBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeLive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  badgeUpcoming: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  badgeTxt: {fontSize: 11, fontWeight: '700', color: '#fff'},

  cardSubject: {fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 4},
  cardTime: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 20,
  },

  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28},
  chip: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  chipTxt: {color: COLORS.primary, fontSize: 12, fontWeight: '700'},

  proceedBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  proceedBtnTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  manualLink: {alignItems: 'center', marginTop: 14},
  manualLinkTxt: {color: COLORS.textSecondary, fontSize: 13, fontWeight: '600'},

  manualTitle: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20},
  inputGroup: {marginBottom: 16},
  inputLabel: {color: COLORS.textSecondary, fontSize: 13, marginBottom: 6},
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 14,
  },
  offlineBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  offlineBannerTxt: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
