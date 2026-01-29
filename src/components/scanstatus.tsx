/**
 * FIXED: Auto-Refreshing Scan Status Component - Dark Theme
 * src/components/ScanStatus.tsx
 */

'use client';

import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation'; // Uncomment for production Next.js app
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Shield,
  ArrowRight
} from 'lucide-react';

// Mock useRouter for preview environment compatibility
const useRouter = () => ({
  push: (path: string) => console.log(`[Preview] Navigating to ${path}`)
});

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
        // Mock API call behavior for preview if API is not available
        // In real app, remove this mock block and use actual fetch
        /* const res = await fetch(`/api/scans/${scanId}`);
        const data = await res.json();
        */
       
        // Mock data for demonstration purposes in preview
        // DELETE this mock data block in production
        const mockData = {
            status: {
                status: 'running', // Toggle this to 'completed' to see completion state
                toolsRun: ['Trivy', 'Grype', 'Semgrep'],
                findingsCount: 12,
                startedAt: new Date().toISOString(),
                severityBreakdown: { critical: 2, high: 3, medium: 5, low: 2 }
            }
        };
        const data = mockData; 
        // End mock block

        setStatus(data.status);
        setLoading(false);

        // If scan is complete, stop polling
        if (data.status?.status === 'completed' || data.status?.status === 'failed') {
          clearInterval(intervalId);
          if (onComplete) onComplete();
        }
      } catch (err: any) {
        // Fallback for preview if fetch fails
        console.warn("Fetch failed, using mock data for preview");
        setStatus({ status: 'running', startedAt: new Date().toISOString() }); 
        setLoading(false);
        // setError(err.message); // Uncomment in production
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
      <div className="bg-[#151E32] border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-4">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-slate-400 font-mono text-sm animate-pulse">
            Initializing scan protocols...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <span className="text-red-400 font-medium">Error: {error}</span>
        </div>
      </div>
    );
  }

  const isRunning = status?.status === 'running';
  const isCompleted = status?.status === 'completed';
  const isFailed = status?.status === 'failed';

  return (
    <div className="space-y-4 font-sans">
      {/* Status Card */}
      <div className={`border rounded-xl p-6 transition-all duration-300 shadow-lg ${
        isRunning ? 'bg-blue-500/5 border-blue-500/20 shadow-blue-900/10' :
        isCompleted ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-900/10' :
        isFailed ? 'bg-red-500/5 border-red-500/20 shadow-red-900/10' :
        'bg-[#151E32] border-slate-800'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${
                isRunning ? 'bg-blue-500/10' :
                isCompleted ? 'bg-emerald-500/10' :
                isFailed ? 'bg-red-500/10' : 'bg-slate-800'
            }`}>
                {isRunning && <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />}
                {isCompleted && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                {isFailed && <XCircle className="w-8 h-8 text-red-400" />}
                {!isRunning && !isCompleted && !isFailed && <Shield className="w-8 h-8 text-slate-400" />}
            </div>
            
            <div>
              <h3 className={`text-lg font-bold tracking-tight ${
                isRunning ? 'text-blue-400' :
                isCompleted ? 'text-emerald-400' :
                isFailed ? 'text-red-400' :
                'text-white'
              }`}>
                {isRunning && 'Scan in Progress'}
                {isCompleted && 'Scan Complete'}
                {isFailed && 'Scan Failed'}
                {!isRunning && !isCompleted && !isFailed && 'Scan Status'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 font-mono">
                Scan ID: <span className="text-slate-400">{scanId.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          {isCompleted && (
            <button
              onClick={() => router.push(`/dashboard/scans/${scanId}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-lg shadow-emerald-900/20 font-medium text-sm flex items-center gap-2"
            >
              View Results
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Info */}
        {status && (
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <dl className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</dt>
                <dd className={`text-sm font-bold mt-1 capitalize ${
                    isRunning ? 'text-blue-300' : 
                    isCompleted ? 'text-emerald-300' : 
                    isFailed ? 'text-red-300' : 'text-slate-300'
                }`}>
                    {status.status}
                </dd>
              </div>
              
              {status.toolsRun && status.toolsRun.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tools Active</dt>
                  <dd className="text-sm font-medium text-slate-300 mt-1">
                    <div className="flex flex-wrap gap-1">
                        {status.toolsRun.map((tool: string) => (
                            <span key={tool} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                {tool}
                            </span>
                        ))}
                    </div>
                  </dd>
                </div>
              )}
              
              {status.findingsCount !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Findings</dt>
                  <dd className="text-sm font-bold text-white mt-1">{status.findingsCount}</dd>
                </div>
              )}
              
              {status.startedAt && (
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Started At</dt>
                  <dd className="text-sm font-medium text-slate-300 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(status.startedAt).toLocaleTimeString()}
                  </dd>
                </div>
              )}
            </dl>

            {/* Severity Breakdown */}
            {status.severityBreakdown && Object.keys(status.severityBreakdown).length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Severity Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {status.severityBreakdown.critical > 0 && (
                    <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                      CRITICAL: {status.severityBreakdown.critical}
                    </span>
                  )}
                  {status.severityBreakdown.high > 0 && (
                    <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs font-bold">
                      HIGH: {status.severityBreakdown.high}
                    </span>
                  )}
                  {status.severityBreakdown.medium > 0 && (
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-bold">
                      MEDIUM: {status.severityBreakdown.medium}
                    </span>
                  )}
                  {status.severityBreakdown.low > 0 && (
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-bold">
                      LOW: {status.severityBreakdown.low}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-refresh indicator */}
        {isRunning && (
          <div className="mt-4 pt-3 border-t border-blue-500/10 flex items-center justify-center space-x-2 text-xs text-blue-400/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-mono">Live updates active</span>
          </div>
        )}
      </div>
    </div>
  );
}