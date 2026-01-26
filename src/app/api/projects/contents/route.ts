import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getDirectoryContents } from '@/lib/local-projects';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const path = searchParams.get('path') || '';

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id required' },
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

    // Get directory contents
    const contents = getDirectoryContents(user.id, projectId, path);

    return NextResponse.json({ contents });
  } catch (error: any) {
    console.error('Error fetching local project contents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contents' },
      { status: 500 }
    );
  }
}
