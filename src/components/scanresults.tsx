'use client';

import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Terminal, 
  ChevronRight, 
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Filter,
  Download,
  FileText, 
  Copy, 
  Check, 
  Search, 
  Gauge, 
  AlertOctagon, 
  Package,
  ArrowRight,
  ExternalLink,
  Sparkles,
  List,
  Code2,
  Braces,
  HelpCircle,
  Bug,
  Lock,
  ChevronUp
} from 'lucide-react';

// --- HELPERS ---
function cleanCode(code: string) {
  if (!code) return '';
  return code.replace(/^```(python|javascript|typescript|go|java|bash)?\n/, '').replace(/```$/, '').trim();
}

function parseRemediation(input: any) {
  if (!input) return null;
  
  // If it's already an object, return it
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }
  
  // Clean markdown code blocks if present
  let cleanInput = input.toString().replace(/```json/g, '').replace(/```/g, '').trim();
  
  try { 
    return JSON.parse(cleanInput);
  } catch (e) {
    // If parsing fails, treat the whole string as the explanation
    return { vulnerability_explanation: cleanInput, is_raw_text: true };
  }
}

// Simple replacement for ReactMarkdown
// Returns a <div> containing <p> tags. 
// CRITICAL: Do NOT wrap this component in a <p> tag in the parent.
const SimpleMarkdown = ({ children }: { children: string }) => {
  if (!children) return null;
  // Ensure input is a string
  const text = typeof children === 'string' ? children : JSON.stringify(children, null, 2);
  
  return (
    <div className="whitespace-pre-wrap font-sans text-sm leading-6">
      {text.split('\n').map((line, i) => (
        <p key={i} className="mb-2 min-h-[1rem]">
          {line || <br/>}
        </p>
      ))}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const RemediationView = ({ remediationPlan }: { remediationPlan?: any }) => {
  const [copied, setCopied] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  // Debug: Log what we're receiving
  console.log('[RemediationView] Received remediationPlan:', remediationPlan);
  console.log('[RemediationView] Type:', typeof remediationPlan);
  console.log('[RemediationView] Keys:', remediationPlan ? Object.keys(remediationPlan) : 'null');

  // Try multiple possible field names for each section
  const explanation = remediationPlan?.vulnerability_explanation || 
                     remediationPlan?.explanation || 
                     remediationPlan?.description ||
                     remediationPlan?.analysis;
  
  const codeFix = remediationPlan?.secure_code_rewrite || 
                 remediationPlan?.fix || 
                 remediationPlan?.code ||
                 remediationPlan?.patch ||
                 remediationPlan?.solution;
  
  const strategy = remediationPlan?.generic_pattern_fix || 
                  remediationPlan?.strategy || 
                  remediationPlan?.recommendation ||
                  remediationPlan?.mitigation ||
                  remediationPlan?.defense;

  const handleCopy = () => {
    if (codeFix) {
      try {
        navigator.clipboard.writeText(cleanCode(codeFix));
        setCopied(true);
      } catch (err) {
        console.warn("Clipboard access denied in preview");
        setCopied(true);
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show empty state only if there's truly no data at all
  if (!remediationPlan) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center text-center bg-slate-900/30 border border-dashed border-slate-700 rounded-xl">
        <div className="p-3 bg-slate-800 rounded-full shadow-sm border border-slate-700 mb-3">
          <Sparkles className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm font-medium">No automated remediation plan available.</p>
      </div>
    );
  }

  // If we have a remediationPlan but no recognized fields, show debug view
  const hasRecognizedData = explanation || codeFix || strategy;
  
  if (!hasRecognizedData) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-amber-400 font-semibold">Debug: Unrecognized Data Structure</h3>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Remediation data exists but doesn't match expected field names. 
            <button 
              onClick={() => setShowRawData(!showRawData)}
              className="text-blue-400 hover:text-blue-300 ml-2 underline"
            >
              {showRawData ? 'Hide' : 'Show'} raw data
            </button>
          </p>
          
          {showRawData && (
            <div className="bg-slate-950 rounded border border-slate-700 p-4 mt-3">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(remediationPlan, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Try to render whatever text we can find */}
        {typeof remediationPlan === 'string' && (
          <div className="bg-[#151E32] rounded-xl border border-slate-700 shadow-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Raw Remediation Text</h3>
            </div>
            <div className="p-5 text-slate-300 leading-relaxed text-sm">
              <SimpleMarkdown>{remediationPlan}</SimpleMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Analysis */}
      {explanation && (
        <div className="bg-[#151E32] rounded-xl border border-blue-500/20 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-500/20 bg-blue-500/5 flex items-center gap-2.5">
            <div className="p-1 rounded-md bg-blue-500/20 text-blue-400">
                <Sparkles size={14} fill="currentColor" />
            </div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">AI Analysis</h3>
          </div>
          <div className="p-5 text-slate-300 leading-relaxed text-sm">
            <SimpleMarkdown>{explanation}</SimpleMarkdown>
          </div>
        </div>
      )}

      {/* Suggested Patch */}
      {codeFix && (
        <div className="bg-[#151E32] rounded-xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-md bg-slate-700 text-slate-300">
                  <Terminal size={14} />
              </div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Suggested Patch</h3>
            </div>
            <button 
              onClick={handleCopy}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-md transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <div className="bg-[#0D1117] p-5 overflow-x-auto">
            <pre className="font-mono text-sm leading-relaxed text-emerald-400">
              <code>{cleanCode(codeFix)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Defense Strategy */}
      {strategy && (
        <div className="bg-[#151E32] rounded-xl border border-orange-500/20 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-500/20 bg-orange-500/5 flex items-center gap-2.5">
            <div className="p-1 rounded-md bg-orange-500/20 text-orange-400">
                <ShieldCheck size={14} />
            </div>
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Defense Strategy</h3>
          </div>
          <div className="p-5 text-slate-300 leading-relaxed text-sm">
            <SimpleMarkdown>{strategy}</SimpleMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

const ImpactView = ({ data }: { data: any }) => {
  const isPatched = !!data.fixedIn;
  const hasMetadata = !!data.package;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data.package) {
      navigator.clipboard.writeText(data.package);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!hasMetadata) {
    return (
      <div className="w-full p-8">
        <div className="border border-dashed border-slate-700 rounded-xl bg-slate-900/30 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full shadow-sm border border-slate-700 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-slate-300 font-semibold text-lg">No Package Metadata</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            No specific package details found for this vulnerability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans antialiased">
      <div className="bg-[#151E32] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#0B1120] border border-slate-700 shadow-sm flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white leading-none tracking-tight">
                  {data.package}
                </h3>
                <button onClick={handleCopy} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wide">
                  {data.type || 'PACKAGE'}
                </span>
              </div>
            </div>
          </div>

          {data.link && (
            <a href={data.link} target="_blank" rel="noreferrer" className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-lg transition-all">
              View CVE
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100" />
            </a>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-800 rounded-full border border-slate-600 z-10 items-center justify-center text-slate-400">
              <ArrowRight size={16} />
            </div>

            {/* Vulnerable Column */}
            <div className="relative border border-red-900/40 bg-red-500/5 rounded-xl p-5 h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Affected
                </span>
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Current Version</p>
              <p className="font-mono text-2xl font-bold text-white">
                {data.version || 'Unknown'}
              </p>
            </div>

            {/* Fixed Column */}
            <div className={`relative border rounded-xl p-5 h-full ${isPatched ? 'border-emerald-900/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isPatched ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${isPatched ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  {isPatched ? 'Patched' : 'Unpatched'}
                </span>
                {isPatched ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4" />}
              </div>
              <p className="text-sm text-slate-500 font-medium">Fixed In</p>
              {isPatched ? (
                <div className="flex flex-wrap gap-2">
                   {Array.isArray(data.fixedIn) ? (
                    data.fixedIn.map((v: string, i: number) => (
                      <span key={i} className="font-mono text-xl font-bold text-white bg-slate-900 px-2 rounded border border-emerald-900 inline-block">
                        {v}
                      </span>
                    ))
                   ) : (
                    <p className="font-mono text-2xl font-bold text-white">{data.fixedIn}</p>
                   )}
                </div>
              ) : (
                <p className="text-slate-500 italic font-medium">No fix available yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TriageView = ({ finding }: { finding: any }) => {
  const [copied, setCopied] = useState(false);
  const confidence = finding.confidence || finding.evidence?.confidence || finding.metadata?.confidence || 'Unknown';

  const handleCopy = () => {
    if (finding.ruleId) {
      navigator.clipboard.writeText(finding.ruleId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSeverityStyles = (severity: string | undefined) => {
    const level = severity?.toUpperCase() || 'UNKNOWN';
    switch (level) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="w-full font-sans antialiased">
      <div className="bg-[#151E32] rounded-2xl shadow-sm border border-slate-700 overflow-hidden animate-in fade-in duration-300">
        <div className="px-6 py-5 border-b border-slate-700 bg-slate-800/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Triage Information</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Vulnerability Metadata</p>
          </div>
        </div>

        <div className="divide-y divide-slate-700/50">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Search size={16} />
              <span className="text-sm font-semibold uppercase tracking-wide">Rule ID</span>
            </div>
            <div className="font-mono text-lg font-bold text-slate-200 bg-slate-900 px-3 py-1 rounded border border-slate-700 flex items-center gap-2">
              {finding.ruleId || 'N/A'}
              <button onClick={handleCopy} className="text-slate-500 hover:text-white transition-colors ml-2 border-l border-slate-700 pl-2">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Gauge size={16} />
              <span className="text-sm font-semibold uppercase tracking-wide">Tool Engine</span>
            </div>
            <span className="text-base font-medium text-white capitalize">{finding.tool || 'Unknown'}</span>
          </div>

          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400">
              <HelpCircle size={16} />
              <span className="text-sm font-semibold uppercase tracking-wide">Confidence</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              confidence.toLowerCase() === 'high' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              confidence.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {confidence}
            </span>
          </div>

          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400">
              <AlertOctagon size={16} />
              <span className="text-sm font-semibold uppercase tracking-wide">Severity</span>
            </div>
            <span className={`inline-flex items-center px-4 py-1.5 rounded-md text-sm font-bold border ${getSeverityStyles(finding.severity)}`}>
              {finding.severity || 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const EvidenceView = ({ codeSnippet, evidence, finding }: { codeSnippet: string, evidence: any, finding: any }) => {
  const [jsonOpen, setJsonOpen] = useState(false);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {codeSnippet ? (
          <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-800/50 px-5 py-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-blue-400" />
                  <span className="text-slate-300 font-mono text-xs">{finding.filePath}:{finding.lineNumber}</span>
                </div>
            </div>
            <div className="bg-[#0D1117] p-5 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed text-emerald-400">
                  <code>{codeSnippet}</code>
                </pre>
            </div>
          </div>
      ) : (
          <div className="py-8 bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-center">
            <span className="text-slate-600 mb-2"><Terminal size={20} /></span>
            <p className="text-slate-500 text-xs font-medium">No source code snippet available.</p>
          </div>
      )}

      <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm bg-[#151E32]">
          <button 
            onClick={() => setJsonOpen(!jsonOpen)} 
            className="w-full bg-slate-800/50 px-5 py-3 border-b border-slate-700 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
          >
              <div className="flex items-center gap-2">
                  <Braces size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Raw Evidence</span>
              </div>
              {jsonOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {jsonOpen && (
            <div className="bg-[#0D1117] p-5 overflow-x-auto">
              <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap">
                  {JSON.stringify(evidence, null, 2)}
              </pre>
            </div>
          )}
      </div>
    </div>
  );
};

// --- MAIN FINDING DETAILS COMPONENT ---

const FindingDetails = ({ finding }: { finding: any }) => {
  const [activeTab, setActiveTab] = useState<'remediation' | 'impact' | 'triage' | 'evidence'>('remediation');

  // Parse Data
  let evidence = finding.evidence || {};
  if (typeof evidence === 'string') { 
    try { 
      evidence = JSON.parse(evidence);
    } catch (e) {
      console.error('[FindingDetails] Failed to parse evidence:', e);
    }
  }

  // Handle AI Remediation parsing
  const remediationPlan = parseRemediation(evidence.ai_remediation || evidence.remediation);
  
  const codeSnippet = evidence.code || evidence.code_snippet;
  
  const scaData = {
    package: evidence.package,
    version: evidence.version,
    fixedIn: evidence.fix_versions,
    link: evidence.links || evidence.link,
    type: evidence.type || evidence.ecosystem,
    severity: finding.severity
  };

  return (
    <div className="bg-[#0B1120] border-t border-slate-800">
      {/* Navigation Header */}
      <div className="flex border-b border-slate-800 bg-[#151E32] px-6 overflow-x-auto">
        {[
          { id: 'remediation', icon: Sparkles, label: 'Remediation' },
          { id: 'impact', icon: Package, label: 'Package & Impact' },
          { id: 'triage', icon: List, label: 'Triage Info' },
          { id: 'evidence', icon: FileText, label: 'Evidence Pack' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'remediation' && <RemediationView remediationPlan={remediationPlan} />}
        {activeTab === 'impact' && <ImpactView data={scaData} />}
        {activeTab === 'triage' && <TriageView finding={finding}/>}
        {activeTab === 'evidence' && <EvidenceView codeSnippet={codeSnippet} evidence={evidence} finding={finding} />}
      </div>
    </div>
  );
}

interface ScanResultsProps {
  scanId: string;
}

export default function ScanResults({ scanId }: ScanResultsProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) throw new Error('Failed to fetch scan results');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchResults();
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

  const getSeverityBadge = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === 'CRITICAL') return 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
    if (s === 'HIGH') return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    if (s === 'MEDIUM') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-slate-800 text-slate-400 border border-slate-700';
  };

  const handleExportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(40, 48, 68);
    doc.text("Security Assessment Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Scan ID: ${scanId}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Executive Summary", 14, 50);
    const critical = data.status.severityBreakdown?.critical || 0;
    const high = data.status.severityBreakdown?.high || 0;
    const medium = data.status.severityBreakdown?.medium || 0;
    const total = data.status.findingsCount || 0;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text([
      `Total Findings: ${total}`,
      `Critical Issues: ${critical}`,
      `High Severity: ${high}`,
      `Medium Severity: ${medium}`
    ], 14, 60);
    const tableColumn = ["Severity", "Vulnerability", "Engine", "Location"];
    const tableRows: any[] = [];
    data.results?.findings?.forEach((finding: any) => {
      const findingData = [
        finding.severity.toUpperCase(),
        finding.title,
        finding.tool,
        finding.filePath || 'N/A'
      ];
      tableRows.push(findingData);
    });
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'grid',
      headStyles: { 
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 0) {
          const severity = data.cell.raw;
          if (severity === 'CRITICAL') data.cell.styles.textColor = [220, 38, 38];
          if (severity === 'HIGH') data.cell.styles.textColor = [234, 88, 12];
        }
      }
    });
    doc.save(`deplai-scan-report-${scanId}.pdf`);
  };

  if (!data && !error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-950 rounded-xl border border-slate-800">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-t-2 border-purple-500 rounded-full animate-spin-slow"></div>
      </div>
      <p className="mt-6 text-slate-400 font-mono text-sm animate-pulse">INITIALIZING SCAN PROTOCOLS...</p>
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-950/20 border border-red-900/50 rounded-xl text-red-400 flex items-center gap-3">
      <AlertTriangle />
      <div>
        <h3 className="font-bold text-red-300">System Error</h3>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    </div>
  );

  if (data?.status?.status === 'running' || data?.status?.status === 'pending') {
    return (
      <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 p-12 text-center max-w-2xl mx-auto mt-10">
        <div className="mx-auto w-24 h-24 mb-8 relative flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-t-blue-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <Activity className="w-10 h-10 text-slate-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Deep Scan In Progress</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 font-light">
          DeplAI is currently traversing your dependency tree and analyzing static code paths.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
           {data.status?.toolsRun ? data.status.toolsRun.map((tool: string, i: number) => (
             <div key={tool} className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
               <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
               <span className="text-slate-300 text-xs font-mono uppercase tracking-wider">{tool}</span>
             </div>
           )) : (
             <span className="text-slate-500 text-xs">Initializing engines...</span>
           )}
        </div>
      </div>
    );
  }

  const findings = data.results?.findings || [];
  const criticalCount = (data.status.severityBreakdown?.critical || 0);
  const highCount = (data.status.severityBreakdown?.high || 0);
  const totalCriticalHigh = criticalCount + highCount;

  return (
    <div className="space-y-6 font-sans text-slate-200">
      <div className="flex justify-end gap-3">
         <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium">
            <Filter size={16} /> Filter
         </button>
         <button 
           onClick={handleExportPDF}
           className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-900/20"
         >
            <Download size={16} /> Export PDF
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151E32] p-5 rounded-xl border border-slate-800/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={60} />
          </div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Findings</span>
          <div className="text-4xl font-bold text-white mt-2">{data.status.findingsCount}</div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-1">
              <span className="text-emerald-400">100%</span> codebase coverage
          </div>
        </div>

        <div className="bg-[#151E32] p-5 rounded-xl border border-red-900/30 shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 p-4 text-red-500 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldAlert size={60} />
            </div>
            <span className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                Critical & High
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
            </span>
            <div className="text-4xl font-bold text-white mt-2">{totalCriticalHigh}</div>
            <div className="mt-4 text-xs text-red-400/80 font-medium">
                Requires immediate attention
            </div>
        </div>

        <div className="bg-[#151E32] p-5 rounded-xl border border-slate-800/60 shadow-lg">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Active Engines</span>
          <div className="mt-3 flex flex-wrap gap-2">
             {data.status.toolsRun?.map((t: string) => (
               <span key={t} className="px-2.5 py-1 bg-slate-900 text-slate-300 text-xs rounded border border-slate-700 uppercase font-mono tracking-wide">
                 {t}
               </span>
             ))}
          </div>
        </div>

        <div className="bg-[#151E32] p-5 rounded-xl border border-emerald-900/20 shadow-lg">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">System Status</span>
          <div className="text-lg font-bold text-emerald-400 mt-2 flex items-center gap-2">
            <CheckCircle2 size={24} />
            Scan Completed
          </div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
            <Clock size={12} /> Duration: 1m 42s
          </div>
        </div>
      </div>

      <div className="bg-[#151E32] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
             <h3 className="font-semibold text-white">Vulnerabilities</h3>
             <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                {findings.length}
             </span>
          </div>
        </div>

        {findings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-900/50">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-medium text-white">System Secure</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">No security vulnerabilities were detected across the analyzed codebase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider w-10"></th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Severity</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Vulnerability</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Engine</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Location</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {findings.map((f: any) => (
                  <React.Fragment key={f.id}>
                    <tr 
                      onClick={() => toggleRow(f.id)}
                      className={`
                        cursor-pointer transition-all duration-200 group
                        ${expandedRow === f.id ? 'bg-slate-800/60' : 'hover:bg-slate-800/40 bg-[#151E32]'}
                      `}
                    >
                      <td className="px-6 py-4 text-slate-500">
                          {expandedRow === f.id ? <ChevronDown size={16} className="text-blue-400" /> : <ChevronRight size={16} className="group-hover:text-slate-300" />}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${getSeverityBadge(f.severity)}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{f.title}</div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">{f.ruleId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                          {f.tool === 'SCA' ? <Package size={12}/> : f.tool === 'SAST' ? <Bug size={12}/> : <Lock size={12} />}
                          {f.tool}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {f.filePath}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-blue-400 group-hover:text-blue-300 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </span>
                      </td>
                    </tr>
                    
                    {expandedRow === f.id && (
                      <tr className="bg-slate-900/50">
                        <td colSpan={6} className="p-0 border-b border-slate-800 relative">
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                           <FindingDetails finding={f} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}