import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyQrToken } from '@/lib/qr';
import { averageSamples } from '@/lib/geo';
import { evaluateRisk } from '@/lib/risk-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      token,
      name,
      enrollmentNumber,
      latitude,
      longitude,
      accuracy,
      samples,
      browserTimestamp,
      userAgent,
      idempotencyKey,
    } = body;

    if (!token || !name || !enrollmentNumber || !idempotencyKey) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const payload = verifyQrToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid or tampered token' }, { status: 400 });
    }

    if (Date.now() > payload.expiresAt) {
      return NextResponse.json({ success: false, error: 'QR Code has expired' }, { status: 400 });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        submissions: { select: { id: true, latitude: true, longitude: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      await prisma.suspiciousAttempt.create({
        data: {
          sessionId: session.id,
          enrollmentNumber,
          name,
          reason: 'ended_session',
          userAgent,
        },
      });
      return NextResponse.json({ success: false, error: 'Session is no longer active' }, { status: 400 });
    }

    const qrVersion = await prisma.qrVersion.findFirst({
      where: { sessionId: session.id, version: payload.version },
    });

    if (!qrVersion || qrVersion.invalidated) {
      return NextResponse.json({ success: false, error: 'QR Code is no longer valid' }, { status: 400 });
    }

    // Check idempotency
    const existingByIdempotency = await prisma.submission.findUnique({
      where: { idempotencyKey },
    });
    if (existingByIdempotency) {
      return NextResponse.json({
        success: true,
        data: {
          riskColor: existingByIdempotency.autoRiskColor,
          riskScore: existingByIdempotency.autoRiskScore,
          message: 'Attendance already recorded successfully',
          submissionId: existingByIdempotency.id,
        },
      });
    }

    // Check duplicates
    const existingSubmission = await prisma.submission.findUnique({
      where: { sessionId_enrollmentNumber: { sessionId: session.id, enrollmentNumber } },
    });

    if (existingSubmission) {
      await prisma.suspiciousAttempt.create({
        data: {
          sessionId: session.id,
          enrollmentNumber,
          name,
          reason: 'duplicate',
          userAgent,
        },
      });
      return NextResponse.json({ success: false, error: 'Attendance already submitted' }, { status: 400 });
    }
    
    // Check manual
    const existingManual = await prisma.manualAttendance.findUnique({
      where: { sessionId_enrollmentNumber: { sessionId: session.id, enrollmentNumber } },
    });

    if (existingManual) {
      return NextResponse.json({ success: false, error: 'Attendance already recorded manually' }, { status: 400 });
    }

    let finalLat = latitude;
    let finalLng = longitude;
    let finalAcc = accuracy;
    let sampleCount = 0;

    if (samples && samples.length > 0) {
      const averaged = averageSamples(samples);
      finalLat = averaged.latitude;
      finalLng = averaged.longitude;
      finalAcc = averaged.averageAccuracy;
      sampleCount = averaged.sampleCount;
    }

    const suspiciousCount = await prisma.suspiciousAttempt.count({
      where: { sessionId: session.id, enrollmentNumber },
    });

    const thresholds = session.riskThresholdsJson
      ? JSON.parse(session.riskThresholdsJson)
      : undefined;

    const submissionForRisk = {
      latitude: finalLat,
      longitude: finalLng,
      accuracy: finalAcc,
      browserTimestamp: new Date(browserTimestamp),
      serverTimestamp: new Date(),
    };

    const riskContext = {
      baseLat: session.baseLat,
      baseLng: session.baseLng,
      baseAccuracy: session.baseAccuracy,
      startedAt: session.createdAt,
      qrExpiresAt: qrVersion.expiresAt,
      sessionDurationMinutes: session.sessionDuration,
      thresholds,
      allSubmissions: session.submissions as any, // Only lat/lng/id are needed
      duplicateCount: suspiciousCount,
    };

    const riskResult = evaluateRisk(submissionForRisk, riskContext);

    const newSubmission = await prisma.submission.create({
      data: {
        sessionId: session.id,
        name,
        enrollmentNumber,
        idempotencyKey,
        latitude: finalLat,
        longitude: finalLng,
        accuracy: finalAcc,
        sampleCount,
        locationDenied: finalLat === null || finalLat === undefined,
        distanceFromBase: riskResult.distanceFromBase,
        browserTimestamp: new Date(browserTimestamp),
        qrVersion: payload.version,
        autoRiskScore: riskResult.totalScore,
        autoRiskColor: riskResult.color,
        riskFactorsJson: JSON.stringify(riskResult.factors),
        userAgent,
        locationSamples: samples && samples.length > 0 ? {
          create: samples.map((s: any, idx: number) => ({
            latitude: s.latitude,
            longitude: s.longitude,
            accuracy: s.accuracy,
            timestamp: new Date(s.timestamp),
            sampleIndex: idx,
          }))
        } : undefined
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        riskColor: riskResult.color,
        riskScore: riskResult.totalScore,
        message: 'Attendance submitted successfully',
        submissionId: newSubmission.id,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
