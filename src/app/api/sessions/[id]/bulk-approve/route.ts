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
    const { submissionIds } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No submissions specified' }, { status: 400 });
    }

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Bulk approve: set facultyDecision to approved but keep original colors
    await prisma.submission.updateMany({
      where: {
        id: { in: submissionIds },
        sessionId: id,
      },
      data: {
        facultyDecision: 'approved',
      },
    });

    // Create audit logs for each
    const submissions = await prisma.submission.findMany({
      where: { id: { in: submissionIds }, sessionId: id },
      select: { id: true, autoRiskColor: true, facultyRiskColor: true },
    });

    await prisma.riskOverride.createMany({
      data: submissions.map(sub => ({
        submissionId: sub.id,
        facultyId: session.user.id,
        originalColor: sub.facultyRiskColor || sub.autoRiskColor,
        newColor: sub.facultyRiskColor || sub.autoRiskColor, // Keep original color
        originalDecision: 'pending',
        newDecision: 'approved',
        reason: 'Bulk approved - student cluster detected near classroom',
      })),
    });

    return NextResponse.json({ success: true, count: submissionIds.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
