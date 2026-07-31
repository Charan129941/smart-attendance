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
    const { submissionId, submissionIds, riskColor: newRiskColor, decision: newDecision, reason } = body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const idsToUpdate: string[] = submissionIds || (submissionId ? [submissionId] : []);

    if (idsToUpdate.length === 0) {
      return NextResponse.json({ success: false, error: 'No submission IDs provided' }, { status: 400 });
    }

    await prisma.submission.updateMany({
      where: { id: { in: idsToUpdate }, sessionId: id },
      data: {
        facultyRiskColor: newRiskColor || 'green',
        facultyDecision: newDecision || 'approved',
      },
    });

    return NextResponse.json({ success: true, count: idsToUpdate.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
