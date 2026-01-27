import { NextResponse } from 'next/server';
import { githubService } from '@/lib/github';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const { installationId } = await req.json();

  if (!installationId) {
    return NextResponse.json(
      { error: 'installationId required' },
      { status: 400 }
    );
  }

  const octokit =
    await githubService.getInstallationClient(installationId);

  const { data } =
    await octokit.apps.listReposAccessibleToInstallation();

  for (const repo of data.repositories) {
    await query(
      `INSERT INTO github_repositories (
        id,
        installation_id,
        full_name,
        owner,
        name,
        is_private,
        default_branch,
        needs_refresh
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE
        installation_id = VALUES(installation_id),
        needs_refresh = true`,
      [
        repo.id,
        installationId,
        repo.full_name,
        repo.owner.login,
        repo.name,
        repo.private,
        repo.default_branch,
      ]
    );
  }

  return NextResponse.json({
    synced: data.repositories.length,
  });
}
