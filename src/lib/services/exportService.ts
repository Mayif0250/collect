import ExcelJS from 'exceljs';
import { AllocationStatus, Block } from '@prisma/client';
import prisma from '../prisma';

export async function generateExcelWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Laptop Collection & Room Allocation System';
  workbook.created = new Date();

  // Fetch all records with room and collector
  const allRecords = await prisma.laptopRecord.findMany({
    include: {
      room: true,
      collector: { select: { name: true, username: true } },
      crossBlockTransfer: { select: { reason: true, createdAt: true } },
    },
    orderBy: [
      { primaryBlock: 'asc' },
      { roomId: 'asc' },
      { seatNumber: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  const allRooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [
      { block: 'asc' },
      { roomOrder: 'asc' },
    ],
  });

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  function formatWorksheetHeaders(sheet: ExcelJS.Worksheet, columns: Array<{ header: string; key: string; width: number }>) {
    sheet.columns = columns;
    const headerRow = sheet.getRow(1);
    headerRow.fill = headerFill;
    headerRow.font = headerFont;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;
  }

  function styleDataRows(sheet: ExcelJS.Worksheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' };
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });
      }
    });
  }

  const standardColumns = [
    { header: 'Collection ID', key: 'collectionId', width: 24 },
    { header: 'Student ID', key: 'studentId', width: 16 },
    { header: 'Student Name', key: 'studentName', width: 22 },
    { header: 'Phone Number', key: 'phoneNumber', width: 16 },
    { header: 'Branch', key: 'branch', width: 12 },
    { header: 'Batch', key: 'batch', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Block', key: 'block', width: 10 },
    { header: 'Room', key: 'room', width: 16 },
    { header: 'Seat', key: 'seat', width: 10 },
    { header: 'Submitter ID', key: 'submitterId', width: 16 },
    { header: 'Present', key: 'present', width: 10 },
    { header: 'Collector', key: 'collector', width: 20 },
    { header: 'Date & Time', key: 'createdAt', width: 22 },
  ];

  function mapRecordToRow(r: (typeof allRecords)[0]) {
    return {
      collectionId: r.collectionId,
      studentId: r.studentId,
      studentName: r.studentName || '—',
      phoneNumber: r.phoneNumber || '—',
      branch: r.branch,
      batch: r.batch,
      status: r.allocationStatus,
      block: r.room?.block || (r.allocationStatus === AllocationStatus.BACKUP ? 'BACKUP' : r.primaryBlock),
      room: r.room?.name || '—',
      seat: r.seatNumber ?? '—',
      submitterId: r.submitterStudentId || (r.isSubmitterPresent ? 'Self' : '—'),
      present: r.isSubmitterPresent ? 'Yes' : 'No',
      collector: `${r.collector.name} (${r.collector.username})`,
      createdAt: r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  // 1. Sheet: Master Register
  const masterSheet = workbook.addWorksheet('Master Register');
  formatWorksheetHeaders(masterSheet, standardColumns);
  for (const r of allRecords) {
    masterSheet.addRow(mapRecordToRow(r));
  }
  styleDataRows(masterSheet);

  // 2. Sheet: E Block Primary Allocation Register
  const eBlockSheet = workbook.addWorksheet('E Block Primary');
  formatWorksheetHeaders(eBlockSheet, standardColumns);
  const eRecords = allRecords.filter((r) => r.room?.block === Block.E && r.allocationStatus === AllocationStatus.PRIMARY);
  for (const r of eRecords) {
    eBlockSheet.addRow(mapRecordToRow(r));
  }
  styleDataRows(eBlockSheet);

  // 3. Sheet: F Block Primary Allocation Register
  const fBlockSheet = workbook.addWorksheet('F Block Primary');
  formatWorksheetHeaders(fBlockSheet, standardColumns);
  const fRecords = allRecords.filter((r) => r.room?.block === Block.F && r.allocationStatus === AllocationStatus.PRIMARY);
  for (const r of fRecords) {
    fBlockSheet.addRow(mapRecordToRow(r));
  }
  styleDataRows(fBlockSheet);

  // 4. Sheet: Backup Inventory
  const backupSheet = workbook.addWorksheet('Backup Inventory');
  formatWorksheetHeaders(backupSheet, standardColumns);
  const backupRecords = allRecords.filter((r) => r.allocationStatus === AllocationStatus.BACKUP);
  for (const r of backupRecords) {
    backupSheet.addRow(mapRecordToRow(r));
  }
  styleDataRows(backupSheet);

  // 5. Sheet: Cross-Block Allocation Register
  const crossBlockSheet = workbook.addWorksheet('Cross-Block Allocations');
  const crossBlockColumns = [
    ...standardColumns,
    { header: 'Transfer Reason', key: 'reason', width: 30 },
  ];
  formatWorksheetHeaders(crossBlockSheet, crossBlockColumns);
  const crossRecords = allRecords.filter((r) => r.allocationStatus === AllocationStatus.CROSS_BLOCK);
  for (const r of crossRecords) {
    crossBlockSheet.addRow({
      ...mapRecordToRow(r),
      reason: r.crossBlockTransfer?.reason || '—',
    });
  }
  styleDataRows(crossBlockSheet);

  // 6. Room-wise worksheets with seats ordered numerically 1..capacity
  for (const room of allRooms) {
    const safeSheetName = room.name.replace(/[/\\?*[\]:]/g, '_').slice(0, 31);
    const roomSheet = workbook.addWorksheet(safeSheetName);

    const roomCols = [
      { header: 'Seat #', key: 'seatNumber', width: 10 },
      { header: 'Status', key: 'seatStatus', width: 14 },
      { header: 'Collection ID', key: 'collectionId', width: 24 },
      { header: 'Student ID', key: 'studentId', width: 16 },
      { header: 'Student Name', key: 'studentName', width: 22 },
      { header: 'Branch', key: 'branch', width: 12 },
      { header: 'Batch', key: 'batch', width: 10 },
      { header: 'Allocation Type', key: 'allocType', width: 16 },
      { header: 'Collector', key: 'collector', width: 20 },
      { header: 'Timestamp', key: 'createdAt', width: 22 },
    ];
    formatWorksheetHeaders(roomSheet, roomCols);

    // Get laptops assigned to this room mapped by seatNumber
    const roomLaptops = allRecords.filter((r) => r.roomId === room.id);
    const laptopBySeat = new Map<number, (typeof allRecords)[0]>();
    for (const l of roomLaptops) {
      if (l.seatNumber !== null) {
        laptopBySeat.set(l.seatNumber, l);
      }
    }

    for (let seat = 1; seat <= room.capacity; seat++) {
      const laptop = laptopBySeat.get(seat);
      if (laptop) {
        const row = roomSheet.addRow({
          seatNumber: seat,
          seatStatus: 'OCCUPIED',
          collectionId: laptop.collectionId,
          studentId: laptop.studentId,
          studentName: laptop.studentName || '—',
          branch: laptop.branch,
          batch: laptop.batch,
          allocType: laptop.allocationStatus,
          collector: laptop.collector.name,
          createdAt: laptop.createdAt.toISOString().replace('T', ' ').slice(0, 19),
        });
        row.getCell('seatStatus').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' }, // Light Green
        };
      } else {
        const row = roomSheet.addRow({
          seatNumber: seat,
          seatStatus: 'VACANT',
          collectionId: '—',
          studentId: '—',
          studentName: '—',
          branch: '—',
          batch: '—',
          allocType: '—',
          collector: '—',
          createdAt: '—',
        });
        row.getCell('seatStatus').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }, // Light Slate
        };
      }
    }
    styleDataRows(roomSheet);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
