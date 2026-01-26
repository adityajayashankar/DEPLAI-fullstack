/**
 * Shared types for API responses and data models
 */

// File browser types
export interface FileItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number | null;
}

// Project types
export interface LocalProject {
  id: string;
  name: string;
  type: 'local';
  source: string;
  access: string;
  fileCount: number;
  sizeBytes: number;
  uploadedAt: string;
  createdAt: string;
  canDelete: boolean;
}

export interface GitHubProject {
  id: string;
  name: string;
  owner: string;
  repo: string;
  type: 'github';
  source: string;
  branch: string;
  access: 'Private' | 'Public';
  languages: Record<string, number> | null;
  lastSyncedAt: string;
  createdAt: string;
  installationId: string;
  canDelete: boolean;
}

export type Project = LocalProject | GitHubProject;

// API response types
export interface ProjectsResponse {
  projects: Project[];
  stats: {
    localCount: number;
    githubCount: number;
    totalCount: number;
  };
}

export interface ContentsResponse {
  contents: FileItem[];
}

export interface FileResponse {
  content: string;
}

export interface SessionResponse {
  isLoggedIn: boolean;
  user?: {
    id: string;
    githubId: number;
    login: string;
    email: string;
    name: string;
    avatarUrl: string;
  };
}

export interface InstallationsResponse {
  installations: Array<{
    id: string;
    account_login: string;
    account_type: string;
  }>;
}

// Error response
export interface ErrorResponse {
  error: string;
}
