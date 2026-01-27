/**
 * Scanner Integration Types
 * Bridges Next.js frontend with Python security scanner
 */

export interface ScanRequest {
  projectId: string;
  projectType: 'local' | 'github';
  scanType?: 'full' | 'sast' | 'dast' | 'sca';
  
  // For GitHub projects
  owner?: string;
  repo?: string;
  branch?: string;
  
  // For local projects
  localPath?: string;
  
  // DAST configuration
  targetUrl?: string;
  
  // Additional context
  languages?: string[];
  frameworks?: string[];
  isPR?: boolean;
  changedFiles?: string[];
}

export interface ScanResponse {
  scanId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export interface ScanStatus {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  finishedAt?: Date;
  toolsRun?: string[];
  findingsCount?: number;
  severityBreakdown?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  error?: string;
}

export interface Finding {
  id: string;
  runId: string;
  category: 'SAST' | 'DAST' | 'SCA' | 'CONFIG' | 'AUTH' | 'SYSTEM';
  tool: string;
  ruleId?: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  filePath?: string;
  lineNumber?: number;
  fingerprint: string;
  evidence?: Record<string, any>;
  status: 'open' | 'fixed' | 'ignored' | 'false_positive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanResults {
  runId: string;
  status: 'completed' | 'failed';
  tools: string[];
  findings: Finding[];
  summary?: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  error?: string;
}

export interface ScannerConfig {
  apiUrl: string;
  dockerImage: string;
  dockerNetwork?: string;
  openRouterKey?: string;
  timeoutSeconds?: number;
}

export interface DockerRunOptions {
  image: string;
  environment: Record<string, string>;
  volumes?: Record<string, string>;
  network?: string;
  autoRemove?: boolean;
}