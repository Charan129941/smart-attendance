import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      include: {
        class: true,
        subject: true,
        submissions: true,
        manualAttendances: true,
        suspiciousAttempts: true,
      },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const mappedSession = {
      ...attendanceSession,
      className: attendanceSession.class.name,
      section: attendanceSession.class.section,
      subject: attendanceSession.subject.name,
      submissions: [
        ...attendanceSession.submissions.map(s => ({ ...s, isManual: false })),
        ...attendanceSession.manualAttendances.map(m => ({
          id: m.id,
          sessionId: m.sessionId,
          name: m.name,
          enrollmentNumber: m.enrollmentNumber,
          latitude: null,
          longitude: null,
          accuracy: null,
          sampleCount: 0,
          distanceFromBase: null,
          browserTimestamp: m.createdAt,
          serverTimestamp: m.createdAt,
          autoRiskScore: 0,
          autoRiskColor: 'green',
          facultyRiskColor: null,
          facultyDecision: m.status === 'present' ? 'approved' : 'rejected',
          remarks: m.remarks,
          isManual: true,
        }))
      ]
    };

    return NextResponse.json({ success: true, data: mappedSession });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!['active', 'paused', 'ended'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const updateData: any = { status };
    if (status === 'ended') {
      updateData.endedAt = new Date();
    }

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: updateData,
    });

    if (status === 'ended') {
      await prisma.qrVersion.updateMany({
        where: { sessionId: id, invalidated: false },
        data: { invalidated: true },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Cascade delete is set in schema, so this will remove all related records
    await prisma.attendanceSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
