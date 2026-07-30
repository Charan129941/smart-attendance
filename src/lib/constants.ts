// =====================================================
// Constants and default configuration
// =====================================================

import type { RiskThresholds } from '@/types';

// --- Default Risk Thresholds ---
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  greenMaxMeters: 25,
  orangeMaxMeters: 60,
  greenMaxScore: 30,
  orangeMaxScore: 60,
};

// --- QR Configuration ---
export const QR_REFRESH_OPTIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
];

export const DEFAULT_QR_REFRESH_INTERVAL = 60; // seconds

// --- Session Configuration ---
export const DEFAULT_SESSION_DURATION = 60; // minutes

// --- Geolocation ---
export const FACULTY_GEO_SAMPLES = 5;
export const FACULTY_GEO_TIMEOUT = 12000; // ms
export const STUDENT_GEO_SAMPLES = 3;
export const STUDENT_GEO_TIMEOUT = 8000; // ms
export const GEO_HIGH_ACCURACY = true;
export const GEO_MAX_AGE = 0;

// --- Risk Engine Weights ---
export const RISK_WEIGHTS = {
  distanceFromBase: 0.40,
  gpsAccuracy: 0.15,
  clusterDistance: 0.20,
  qrTiming: 0.10,
  duplicateAttempts: 0.10,
  lateSubmission: 0.05,
} as const;

// --- Clustering ---
export const CLUSTER_RADIUS_METERS = 50;
export const MIN_CLUSTER_SIZE = 3;

// --- Polling ---
export const DASHBOARD_POLL_INTERVAL = 5000; // ms
export const QR_POLL_INTERVAL = 1000; // ms for countdown

// --- API ---
export const MAX_NAME_LENGTH = 100;
export const MAX_ENROLLMENT_LENGTH = 30;
export const MAX_REMARKS_LENGTH = 500;

// --- Session Status Labels ---
export const SESSION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
};

// --- Risk Color Labels ---
export const RISK_COLOR_LABELS: Record<string, string> = {
  green: 'Likely Present',
  orange: 'Borderline',
  red: 'Suspicious',
};

// --- Student Feedback Messages ---
export const STUDENT_FEEDBACK = {
  green: {
    title: 'Attendance Recorded Successfully!',
    message: 'Your location matches the classroom. You\'re all set.',
    icon: '✅',
  },
  orange: {
    title: 'Attendance Recorded',
    message: 'Your location differs slightly from the classroom. Faculty may review your attendance.',
    icon: '⚠️',
  },
  red: {
    title: 'Attendance Recorded',
    message: 'Your location differs significantly from the classroom. Please speak to your faculty for verification.',
    icon: '🔴',
  },
} as const;
