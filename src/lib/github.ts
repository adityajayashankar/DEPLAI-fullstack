import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { query } from './db';
import { encryptToken, decryptToken } from './crypto';
import { v4 as uuidv4 } from 'uuid';

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

  private async cacheToken(
    installationId: string, 
    token: string, 
    expiresAt: string
  ): Promise<void> {
    const encrypted = encryptToken(token);
    const id = uuidv4();

    await query(
      `INSERT INTO github_access_tokens (id, installation_id, token_encrypted, expires_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE token_encrypted = ?, expires_at = ?`,
      [id, installationId, encrypted, expiresAt, encrypted, expiresAt]
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