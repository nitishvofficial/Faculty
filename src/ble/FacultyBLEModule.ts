/**
 * FacultyBLEModule.ts — AM_Faculty
 *
 * Faculty acts as BLE PERIPHERAL (GATT Server + Advertiser).
 * The native Android module (BLEPeripheralModule.kt) handles hardware.
 * This JS layer handles session logic, OTP, and student tracking.
 *
 * Role inversion from Student_BLE:
 *   Student (Central): scans → connects → writes JOIN → receives OTP_REQUEST
 *   Faculty (Peripheral): advertises → accepts → receives JOIN → sends OTP_REQUEST
 */
import {NativeModules, NativeEventEmitter} from 'react-native';
import {
  AM_SERVICE_UUID,
  FACULTY_TO_STUDENT_CHAR_UUID,
  STUDENT_TO_FACULTY_CHAR_UUID,
  MSG,
  SESSION_DATA_SEPARATOR,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
} from './BLEConstants';

const {BLEPeripheralModule} = NativeModules;
const TAG = '[FacultyBLEModule]';

export interface ConnectedStudent {
  uid: string;
  timestamp: number;
  status: 'pending' | 'otp_sent' | 'confirmed' | 'rejected';
  deviceAddress?: string;
  otpAttempts: number;
}

export interface ClassInfo {
  subject: string;
  branch: string;
  semester: string;
  section: string;
}

type SessionCallbacks = {
  onStudentJoined?: (student: ConnectedStudent) => void;
  onStudentOTPVerified?: (uid: string, success: boolean) => void;
  onStudentRemoved?: (uid: string) => void;
  onOTPExpired?: () => void;
  onError?: (err: Error) => void;
};

/**
 * Compresses the BLE advertising payload to fit strictly within 13 characters.
 * This prevents the ADVERTISE_FAILED_DATA_TOO_LARGE error (code 1) on the BLE chip.
 */
function compressPayload(classInfo: ClassInfo): string {
  const getInitialsOrPrefix = (str: string, maxLen: number): string => {
    const clean = (str || '').trim().replace(/[^a-zA-Z0-9\s]/g, '');
    if (!clean) return 'X';
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const initials = words.map(w => w[0]).join('').toUpperCase();
      return initials.slice(0, maxLen);
    }
    return clean.slice(0, maxLen).toUpperCase();
  };

  const sub = getInitialsOrPrefix(classInfo.subject, 5);
  const br = getInitialsOrPrefix(classInfo.branch, 3);
  const semDigits = String(classInfo.semester || '').replace(/[^0-9]/g, '');
  const sem = `S${semDigits ? semDigits.slice(0, 2) : 'X'}`;

  return [sub, br, sem].join(SESSION_DATA_SEPARATOR);
}

class FacultyBLEModuleClass {
  private emitter: NativeEventEmitter | null = null;
  private eventSubs: any[] = [];
  private connectedStudents: Map<string, ConnectedStudent> = new Map();
  private currentOTP: string | null = null;
  private otpGeneratedAt: number = 0;
  private otpExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionOpen = false;
  private callbacks: SessionCallbacks = {};

  // ─── Initialize ─────────────────────────────────────────────────────────────

  initialize = async (): Promise<void> => {
    if (!BLEPeripheralModule) {
      throw new Error(
        'BLEPeripheralModule native module not found. Rebuild Android.',
      );
    }
    this.emitter = new NativeEventEmitter(BLEPeripheralModule);
    await BLEPeripheralModule.initialize();
    console.log(TAG, 'Initialized');
  };

  // ─── Advertising ────────────────────────────────────────────────────────────

  startAdvertising = async (classInfo: ClassInfo): Promise<void> => {
    const payload = compressPayload(classInfo);

    console.log(TAG, 'Starting advertising with payload:', payload);
    await BLEPeripheralModule.startAdvertising(
      AM_SERVICE_UUID,
      FACULTY_TO_STUDENT_CHAR_UUID,
      STUDENT_TO_FACULTY_CHAR_UUID,
      payload,
    );
    this.sessionOpen = true;
    console.log(TAG, 'Advertising started');
  };

  stopAdvertising = async (): Promise<void> => {
    await BLEPeripheralModule.stopAdvertising();
    this.sessionOpen = false;
    console.log(TAG, 'Advertising stopped');
  };

  // ─── Session Management ──────────────────────────────────────────────────────

  startSession = (callbacks: SessionCallbacks): void => {
    this.callbacks = callbacks;
    this.connectedStudents.clear();

    if (!this.emitter) {
      console.error(TAG, 'Emitter not initialized — call initialize() first');
      return;
    }

    // Clear old subscriptions
    this.eventSubs.forEach(sub => sub.remove());

    // Listen for student messages (JOIN / OTP_VERIFY)
    const msgSub = this.emitter.addListener(
      'onStudentMessage',
      (event: {message: string; address: string}) => {
        this._handleStudentMessage(event.message, event.address);
      },
    );

    // Listen for client disconnects
    const disconnectSub = this.emitter.addListener(
      'onClientDisconnected',
      (event: {address: string}) => {
        console.log(TAG, 'Client disconnected:', event.address);
      },
    );

    // Listen for advertising failure
    const advFailureSub = this.emitter.addListener(
      'onAdvertisingFailure',
      (event: {errorCode: number}) => {
        console.error(TAG, 'Asynchronous BLE advertising failure:', event.errorCode);
        let errorMsg = 'BLE Advertising failed';
        if (event.errorCode === 1) {
          errorMsg = 'BLE Advertising failed: Payload data too large';
        } else if (event.errorCode === 2) {
          errorMsg = 'BLE Advertising failed: Too many advertisers';
        } else if (event.errorCode === 3) {
          errorMsg = 'BLE Advertising failed: Already started';
        } else if (event.errorCode === 4) {
          errorMsg = 'BLE Advertising failed: Internal error';
        } else if (event.errorCode === 5) {
          errorMsg = 'BLE Advertising failed: Feature not supported';
        } else {
          errorMsg = `BLE Advertising failed with native error code ${event.errorCode}`;
        }
        this.callbacks.onError?.(new Error(errorMsg));
      },
    );

    this.eventSubs = [msgSub, disconnectSub, advFailureSub];
  };

  stopSession = (): void => {
    this.eventSubs.forEach(sub => sub.remove());
    this.eventSubs = [];
    this.sessionOpen = false;
    this.currentOTP = null;
    if (this.otpExpiryTimer) {
      clearTimeout(this.otpExpiryTimer);
      this.otpExpiryTimer = null;
    }
    console.log(TAG, 'Session stopped');
  };

  // ─── OTP ─────────────────────────────────────────────────────────────────────

  /**
   * Generate a random 4-digit OTP with 2-minute expiry.
   */
  generateOTP = (): string => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    this.currentOTP = otp;
    this.otpGeneratedAt = Date.now();

    // Clear previous timer
    if (this.otpExpiryTimer) {
      clearTimeout(this.otpExpiryTimer);
    }

    // Auto-expire after 2 minutes
    this.otpExpiryTimer = setTimeout(() => {
      console.log(TAG, 'OTP expired');
      this.currentOTP = null;
      this.callbacks.onOTPExpired?.();
    }, OTP_EXPIRY_MS);

    console.log(TAG, 'OTP generated:', otp);
    return otp;
  };

  /**
   * Broadcast OTP_REQUEST to all connected students.
   */
  broadcastOTPRequest = async (): Promise<void> => {
    await this._notifyAllStudents(MSG.OTP_REQUEST);
    // Update all pending students to otp_sent
    for (const [uid, student] of this.connectedStudents) {
      if (student.status === 'pending') {
        student.status = 'otp_sent';
        this.connectedStudents.set(uid, student);
      }
    }
    console.log(TAG, 'Broadcast OTP_REQUEST to all students');
  };

  isOTPExpired = (): boolean => {
    if (!this.currentOTP) return true;
    return Date.now() - this.otpGeneratedAt > OTP_EXPIRY_MS;
  };

  getOTPRemainingSeconds = (): number => {
    if (!this.currentOTP) return 0;
    const elapsed = Date.now() - this.otpGeneratedAt;
    return Math.max(0, Math.ceil((OTP_EXPIRY_MS - elapsed) / 1000));
  };

  // ─── Manual Override ─────────────────────────────────────────────────────────

  manualMarkPresent = (uid: string): void => {
    const existing = this.connectedStudents.get(uid);
    if (existing) {
      existing.status = 'confirmed';
      this.connectedStudents.set(uid, existing);
    } else {
      this.connectedStudents.set(uid, {
        uid,
        timestamp: Date.now(),
        status: 'confirmed',
        otpAttempts: 0,
      });
    }
    this.callbacks.onStudentJoined?.(this.connectedStudents.get(uid)!);
    console.log(TAG, 'Manually marked present:', uid);
  };

  removeStudent = (uid: string): void => {
    this.connectedStudents.delete(uid);
    this.callbacks.onStudentRemoved?.(uid);
    console.log(TAG, 'Removed student:', uid);
  };

  // ─── Accessors ───────────────────────────────────────────────────────────────

  getConnectedStudents = (): ConnectedStudent[] => {
    return Array.from(this.connectedStudents.values());
  };

  getCurrentOTP = (): string | null => this.currentOTP;

  destroy = async (): Promise<void> => {
    this.stopSession();
    try {
      await BLEPeripheralModule.stopAdvertising();
    } catch (_) {}
    console.log(TAG, 'Destroyed');
  };

  // ─── Private ─────────────────────────────────────────────────────────────────

  private _handleStudentMessage = (
    message: string,
    deviceAddress: string,
  ): void => {
    console.log(TAG, 'Student message:', message, 'from', deviceAddress);

    // ── JOIN ─────────────────────────────────────────────────────────────────
    if (message.startsWith(MSG.JOIN_PREFIX)) {
      const uid = message.slice(MSG.JOIN_PREFIX.length).trim();

      // Reject if session closed
      if (!this.sessionOpen) {
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          `${MSG.JOIN_REJECTED}${MSG.REJECT_CLOSED}`,
        ).catch(console.error);
        return;
      }

      // Reject duplicate
      if (this.connectedStudents.has(uid)) {
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          `${MSG.JOIN_REJECTED}${MSG.REJECT_DUPLICATE}`,
        ).catch(console.error);
        return;
      }

      const student: ConnectedStudent = {
        uid,
        timestamp: Date.now(),
        status: 'pending',
        deviceAddress,
        otpAttempts: 0,
      };
      this.connectedStudents.set(uid, student);
      this.callbacks.onStudentJoined?.(student);

      // Send OTP_REQUEST immediately to the joining student
      BLEPeripheralModule.notifyDevice(
        deviceAddress,
        FACULTY_TO_STUDENT_CHAR_UUID,
        MSG.OTP_REQUEST,
      ).catch(console.error);
      return;
    }

    // ── OTP_VERIFY ───────────────────────────────────────────────────────────
    if (message.startsWith(MSG.OTP_VERIFY_PREFIX)) {
      const submittedOTP = message.slice(MSG.OTP_VERIFY_PREFIX.length).trim();

      // Find student by deviceAddress
      const student = Array.from(this.connectedStudents.values()).find(
        s => s.deviceAddress === deviceAddress,
      );
      if (!student) {
        console.warn(TAG, 'OTP from unknown device:', deviceAddress);
        return;
      }

      // Check if OTP expired
      if (this.isOTPExpired()) {
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          MSG.OTP_WRONG,
        ).catch(console.error);
        this.callbacks.onStudentOTPVerified?.(student.uid, false);
        return;
      }

      // Check retry limit (3 max)
      student.otpAttempts += 1;
      if (student.otpAttempts > OTP_MAX_ATTEMPTS) {
        student.status = 'rejected';
        this.connectedStudents.set(student.uid, student);
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          `${MSG.JOIN_REJECTED}${MSG.REJECT_MAX_ATTEMPTS}`,
        ).catch(console.error);
        this.callbacks.onStudentOTPVerified?.(student.uid, false);
        return;
      }

      const isCorrect = submittedOTP === this.currentOTP;
      console.log(
        TAG,
        `OTP verify for ${student.uid}: submitted=${submittedOTP}, expected=${this.currentOTP}, match=${isCorrect}, attempt=${student.otpAttempts}/${OTP_MAX_ATTEMPTS}`,
      );

      if (isCorrect) {
        student.status = 'confirmed';
        this.connectedStudents.set(student.uid, student);
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          MSG.ATTENDANCE_CONFIRMED,
        ).catch(console.error);
        this.callbacks.onStudentOTPVerified?.(student.uid, true);
      } else {
        BLEPeripheralModule.notifyDevice(
          deviceAddress,
          FACULTY_TO_STUDENT_CHAR_UUID,
          MSG.OTP_WRONG,
        ).catch(console.error);
        this.callbacks.onStudentOTPVerified?.(student.uid, false);
      }
    }
  };

  private _notifyAllStudents = async (message: string): Promise<void> => {
    const students = this.getConnectedStudents();
    const promises = students
      .filter(s => s.deviceAddress)
      .map(s =>
        BLEPeripheralModule.notifyDevice(
          s.deviceAddress!,
          FACULTY_TO_STUDENT_CHAR_UUID,
          message,
        ).catch((e: any) =>
          console.warn(TAG, 'notifyDevice failed:', e.message),
        ),
      );
    await Promise.all(promises);
  };
}

const FacultyBLEModule = new FacultyBLEModuleClass();
export default FacultyBLEModule;
