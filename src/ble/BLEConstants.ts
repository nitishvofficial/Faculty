/**
 * BLEConstants.ts — AM_Faculty
 *
 * BLE protocol constants. MUST match Student_BLE/src/ble/BLEConstants.js EXACTLY.
 * Any mismatch will cause the BLE handshake to fail.
 *
 * Adapted from Student_BLE/src/ble/BLEConstants.js
 */

// ─── Service & Characteristic UUIDs ───────────────────────────────────────────
// MUST match Student_BLE BLEConstants.js
export const AM_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
export const FACULTY_TO_STUDENT_CHAR_UUID = '12345678-1234-1234-1234-1234567890ac';
export const STUDENT_TO_FACULTY_CHAR_UUID = '12345678-1234-1234-1234-1234567890ad';

// ─── Message Protocol ─────────────────────────────────────────────────────────
// MUST match Student_BLE BLEConstants.js
export const MSG = {
  // Student → Faculty
  JOIN_PREFIX: 'JOIN:',
  OTP_VERIFY_PREFIX: 'OTP_VERIFY:',

  // Faculty → Student
  OTP_REQUEST: 'OTP_REQUEST',
  OTP_WRONG: 'OTP_WRONG',
  ATTENDANCE_CONFIRMED: 'ATTENDANCE_CONFIRMED',

  // Rejection reasons
  JOIN_REJECTED: 'JOIN_REJECTED:',
  REJECT_DUPLICATE: 'DUPLICATE',
  REJECT_CLOSED: 'SESSION_CLOSED',
  REJECT_NOT_ENROLLED: 'NOT_ENROLLED',
  REJECT_MAX_ATTEMPTS: 'MAX_ATTEMPTS',
};

// ─── Session Advertisement ──────────────────────────────────────────────────
// Service data payload: "Subject|Branch|S<sem>"
export const SESSION_DATA_SEPARATOR = '|';

// ─── OTP Config ─────────────────────────────────────────────────────────────
export const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
export const OTP_MAX_ATTEMPTS = 3;
