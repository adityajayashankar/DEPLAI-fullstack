/**
 * POST /api/scans/trigger
 * Triggers a security scan for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { scannerService } from '@/lib/scanner/service';
import { ScanRequest } from '@/lib/scanner/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { projectId, scanType, targetUrl } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // 3. Fetch project details and verify ownership
    const [project] = await query<any[]>(
      `SELECT 
        p.id,
        p.name,
        p.project_type,
        p.local_path,
        p.user_id,
        r.full_name,
        r.default_branch,
        r.languages
       FROM projects p
       LEFT JOIN github_repositories r ON r.id = p.repository_id
       WHERE p.id = ?`,
      [projectId]
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this project' },
        { status: 403 }
      );
    }

    // 4. Prepare scan request
    const scanRequest: ScanRequest = {
      projectId: project.id,
      projectType: project.project_type,
      scanType: scanType || 'full',
    };

    // Add project-specific details
    if (project.project_type === 'local') {
      scanRequest.localPath = project.local_path;
    } else if (project.project_type === 'github') {
      const [owner, repo] = (project.full_name || '').split('/');
      scanRequest.owner = owner;
      scanRequest.repo = repo;
      scanRequest.branch = project.default_branch;
      
      // Parse languages from JSON
      if (project.languages) {
        const languagesObj = JSON.parse(project.languages);
        scanRequest.languages = Object.keys(languagesObj);
      }
    }

    // Add DAST target if provided
    if (targetUrl) {
      scanRequest.targetUrl = targetUrl;
    }

    // 5. Trigger scan
    const response = await scannerService.triggerScan(scanRequest);

    if (response.status === 'failed') {
      return NextResponse.json(
        { error: response.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      scanId: response.scanId,
      status: response.status,
      message: 'Security scan started successfully',
    });
  } catch (error: any) {
    console.error('Scan trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger scan' },
      { status: 500 }
    );
  }
}