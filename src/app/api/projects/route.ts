import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch local projects
    const localProjects = await query<any[]>(
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
       WHERE user_id = ? AND project_type = 'local'
       ORDER BY created_at DESC`,
      [user.id]
    );

    // Fetch GitHub repositories through installations
    const githubRepos = await query<any[]>(
      `SELECT 
        r.id,
        r.full_name,
        r.default_branch,
        r.is_private,
        r.languages,
        r.last_synced_at,
        r.created_at,
        i.id as installation_id,
        i.account_login
       FROM github_repositories r
       JOIN github_installations i ON i.id = r.installation_id
       WHERE i.user_id = ?
       ORDER BY r.full_name ASC`,
      [user.id]
    );

    // Format local projects
    const formattedLocalProjects = localProjects.map(project => ({
      id: project.id,
      name: project.name,
      type: 'local',
      source: 'System',
      access: 'Local',
      fileCount: project.file_count,
      sizeBytes: project.size_bytes,
      uploadedAt: project.uploaded_at,
      createdAt: project.created_at,
      canDelete: true,
    }));

    // Format GitHub repositories
    const formattedGithubRepos = githubRepos.map(repo => {
      const [owner, repoName] = repo.full_name.split('/');
      
      return {
        id: repo.id,
        name: repo.full_name,
        owner,
        repo: repoName,
        type: 'github',
        source: repo.account_login,
        branch: repo.default_branch,
        access: repo.is_private ? 'Private' : 'Public',
        languages: repo.languages ? JSON.parse(repo.languages) : null,
        lastSyncedAt: repo.last_synced_at,
        createdAt: repo.created_at,
        installationId: repo.installation_id,
        canDelete: false,
      };
    });

    // Combine: local projects first, then GitHub repos
    const allProjects = [...formattedLocalProjects, ...formattedGithubRepos];

    return NextResponse.json({
      projects: allProjects,
      stats: {
        localCount: formattedLocalProjects.length,
        githubCount: formattedGithubRepos.length,
        totalCount: allProjects.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}