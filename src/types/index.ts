// =====================================================
// Smart College Attendance System — Type Definitions
// =====================================================

// --- Enums ---

export type RiskColor = 'green' | 'orange' | 'red';
export type SessionStatus = 'active' | 'paused' | 'ended';
export type AttendanceStatus = 'present' | 'absent' | 'pending';
export type FacultyDecision = 'approved' | 'rejected' | 'pending';

// --- Geolocation ---

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeoSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AveragedLocation {
  latitude: number;
  longitude: number;
  averageAccuracy: number;
  sampleCount: number;
  samples: GeoSample[];
}

// --- QR Token ---

export interface QrTokenPayload {
  sessionId: string;
  version: number;
  expiresAt: number; // Unix timestamp in ms
}

export interface QrTokenData extends QrTokenPayload {
  signature: string;
}

// --- Risk Engine ---

export interface RiskFactor {
  name: string;
  score: number;     // 0-100 contribution before weighting
  weight: number;    // 0-1 weight
  weighted: number;  // score * weight
  detail: string;
}

export interface RiskResult {
  totalScore: number;  // 0-100
  color: RiskColor;
  factors: RiskFactor[];
  distanceFromBase: number;    // meters
  distanceFromCluster: number; // meters
}

export interface ClusterInfo {
  centroid: { latitude: number; longitude: number };
  memberCount: number;
  averageDistance: number; // average distance of members from centroid
}

export interface RiskThresholds {
  greenMaxMeters: number;
  orangeMaxMeters: number;
  greenMaxScore: number;
  orangeMaxScore: number;
}

// --- Session ---

export interface SessionConfig {
  qrRefreshInterval: number;  // seconds
  sessionDuration: number;    // minutes
  riskThresholds: RiskThresholds;
}

export interface CreateSessionInput {
  className: string;
  section: string;
  subject: string;
  date: string;
  period: string;
  notes?: string;
  config: SessionConfig;
  baseLat: number;
  baseLng: number;
  baseAccuracy: number;
}

export interface SessionSummary {
  id: string;
  className: string;
  section: string;
  subject: string;
  date: string;
  period: string;
  status: SessionStatus;
  totalSubmissions: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  manualCount: number;
  duplicateAttempts: number;
  notes?: string | null;
  qrRefreshInterval: number;
  createdAt: string;
}

// --- Submission ---

export interface SubmitAttendanceInput {
  name: string;
  enrollmentNumber: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  samples: GeoSample[];
  browserTimestamp: number;
  userAgent: string;
  idempotencyKey: string;
}

export interface SubmissionRecord {
  id: string;
  sessionId: string;
  name: string;
  enrollmentNumber: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  sampleCount: number;
  distanceFromBase: number | null;
  browserTimestamp: string;
  serverTimestamp: string;
  autoRiskScore: number;
  autoRiskColor: RiskColor;
  facultyRiskColor: RiskColor | null;
  facultyDecision: FacultyDecision;
  remarks: string | null;
  isManual: boolean;
}

// --- Manual Attendance ---

export interface ManualAttendanceInput {
  name: string;
  enrollmentNumber: string;
  status: AttendanceStatus;
  reason?: string;
  remarks?: string;
}

// --- Override ---

export interface RiskOverrideInput {
  submissionId: string;
  newRiskColor: RiskColor;
  newDecision: FacultyDecision;
  reason?: string;
}

// --- Export ---

export interface ExportRow {
  name: string;
  enrollmentNumber: string;
  attendanceStatus: string;
  submissionTime: string;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  distanceFromBase: number | null;
  autoRisk: string;
  facultyRisk: string;
  facultyDecision: string;
  isManual: boolean;
  remarks: string;
}

// --- API Responses ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SubmitResponse {
  riskColor: RiskColor;
  riskScore: number;
  message: string;
  submissionId: string;
}

// --- Dashboard Stats ---

export interface DashboardStats {
  totalSubmissions: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  manualCount: number;
  duplicateAttempts: number;
  pendingReview: number;
}

export type Session = SessionSummary;
export type AttendanceSubmission = SubmissionRecord;
