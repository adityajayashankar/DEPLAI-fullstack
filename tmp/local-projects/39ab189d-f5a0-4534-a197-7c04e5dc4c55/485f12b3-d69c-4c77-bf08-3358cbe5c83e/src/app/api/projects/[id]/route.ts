import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { deleteProject } from '@/lib/local-projects';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { id: projectId } = await context.params;
    
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch project to verify ownership and type
    const [project] = await query<any[]>(
      `SELECT 
        id,
        name,
        project_type,
        local_path,
        user_id
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

    // Verify ownership
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this project' },
        { status: 403 }
      );
    }

    // Only allow deletion of local projects
    if (project.project_type !== 'local') {
      return NextResponse.json(
        { error: 'Cannot delete GitHub repositories through this endpoint' },
        { status: 400 }
      );
    }

    // Delete from filesystem
    try {
      deleteProject(user.id, projectId);
    } catch (fsError: any) {
      console.error('Filesystem deletion error:', fsError);
    }

    // Delete from database
    await query(
      `DELETE FROM projects WHERE id = ?`,
      [projectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
      deletedProject: {
        id: project.id,
        name: project.name,
      },
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const { id: projectId } = await context.params;
    
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch project details
    const [project] = await query<any[]>(
      `SELECT 
        id,
        name,
        project_type,
        local_path,
        file_count,
        size_bytes,
        uploaded_at,
        created_at,
        user_id
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

    // Verify ownership
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this project' },
        { status: 403 }
      );
    }

    return NextResponse.json({
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
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}