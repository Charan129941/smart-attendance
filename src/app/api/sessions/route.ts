import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createQrToken, generateQrDataUrl, hashToken, buildAttendanceUrl } from '@/lib/qr';
import { SessionConfig } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const sessions = await prisma.attendanceSession.findMany({
      where: { facultyId: userId },
      include: {
        class: true,
        subject: true,
        submissions: true,
        manualAttendances: true,
        suspiciousAttempts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = sessions.map((s: any) => ({
      sessionId: s.id,
      className: s.class.name,
      section: s.class.section,
      subject: s.subject.name,
      date: s.date,
      period: s.period,
      status: s.status,
      counts: {
        total: s.submissions.length,
        green: s.submissions.filter((sub: any) => sub.autoRiskColor === 'green').length,
        orange: s.submissions.filter((sub: any) => sub.autoRiskColor === 'orange').length,
        red: s.submissions.filter((sub: any) => sub.autoRiskColor === 'red').length,
        manual: s.manualAttendances.length,
        duplicates: s.suspiciousAttempts.filter((a: any) => a.reason === 'duplicate').length,
      },
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      className,
      section,
      subject,
      date,
      period,
      notes,
      config,
      baseLat,
      baseLng,
      baseAccuracy,
    } = body;

    const classRecord = await prisma.class.upsert({
      where: { name_section: { name: className, section } },
      update: {},
      create: { name: className, section },
    });

    const subjectRecord = await prisma.subject.upsert({
      where: { name: subject },
      update: {},
      create: { name: subject },
    });

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        facultyId: session.user.id,
        date,
        period,
        notes,
        baseLat,
        baseLng,
        baseAccuracy,
        qrRefreshInterval: config.qrRefreshInterval,
        sessionDuration: config.sessionDuration,
        riskThresholdsJson: JSON.stringify(config.riskThresholds),
      },
    });

    const version = 1;
    const expiresAt = Date.now() + config.sessionDuration * 60 * 1000;
    const payload = {
      sessionId: attendanceSession.id,
      version,
      expiresAt,
    };
    
    const token = createQrToken(attendanceSession.id, version, expiresAt);
    const tokenHash = hashToken(token);
    
    await prisma.qrVersion.create({
      data: {
        sessionId: attendanceSession.id,
        version,
        tokenHash,
        expiresAt: new Date(expiresAt),
      },
    });
    
    await prisma.attendanceSession.update({
      where: { id: attendanceSession.id },
      data: { currentQrVersion: version },
    });
    // Derive host URL for QR generation (e.g., http://192.168.1.5:3000)
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const hostUrl = host ? `${protocol}://${host}` : undefined;
    
    const qrDataUrl = await generateQrDataUrl(token, hostUrl);
    const attendanceUrl = buildAttendanceUrl(token, hostUrl);

    return NextResponse.json({
      success: true,
      data: { sessionId: attendanceSession.id, qrDataUrl, attendanceUrl },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
