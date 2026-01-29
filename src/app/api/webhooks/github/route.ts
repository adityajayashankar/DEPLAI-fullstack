import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    
    if (!signature || !event) {
      console.error('Missing webhook headers');
      return NextResponse.json(
        { error: 'Missing headers' },
        { status: 400 }
      );
    }

    const body = await request.text();
    
    const isValid = verifyWebhookSignature(
      body,
      signature,
      process.env.GITHUB_WEBHOOK_SECRET!
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    console.log(`Received GitHub webhook: ${event}`);

    switch (event) {
      case 'installation':
        await handleInstallation(payload);
        break;
      
      case 'installation_repositories':
        await handleInstallationRepositories(payload);
        break;
      
      case 'push':
        await handlePush(payload);
        break;
      
      case 'pull_request':
        await handlePullRequest(payload);
        break;
      
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function handleInstallation(payload: any) {
  const { action, installation, repositories } = payload;

  console.log(`Installation ${action}: ${installation.account.login}`);

  if (action === 'created') {
    const installationId = uuidv4();

    try {
      await query(
        `INSERT INTO github_installations 
         (id, installation_id, account_login, account_type, metadata, installed_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          installationId,
          installation.id,
          installation.account.login,
          installation.account.type,
          JSON.stringify({ installation }),
        ]
      );

      console.log(`Created installation record: ${installationId}`);

      // Store repositories if provided
      if (repositories && Array.isArray(repositories)) {
        for (const repo of repositories) {
          await storeRepository(installationId, repo);
        }
        console.log(`Stored ${repositories.length} repositories`);
      }
    } catch (error: any) {
      console.error('Error creating installation:', error);
      throw error;
    }
  } else if (action === 'deleted') {
    try {
      const [inst] = await query<any[]>(
        'SELECT id FROM github_installations WHERE installation_id = ?',
        [installation.id]
      );

      if (inst) {
        await query(
          'DELETE FROM github_installations WHERE installation_id = ?',
          [installation.id]
        );
        console.log(`Deleted installation: ${installation.id}`);
      }
    } catch (error: any) {
      console.error('Error deleting installation:', error);
      throw error;
    }
  } else if (action === 'suspend') {
    try {
      await query(
        'UPDATE github_installations SET suspended_at = NOW() WHERE installation_id = ?',
        [installation.id]
      );
      console.log(`Suspended installation: ${installation.id}`);
    } catch (error: any) {
      console.error('Error suspending installation:', error);
    }
  } else if (action === 'unsuspend') {
    try {
      await query(
        'UPDATE github_installations SET suspended_at = NULL WHERE installation_id = ?',
        [installation.id]
      );
      console.log(`Unsuspended installation: ${installation.id}`);
    } catch (error: any) {
      console.error('Error unsuspending installation:', error);
    }
  }
}

async function handleInstallationRepositories(payload: any) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  console.log(`Installation repositories ${action}: ${installation.account.login}`);

  try {
    const [inst] = await query<any[]>(
      'SELECT id FROM github_installations WHERE installation_id = ?',
      [installation.id]
    );

    if (!inst) {
      console.error(`Installation not found: ${installation.id}`);
      return;
    }

    if (action === 'added' && repositories_added) {
      for (const repo of repositories_added) {
        await storeRepository(inst.id, repo);
      }
      console.log(`Added ${repositories_added.length} repositories`);
    } else if (action === 'removed' && repositories_removed) {
      for (const repo of repositories_removed) {
        await query(
          'DELETE FROM github_repositories WHERE installation_id = ? AND github_repo_id = ?',
          [inst.id, repo.id]
        );
      }
      console.log(`Removed ${repositories_removed.length} repositories`);
    }
  } catch (error: any) {
    console.error('Error handling installation repositories:', error);
    throw error;
  }
}

async function handlePush(payload: any) {
  const { repository, ref, after } = payload;

  console.log(`Push to ${repository.full_name}: ${ref}`);

  try {
    // Mark repository as needing refresh
    await query(
      `UPDATE github_repositories 
       SET needs_refresh = true, last_push_at = NOW()
       WHERE github_repo_id = ?`,
      [repository.id]
    );

    const defaultRef = `refs/heads/${repository.default_branch}`;
    if (ref !== defaultRef) {
      console.log(`Push to non-default branch ${ref}, marked as stale but not creating run`);
      return;
    }

    // Get repository and project
    const [repo] = await query<any[]>(
      `SELECT r.id, p.id as project_id 
       FROM github_repositories r
       LEFT JOIN projects p ON p.repository_id = r.id
       WHERE r.github_repo_id = ?`,
      [repository.id]
    );

    if (!repo || !repo.project_id) {
      console.log('No project found for this repository');
      return;
    }

    // Create scan run
    await query(
      `INSERT INTO runs 
       (id, project_id, repository_id, trigger_type, git_ref, commit_sha, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        repo.project_id,
        repo.id,
        'push',
        ref,
        after,
        'pending'
      ]
    );

    console.log(`Created run for push to ${repository.full_name}`);
  } catch (error: any) {
    console.error('Error handling push:', error);
  }
}

async function handlePullRequest(payload: any) {
  const { action, pull_request, repository } = payload;

  if (action !== 'opened' && action !== 'synchronize') {
    return;
  }

  console.log(`PR ${action}: ${repository.full_name} #${pull_request.number}`);

  try {
    // Mark repository as needing refresh
    await query(
      `UPDATE github_repositories 
       SET needs_refresh = true
       WHERE github_repo_id = ?`,
      [repository.id]
    );

    const [repo] = await query<any[]>(
      `SELECT r.id, p.id as project_id 
       FROM github_repositories r
       LEFT JOIN projects p ON p.repository_id = r.id
       WHERE r.github_repo_id = ?`,
      [repository.id]
    );

    if (!repo || !repo.project_id) {
      console.log('No project found for this repository');
      return;
    }

    await query(
      `INSERT INTO runs 
       (id, project_id, repository_id, trigger_type, git_ref, commit_sha, pr_number, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        repo.project_id,
        repo.id,
        'pull_request',
        pull_request.head.ref,
        pull_request.head.sha,
        pull_request.number,
        'pending'
      ]
    );

    console.log(`Created run for PR #${pull_request.number} in ${repository.full_name}`);
  } catch (error: any) {
    console.error('Error handling pull request:', error);
  }
}

async function storeRepository(installationId: string, repo: any) {
  try {
    const repoId = uuidv4();
    
    await query(
      `INSERT INTO github_repositories 
       (id, installation_id, github_repo_id, full_name, is_private, default_branch, needs_refresh, created_at)
       VALUES (?, ?, ?, ?, ?, ?, true, NOW())
       ON DUPLICATE KEY UPDATE 
       full_name = VALUES(full_name),
       default_branch = VALUES(default_branch),
       needs_refresh = true`,
      [
        repoId,
        installationId,
        repo.id,
        repo.full_name,
        repo.private,
        repo.default_branch || 'main'
      ]
    );

    console.log(`Stored repository: ${repo.full_name}`);
  } catch (error: any) {
    console.error(`Error storing repository ${repo.full_name}:`, error);
    throw error;
  }
}