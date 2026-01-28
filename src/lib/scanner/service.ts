/**
 * Scanner Service
 * Orchestrates security scans by spawning Docker containers
 */

import Docker from 'dockerode';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import {
  ScanRequest,
  ScanResponse,
  ScanStatus,
  ScanResults,
  ScannerConfig,
  DockerRunOptions,
} from './types';

const docker = new Docker();

// 🛡️ FIX 1: Enhanced Safe Parse (Handles Objects + Strings)
function safeParse(input: any, fallback: any) {
  if (input === null || input === undefined) return fallback;
  
  // If DB driver already parsed it into an Object/Array, return it as is
  if (typeof input === 'object') {
    return input;
  }

  // If it's a string, try to parse it
  try {
    return JSON.parse(input);
  } catch (e) {
    console.warn("⚠️ Failed to parse DB JSON:", input);
    return fallback;
  }
}

export class ScannerService {
  private config: ScannerConfig;

  constructor(config: ScannerConfig) {
    this.config = config;
  }

  async triggerScan(request: ScanRequest): Promise<ScanResponse> {
    const scanId = uuidv4();

    try {
      await this.createScanRecord(scanId, request);
      const scanInput = await this.prepareScanInput(request, scanId);
      await this.spawnScannerContainer(scanInput);

      return {
        scanId,
        status: 'running',
        message: 'Security scan started successfully',
      };
    } catch (error: any) {
      console.error('Trigger Scan Error:', error);
      await query(
        `UPDATE runs SET status = 'failed', finished_at = NOW() WHERE id = ?`,
        [scanId]
      );
      return {
        scanId,
        status: 'failed',
        message: error.message || 'Failed to start scan',
      };
    }
  }

  async getScanStatus(scanId: string): Promise<ScanStatus | null> {
    const [scan] = await query<any[]>(
      `SELECT id, project_id, status, started_at, finished_at, tools_run, findings_count, severity_breakdown
       FROM runs WHERE id = ?`,
      [scanId]
    );

    if (!scan) return null;

    return {
      id: scan.id,
      projectId: scan.project_id,
      status: scan.status,
      startedAt: scan.started_at,
      finishedAt: scan.finished_at,
      toolsRun: safeParse(scan.tools_run, []), 
      findingsCount: scan.findings_count,
      severityBreakdown: safeParse(scan.severity_breakdown, {}),
    };
  }

  async getScanFindings(scanId: string): Promise<ScanResults> {
    const [scan] = await query<any[]>(
      `SELECT status, tools_run FROM runs WHERE id = ?`,
      [scanId]
    );

    if (!scan) throw new Error('Scan not found');

    const findings = await query<any[]>(
      `SELECT * FROM findings WHERE run_id = ?
       ORDER BY FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'), created_at DESC`,
      [scanId]
    );

    const formattedFindings = findings.map((f) => ({
      id: f.id,
      runId: f.run_id,
      category: f.category,
      tool: f.tool,
      ruleId: f.rule_id,
      title: f.title,
      severity: f.severity,
      confidence: f.confidence,
      filePath: f.file_path,
      lineNumber: f.line_number,
      fingerprint: f.fingerprint,
      evidence: safeParse(f.evidence, {}),
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    const summary = {
      total: formattedFindings.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    formattedFindings.forEach((f) => {
      summary.byCategory[f.category] = (summary.byCategory[f.category] || 0) + 1;
      summary.bySeverity[f.severity] = (summary.bySeverity[f.severity] || 0) + 1;
    });

    return {
      runId: scanId,
      status: scan.status,
      tools: safeParse(scan.tools_run, []),
      findings: formattedFindings,
      summary,
    };
  }

  async processScanResults(scanId: string, results: any): Promise<void> {
    const { status, tools, findings } = results;

    const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    findings?.forEach((f: any) => {
      const severity = f.severity?.toLowerCase();
      if (severity && severity in severityBreakdown) {
        severityBreakdown[severity as keyof typeof severityBreakdown]++;
      }
    });

    // Ensure we store a valid JSON string for MySQL
    const toolsJson = JSON.stringify(Array.isArray(tools) ? tools : []);

    await query(
      `UPDATE runs 
       SET status = ?, finished_at = NOW(), tools_run = ?, findings_count = ?, severity_breakdown = ?
       WHERE id = ?`,
      [
        status,
        toolsJson,
        findings?.length || 0,
        JSON.stringify(severityBreakdown),
        scanId,
      ]
    );

    if (findings && findings.length > 0) {
      for (const finding of findings) {
        const ruleId = finding.rule_id || null;
        const filePath = finding.file || finding.file_path || null;
        
        await query(
          `INSERT INTO findings (
            id, run_id, category, tool, rule_id, title, severity, 
            confidence, file_path, line_number, fingerprint, evidence, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            scanId,
            finding.category || 'UNKNOWN',
            finding.tool || 'unknown',
            ruleId,
            finding.title || 'Untitled Finding',
            finding.severity || 'LOW',
            finding.confidence || 'UNKNOWN',
            filePath,
            finding.line || finding.line_number || 0,
            finding.fingerprint || uuidv4(),
            JSON.stringify(finding.evidence || {}),
            'open',
          ]
        );
      }
    }
  }

  private async createScanRecord(scanId: string, request: ScanRequest): Promise<void> {
    const [project] = await query<any[]>(
      `SELECT p.*, r.id as repository_id FROM projects p
       LEFT JOIN github_repositories r ON r.id = p.repository_id
       WHERE p.id = ?`,
      [request.projectId]
    );

    if (!project) throw new Error('Project not found');

    await query(
      `INSERT INTO runs (id, project_id, repository_id, trigger_type, scan_type, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        scanId,
        request.projectId,
        project.repository_id || null,
        'manual',
        request.scanType || 'full',
        'running',
      ]
    );
  }

  /**
   * 🛡️ FIX 2: Prepare Input with DOCKER-COMPATIBLE Paths
   * Instead of sending Windows paths (C:\Users\...), we send Linux paths (/app/tmp/...)
   * because the code runs inside the container.
   */
  private async prepareScanInput(request: ScanRequest, scanId: string): Promise<any> {
    const finalDependencies = (request.languages && request.languages.length > 0) 
        ? request.languages : []; 

    const input: any = {
      run_id: scanId,
      languages: request.languages || ['python'],
      frameworks: request.frameworks || [],
      dependencies: finalDependencies,
      is_pr: request.isPR || false,
      changed_files: request.changedFiles || [],
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/scans/results`,
    };

    // Construct the path relative to the 'tmp' directory
    let relativePath = '';

    if (request.projectType === 'local') {
      relativePath = `local-projects/${request.localPath || ''}`;
    } else if (request.projectType === 'github') {
      relativePath = `repos/${request.owner || ''}/${request.repo || ''}`;
    }

    // 🔑 THE FIX: Force forward slashes and prepend /app/tmp/ for Docker
    // This transforms "repos\aditya\project" -> "/app/tmp/repos/aditya/project"
    const dockerPath = `/app/tmp/${relativePath.split(path.sep).join('/')}`;
    
    input.repo_path = dockerPath; // Send the Linux path to the container
    
    if (request.owner && request.repo) {
        input.repo_url = `https://github.com/${request.owner}/${request.repo}`;
    }

    if (request.targetUrl) {
      input.dast = { target_url: request.targetUrl };
    }

    return input;
  }

  private async spawnScannerContainer(scanInput: any): Promise<void> {
    const containerName = `scan-${scanInput.run_id}`;
    
    const options: DockerRunOptions = {
      image: this.config.dockerImage,
      environment: {
        SCAN_INPUT_JSON: JSON.stringify(scanInput),
        OPENROUTER_API_KEY: this.config.openRouterKey || '',
      },
      volumes: { 
        // Mount local tmp to /app/tmp in container
        [`${process.cwd()}/tmp`]: '/app/tmp' 
      },
      network: this.config.dockerNetwork,
      autoRemove: true,
    };

    try {
      const container = await docker.createContainer({
        Image: options.image,
        name: containerName,
        Env: Object.entries(options.environment).map(([k, v]) => `${k}=${v}`),
        HostConfig: {
          Binds: options.volumes ? Object.entries(options.volumes).map(([h, c]) => `${h}:${c}`) : undefined,
          NetworkMode: options.network === 'bridge' ? undefined : options.network,
          AutoRemove: options.autoRemove,
        },
      });
      await container.start();
      console.log(`Scanner container started: ${containerName}`);
    } catch (error: any) {
      console.error('Failed to spawn scanner container:', error);
      throw new Error(`Docker spawn failed: ${error.message}`);
    }
  }
}

export const scannerService = new ScannerService({
  apiUrl: process.env.SCANNER_API_URL || 'http://localhost:8000',
  dockerImage: process.env.SCANNER_DOCKER_IMAGE || 'deplai-worker',
  dockerNetwork: process.env.SCANNER_NETWORK || 'bridge', 
  openRouterKey: process.env.OPENROUTER_API_KEY,
  timeoutSeconds: 3600,
});