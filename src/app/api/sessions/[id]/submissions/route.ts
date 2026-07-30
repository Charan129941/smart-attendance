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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const riskColor = searchParams.get('riskColor');
    const status = searchParams.get('status');

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id, facultyId: session.user.id },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const whereClause: any = { sessionId: id };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { enrollmentNumber: { contains: search } },
      ];
    }
    
    if (riskColor) {
      whereClause.autoRiskColor = riskColor;
    }
    
    if (status) {
      whereClause.facultyDecision = status;
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: { serverTimestamp: 'desc' },
    });

    const parsedSubmissions = submissions.map((sub: any) => ({
      ...sub,
      riskFactors: sub.riskFactorsJson ? JSON.parse(sub.riskFactorsJson) : [],
      isManual: false,
    }));

    return NextResponse.json({ success: true, data: parsedSubmissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
