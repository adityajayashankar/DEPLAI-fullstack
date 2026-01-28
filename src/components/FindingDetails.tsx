'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface FindingDetailsProps {
  finding: any; 
}

export default function FindingDetails({ finding }: FindingDetailsProps) {
  // 1. Safe Parse Evidence
  let evidence = finding.evidence;
  if (typeof evidence === 'string') {
    try {
      evidence = JSON.parse(evidence);
    } catch {
      evidence = {};
    }
  }
  evidence = evidence || {};

  // 2. Intelligent Remediation Parsing
  let remediation = evidence.ai_remediation || evidence.remediation;
  let remediationContent = null;

  // Check if remediation is actually a JSON object (like in your screenshot)
  if (remediation) {
    try {
        // Double-decode if it's a stringified JSON string
        const parsedRemediation = typeof remediation === 'string' ? JSON.parse(remediation) : remediation;
        
        // If it matches your schema (explanation, rewrite, etc.)
        if (parsedRemediation.vulnerability_explanation || parsedRemediation.secure_code_rewrite) {
            remediationContent = (
                <div className="space-y-4">
                    {parsedRemediation.vulnerability_explanation && (
                        <div>
                            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Analysis</h4>
                            <p className="text-gray-700">{parsedRemediation.vulnerability_explanation}</p>
                        </div>
                    )}
                    {parsedRemediation.secure_code_rewrite && (
                        <div>
                            <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Suggested Fix</h4>
                            <div className="bg-[#0d1117] rounded-md p-3 overflow-x-auto border border-gray-800">
                                <pre className="text-sm text-gray-300 font-mono">
                                    <code>{parsedRemediation.secure_code_rewrite}</code>
                                </pre>
                            </div>
                        </div>
                    )}
                    {parsedRemediation.generic_pattern_fix && (
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
                            <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">General Pattern</h4>
                            <p className="text-sm text-yellow-800">{parsedRemediation.generic_pattern_fix}</p>
                        </div>
                    )}
                </div>
            );
        } else {
            // Fallback: It's just markdown text
            remediationContent = <ReactMarkdown>{String(remediation)}</ReactMarkdown>;
        }
    } catch (e) {
        // Fallback if parsing fails
        remediationContent = <ReactMarkdown>{String(remediation)}</ReactMarkdown>;
    }
  }

  // 3. Extract & Clean Metadata
  const triage = evidence.triage || {};
  const codeSnippet = evidence.code || evidence.code_snippet;
  
  // Specific fields for SCA (Software Composition Analysis)
  const scaData = {
      package: evidence.package,
      version: evidence.version,
      fixedIn: evidence.fix_versions,
      link: evidence.links || evidence.link,
      type: evidence.type || evidence.ecosystem,
  };

  // Remove known keys to find "leftover" evidence
  const { 
      ai_remediation, remediation: _, code, code_snippet, triage: __, 
      package: ___, version, fix_versions, links, link, type, ecosystem,
      ...genericEvidence 
  } = evidence;

  return (
    <div className="p-6 bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Remediation & Code (Takes 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* AI Remediation Card */}
            {remediationContent && (
                <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-white px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h3 className="text-blue-900 font-semibold text-sm">AI Remediation Plan</h3>
                    </div>
                    <div className="p-5 text-sm prose prose-sm max-w-none prose-blue">
                        {remediationContent}
                    </div>
                </div>
            )}

            {/* Vulnerable Code Block */}
            {codeSnippet && (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Vulnerable Code</span>
                        <span className="text-xs font-mono text-gray-400">
                            {finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ''}
                        </span>
                    </div>
                    <div className="bg-[#0d1117] p-4 overflow-x-auto">
                        <pre className="font-mono text-sm text-gray-300 leading-relaxed">
                            <code>{codeSnippet}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: Metadata & Context (Takes 1/3 width) */}
        <div className="space-y-4">
            
            {/* Triage / Owner Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                    Triage
                </h4>
                
                <div className="space-y-4">
                    <div>
                        <span className="block text-xs text-gray-500 mb-1">Suggested Owner</span>
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
                                {triage.suggested_team ? triage.suggested_team.charAt(0) : '?'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                                {triage.suggested_team || 'Unassigned'}
                            </span>
                        </div>
                    </div>

                    {triage.priority_boost && triage.priority_boost !== 'NONE' && (
                        <div>
                            <span className="block text-xs text-gray-500 mb-1">Priority Signal</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                triage.priority_boost === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {triage.priority_boost} BOOST
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* SCA / Package Details Card (If available) */}
            {(scaData.package || scaData.version) && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Vulnerability Context
                    </h4>
                    <dl className="space-y-3 text-sm">
                        {scaData.package && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Package</dt>
                                <dd className="font-mono font-medium text-gray-900">{scaData.package}</dd>
                            </div>
                        )}
                        {scaData.version && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Version</dt>
                                <dd className="font-mono text-red-600">{scaData.version}</dd>
                            </div>
                        )}
                        {scaData.fixedIn && scaData.fixedIn.length > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Fixed In</dt>
                                <dd className="font-mono text-green-600">
                                    {Array.isArray(scaData.fixedIn) ? scaData.fixedIn.join(', ') : scaData.fixedIn}
                                </dd>
                            </div>
                        )}
                        {scaData.link && (
                            <div className="pt-2">
                                <a 
                                    href={scaData.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    View CVE Reference
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            </div>
                        )}
                    </dl>
                </div>
            )}

            {/* Other Generic Evidence (Only if exists) */}
            {Object.keys(genericEvidence).length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Additional Evidence
                    </h4>
                    <dl className="space-y-2 text-sm">
                        {Object.entries(genericEvidence).map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                                <dt className="text-xs text-gray-500 capitalize mb-0.5">{key.replace(/_/g, ' ')}</dt>
                                <dd className="font-mono text-xs text-gray-800 break-all bg-gray-50 p-1.5 rounded">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}