import { NextRequest, NextResponse } from 'next/server';
import { githubService } from '@/lib/github';
import { getAuthenticatedUser, verifyRepositoryOwnership } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'owner and repo required' },
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

    await githubService.forceRefresh(
      repoAccess.installationId,
      owner,
      repo
    );

    return NextResponse.json({ 
      success: true,
      message: 'Repository refreshed successfully' 
    });
  } catch (error: any) {
    console.error('Error refreshing repository:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh repository' },
      { status: 500 }
    );
  }
}