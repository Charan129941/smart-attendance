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

    // Invalidate previous ones
    await prisma.qrVersion.updateMany({
      where: { sessionId: id, invalidated: false },
      data: { invalidated: true },
    });

    const newVersion = attendanceSession.currentQrVersion + 1;
    const expiresAt = Date.now() + attendanceSession.sessionDuration * 60 * 1000; // or use qrRefreshInterval if that's preferred

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

    // Usually we don't return a new QR token on GET, we might want to return the last active token 
    // but generating it from scratch requires knowing the exact expiresAt we used. Let's just create a new one to be safe, or just return the version number if the UI only needs that.
    // Assuming UI expects the current active QR token data URL on refresh, which means we might want to just ROTATE it or we should store the plain token? We can't store plain tokens, so we create a new one.
    // Wait, the prompt says "GET: Get current QR data URL and version info."
    // Actually, without the original signature, we can't recreate the QR URL exactly for the existing token because we don't store the raw token.
    // So on a GET request, we can just issue a new token for the CURRENT version if we want, OR we can rotate it. Let's create a new token with the same version.
    
    const version = attendanceSession.currentQrVersion;
    const expiresAt = Date.now() + attendanceSession.sessionDuration * 60 * 1000;
    
    const token = createQrToken(id, version, expiresAt);
    const tokenHash = hashToken(token);
    
    await prisma.qrVersion.create({
      data: {
        sessionId: id,
        version,
        tokenHash,
        expiresAt: new Date(expiresAt),
      },
    });
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
