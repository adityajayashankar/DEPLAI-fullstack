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

export class ScannerService {
  private config: ScannerConfig;

  constructor(config: ScannerConfig) {
    this.config = config;
  }

  /**
   * Trigger a security scan for a project
   */
  async triggerScan(request: ScanRequest): Promise<ScanResponse> {
    const scanId = uuidv4();

    try {
      // 1. Create run record in database
      await this.createScanRecord(scanId, request);

      // 2. Prepare scan input for Python worker
      const scanInput = await this.prepareScanInput(request, scanId);

      // 3. Spawn Docker container to run security checks
      await this.spawnScannerContainer(scanInput);

      return {
        scanId,
        status: 'running',
        message: 'Security scan started successfully',
      };
    } catch (error: any) {
      // Update database with failure
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

  /**
   * Get scan status
   */
  async getScanStatus(scanId: string): Promise<ScanStatus | null> {
    const [scan] = await query<any[]>(
      `SELECT 
        id,
        project_id,
        status,
        started_at,
        finished_at,
        tools_run,
        findings_count,
        severity_breakdown
       FROM runs
       WHERE id = ?`,
      [scanId]
    );

    if (!scan) {
      return null;
    }

    return {
      id: scan.id,
      projectId: scan.project_id,
      status: scan.status,
      startedAt: scan.started_at,
      finishedAt: scan.finished_at,
      toolsRun: scan.tools_run ? JSON.parse(scan.tools_run) : [],
      findingsCount: scan.findings_count,
      severityBreakdown: scan.severity_breakdown
        ? JSON.parse(scan.severity_breakdown)
        : {},
    };
  }

  /**
   * Get scan findings
   */
  async getScanFindings(scanId: string): Promise<ScanResults> {
    const [scan] = await query<any[]>(
      `SELECT status, tools_run FROM runs WHERE id = ?`,
      [scanId]
    );

    if (!scan) {
      throw new Error('Scan not found');
    }

    const findings = await query<any[]>(
      `SELECT 
        id,
        run_id,
        category,
        tool,
        rule_id,
        title,
        severity,
        confidence,
        file_path,
        line_number,
        fingerprint,
        evidence,
        status,
        created_at,
        updated_at
       FROM findings
       WHERE run_id = ?
       ORDER BY 
         FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
         created_at DESC`,
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
      evidence: f.evidence ? JSON.parse(f.evidence) : {},
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    // Calculate summary
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
      tools: scan.tools_run ? JSON.parse(scan.tools_run) : [],
      findings: formattedFindings,
      summary,
    };
  }

  /**
   * Process scan results (called by webhook)
   */
  async processScanResults(scanId: string, results: any): Promise<void> {
    const { status, tools, findings } = results;

    // Update run record
    const severityBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    findings?.forEach((f: any) => {
      const severity = f.severity?.toLowerCase();
      if (severity && severity in severityBreakdown) {
        severityBreakdown[severity as keyof typeof severityBreakdown]++;
      }
    });

    await query(
      `UPDATE runs 
       SET status = ?,
           finished_at = NOW(),
           tools_run = ?,
           findings_count = ?,
           severity_breakdown = ?
       WHERE id = ?`,
      [
        status,
        JSON.stringify(tools || []),
        findings?.length || 0,
        JSON.stringify(severityBreakdown),
        scanId,
      ]
    );

    // Store findings
    if (findings && findings.length > 0) {
      for (const finding of findings) {
        const findingId = uuidv4();

        await query(
          `INSERT INTO findings (
            id,
            run_id,
            category,
            tool,
            rule_id,
            title,
            severity,
            confidence,
            file_path,
            line_number,
            fingerprint,
            evidence,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            findingId,
            scanId,
            finding.category || 'UNKNOWN',
            finding.tool || 'unknown',
            finding.rule_id,
            finding.title || 'Untitled Finding',
            finding.severity || 'LOW',
            finding.confidence || 'UNKNOWN',
            finding.file || finding.file_path,
            finding.line || finding.line_number || 0,
            finding.fingerprint || uuidv4(),
            JSON.stringify(finding.evidence || {}),
            'open',
          ]
        );
      }
    }
  }

  /**
   * Private: Create scan record in database
   */
  private async createScanRecord(
    scanId: string,
    request: ScanRequest
  ): Promise<void> {
    // Get project and repository details
    const [project] = await query<any[]>(
      `SELECT p.*, r.id as repository_id
       FROM projects p
       LEFT JOIN github_repositories r ON r.id = p.repository_id
       WHERE p.id = ?`,
      [request.projectId]
    );

    if (!project) {
      throw new Error('Project not found');
    }

    await query(
      `INSERT INTO runs (
        id,
        project_id,
        repository_id,
        trigger_type,
        scan_type,
        status,
        started_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
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
   * Private: Prepare scan input for Python worker
   */
  private async prepareScanInput(
    request: ScanRequest,
    scanId: string
  ): Promise<any> {
    const input: any = {
      run_id: scanId,
      languages: request.languages || ['python'],
      frameworks: request.frameworks || [],
      dependencies: [],
      is_pr: request.isPR || false,
      changed_files: request.changedFiles || [],
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/scans/results`,
    };

    if (request.projectType === 'local') {
      // Local project: pass the local path
      input.repo_path = path.join(
        process.cwd(),
        'tmp',
        'local-projects',
        request.localPath || ''
      );
    } else if (request.projectType === 'github') {
      // GitHub project: pass the cloned repo path
      input.repo_path = path.join(
        process.cwd(),
        'tmp',
        'repos',
        request.owner || '',
        request.repo || ''
      );
    }

    // DAST configuration
    if (request.targetUrl) {
      input.dast = {
        target_url: request.targetUrl,
      };
    }

    return input;
  }

  /**
   * Private: Spawn Docker container to run security scanner
   */
  private async spawnScannerContainer(scanInput: any): Promise<void> {
    const containerName = `scan-${scanInput.run_id}`;

    const options: DockerRunOptions = {
      image: this.config.dockerImage,
      environment: {
        SCAN_INPUT_JSON: JSON.stringify(scanInput),
        OPENROUTER_API_KEY: this.config.openRouterKey || '',
      },
      volumes: {
        // Mount the tmp directory so scanner can access projects
        [`${process.cwd()}/tmp`]: '/app/tmp',
      },
      network: this.config.dockerNetwork,
      autoRemove: true,
    };

    try {
      // Create and start container
      const container = await docker.createContainer({
        Image: options.image,
        name: containerName,
        Env: Object.entries(options.environment).map(
          ([key, value]) => `${key}=${value}`
        ),
        HostConfig: {
          Binds: options.volumes
            ? Object.entries(options.volumes).map(
                ([host, container]) => `${host}:${container}`
              )
            : undefined,
          NetworkMode: options.network,
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

// Export singleton instance
export const scannerService = new ScannerService({
  apiUrl: process.env.SCANNER_API_URL || 'http://localhost:8000',
  dockerImage: process.env.SCANNER_DOCKER_IMAGE || 'deplai-worker',
  dockerNetwork: process.env.SCANNER_NETWORK || 'deplai-network',
  openRouterKey: process.env.OPENROUTER_API_KEY,
  timeoutSeconds: 3600, // 1 hour
});