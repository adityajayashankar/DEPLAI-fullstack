/**
 * Scan Results Component
 * Displays security findings from a completed scan
 */

'use client';

import { useState, useEffect } from 'react';

interface Finding {
  id: string;
  category: string;
  tool: string;
  ruleId?: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: string;
  filePath?: string;
  lineNumber?: number;
  evidence?: Record<string, any>;
  status: string;
}

interface ScanResultsProps {
  scanId: string;
}

export default function ScanResults({ scanId }: ScanResultsProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchScanResults();
    
    // Poll for updates if scan is still running
    const interval = setInterval(() => {
      if (status?.status === 'running') {
        fetchScanResults();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scanId, status?.status]);

  async function fetchScanResults() {
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      const data = await res.json();

      setStatus(data.status);

      if (data.results) {
        setFindings(data.results.findings || []);
        setSummary(data.results.summary);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch scan results:', error);
      setLoading(false);
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'SAST':
        return '🔍';
      case 'DAST':
        return '🌐';
      case 'SCA':
        return '📦';
      case 'CONFIG':
        return '⚙️';
      case 'AUTH':
        return '🔐';
      default:
        return '⚠️';
    }
  }

  const filteredFindings = findings.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'critical-high') return ['CRITICAL', 'HIGH'].includes(f.severity);
    return f.category === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading scan results...</span>
      </div>
    );
  }

  if (status?.status === 'running') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Scan in Progress</h3>
        <p className="text-blue-700">
          Security scan is currently running. This page will update automatically.
        </p>
        {status.toolsRun && status.toolsRun.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-blue-600 mb-2">Tools running:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {status.toolsRun.map((tool: string) => (
                <span key={tool} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status?.status === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Scan Failed</h3>
        <p className="text-red-700">An error occurred during the security scan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Findings</div>
            <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 mb-1">Critical</div>
            <div className="text-3xl font-bold text-red-900">{summary.bySeverity?.CRITICAL || 0}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1">High</div>
            <div className="text-3xl font-bold text-orange-900">{summary.bySeverity?.HIGH || 0}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-600 mb-1">Medium</div>
            <div className="text-3xl font-bold text-yellow-900">{summary.bySeverity?.MEDIUM || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setFilter('critical-high')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'critical-high'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Critical & High
          </button>
          {Object.entries(summary?.byCategory || {}).map(([category, count]: [string, unknown]) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getCategoryIcon(category)} {category} ({count as number})
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Security Findings ({filteredFindings.length})
          </h3>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Findings</h4>
            <p className="text-gray-600">No security issues detected in this scan.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                        {finding.severity}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {getCategoryIcon(finding.category)} {finding.category}
                      </span>
                      <span className="text-xs text-gray-500">{finding.tool}</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{finding.title}</h4>
                    {finding.filePath && (
                      <p className="text-sm text-gray-600">
                        {finding.filePath}
                        {finding.lineNumber && `:${finding.lineNumber}`}
                      </p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedFinding(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded text-sm font-medium border ${getSeverityColor(selectedFinding.severity)}`}>
                      {selectedFinding.severity}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                      {getCategoryIcon(selectedFinding.category)} {selectedFinding.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedFinding.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
                <dl className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-sm text-gray-600">Tool</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedFinding.tool}</dd>
                  </div>
                  {selectedFinding.ruleId && (
                    <div>
                      <dt className="text-sm text-gray-600">Rule ID</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedFinding.ruleId}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-600">Confidence</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedFinding.confidence}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Status</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedFinding.status}</dd>
                  </div>
                </dl>
              </div>

              {selectedFinding.filePath && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded font-mono">
                    {selectedFinding.filePath}
                    {selectedFinding.lineNumber && `:${selectedFinding.lineNumber}`}
                  </p>
                </div>
              )}

              {selectedFinding.evidence && Object.keys(selectedFinding.evidence).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Evidence</h3>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(selectedFinding.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}