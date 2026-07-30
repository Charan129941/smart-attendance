import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyQrToken } from '@/lib/qr';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const payload = verifyQrToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or tampered QR code' },
        { status: 400 }
      );
    }

    if (Date.now() > payload.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'This QR code has expired. Please scan the latest QR code.' },
        { status: 400 }
      );
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        class: true,
        subject: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'This session is no longer active' },
        { status: 400 }
      );
    }

    const qrVersion = await prisma.qrVersion.findFirst({
      where: { sessionId: session.id, version: payload.version },
    });

    if (!qrVersion || qrVersion.invalidated) {
      return NextResponse.json(
        { success: false, error: 'This QR code is no longer valid. Please scan the latest QR code.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionInfo: {
        className: session.class.name,
        section: session.class.section,
        subject: session.subject.name,
        period: session.period,
        date: session.date,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
