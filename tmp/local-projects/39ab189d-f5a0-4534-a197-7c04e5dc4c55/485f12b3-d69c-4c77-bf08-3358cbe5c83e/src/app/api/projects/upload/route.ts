import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { extractZipToProject } from '@/lib/local-projects';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB limit

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('name') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!projectName || projectName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Validate file type (only zip)
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only .zip files are supported' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB limit` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate project ID
    const projectId = uuidv4();

    // Extract zip to local storage
    const { path: localPath, fileCount, sizeBytes } = await extractZipToProject(
      buffer,
      user.id,
      projectId,
      projectName.trim()
    );

    // Create project record in database
    await query(
      `INSERT INTO projects 
       (id, name, project_type, local_path, file_count, size_bytes, user_id, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [projectId, projectName.trim(), 'local', localPath, fileCount, sizeBytes, user.id]
    );

    // Fetch the created project
    const [project] = await query<any[]>(
      `SELECT 
        id,
        name,
        project_type,
        local_path,
        file_count,
        size_bytes,
        uploaded_at,
        created_at
       FROM projects
       WHERE id = ?`,
      [projectId]
    );

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        type: project.project_type,
        localPath: project.local_path,
        fileCount: project.file_count,
        sizeBytes: project.size_bytes,
        uploadedAt: project.uploaded_at,
        createdAt: project.created_at,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload project' },
      { status: 500 }
    );
  }
}