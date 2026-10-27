import { requireRole } from '@/lib/auth';
import { generateExcelWorkbook } from '@/lib/services/exportService';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Only administrators are authorized to export the master registers
    await requireRole([Role.ADMIN]);

    const excelBuffer = await generateExcelWorkbook();

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `laptop-collection-master-register-${timestamp}.xlsx`;

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Admin authorization required for Excel exports' }), { status: 403 });
    }
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate Excel export' }), { status: 500 });
  }
}
