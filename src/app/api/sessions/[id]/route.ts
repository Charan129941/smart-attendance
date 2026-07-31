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
    const body = await req.json();
    const { status, className, section, subject, date, period, notes } = body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      if (!['active', 'paused', 'ended'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'ended') {
        updateData.endedAt = new Date();
        await prisma.qrVersion.updateMany({
          where: { sessionId: id, invalidated: false },
          data: { invalidated: true },
        });
      }
    }

    if (className || section) {
      const classObj = await prisma.class.upsert({
        where: { name_section: { name: className || '', section: section || '' } },
        update: {},
        create: { name: className || '', section: section || '' },
      });
      updateData.classId = classObj.id;
    }

    if (subject) {
      const subjectObj = await prisma.subject.upsert({
        where: { name: subject },
        update: {},
        create: { name: subject },
      });
      updateData.subjectId = subjectObj.id;
    }

    if (date !== undefined) updateData.date = date;
    if (period !== undefined) updateData.period = period;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        subject: true,
      }
    });

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
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Prisma doesn't natively support cascading deletes on all our relations if not defined in schema with onDelete: Cascade.
    // So we need to delete child records manually in a transaction.
    await prisma.$transaction([
      prisma.locationSample.deleteMany({
        where: { submission: { sessionId: id } },
      }),
      prisma.riskOverride.deleteMany({
        where: { submission: { sessionId: id } },
      }),
      prisma.submission.deleteMany({
        where: { sessionId: id },
      }),
      prisma.manualAttendance.deleteMany({
        where: { sessionId: id },
      }),
      prisma.suspiciousAttempt.deleteMany({
        where: { sessionId: id },
      }),
      prisma.qrVersion.deleteMany({
        where: { sessionId: id },
      }),
      prisma.exportHistory.deleteMany({
        where: { sessionId: id },
      }),
      prisma.attendanceSession.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
