import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createQrToken, generateQrDataUrl, hashToken, buildAttendanceUrl } from '@/lib/qr';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    if (attendanceSession.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session is not active' }, { status: 400 });
    }

    const newVersion = attendanceSession.currentQrVersion + 1;
    const intervalSecs = attendanceSession.qrRefreshInterval || 15;
    // Add 45 seconds of grace period so students with slow internet have time to scan and submit
    const expiresAt = Date.now() + (intervalSecs + 45) * 1000;

    const token = createQrToken(id, newVersion, expiresAt);
    const tokenHash = hashToken(token);

    await prisma.qrVersion.create({
      data: {
        sessionId: id,
        version: newVersion,
        tokenHash,
        expiresAt: new Date(expiresAt),
      },
    });

    await prisma.attendanceSession.update({
      where: { id },
      data: { currentQrVersion: newVersion },
    });
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const hostUrl = host ? `${protocol}://${host}` : undefined;

    const qrDataUrl = await generateQrDataUrl(token, hostUrl);
    const attendanceUrl = buildAttendanceUrl(token, hostUrl);

    return NextResponse.json({
      success: true,
      data: { qrDataUrl, attendanceUrl, version: newVersion, expiresAt },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const latestQr = await prisma.qrVersion.findFirst({
      where: { sessionId: id, invalidated: false },
      orderBy: { createdAt: 'desc' },
    });

    const intervalSecs = attendanceSession.qrRefreshInterval || 15;
    let version = attendanceSession.currentQrVersion || 1;
    let expiresAt = latestQr ? latestQr.expiresAt.getTime() : Date.now() + (intervalSecs + 45) * 1000;

    if (!latestQr || latestQr.expiresAt.getTime() <= Date.now()) {
      expiresAt = Date.now() + (intervalSecs + 45) * 1000;
      const newToken = createQrToken(id, version, expiresAt);
      const tokenHash = hashToken(newToken);
      await prisma.qrVersion.create({
        data: {
          sessionId: id,
          version,
          tokenHash,
          expiresAt: new Date(expiresAt),
        },
      });
    }

    const token = createQrToken(id, version, expiresAt);
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const hostUrl = host ? `${protocol}://${host}` : undefined;

    const qrDataUrl = await generateQrDataUrl(token, hostUrl);
    const attendanceUrl = buildAttendanceUrl(token, hostUrl);

    return NextResponse.json({
      success: true,
      data: { qrDataUrl, attendanceUrl, version, expiresAt },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
