/**
 * POST /api/scans/trigger
 * Triggers a security scan for a project
 * * Updates:
 * - Checks for existing completed scans to avoid redundancy
 * - Accepts 'force' flag to bypass cache
 * - Handles GitHub Repository ID to Project ID mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { scannerService } from '@/lib/scanner/service';
import { ScanRequest } from '@/lib/scanner/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { projectId, scanType, targetUrl, force } = body; // 'force' allows re-scanning

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // 3. Resolve Project ID (Handle GitHub Wrapper Logic)
    // We need the REAL internal UUID (finalProjectId) to check the database
    let finalProjectId = projectId;
    
    // First, try to find it in the projects table (Local projects or existing wrappers)
    let [project] = await query<any[]>(
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

    // If not found, check if it's a GitHub Repository ID
    if (!project) {
        const [repo] = await query<any[]>(
            `SELECT 
                r.id, 
                r.full_name, 
                r.default_branch, 
                r.languages, 
                i.user_id 
             FROM github_repositories r
             JOIN github_installations i ON i.id = r.installation_id
             WHERE r.id = ?`,
            [projectId]
        );

        if (repo) {
            // It IS a GitHub repo.
            // Check if we already have a wrapper project for this repo
            const [existingWrapper] = await query<any[]>(
                'SELECT id FROM projects WHERE repository_id = ?', 
                [repo.id]
            );

            if (existingWrapper) {
                finalProjectId = existingWrapper.id;
            } else {
                // CREATE A WRAPPER PROJECT
                finalProjectId = uuidv4();
                await query(
                    `INSERT INTO projects (id, name, project_type, repository_id, user_id, created_at)
                     VALUES (?, ?, 'github', ?, ?, NOW())`,
                    [finalProjectId, repo.full_name, repo.id, repo.user_id]
                );
            }

            // Now fetch the fully formed project object using the valid UUID
            [project] = await query<any[]>(
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
                [finalProjectId]
            );
        }
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify ownership
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. CHECK FOR EXISTING SCANS (The "Need Not Scan Again" Logic)
    if (!force) {
        const [latestScan] = await query<any[]>(
            `SELECT id, status, created_at 
             FROM runs 
             WHERE project_id = ? AND status = 'completed'
             ORDER BY created_at DESC LIMIT 1`,
            [finalProjectId]
        );

        if (latestScan) {
            console.log(`♻️ Skipping scan. Found existing scan: ${latestScan.id}`);
            return NextResponse.json({
                success: true,
                scanId: latestScan.id,
                status: 'completed',
                message: 'Loaded cached scan results. (Use "Scan Again" to force update)',
                isCached: true
            });
        }
    }

    // 5. Prepare scan request
    const scanRequest: ScanRequest = {
      projectId: finalProjectId,
      projectType: project.project_type,
      scanType: scanType || 'full',
    };

    if (project.project_type === 'local') {
      scanRequest.localPath = project.local_path;
    } else if (project.project_type === 'github') {
      const [owner, repo] = (project.full_name || '').split('/');
      scanRequest.owner = owner;
      scanRequest.repo = repo;
      scanRequest.branch = project.default_branch;
      
      if (project.languages) {
        try {
            const languagesObj = typeof project.languages === 'string' 
                ? JSON.parse(project.languages) 
                : project.languages;
            scanRequest.languages = Object.keys(languagesObj);
        } catch (e) {
            scanRequest.languages = [];
        }
      }
    }

    if (targetUrl) {
      scanRequest.targetUrl = targetUrl;
    }

    // 6. Trigger actual scan
    const response = await scannerService.triggerScan(scanRequest);

    if (response.status === 'failed') {
      return NextResponse.json({ error: response.message }, { status: 500 });
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