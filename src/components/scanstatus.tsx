/**
 * FIXED: Auto-Refreshing Scan Status Component
 * src/components/ScanStatus.tsx
 * 
 * This component automatically polls for scan updates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScanStatusProps {
  scanId: string;
  onComplete?: () => void;
}

export default function ScanStatus({ scanId, onComplete }: ScanStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        const data = await res.json();

        setStatus(data.status);
        setLoading(false);

        // If scan is complete, stop polling
        if (data.status?.status === 'completed' || data.status?.status === 'failed') {
          clearInterval(intervalId);
          if (onComplete) onComplete();
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        clearInterval(intervalId);
      }
    }

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds while scan is running
    intervalId = setInterval(fetchStatus, 3000);

    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scanId, onComplete]);

  if (loading && !status) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Initializing scan...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-900 font-medium">Error: {error}</span>
        </div>
      </div>
    );
  }

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`border rounded-lg p-6 ${
        isRunning ? 'bg-blue-50 border-blue-200' :
        isCompleted ? 'bg-green-50 border-green-200' :
        isFailed ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {isRunning && (
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            )}
            {isCompleted && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {isFailed && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            
            <div>
              <h3 className={`text-lg font-semibold ${
                isRunning ? 'text-blue-900' :
                isCompleted ? 'text-green-900' :
                isFailed ? 'text-red-900' :
                'text-gray-900'
              }`}>
                {isRunning && 'Scan in Progress'}
                {isCompleted && 'Scan Complete'}
                {isFailed && 'Scan Failed'}
                {!isRunning && !isCompleted && !isFailed && 'Scan Status'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Scan ID: {scanId.slice(0, 8)}...
              </p>
            </div>
          </div>

          {isCompleted && (
            <button
              onClick={() => router.push(`/dashboard/scans/${scanId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              View Results
            </button>
          )}
        </div>

        {/* Progress Info */}
        {status && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600">Status</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">{status.status}</dd>
              </div>
              
              {status.toolsRun && status.toolsRun.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-600">Tools Run</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {status.toolsRun.join(', ')}
                  </dd>
                </div>
              )}
              
              {status.findingsCount !== undefined && (
                <div>
                  <dt className="text-sm text-gray-600">Findings</dt>
                  <dd className="text-sm font-medium text-gray-900">{status.findingsCount}</dd>
                </div>
              )}
              
              {status.startedAt && (
                <div>
                  <dt className="text-sm text-gray-600">Started</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(status.startedAt).toLocaleTimeString()}
                  </dd>
                </div>
              )}
            </dl>

            {/* Severity Breakdown */}
            {status.severityBreakdown && Object.keys(status.severityBreakdown).length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Severity Breakdown</p>
                <div className="flex gap-2">
                  {status.severityBreakdown.critical > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                      Critical: {status.severityBreakdown.critical}
                    </span>
                  )}
                  {status.severityBreakdown.high > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                      High: {status.severityBreakdown.high}
                    </span>
                  )}
                  {status.severityBreakdown.medium > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      Medium: {status.severityBreakdown.medium}
                    </span>
                  )}
                  {status.severityBreakdown.low > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Low: {status.severityBreakdown.low}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-refresh indicator */}
        {isRunning && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>Auto-refreshing every 3 seconds...</span>
          </div>
        )}
      </div>
    </div>
  );
}