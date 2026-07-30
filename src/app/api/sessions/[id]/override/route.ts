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
    const { submissionId, newRiskColor, newDecision, reason } = body;

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId, sessionId: id },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    await prisma.riskOverride.create({
      data: {
        submissionId,
        facultyId: session.user.id,
        originalColor: submission.facultyRiskColor || submission.autoRiskColor,
        newColor: newRiskColor,
        originalDecision: submission.facultyDecision,
        newDecision,
        reason,
      },
    });

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        facultyRiskColor: newRiskColor,
        facultyDecision: newDecision,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
