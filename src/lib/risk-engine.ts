// =====================================================
// Risk Scoring Engine
// Evaluates proxy likelihood based on multiple factors
// =====================================================

import type { RiskColor, RiskFactor, RiskResult, RiskThresholds } from '@/types';
import { haversineDistance, clusterCoordinates } from './geo';
import { RISK_WEIGHTS, CLUSTER_RADIUS_METERS, DEFAULT_RISK_THRESHOLDS } from './constants';

interface SubmissionForRisk {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  browserTimestamp: Date;
  serverTimestamp: Date;
}

interface SessionContext {
  baseLat: number;
  baseLng: number;
  baseAccuracy: number;
  startedAt: Date;
  qrExpiresAt: Date;
  sessionDurationMinutes: number;
  thresholds: RiskThresholds;
  allSubmissions: Array<{ latitude: number; longitude: number; id: string }>;
  duplicateCount: number;
}

/**
 * Main risk evaluation function.
 * Returns a composite score 0-100 with contributing factors.
 */
export function evaluateRisk(
  submission: SubmissionForRisk,
  context: SessionContext
): RiskResult {
  const factors: RiskFactor[] = [];
  const thresholds = context.thresholds || DEFAULT_RISK_THRESHOLDS;

  // If no location data, assign maximum risk
  if (submission.latitude == null || submission.longitude == null) {
    return {
      totalScore: 85,
      color: 'red',
      factors: [{
        name: 'No Location',
        score: 100,
        weight: 1,
        weighted: 85,
        detail: 'Location permission was denied or unavailable',
      }],
      distanceFromBase: -1,
      distanceFromCluster: -1,
    };
  }

  // --- Factor 1: Distance from faculty base location ---
  const distFromBase = haversineDistance(
    context.baseLat,
    context.baseLng,
    submission.latitude,
    submission.longitude
  );

  let distScore: number;
  if (distFromBase <= thresholds.greenMaxMeters) {
    distScore = (distFromBase / thresholds.greenMaxMeters) * 30;
  } else if (distFromBase <= thresholds.orangeMaxMeters) {
    distScore = 30 + ((distFromBase - thresholds.greenMaxMeters) /
      (thresholds.orangeMaxMeters - thresholds.greenMaxMeters)) * 40;
  } else {
    distScore = Math.min(100, 70 + ((distFromBase - thresholds.orangeMaxMeters) / 100) * 30);
  }

  factors.push({
    name: 'Distance from Faculty',
    score: Math.round(distScore),
    weight: RISK_WEIGHTS.distanceFromBase,
    weighted: Math.round(distScore * RISK_WEIGHTS.distanceFromBase),
    detail: `${Math.round(distFromBase)}m from classroom (thresholds: ${thresholds.greenMaxMeters}m / ${thresholds.orangeMaxMeters}m)`,
  });

  // --- Factor 2: GPS accuracy penalty ---
  const accuracy = submission.accuracy ?? 100;
  // High accuracy value (in meters) = less precise GPS = more risk
  let accScore: number;
  if (accuracy <= 10) {
    accScore = 0;
  } else if (accuracy <= 30) {
    accScore = ((accuracy - 10) / 20) * 30;
  } else if (accuracy <= 100) {
    accScore = 30 + ((accuracy - 30) / 70) * 40;
  } else {
    accScore = Math.min(100, 70 + ((accuracy - 100) / 200) * 30);
  }

  factors.push({
    name: 'GPS Accuracy',
    score: Math.round(accScore),
    weight: RISK_WEIGHTS.gpsAccuracy,
    weighted: Math.round(accScore * RISK_WEIGHTS.gpsAccuracy),
    detail: `Reported accuracy: ±${Math.round(accuracy)}m`,
  });

  // --- Factor 3: Distance from dominant cluster ---
  let distFromCluster = 0;
  let clusterScore = 0;

  const validSubmissions = context.allSubmissions.filter(
    (s) => s.latitude !== 0 && s.longitude !== 0
  );

  if (validSubmissions.length >= 3) {
    const clusters = clusterCoordinates(validSubmissions, CLUSTER_RADIUS_METERS);
    if (clusters.length > 0) {
      const mainCluster = clusters[0];
      distFromCluster = haversineDistance(
        mainCluster.centroid.latitude,
        mainCluster.centroid.longitude,
        submission.latitude,
        submission.longitude
      );

      if (distFromCluster <= thresholds.greenMaxMeters) {
        clusterScore = 0;
      } else if (distFromCluster <= thresholds.orangeMaxMeters) {
        clusterScore = ((distFromCluster - thresholds.greenMaxMeters) /
          (thresholds.orangeMaxMeters - thresholds.greenMaxMeters)) * 60;
      } else {
        clusterScore = Math.min(100, 60 + ((distFromCluster - thresholds.orangeMaxMeters) / 100) * 40);
      }
    }
  }

  factors.push({
    name: 'Cluster Distance',
    score: Math.round(clusterScore),
    weight: RISK_WEIGHTS.clusterDistance,
    weighted: Math.round(clusterScore * RISK_WEIGHTS.clusterDistance),
    detail: validSubmissions.length >= 3
      ? `${Math.round(distFromCluster)}m from main student cluster`
      : 'Too few submissions for clustering',
  });

  // --- Factor 4: QR timing (how close to expiry) ---
  const qrLifeMs = context.qrExpiresAt.getTime() - context.startedAt.getTime();
  const submitTimeMs = submission.serverTimestamp.getTime() - context.startedAt.getTime();
  const timingRatio = Math.max(0, Math.min(1, submitTimeMs / Math.max(qrLifeMs, 1)));
  // Submissions very close to QR expiry are slightly more suspicious
  const timingScore = timingRatio > 0.9 ? 40 : timingRatio > 0.7 ? 20 : 0;

  factors.push({
    name: 'QR Timing',
    score: timingScore,
    weight: RISK_WEIGHTS.qrTiming,
    weighted: Math.round(timingScore * RISK_WEIGHTS.qrTiming),
    detail: timingScore > 0
      ? 'Submitted close to QR expiry'
      : 'Submitted within normal window',
  });

  // --- Factor 5: Duplicate attempts ---
  const dupScore = Math.min(100, context.duplicateCount * 40);

  factors.push({
    name: 'Duplicate Attempts',
    score: dupScore,
    weight: RISK_WEIGHTS.duplicateAttempts,
    weighted: Math.round(dupScore * RISK_WEIGHTS.duplicateAttempts),
    detail: context.duplicateCount > 0
      ? `${context.duplicateCount} prior rejected attempt(s)`
      : 'No duplicate attempts',
  });

  // --- Factor 6: Late submission ---
  const sessionElapsedMs = submission.serverTimestamp.getTime() - context.startedAt.getTime();
  const sessionDurationMs = context.sessionDurationMinutes * 60 * 1000;
  const lateRatio = sessionElapsedMs / Math.max(sessionDurationMs, 1);
  const lateScore = lateRatio > 1 ? 80 : lateRatio > 0.8 ? 30 : 0;

  factors.push({
    name: 'Late Submission',
    score: lateScore,
    weight: RISK_WEIGHTS.lateSubmission,
    weighted: Math.round(lateScore * RISK_WEIGHTS.lateSubmission),
    detail: lateRatio > 1
      ? 'Submitted after session duration'
      : lateRatio > 0.8
        ? 'Submitted in final 20% of session'
        : 'Submitted within expected time',
  });

  // --- Compute total ---
  const totalScore = Math.min(100, Math.round(
    factors.reduce((sum, f) => sum + f.weighted, 0)
  ));

  const color = scoreToColor(totalScore, thresholds);

  return {
    totalScore,
    color,
    factors,
    distanceFromBase: Math.round(distFromBase),
    distanceFromCluster: Math.round(distFromCluster),
  };
}

/**
 * Map a risk score (0-100) to a color.
 */
export function scoreToColor(score: number, thresholds?: RiskThresholds): RiskColor {
  const t = thresholds || DEFAULT_RISK_THRESHOLDS;
  if (score <= t.greenMaxScore) return 'green';
  if (score <= t.orangeMaxScore) return 'orange';
  return 'red';
}

/**
 * Get cluster information for the faculty dashboard.
 */
export function getClusterAnalysis(
  submissions: Array<{ latitude: number; longitude: number; id: string; name?: string }>
) {
  const valid = submissions.filter((s) => s.latitude !== 0 && s.longitude !== 0);
  if (valid.length < 2) {
    return { clusters: [], totalPoints: valid.length };
  }

  const clusters = clusterCoordinates(valid, CLUSTER_RADIUS_METERS);

  return {
    clusters: clusters.map((c, i) => ({
      index: i,
      centroid: c.centroid,
      memberCount: c.members.length,
      averageDistance: Math.round(c.averageDistance),
      isMainCluster: i === 0,
      memberIds: c.members.map((m) => m.id),
    })),
    totalPoints: valid.length,
    outlierCount: valid.length - (clusters[0]?.members.length || 0),
  };
}
