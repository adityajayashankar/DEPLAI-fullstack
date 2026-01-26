import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { query } from './db';
import { encryptToken, decryptToken } from './crypto';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

interface GitHubConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

interface CachedToken {
  token: string;
  expiresAt: Date;
}

export class GitHubService {
  private config: GitHubConfig;
  private app: Octokit;

  constructor(config: GitHubConfig) {
    this.config = config;
    
    this.app = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.appId,
        privateKey: config.privateKey.replace(/\\n/g, '\n'),
      },
    });
  }

  async getInstallationToken(installationId: string): Promise<string> {
    const cached = await this.getCachedToken(installationId);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached.token;
    }

    const installation = await query<any[]>(
      'SELECT installation_id FROM github_installations WHERE id = ?',
      [installationId]
    );

    if (!installation || installation.length === 0) {
      throw new Error('Installation not found');
    }

    const { data } = await this.app.apps.createInstallationAccessToken({
      installation_id: installation[0].installation_id,
    });

    await this.cacheToken(installationId, data.token, data.expires_at);

    return data.token;
  }

  async getInstallationClient(installationId: string): Promise<Octokit> {
    const token = await this.getInstallationToken(installationId);
    return new Octokit({ auth: token });
  }

  async getRepository(installationId: string, owner: string, repo: string) {
    const octokit = await this.getInstallationClient(installationId);
    const { data } = await octokit.repos.get({ owner, repo });
    
    const { data: languages } = await octokit.repos.listLanguages({ 
      owner, 
      repo 
    });

    return {
      id: data.id,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      languages,
      size: data.size,
      pushedAt: data.pushed_at,
    };
  }

  async createWebhook(
    installationId: string,
    owner: string,
    repo: string,
    webhookUrl: string
  ): Promise<number> {
    const octokit = await this.getInstallationClient(installationId);
    
    const { data } = await octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: this.config.webhookSecret,
        insecure_ssl: '0',
      },
      events: ['push', 'pull_request'],
      active: true,
    });

    return data.id;
  }

  /**
   * Clone repository to local tmp directory
   */
  async cloneRepository(
    installationId: string,
    owner: string,
    repo: string,
    branch?: string
  ): Promise<string> {
    const token = await this.getInstallationToken(installationId);
    const repoPath = path.join(process.cwd(), 'tmp', 'repos', owner, repo);
    
    // Create directory if it doesn't exist
    const parentDir = path.dirname(repoPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Remove if already exists
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }

    const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    const git = simpleGit();

    console.log(`Cloning ${owner}/${repo}...`);

    // Try to clone with the specified branch, fallback to 'master' if 'main' fails
    try {
      await git.clone(cloneUrl, repoPath, [
        '--depth', '1',
        '--single-branch',
        '--branch', branch || 'main',
      ]);
      
      console.log(`Cloned ${owner}/${repo} successfully`);
    } catch (error: any) {
      // If 'main' fails, try 'master' as fallback
      if (error.message.includes('Remote branch main not found') || 
          error.message.includes('Remote branch') && branch === 'main') {
        console.log(`Branch 'main' not found, trying 'master' for ${owner}/${repo}...`);
        
        await git.clone(cloneUrl, repoPath, [
          '--depth', '1',
          '--single-branch',
          '--branch', 'master',
        ]);
        
        console.log(`Cloned ${owner}/${repo} with 'master' branch successfully`);
        
        // Update database with correct branch
        await query(
          `UPDATE github_repositories 
           SET default_branch = 'master' 
           WHERE full_name = ?`,
          [`${owner}/${repo}`]
        );
      } else {
        throw error;
      }
    }

    // Get commit SHA
    const repoGit = simpleGit(repoPath);
    const commitSha = await repoGit.revparse(['HEAD']);

    // Update database
    await query(
      `UPDATE github_repositories 
       SET needs_refresh = false,
           last_cloned_at = NOW(),
           last_commit_sha = ?
       WHERE full_name = ?`,
      [commitSha, `${owner}/${repo}`]
    );

    return repoPath;
  }

  /**
   * Pull latest changes for existing repo
   */
  async pullRepository(owner: string, repo: string): Promise<string> {
    const repoPath = path.join(process.cwd(), 'tmp', 'repos', owner, repo);

    if (!fs.existsSync(repoPath)) {
      throw new Error('Repository not cloned yet');
    }

    // Get the correct branch from database
    const [repoData] = await query<any[]>(
      `SELECT default_branch FROM github_repositories 
       WHERE full_name = ?`,
      [`${owner}/${repo}`]
    );

    const branch = repoData?.default_branch || 'main';

    console.log(`Pulling latest changes for ${owner}/${repo} (branch: ${branch})...`);

    const git = simpleGit(repoPath);
    
    try {
      await git.pull('origin', branch);
      console.log(`Updated ${owner}/${repo} successfully`);
    } catch (error: any) {
      // If pulling fails, try the other common branch
      const fallbackBranch = branch === 'main' ? 'master' : 'main';
      console.log(`Failed to pull '${branch}', trying '${fallbackBranch}'...`);
      
      await git.pull('origin', fallbackBranch);
      
      // Update database with correct branch
      await query(
        `UPDATE github_repositories 
         SET default_branch = ? 
         WHERE full_name = ?`,
        [fallbackBranch, `${owner}/${repo}`]
      );
      
      console.log(`Updated ${owner}/${repo} with '${fallbackBranch}' branch successfully`);
    }

    // Get new commit SHA
    const commitSha = await git.revparse(['HEAD']);

    // Update database
    await query(
      `UPDATE github_repositories 
       SET needs_refresh = false,
           last_cloned_at = NOW(),
           last_commit_sha = ?
       WHERE full_name = ?`,
      [commitSha, `${owner}/${repo}`]
    );

    return repoPath;
  }

  /**
   * Ensure repository is fresh (clone or pull as needed)
   */
  async ensureRepoFresh(
    installationId: string,
    owner: string,
    repo: string
  ): Promise<string> {
    const repoPath = path.join(process.cwd(), 'tmp', 'repos', owner, repo);

    // Check if needs refresh
    const [repoData] = await query<any[]>(
      `SELECT needs_refresh, default_branch FROM github_repositories 
       WHERE full_name = ?`,
      [`${owner}/${repo}`]
    );

    if (!repoData) {
      throw new Error('Repository not found in database');
    }

    const needsRefresh = repoData.needs_refresh || !fs.existsSync(repoPath);

    if (needsRefresh) {
      if (!fs.existsSync(repoPath)) {
        // First time: clone
        return await this.cloneRepository(
          installationId,
          owner,
          repo,
          repoData.default_branch
        );
      } else {
        // Already exists: pull
        return await this.pullRepository(owner, repo);
      }
    }

    return repoPath;
  }

  /**
   * Read directory contents
   */
  async getDirectoryContents(
    installationId: string,
    owner: string,
    repo: string,
    dirPath: string = ''
  ): Promise<any[]> {
    const repoPath = await this.ensureRepoFresh(installationId, owner, repo);
    const fullPath = path.join(repoPath, dirPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('Path does not exist');
    }

    const items = fs.readdirSync(fullPath, { withFileTypes: true });

    return items
      .filter(item => !item.name.startsWith('.')) // Hide hidden files
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name).replace(/\\/g, '/'), // Normalize path separators
        type: item.isDirectory() ? 'dir' : 'file',
        size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : null,
      }))
      .sort((a, b) => {
        // Folders first, then files, alphabetically
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Read file contents
   */
  async getFileContents(
    installationId: string,
    owner: string,
    repo: string,
    filePath: string
  ): Promise<string> {
    const repoPath = await this.ensureRepoFresh(installationId, owner, repo);
    const fullPath = path.join(repoPath, filePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File does not exist');
    }

    if (fs.statSync(fullPath).isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Force refresh repository
   */
  async forceRefresh(installationId: string, owner: string, repo: string): Promise<void> {
    await query(
      `UPDATE github_repositories 
       SET needs_refresh = true 
       WHERE full_name = ?`,
      [`${owner}/${repo}`]
    );

    await this.ensureRepoFresh(installationId, owner, repo);
  }

  private async cacheToken(
    installationId: string, 
    token: string, 
    expiresAt: string
  ): Promise<void> {
    const encrypted = encryptToken(token);
    const id = uuidv4();

    // Convert ISO 8601 datetime to MySQL format
    // GitHub returns: "2026-01-19T16:51:53Z"
    // MySQL needs: "2026-01-19 16:51:53"
    const mysqlDateTime = expiresAt.replace('T', ' ').replace('Z', '');

    await query(
      `INSERT INTO github_access_tokens (id, installation_id, token_encrypted, expires_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE token_encrypted = ?, expires_at = ?`,
      [id, installationId, encrypted, mysqlDateTime, encrypted, mysqlDateTime]
    );
  }

  private async getCachedToken(
    installationId: string
  ): Promise<CachedToken | null> {
    const results = await query<any[]>(
      `SELECT token_encrypted, expires_at 
       FROM github_access_tokens 
       WHERE installation_id = ? 
       AND expires_at > NOW()
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [installationId]
    );

    if (!results || results.length === 0) {
      return null;
    }

    return {
      token: decryptToken(results[0].token_encrypted),
      expiresAt: results[0].expires_at,
    };
  }
}

export const githubService = new GitHubService({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!,
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
});