import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getFileContents } from '@/lib/local-projects';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const filePath = searchParams.get('path');

    if (!projectId || !filePath) {
      return NextResponse.json(
        { error: 'project_id and path required' },
        { status: 400 }
      );
    }

    // Verify ownership and project type
    const [project] = await query<any[]>(
      `SELECT id, name, project_type, user_id
       FROM projects
       WHERE id = ?`,
      [projectId]
    );

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this project' },
        { status: 403 }
      );
    }

    if (project.project_type !== 'local') {
      return NextResponse.json(
        { error: 'This endpoint is for local projects only' },
        { status: 400 }
      );
    }

    // Get file contents
    const content = getFileContents(user.id, projectId, filePath);

    return NextResponse.json({ content, path: filePath });
  } catch (error: any) {
    console.error('Error fetching local project file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file' },
      { status: 500 }
    );
  }
}