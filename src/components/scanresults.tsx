'use client';

import { useEffect, useState } from 'react';
import FindingDetails from './FindingDetails'; // Import our new component

interface ScanResultsProps {
  scanId: string;
}

export default function ScanResults({ scanId }: ScanResultsProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null); // Track expanded row

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) throw new Error('Failed to fetch results');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchResults();
    // Poll every 3 seconds if running
    const interval = setInterval(() => {
      if (data?.status?.status === 'running' || data?.status?.status === 'pending') {
        fetchResults();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [scanId, data?.status?.status]);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // 1. Loading State
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-500">Initializing scan context...</p>
    </div>
  );

  // 2. Error State
  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <h3 className="font-bold">Error loading results</h3>
      <p>{error}</p>
    </div>
  );

  // 3. Scan In Progress
  if (data.status.status === 'running' || data.status.status === 'pending') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="mx-auto w-16 h-16 mb-6 relative">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Scan in Progress</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          DeplAI is analyzing your codebase. This usually takes 1-2 minutes depending on repository size.
        </p>
        <div className="mt-8 flex justify-center gap-2">
            {data.status.toolsRun?.map((tool: string) => (
                <span key={tool} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-mono">
                    {tool}
                </span>
            ))}
        </div>
      </div>
    );
  }

  // 4. Scan Completed (Findings Table)
  const findings = data.results?.findings || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-xs font-bold uppercase">Total Issues</span>
          <div className="text-3xl font-bold text-gray-900 mt-1">{data.status.findingsCount}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
          <span className="text-red-600 text-xs font-bold uppercase">Critical & High</span>
          <div className="text-3xl font-bold text-red-700 mt-1">
            {(data.status.severityBreakdown?.critical || 0) + (data.status.severityBreakdown?.high || 0)}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
          <span className="text-blue-600 text-xs font-bold uppercase">Tools Run</span>
          <div className="mt-2 flex flex-wrap gap-1">
             {data.status.toolsRun?.map((t: string) => (
               <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded uppercase font-medium">{t}</span>
             ))}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
          <span className="text-green-600 text-xs font-bold uppercase">Scan Status</span>
          <div className="text-lg font-bold text-green-700 mt-1 flex items-center gap-2">
            Completed
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900">Security Findings</h3>
          <span className="text-xs text-gray-500">{findings.length} results found</span>
        </div>

        {findings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">All Clear!</h3>
            <p className="text-gray-500 mt-1">No security issues were detected in this scan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium uppercase text-xs w-8"></th>
                  <th className="px-6 py-3 font-medium uppercase text-xs">Severity</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs">Vulnerability</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs">Tool</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs">Location</th>
                  <th className="px-6 py-3 font-medium uppercase text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {findings.map((f: any) => (
                  <>
                    <tr 
                      key={f.id} 
                      onClick={() => toggleRow(f.id)}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${expandedRow === f.id ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-6 py-4 text-gray-400">
                        <svg 
                          className={`w-4 h-4 transform transition-transform ${expandedRow === f.id ? 'rotate-90' : ''}`} 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${f.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            f.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            f.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{f.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{f.ruleId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 font-mono text-xs border border-gray-200 px-1.5 py-0.5 rounded bg-gray-50">
                          {f.tool}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {f.filePath}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          {expandedRow === f.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* EXPANDED ROW (The Magic Part) */}
                    {expandedRow === f.id && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="p-0">
                          <FindingDetails finding={f} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}