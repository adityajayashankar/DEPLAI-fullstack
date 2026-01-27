/**
 * GET /api/scans/[id]
 * Get scan status and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { scannerService } from '@/lib/scanner/service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { id: scanId } = await context.params;

    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify ownership
    const [scan] = await query<any[]>(
      `SELECT r.id, p.user_id
       FROM runs r
       JOIN projects p ON p.id = r.project_id
       WHERE r.id = ?`,
      [scanId]
    );

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    if (scan.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this scan' },
        { status: 403 }
      );
    }

    // 3. Get scan status
    const status = await scannerService.getScanStatus(scanId);

    if (!status) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // 4. If completed, include findings
    let response: any = { status };

    if (status.status === 'completed') {
      const results = await scannerService.getScanFindings(scanId);
      response.results = results;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}