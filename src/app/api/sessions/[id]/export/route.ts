import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAttendanceExcel } from '@/lib/export';
import { ExportRow } from '@/types';

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
        faculty: true,
        submissions: true,
        manualAttendances: true,
      },
    });

    if (!attendanceSession) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const exportRows: ExportRow[] = [];

    // Add regular submissions
    for (const sub of attendanceSession.submissions) {
      exportRows.push({
        name: sub.name,
        enrollmentNumber: sub.enrollmentNumber,
        attendanceStatus: 'present',
        submissionTime: sub.serverTimestamp.toISOString(),
        latitude: sub.latitude,
        longitude: sub.longitude,
        gpsAccuracy: sub.accuracy,
        distanceFromBase: sub.distanceFromBase,
        autoRisk: sub.autoRiskColor,
        facultyRisk: sub.facultyRiskColor || '',
        facultyDecision: sub.facultyDecision,
        isManual: false,
        remarks: sub.remarks || '',
      });
    }

    // Add manual attendances
    for (const manual of attendanceSession.manualAttendances) {
      exportRows.push({
        name: manual.name,
        enrollmentNumber: manual.enrollmentNumber,
        attendanceStatus: manual.status,
        submissionTime: manual.createdAt.toISOString(),
        latitude: null,
        longitude: null,
        gpsAccuracy: null,
        distanceFromBase: null,
        autoRisk: 'green',
        facultyRisk: 'green',
        facultyDecision: 'approved',
        isManual: true,
        remarks: manual.remarks || manual.reason || '',
      });
    }

    const excelBuffer = await generateAttendanceExcel(exportRows, {
      className: attendanceSession.class.name,
      section: attendanceSession.class.section,
      subject: attendanceSession.subject.name,
      date: attendanceSession.date,
      period: attendanceSession.period,
      facultyName: attendanceSession.faculty.name,
    });

    // Save export history
    await prisma.exportHistory.create({
      data: {
        sessionId: id,
        facultyId: session.user.id,
        fileName: `attendance_${attendanceSession.class.name}_${attendanceSession.date}.xlsx`,
        recordCount: exportRows.length,
      },
    });

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="attendance_${attendanceSession.class.name}_${attendanceSession.date}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
