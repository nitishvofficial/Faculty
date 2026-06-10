/**
 * timetableService.ts — AM_Faculty
 *
 * Fetches the faculty's timetable from faculties.timetable_json (JSONB).
 * There is NO separate timetable table — data is embedded in the faculty row.
 * Handles both flat array and nested object formats found in the database.
 */
import {supabase} from './supabaseClient';
import dayjs from 'dayjs';

const TAG = '[TimetableService]';

export interface ClassSlot {
  day: string;
  subject: string;
  branch: string;
  semester: string;
  section: string;
  start_time: string;
  end_time: string;
}

export interface TimetableSuggestion {
  slot: ClassSlot;
  isLive: boolean;
  timeLabel: string;
}

export const timetableService = {
  /**
   * Fetch timetable and parse into flat ClassSlot array.
   */
  async fetchTimetable(facultyId: string): Promise<ClassSlot[]> {
    console.log(TAG, 'Fetching timetable for:', facultyId);

    const {data, error} = await supabase
      .from('faculties')
      .select('timetable_json')
      .eq('faculty_id', facultyId)
      .single();

    if (error) {
      throw new Error(`Timetable fetch error: ${error.message}`);
    }

    let raw = data?.timetable_json;
    if (!raw) {
      console.warn(TAG, 'No timetable data found for faculty');
      return [];
    }

    // Supabase may return timetable_json as a raw string if the column is TEXT not JSONB.
    // Parse it so the Array.isArray / object checks below work correctly.
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
        console.log(TAG, 'Parsed timetable_json from string');
      } catch (parseErr) {
        console.error(TAG, 'timetable_json is a string but failed to parse as JSON:', parseErr);
        return [];
      }
    }

    const slots: ClassSlot[] = [];

    // Format 1: Flat Array
    if (Array.isArray(raw)) {
      console.log(TAG, 'Detected flat array format,', raw.length, 'slots');
      return raw;
    }

    // Format 2: Nested Object {"timetable": {"Monday": {"P1": {...}}}}
    if (typeof raw === 'object' && raw.timetable) {
      console.log(TAG, 'Detected nested object format');
      try {
        const tt = raw.timetable;
        for (const [day, periods] of Object.entries<any>(tt)) {
          for (const [pName, pData] of Object.entries<any>(periods)) {
            // pData looks like { "class": "CSE-B", "subject": "AI", ... }
            // If pData doesn't have start/end time, we assign defaults based on period name
            slots.push({
              day,
              subject: pData.subject || pName,
              branch: pData.branch || pData.class || 'N/A',
              semester: String(pData.semester || ''),
              section: pData.section || (pData.class?.includes('-') ? pData.class.split('-')[1] : 'A'),
              start_time: pData.start_time || this.getDefaultStartTime(pName),
              end_time: pData.end_time || this.getDefaultEndTime(pName),
            });
          }
        }
      } catch (err) {
        console.error(TAG, 'Failed to parse nested timetable:', err);
      }
    }

    console.log(TAG, `Loaded ${slots.length} timetable slots`);
    return slots;
  },

  getDefaultStartTime(p: string): string {
    const times: Record<string, string> = {
      P1: '09:00', P2: '10:00', P3: '11:00', P4: '12:00',
      P5: '14:00', P6: '15:00', P7: '16:00',
    };
    return times[p] || '09:00';
  },

  getDefaultEndTime(p: string): string {
    const times: Record<string, string> = {
      P1: '10:00', P2: '11:00', P3: '12:00', P4: '13:00',
      P5: '15:00', P6: '16:00', P7: '17:00',
    };
    return times[p] || '10:00';
  },

  getSuggestion(slots: ClassSlot[]): TimetableSuggestion | null {
    const now = dayjs();
    const today = now.format('dddd');
    const nowMinutes = now.hour() * 60 + now.minute();

    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const todaySlots = slots.filter(
      s => s.day.toLowerCase() === today.toLowerCase(),
    );

    if (todaySlots.length === 0) return null;

    // 1. Live slot
    const live = todaySlots.find(s => {
      const start = toMinutes(s.start_time);
      const end = toMinutes(s.end_time);
      return nowMinutes >= start && nowMinutes < end;
    });

    if (live) {
      return {
        slot: live,
        isLive: true,
        timeLabel: `Now  ${live.start_time} – ${live.end_time}`,
      };
    }

    // 2. Upcoming slot
    const upcoming = todaySlots
      .filter(s => toMinutes(s.start_time) > nowMinutes)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))[0];

    if (upcoming) {
      return {
        slot: upcoming,
        isLive: false,
        timeLabel: `Next at ${upcoming.start_time}`,
      };
    }

    return null;
  },

  async saveAttendance(params: {
    facultyId: string;
    studentId: string;
    subject: string;
    branch: string;
    semester: string;
    section: string;
    timestamp: number;
    status: string;
  }): Promise<void> {
    const {error} = await supabase.from('attendance').insert({
      faculty_id: params.facultyId,
      student_id: params.studentId,
      subject: params.subject,
      branch: params.branch,
      semester: params.semester,
      section: params.section,
      timestamp: new Date(params.timestamp).toISOString(),
      status: params.status,
    });

    if (error) {
      console.error(TAG, 'Failed to save attendance:', error.message);
      throw error;
    }
  },

  async saveAttendanceBatch(records: any[]): Promise<void> {
    const {error} = await supabase.from('attendance').insert(
      records.map(r => ({
        faculty_id: r.facultyId,
        student_id: r.studentId,
        subject: r.subject,
        branch: r.branch,
        semester: r.semester,
        section: r.section,
        timestamp: new Date(r.timestamp).toISOString(),
        status: r.status,
      }))
    );

    if (error) {
      console.error(TAG, 'Failed to save batch attendance:', error.message);
      throw error;
    }
  },
};
