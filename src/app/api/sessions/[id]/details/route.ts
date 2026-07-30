import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const { className, section, subject, date, period, notes } = body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Upsert Class and Subject
    const classRecord = await prisma.class.upsert({
      where: { name_section: { name: className, section: section || '' } },
      update: {},
      create: { name: className, section: section || '' },
    });

    const subjectRecord = await prisma.subject.upsert({
      where: { name: subject },
      update: {},
      create: { name: subject },
    });

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: {
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        date: date || attendanceSession.date,
        period: period || attendanceSession.period,
        notes: notes !== undefined ? notes : attendanceSession.notes,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
