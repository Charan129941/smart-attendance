// =====================================================
// Excel Export Service
// Generates .xlsx attendance reports with ExcelJS
// =====================================================

import ExcelJS from 'exceljs';
import type { ExportRow } from '@/types';

const RISK_COLORS: Record<string, string> = {
  green: 'FF22C55E',
  orange: 'FFF59E0B',
  red: 'FFEF4444',
};

/**
 * Generate an Excel workbook from attendance data.
 * Returns a Buffer ready to be sent as a download.
 */
export async function generateAttendanceExcel(
  rows: ExportRow[],
  sessionInfo: {
    className: string;
    section: string;
    subject: string;
    date: string;
    period: string;
    facultyName: string;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Attendance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance', {
    properties: { defaultColWidth: 15 },
  });

  // --- Header rows ---
  sheet.mergeCells('A1:N1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Attendance Report';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1A2340' } };
  titleCell.alignment = { horizontal: 'center' };

  const infoData = [
    ['Class:', `${sessionInfo.className} - ${sessionInfo.section}`, 'Subject:', sessionInfo.subject],
    ['Date:', sessionInfo.date, 'Period:', sessionInfo.period],
    ['Faculty:', sessionInfo.facultyName, 'Generated:', new Date().toLocaleString()],
  ];

  infoData.forEach((row, i) => {
    const rowNum = i + 3;
    sheet.getCell(`A${rowNum}`).value = row[0];
    sheet.getCell(`A${rowNum}`).font = { bold: true };
    sheet.getCell(`B${rowNum}`).value = row[1];
    sheet.getCell(`D${rowNum}`).value = row[2];
    sheet.getCell(`D${rowNum}`).font = { bold: true };
    sheet.getCell(`E${rowNum}`).value = row[3];
  });

  // --- Column headers ---
  const headerRow = sheet.getRow(7);
  const headers = [
    'S.No.',
    'Student Name',
    'Enrollment No.',
    'Status',
    'Submission Time',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Distance (m)',
    'Auto Risk',
    'Faculty Risk',
    'Faculty Decision',
    'Manual Entry',
    'Remarks',
  ];

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A2340' },
    };
    cell.alignment = { horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
    };
  });

  // --- Data rows ---
  rows.forEach((row, index) => {
    const dataRow = sheet.getRow(index + 8);
    const values = [
      index + 1,
      row.name,
      row.enrollmentNumber,
      row.attendanceStatus,
      row.submissionTime,
      row.latitude ?? 'N/A',
      row.longitude ?? 'N/A',
      row.gpsAccuracy !== null ? Math.round(row.gpsAccuracy) : 'N/A',
      row.distanceFromBase !== null ? Math.round(row.distanceFromBase) : 'N/A',
      row.autoRisk,
      row.facultyRisk || 'Pending',
      row.facultyDecision,
      row.isManual ? 'Yes' : 'No',
      row.remarks || '',
    ];

    values.forEach((v, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = v;
      cell.alignment = { horizontal: 'center' };

      // Color-code risk cells
      if (i === 9 || i === 10) { // Auto Risk or Faculty Risk
        const colorKey = String(v).toLowerCase();
        if (RISK_COLORS[colorKey]) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: RISK_COLORS[colorKey] },
          };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      }
    });

    // Alternate row shading
    if (index % 2 === 1) {
      for (let i = 1; i <= headers.length; i++) {
        const cell = dataRow.getCell(i);
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).pattern !== 'solid') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      }
    }
  });

  // --- Summary row ---
  const summaryRowNum = rows.length + 9;
  sheet.mergeCells(`A${summaryRowNum}:C${summaryRowNum}`);
  const summaryCell = sheet.getCell(`A${summaryRowNum}`);
  summaryCell.value = `Total Records: ${rows.length}`;
  summaryCell.font = { bold: true, size: 11 };

  const greenCount = rows.filter((r) => r.autoRisk === 'green').length;
  const orangeCount = rows.filter((r) => r.autoRisk === 'orange').length;
  const redCount = rows.filter((r) => r.autoRisk === 'red').length;
  const manualCount = rows.filter((r) => r.isManual).length;

  sheet.getCell(`D${summaryRowNum}`).value = `Green: ${greenCount}`;
  sheet.getCell(`D${summaryRowNum}`).font = { bold: true, color: { argb: 'FF22C55E' } };
  sheet.getCell(`E${summaryRowNum}`).value = `Orange: ${orangeCount}`;
  sheet.getCell(`E${summaryRowNum}`).font = { bold: true, color: { argb: 'FFF59E0B' } };
  sheet.getCell(`F${summaryRowNum}`).value = `Red: ${redCount}`;
  sheet.getCell(`F${summaryRowNum}`).font = { bold: true, color: { argb: 'FFEF4444' } };
  sheet.getCell(`G${summaryRowNum}`).value = `Manual: ${manualCount}`;
  sheet.getCell(`G${summaryRowNum}`).font = { bold: true };

  // --- Auto-fit columns ---
  sheet.columns.forEach((column) => {
    if (column.values) {
      let maxLength = 10;
      column.values.forEach((v) => {
        if (v) {
          const len = String(v).length;
          if (len > maxLength) maxLength = len;
        }
      });
      column.width = Math.min(maxLength + 4, 30);
    }
  });

  // Return buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
