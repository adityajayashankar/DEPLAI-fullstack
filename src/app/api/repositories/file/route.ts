import { NextRequest, NextResponse } from 'next/server';
import { githubService } from '@/lib/github';
import { getAuthenticatedUser, verifyRepositoryOwnership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const filePath = searchParams.get('path');

    if (!owner || !repo || !filePath) {
      return NextResponse.json(
        { error: 'owner, repo, and path required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const repoAccess = await verifyRepositoryOwnership(user.id, owner, repo);
    if (!repoAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this repository' },
        { status: 403 }
      );
    }

    const content = await githubService.getFileContents(
      repoAccess.installationId,
      owner,
      repo,
      filePath
    );

    return NextResponse.json({ content, path: filePath });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file' },
      { status: 500 }
    );
  }
}