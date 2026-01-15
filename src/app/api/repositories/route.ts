import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get('installation_id');

    if (!installationId) {
      return NextResponse.json(
        { error: 'installation_id required' },
        { status: 400 }
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