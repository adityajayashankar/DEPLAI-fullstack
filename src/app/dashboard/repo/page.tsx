'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Types ---
interface FileItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number | null;
}

// --- Icons Components ---
const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const RefreshIcon = ({ className, spin }: { className?: string; spin?: boolean }) => (
  <svg className={`${className} ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const BackIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export default function RepositoryBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine project type
  const projectType = searchParams.get('type') || 'github';
  const isLocal = projectType === 'local';
  
  // GitHub params
  const owner = searchParams.get('owner') || '';
  const repo = searchParams.get('repo') || '';
  
  // Local project params
  const projectId = searchParams.get('project_id') || '';
  
  const currentPath = searchParams.get('path') || '';

  // State
  const [authLoading, setAuthLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [contents, setContents] = useState<FileItem[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check authentication first
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (isLocal && projectId) {
        fetchProjectDetails();
        fetchContents();
      } else if (!isLocal && owner && repo) {
        setProjectName(repo);
        fetchContents();
      }
    }
  }, [owner, repo, projectId, currentPath, authLoading, isLocal]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      
      if (!session.isLoggedIn) {
        router.push('/');
        return;
      }
      
      setAuthLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    }
  }

  async function fetchProjectDetails() {
    if (!isLocal || !projectId) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectName(data.project.name);
      }
    } catch (err) {
      console.error('Failed to fetch project details:', err);
    }
  }

  async function fetchContents() {
    setLoading(true);
    setError(null);
    setFileContent(null);
    setSelectedFile(null);

    try {
      let url: string;
      
      if (isLocal) {
        url = `/api/projects/contents?project_id=${projectId}&path=${currentPath}`;
      } else {
        url = `/api/repositories/contents?owner=${owner}&repo=${repo}&path=${currentPath}`;
      }

      const res = await fetch(url);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch contents');
      }

      const data = await res.json();
      setContents(data.contents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileClick(item: FileItem) {
    if (item.type === 'file') {
      setSelectedFile(item.path);
      setLoading(true);

      try {
        let url: string;
        
        if (isLocal) {
          url = `/api/projects/file?project_id=${projectId}&path=${item.path}`;
        } else {
          url = `/api/repositories/file?owner=${owner}&repo=${repo}&path=${item.path}`;
        }

        const res = await fetch(url);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch file');
        }

        const data = await res.json();
        setFileContent(data.content);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleRefresh() {
    if (isLocal) {
      await fetchContents();
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch('/api/repositories/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      });

      if (!res.ok) {
        throw new Error('Failed to refresh');
      }

      await fetchContents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  function buildNavigationUrl(path: string) {
    if (isLocal) {
      return `/dashboard/repo?project_id=${projectId}&type=local${path ? `&path=${path}` : ''}`;
    } else {
      return `/dashboard/repo?owner=${owner}&repo=${repo}&type=github${path ? `&path=${path}` : ''}`;
    }
  }

  function handleDirectoryClick(itemPath: string) {
    window.location.href = buildNavigationUrl(itemPath);
  }

  function handleBackClick() {
    if (!currentPath) return;
    const parentPath = currentPath.includes('/')
      ? currentPath.split('/').slice(0, -1).join('/')
      : '';
    window.location.href = buildNavigationUrl(parentPath);
  }

  function handleBreadcrumbClick(path: string) {
    window.location.href = buildNavigationUrl(path);
  }

  function handleCopy() {
    if (fileContent) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = fileContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
      } catch (err) {
        navigator.clipboard.writeText(fileContent).then(() => {
          setCopied(true);
        });
      }
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getLanguageFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql',
      'sh': 'bash',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'text',
      'dockerfile': 'dockerfile',
    };
    return languageMap[extension || ''] || 'text';
  }

  const pathParts = currentPath ? currentPath.split('/') : [];
  const breadcrumbs = [
    { name: projectName || 'root', path: '' },
    ...pathParts.map((part, index) => ({
      name: part,
      path: pathParts.slice(0, index + 1).join('/'),
    })),
  ];

  // --- Loading State ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400 font-mono text-sm">Initializing environment...</p>
        </div>
      </div>
    );
  }

  // --- No Project State ---
  if ((!isLocal && (!owner || !repo)) || (isLocal && !projectId)) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FolderIcon className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Repository Selected</h2>
          <p className="text-gray-500 mb-8">Please return to the dashboard and select a repository to browse its contents.</p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0F1117]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              disabled={!currentPath}
              className={`p-2 -ml-2 rounded-lg transition ${!currentPath ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Back"
            >
              <BackIcon className="w-5 h-5" />
            </button>
            
            <div className="h-6 w-px bg-slate-800 mx-2 hidden sm:block"></div>

            <nav className="hidden sm:flex items-center text-sm overflow-hidden whitespace-nowrap mask-linear-fade">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRightIcon className="w-4 h-4 text-slate-600 mx-1 flex-shrink-0" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-white flex items-center">
                      {index === 0 && <span className="text-blue-500 mr-2">/</span>}
                      {crumb.name}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.path)}
                      className="text-slate-400 hover:text-blue-400 hover:underline decoration-blue-500/50 underline-offset-4 transition-colors flex items-center"
                    >
                      {index === 0 && <span className="text-slate-600 mr-2">/</span>}
                      {crumb.name}
                    </button>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {!isLocal && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded-md transition disabled:opacity-50"
              >
                <RefreshIcon className="w-3.5 h-3.5" spin={refreshing} />
                <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}
            
            <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
              {isLocal ? 'LOC' : 'GIT'}
            </div>

            <Link
              href="/dashboard"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Back to Dashboard"
            >
              <HomeIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className={`grid gap-6 ${fileContent ? 'lg:grid-cols-12' : 'lg:grid-cols-1'}`}>
          
          {/* File Explorer Panel */}
          <div className={`flex flex-col h-[calc(100vh-8rem)] ${fileContent ? 'lg:col-span-3 lg:h-[calc(100vh-8rem)]' : 'lg:col-span-12'}`}>
            <div className="bg-[#161b22] rounded-xl border border-slate-800 shadow-xl shadow-black/20 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-800/50 bg-[#161b22]">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Explorer</h2>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-2">
                {loading && !fileContent ? (
                  <div className="flex flex-col items-center justify-center h-40 space-y-3">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-xs text-slate-500">Fetching file tree...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-red-400 mb-2">{error}</p>
                    <button onClick={() => fetchContents()} className="text-xs text-blue-400 hover:underline">Retry</button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {/* Parent Directory Link */}
                    {currentPath && (
                      <button
                        onClick={handleBackClick}
                        className="flex w-full items-center space-x-2 px-3 py-2 rounded-md hover:bg-slate-800/50 text-slate-400 hover:text-white transition group"
                      >
                        <BackIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-mono">..</span>
                      </button>
                    )}

                    {contents.length === 0 && (
                      <div className="text-center py-8 text-slate-600 text-sm italic">
                        Empty directory
                      </div>
                    )}

                    {contents.map((item) => (
                      <div
                        key={item.path}
                        onClick={() => item.type === 'dir' ? handleDirectoryClick(item.path) : handleFileClick(item)}
                        className={`
                          group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-200 border-l-2
                          ${selectedFile === item.path 
                            ? 'bg-blue-500/10 border-blue-500 text-blue-100' 
                            : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {item.type === 'dir' ? (
                            <FolderIcon className={`w-4 h-4 flex-shrink-0 ${selectedFile === item.path ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
                          ) : (
                            <FileIcon className={`w-4 h-4 flex-shrink-0 ${selectedFile === item.path ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                          )}
                          <span className="text-sm truncate font-medium">{item.name}</span>
                        </div>
                        
                        {item.type === 'file' && item.size !== null && (
                          <span className="text-[10px] text-slate-600 font-mono ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Viewer Panel */}
          {fileContent && (
            <div className="lg:col-span-9 h-[calc(100vh-8rem)]">
              <div className="bg-[#161b22] rounded-xl border border-slate-800 shadow-xl shadow-black/20 flex flex-col h-full overflow-hidden">
                {/* File Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#161b22]">
                  <div className="flex items-center space-x-3">
                    <FileIcon className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-mono text-slate-200">
                      {selectedFile ? selectedFile.split('/').pop() : 'No file selected'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition relative group"
                      title="Copy content"
                    >
                      {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                      <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        {copied ? 'Copied!' : 'Copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 overflow-auto bg-[#0d1117] relative group p-4 font-mono text-sm leading-relaxed text-slate-300">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117] z-10">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre overflow-x-auto">
                      <code>{fileContent}</code>
                    </pre>
                  )}
                </div>
                
                {/* Footer status bar */}
                <div className="px-4 py-1.5 bg-blue-600 text-white text-[10px] font-mono flex items-center justify-between">
                  <span>{getLanguageFromFilename(selectedFile || '').toUpperCase()}</span>
                  <span>UTF-8</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/10 border-t border-slate-800 px-4 py-1 flex items-center justify-between text-[11px] text-slate-500 backdrop-blur-sm z-30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className={`w-2 h-2 rounded-full ${isLocal ? 'bg-orange-500' : 'bg-green-500'}`}></div>
            <span className="font-medium text-slate-400">
              {isLocal ? 'Local Environment' : 'Connected to GitHub'}
            </span>
          </div>
        </div>
        <div>
          Repository Browser v1.2.0
        </div>
      </div>
    </div>
  );
}