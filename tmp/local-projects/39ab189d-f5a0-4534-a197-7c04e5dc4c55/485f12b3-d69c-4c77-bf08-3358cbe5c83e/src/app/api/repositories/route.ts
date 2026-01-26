import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, verifyInstallationOwnership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get('installation_id');

    if (!installationId) {
      return NextResponse.json(
        { error: 'installation_id required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const hasAccess = await verifyInstallationOwnership(user.id, installationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this installation' },
        { status: 403 }
      );
    }

    const repositories = await query<any[]>(
      `SELECT 
        id,
        github_repo_id,
        full_name,
        default_branch,
        is_private,
        languages,
        last_synced_at,
        created_at
       FROM github_repositories
       WHERE installation_id = ?
       ORDER BY full_name ASC`,
      [installationId]
    );

    const formatted = repositories.map(repo => ({
      ...repo,
      languages: repo.languages ? JSON.parse(repo.languages) : null,
    }));

    return NextResponse.json({ repositories: formatted });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}