'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CloudBoltIcon from '@/components/CloudBoltIcon';
import ExitIcon from '@/components/ExitIcon';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [installations, setInstallations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ localCount: 0, githubCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshingInstallations, setRefreshingInstallations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      
      if (!session.isLoggedIn) {
        router.push('/');
        return;
      }
      
      setUser(session.user);
      setAuthLoading(false);
      
      // NEW: Setup installations first (links any unlinked ones)
      await setupInstallations();
      
      // Then fetch data
      fetchInstallations();
      fetchProjects();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    }
  }

  async function setupInstallations() {
    try {
      await fetch('/api/installations/setup', { method: 'POST' });
    } catch (error) {
      console.error('Setup installations failed:', error);
    }
  }

  async function fetchInstallations() {
    const res = await fetch('/api/installations');
    const data = await res.json();
    setInstallations(data.installations || []);
  }

  async function fetchProjects() {
    setLoading(true);
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.projects || []);
    setStats(data.stats || { localCount: 0, githubCount: 0, totalCount: 0 });
    setLoading(false);
  }

  async function handleRefreshInstallations() {
    setRefreshingInstallations(true);
    try {
      await fetch('/api/installations/setup', { method: 'POST' });
      await fetchInstallations();
      await fetchProjects();
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Failed to refresh installations');
    } finally {
      setRefreshingInstallations(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('Please upload a .zip file');
      return;
    }

    const projectName = prompt('Enter project name:');
    if (!projectName || projectName.trim().length === 0) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', projectName.trim());

      const response = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert('Project uploaded successfully!');
        fetchProjects();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload project');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteProject(projectId: string, projectName: string) {
    const confirmed = confirm(`Delete "${projectName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Project deleted successfully');
        fetchProjects();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
    }
  }

  function handleProjectClick(project: any) {
    if (project.type === 'local') {
      router.push(`/dashboard/repo?project_id=${project.id}&type=local`);
    } else {
      router.push(`/dashboard/repo?owner=${project.owner}&repo=${project.repo}&type=github`);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">
                <CloudBoltIcon />
              </div>
              <span className="text-xl font-bold text-gray-900">Dashboard</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              title="Logout"
            >
              <ExitIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards - Only 2 cards now */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Scans</span>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-500 mt-1">Security scans completed</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Findings</span>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-500 mt-1">Issues detected</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Project Section */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Upload Project</h2>
              </div>
              
              <div className="p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload Local Project</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Upload a .zip file (max 10GB)
                </p>
              </div>
            </div>

            {/* GitHub Installations */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">GitHub Accounts</h2>
                  {installations.length > 0 && (
                    <button
                      onClick={handleRefreshInstallations}
                      disabled={refreshingInstallations}
                      className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center space-x-1"
                    >
                      <svg
                        className={`w-4 h-4 ${refreshingInstallations ? 'animate-spin' : ''}`}
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
                      <span>{refreshingInstallations ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                {installations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium mb-2">No installations yet</p>
                    <p className="text-sm text-gray-500 mb-4">Install the GitHub App to get started</p>
                    <a 
                      href="https://github.com/apps/deplai-gitapp-aj/installations/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Install GitHub App
                    </a>
                    <p className="text-xs text-blue-600 mt-3">
                      After installation, this page will refresh automatically
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {installations.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-4 rounded-lg bg-gray-50 border-2 border-transparent"
                      >
                        <div className="flex items-center space-x-3">
                          <img 
                            src={user?.avatarUrl || `https://github.com/${inst.account_login}.png`}
                            alt={inst.account_login}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{inst.account_login}</h3>
                            <p className="text-xs text-gray-500">{inst.account_type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Projects Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {loading ? 'Loading...' : `${stats.totalCount} projects available`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading projects...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 font-medium mb-2">No projects yet</p>
                    <p className="text-sm text-gray-500">Upload a local project or install the GitHub App</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div 
                        key={project.id} 
                        className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                        onClick={() => handleProjectClick(project)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              project.type === 'local' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              <svg className={`w-5 h-5 ${
                                project.type === 'local' ? 'text-purple-600' : 'text-blue-600'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {project.type === 'local' ? project.name : project.repo}
                              </h3>
                              <div className="flex items-center space-x-3 mt-1">
                                {project.type === 'local' ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    Local
                                  </span>
                                ) : (
                                  <>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      project.access === 'Private'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {project.access}
                                    </span>
                                    {project.branch && (
                                      <span className="text-xs text-gray-500">
                                        {project.branch}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {project.canDelete && (
                              <button 
                                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id, project.name);
                                }}
                              >
                                Delete
                              </button>
                            )}
                            <button 
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Scan clicked for:', project.name);
                              }}
                            >
                              Scan Now
                            </button>
                          </div>
                        </div>

                        {/* Languages for GitHub repos only */}
                        {project.type === 'github' && project.languages && Object.keys(project.languages).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {Object.keys(project.languages).slice(0, 5).map((lang) => (
                              <span
                                key={lang}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Last scan status */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Last scan:</span>
                            <span className="text-gray-400">Never</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}