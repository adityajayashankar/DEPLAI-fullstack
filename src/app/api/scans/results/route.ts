/**
 * POST /api/scans/results
 * Webhook endpoint to receive scan results from Python worker
 */

import { NextRequest, NextResponse } from 'next/server';
import { scannerService } from '@/lib/scanner/service';

export async function POST(request: NextRequest) {
  try {
    const results = await request.json();
    const { run_id } = results;

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      );
    }

    console.log(`Received scan results for run_id: ${run_id}`);

    // Process and store results
    await scannerService.processScanResults(run_id, results);

    return NextResponse.json({
      success: true,
      message: 'Results processed successfully',
    });
  } catch (error: any) {
    console.error('Results webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process results' },
      { status: 500 }
    );
  }
}