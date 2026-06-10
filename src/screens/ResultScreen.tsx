/**
 * ResultScreen.tsx - AM_Faculty
 *
 * Step 5: Final Summary and Data Persistence.
 * Displays stats: Present / Total Joined.
 * Saves data to Supabase 'attendance' table.
 * Manual marking override (Swipe/Button).
 * Share results functionality.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { timetableService } from '../services/timetableService';
import { ConnectedStudent } from '../ble/FacultyBLEModule';
import { COLORS } from '../constants/theme';
import { supabase } from '../services/supabaseClient';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

export default function ResultScreen({ navigation, route }: Props) {
  const { uid, name, classInfo, students: initialStudents } = route.params;
  const [students, setStudents] = useState<ConnectedStudent[]>(initialStudents);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const presentCount = students.filter(s => s.status === 'confirmed').length;

  const handleManualMark = (studentUid: string) => {
    const updated = students.map(s => {
      if (s.uid === studentUid) {
        return { ...s, status: s.status === 'confirmed' ? 'rejected' : 'confirmed' } as ConnectedStudent;
      }
      return s;
    });
    setStudents(updated);
  };

  const handleExportCSV = async () => {
    setSaving(true);
    try {
      const dateStr = new Date().toLocaleDateString();
      const timeStr = new Date().toLocaleTimeString();

      // Fetch full class list from Supabase
      const { data: allStudents, error } = await supabase
        .from('students')
        .select('student_uid, name, roll_number')
        .eq('branch', classInfo.branch)
        .eq('semester', classInfo.semester)
        .eq('section', classInfo.section);

      if (error) {
        console.warn('Failed to fetch class list from database:', error.message);
      }

      let csvString = 'Faculty ID,Faculty Name,Student ID,Student Name,Roll Number,Status,Subject,Branch,Semester,Section,Date,Time\n';

      if (allStudents && allStudents.length > 0) {
        allStudents.forEach(s => {
          // Check if this student is in the connected/verified list
          const connectedStudent = students.find(cs => cs.uid === s.student_uid);
          const statusStr = (connectedStudent && connectedStudent.status === 'confirmed') ? 'Present' : 'Absent';
          
          csvString += `${uid},${name},${s.student_uid},${s.name},${s.roll_number},${statusStr},${classInfo.subject},${classInfo.branch},${classInfo.semester},${classInfo.section},${dateStr},${timeStr}\n`;
        });
      } else {
        // Fallback to just the connected students if no roster found
        students.forEach(s => {
          const statusStr = s.status === 'confirmed' ? 'Present' : 'Absent';
          csvString += `${uid},${name},${s.uid},Unknown,Unknown,${statusStr},${classInfo.subject},${classInfo.branch},${classInfo.semester},${classInfo.section},${dateStr},${timeStr}\n`;
        });
      }

      const fileName = `Attendance_${classInfo.subject.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const filePath = Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvString, 'utf8');
      setSaved(true);
      Alert.alert('Success', `Attendance CSV saved to:\n${filePath}`);
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Check storage permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const dateStr = new Date().toLocaleDateString();
    const confirmed = students.filter(s => s.status === 'confirmed').map(s => s.uid).join('\n');
    const msg = `Attendance Report - ${dateStr}\nSubject: ${classInfo.subject}\nFaculty: ${name}\n\nPresent Students (${presentCount}):\n${confirmed}`;

    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const renderStudent = ({ item }: { item: ConnectedStudent }) => (
    <View style={styles.studentRow}>
      <Text style={styles.studentUid}>{item.uid}</Text>
      <View style={[styles.statusBadge, item.status === 'confirmed' ? styles.confirmedBadge : styles.rejectedBadge]}>
        <Text style={styles.statusBadgeTxt}>{item.status === 'confirmed' ? 'PRESENT' : 'ABSENT'}</Text>
      </View>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => handleManualMark(item.uid)}
      >
        <Text style={styles.toggleBtnTxt}>{item.status === 'confirmed' ? 'Remove' : 'Mark'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>SUMMARY</Text>
        <Text style={styles.subtitle}>{classInfo.subject}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{presentCount}</Text>
          <Text style={styles.statLabel}>PRESENT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{students.length}</Text>
          <Text style={styles.statLabel}>TOTAL JOINED</Text>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={s => s.uid}
        renderItem={renderStudent}
        style={styles.list}
        ListHeaderComponent={<Text style={styles.listHeader}>Verified List</Text>}
      />

      <View style={styles.actions}>
        {!saved ? (
          <TouchableOpacity
            style={[styles.mainBtn, saving && styles.disabledBtn]}
            onPress={handleExportCSV}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainBtnTxt}>EXPORT AS CSV</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: COLORS.secondary }]} onPress={handleShare}>
            <Text style={styles.mainBtnTxt}>SHARE TEXT REPORT</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.newSessionBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.newSessionBtnTxt}>START NEW SESSION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, paddingTop: 56, alignItems: 'center' },
  title: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  subtitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  statsCard: { backgroundColor: COLORS.surface, margin: 24, borderRadius: 20, flexDirection: 'row', padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 32, fontWeight: '900' },
  statLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  list: { flex: 1, paddingHorizontal: 24 },
  listHeader: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8 },
  studentUid: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 12 },
  confirmedBadge: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: COLORS.success },
  rejectedBadge: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: COLORS.error },
  statusBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#fff' },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleBtnTxt: { color: '#ccc', fontSize: 11, fontWeight: '700' },
  actions: { padding: 24 },
  mainBtn: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  mainBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  disabledBtn: { opacity: 0.7 },
  newSessionBtn: { padding: 12, alignItems: 'center' },
  newSessionBtnTxt: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});
