import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const body = await req.json();
    const { name, enrollmentNumber, status, reason, remarks } = body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: { sessionId_enrollmentNumber: { sessionId: id, enrollmentNumber } },
    });
    
    if (existingSubmission) {
      return NextResponse.json({ success: false, error: 'Student already has a regular submission' }, { status: 400 });
    }

    const existingManual = await prisma.manualAttendance.findUnique({
      where: { sessionId_enrollmentNumber: { sessionId: id, enrollmentNumber } },
    });

    if (existingManual) {
      return NextResponse.json({ success: false, error: 'Student already has a manual attendance entry' }, { status: 400 });
    }

    const manual = await prisma.manualAttendance.create({
      data: {
        sessionId: id,
        facultyId: session.user.id,
        name,
        enrollmentNumber,
        status,
        reason,
        remarks,
      },
    });

    return NextResponse.json({ success: true, data: manual });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
