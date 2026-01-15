import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    
    if (!signature || !event) {
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
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleInstallation(payload: any) {
  const { action, installation, repositories } = payload;

  if (action === 'created') {
    const installationId = uuidv4();

    await query(
      `INSERT INTO github_installations 
       (id, installation_id, account_login, account_type, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        installationId,
        installation.id,
        installation.account.login,
        installation.account.type,
        JSON.stringify({ installation }),
      ]
    );

    if (repositories) {
      for (const repo of repositories) {
        await storeRepository(installationId, repo);
      }
    }
  } else if (action === 'deleted') {
    await query(
      'DELETE FROM github_installations WHERE installation_id = ?',
      [installation.id]
    );
  }
}

async function handleInstallationRepositories(payload: any) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  const [inst] = await query<any[]>(
    'SELECT id FROM github_installations WHERE installation_id = ?',
    [installation.id]
  );

  if (!inst) return;

  if (action === 'added') {
    for (const repo of repositories_added) {
      await storeRepository(inst.id, repo);
    }
  } else if (action === 'removed') {
    for (const repo of repositories_removed) {
      await query(
        'DELETE FROM github_repositories WHERE installation_id = ? AND github_repo_id = ?',
        [inst.id, repo.id]
      );
    }
  }
}

async function handlePush(payload: any) {
  const { repository, installation, ref, after } = payload;

  const defaultRef = `refs/heads/${repository.default_branch}`;
  if (ref !== defaultRef) {
    return;
  }

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
     (id, project_id, repository_id, trigger_type, git_ref, commit_sha, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
}

async function handlePullRequest(payload: any) {
  const { action, pull_request, repository } = payload;

  if (action !== 'opened' && action !== 'synchronize') {
    return;
  }

  const [repo] = await query<any[]>(
    `SELECT r.id, p.id as project_id 
     FROM github_repositories r
     LEFT JOIN projects p ON p.repository_id = r.id
     WHERE r.github_repo_id = ?`,
    [repository.id]
  );

  if (!repo || !repo.project_id) {
    return;
  }

  await query(
    `INSERT INTO runs 
     (id, project_id, repository_id, trigger_type, git_ref, commit_sha, pr_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
}

async function storeRepository(installationId: string, repo: any) {
  await query(
    `INSERT INTO github_repositories 
     (id, installation_id, github_repo_id, full_name, is_private, default_branch)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     full_name = VALUES(full_name),
     default_branch = VALUES(default_branch)`,
    [
      uuidv4(),
      installationId,
      repo.id,
      repo.full_name,
      repo.private,
      repo.default_branch || 'main'
    ]
  );
}