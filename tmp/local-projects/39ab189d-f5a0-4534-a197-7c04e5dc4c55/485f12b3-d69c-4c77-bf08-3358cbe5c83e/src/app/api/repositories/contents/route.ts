import { NextRequest, NextResponse } from 'next/server';
import { githubService } from '@/lib/github';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const path = searchParams.get('path') || '';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'owner and repo required' },
        { status: 400 }
      );
    }

    // Get installation ID for this repo
    const [repoData] = await query<any[]>(
      `SELECT r.installation_id, i.id as installation_uuid
       FROM github_repositories r
       JOIN github_installations i ON i.id = r.installation_id
       WHERE r.full_name = ?`,
      [`${owner}/${repo}`]
    );

    if (!repoData) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    const contents = await githubService.getDirectoryContents(
      repoData.installation_uuid,
      owner,
      repo,
      path
    );

    return NextResponse.json({ contents });
  } catch (error: any) {
    console.error('Error fetching contents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contents' },
      { status: 500 }
    );
  }
}