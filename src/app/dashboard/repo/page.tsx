'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CloudBoltIcon from '@/components/CloudBoltIcon';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number | null;
}

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

  const [authLoading, setAuthLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [contents, setContents] = useState<FileItem[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    };
    return languageMap[extension || ''] || 'text';
  }

  const pathParts = currentPath ? currentPath.split('/') : [];
  const breadcrumbs = [
    { name: projectName || 'Project', path: '' },
    ...pathParts.map((part, index) => ({
      name: part,
      path: pathParts.slice(0, index + 1).join('/'),
    })),
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if ((!isLocal && (!owner || !repo)) || (isLocal && !projectId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No project selected</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="text-blue-600">
                  <CloudBoltIcon />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Code View
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              {!isLocal && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                >
                  <svg
                    className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              )}

              <Link
                href="/dashboard"
                className="hover:opacity-70 transition"
                title="Back to Dashboard"
              >
                <svg
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.125 6.62502C18.125 6.32168 17.9423 6.0482 17.662 5.93211C17.3818 5.81603 17.0592 5.88019 16.8447 6.09469L10.5947 12.3447C10.3018 12.6376 10.3018 13.1125 10.5947 13.4054L16.8447 19.6554C17.0592 19.8699 17.3818 19.934 17.662 19.8179C17.9423 19.7018 18.125 19.4284 18.125 19.125V6.62502Z"
                    fill="#323544"
                  />
                  <path
                    d="M13.4053 7.15535C13.6982 6.86246 13.6982 6.38758 13.4053 6.09469C13.1124 5.8018 12.6376 5.8018 12.3447 6.09469L6.09467 12.3447C5.80178 12.6376 5.80178 13.1125 6.09467 13.4054L12.3447 19.6554C12.6376 19.9482 13.1124 19.9482 13.4053 19.6554C13.6982 19.3625 13.6982 18.8876 13.4053 18.5947L7.68566 12.875L13.4053 7.15535Z"
                    fill="#323544"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 mt-3 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center space-x-2">
                {index > 0 && <span className="text-gray-400">/</span>}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{crumb.name}</span>
                ) : (
                  <Link
                    href={buildNavigationUrl(crumb.path)}
                    className="text-blue-600 hover:underline"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className={`grid gap-6 ${fileContent ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {/* File Browser */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Files</h2>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {loading && !fileContent ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={fetchContents}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div>
                  {/* Parent directory link */}
                  {currentPath && (
                    <>
                      <Link
                        href={buildNavigationUrl(
                          currentPath.includes('/')
                            ? currentPath.split('/').slice(0, -1).join('/')
                            : ''
                        )}
                        className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition border-l-4 border-l-transparent"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        <span className="text-gray-600">..</span>
                      </Link>
                      <div className="border-b border-gray-200"></div>
                    </>
                  )}

                  {contents.map((item, index) => (
                    <div key={item.path}>
                      <div
                        onClick={() =>
                          item.type === 'dir'
                            ? handleDirectoryClick(item.path)
                            : handleFileClick(item)
                        }
                        className={`flex items-center justify-between p-4 cursor-pointer transition ${
                          selectedFile === item.path 
                            ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                            : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {item.type === 'dir' ? (
                            <svg
                              className="w-5 h-5 text-blue-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <span className="text-gray-900 font-medium">{item.name}</span>
                        </div>

                        {item.type === 'file' && item.size !== null && (
                          <span className="text-xs text-gray-500">
                            {(item.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      {index < contents.length - 1 && (
                        <div className="border-b border-gray-200"></div>
                      )}
                    </div>
                  ))}

                  {contents.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Empty directory
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* File Content Viewer */}
          {fileContent && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedFile ? selectedFile.split('/').pop() : 'Select a file'}
                </h2>
              </div>

              <div className="p-6">
                <div className="rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language={getLanguageFromFilename(selectedFile || '')}
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    customStyle={{
                      margin: 0,
                      maxHeight: '600px',
                      fontSize: '14px',
                    }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="container mx-auto px-6 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              {isLocal ? (
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Note:</span> This is a local project. Files are stored temporarily and can be deleted from the dashboard.
                </p>
              ) : (
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Note:</span> Changes are made in your IDE and automatically reflected here when pushed to GitHub.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}