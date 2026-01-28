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

// ------------------------------------------------------------------
// HELPER: Aggressively sanitize the private key to prevent OpenSSL errors
// ------------------------------------------------------------------
function formatPrivateKey(key: string): string {
  if (!key) return '';
  
  let cleanKey = key.trim();

  // 1. Remove surrounding quotes if present (common .env artifact)
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || 
      (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1);
  }

  // 2. Handle literal escaped newlines (e.g. "\n" characters from .env)
  cleanKey = cleanKey.replace(/\\n/g, '\n');

  // 3. Ensure standard PEM headers exist and are separated by newlines
  const header = '-----BEGIN RSA PRIVATE KEY-----';
  const footer = '-----END RSA PRIVATE KEY-----';

  if (cleanKey.includes(header) && !cleanKey.includes(header + '\n')) {
    cleanKey = cleanKey.replace(header, header + '\n');
  }
  if (cleanKey.includes(footer) && !cleanKey.includes('\n' + footer)) {
    cleanKey = cleanKey.replace(footer, '\n' + footer);
  }

  return cleanKey.trim();
}

export class GitHubService {
  private config: GitHubConfig;
  private app: Octokit;

  constructor(config: GitHubConfig) {
    this.config = config;
    
    // Apply the formatting fix to the key
    const privateKey = formatPrivateKey(config.privateKey);

    // Basic validation to warn in logs if key is still bad
    if (!privateKey.includes('BEGIN') || !privateKey.includes('KEY')) {
      console.error('CRITICAL: GITHUB_PRIVATE_KEY appears invalid or empty.');
    }

    this.app = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.appId,
        privateKey: privateKey,
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

    // FIX: Ensure installation_id is passed as a Number to the GitHub API
    const ghInstallationId = Number(installation[0].installation_id);
    
    const { data } = await this.app.apps.createInstallationAccessToken({
      installation_id: ghInstallationId,
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

    // Remove if already exists to ensure fresh clone
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }

    const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    const git = simpleGit();

    console.log(`Cloning ${owner}/${repo}...`);

    try {
      await git.clone(cloneUrl, repoPath, [
        '--depth', '1',
        '--single-branch',
        '--branch', branch || 'main',
      ]);
      console.log(`Cloned ${owner}/${repo} successfully`);
    } catch (error: any) {
      // Fallback: If 'main' fails, try 'master'
      if (error.message.includes('Remote branch main not found') || 
          (error.message.includes('Remote branch') && branch === 'main')) {
        console.log(`Branch 'main' not found, trying 'master' for ${owner}/${repo}...`);
        
        await git.clone(cloneUrl, repoPath, [
          '--depth', '1',
          '--single-branch',
          '--branch', 'master',
        ]);
        
        // Update database with correct branch for future reference
        await query(
          `UPDATE github_repositories SET default_branch = 'master' WHERE full_name = ?`,
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

    const [repoData] = await query<any[]>(
      `SELECT default_branch FROM github_repositories WHERE full_name = ?`,
      [`${owner}/${repo}`]
    );

    const branch = repoData?.default_branch || 'main';
    const git = simpleGit(repoPath);
    
    try {
      await git.pull('origin', branch);
    } catch (error: any) {
      // Fallback logic for pull
      const fallbackBranch = branch === 'main' ? 'master' : 'main';
      console.log(`Failed to pull '${branch}', trying '${fallbackBranch}'...`);
      
      await git.pull('origin', fallbackBranch);
      
      await query(
        `UPDATE github_repositories SET default_branch = ? WHERE full_name = ?`,
        [fallbackBranch, `${owner}/${repo}`]
      );
    }

    const commitSha = await git.revparse(['HEAD']);
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
    const [repoData] = await query<any[]>(
      `SELECT needs_refresh, default_branch FROM github_repositories WHERE full_name = ?`,
      [`${owner}/${repo}`]
    );

    if (!repoData) throw new Error('Repository not found in database');

    const needsRefresh = repoData.needs_refresh || !fs.existsSync(repoPath);

    if (needsRefresh) {
      if (!fs.existsSync(repoPath)) {
        return await this.cloneRepository(
          installationId,
          owner,
          repo,
          repoData.default_branch
        );
      } else {
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

    if (!fs.existsSync(fullPath)) throw new Error('Path does not exist');

    const items = fs.readdirSync(fullPath, { withFileTypes: true });

    return items
      .filter(item => !item.name.startsWith('.')) // Hide hidden files
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name).replace(/\\/g, '/'),
        type: item.isDirectory() ? 'dir' : 'file',
        size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : null,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
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

    if (!fs.existsSync(fullPath)) throw new Error('File does not exist');
    if (fs.statSync(fullPath).isDirectory()) throw new Error('Path is a directory, not a file');

    return fs.readFileSync(fullPath, 'utf-8');
  }

  async forceRefresh(installationId: string, owner: string, repo: string): Promise<void> {
    await query(
      `UPDATE github_repositories SET needs_refresh = true WHERE full_name = ?`,
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
    // Convert ISO datetime to MySQL format (remove 'T' and 'Z')
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
       ORDER BY expires_at DESC LIMIT 1`,
      [installationId]
    );

    if (!results || results.length === 0) return null;

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