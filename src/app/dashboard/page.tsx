'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CloudBoltIcon from '@/components/CloudBoltIcon';

export default function Dashboard() {
  const [installations, setInstallations] = useState<any[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInstallations();
  }, []);

  useEffect(() => {
    if (selectedInstallation) {
      fetchRepositories(selectedInstallation);
    }
  }, [selectedInstallation]);

  async function fetchInstallations() {
    const res = await fetch('/api/installations');
    const data = await res.json();
    setInstallations(data.installations || []);
    
    // Auto-select first installation
    if (data.installations && data.installations.length > 0) {
      setSelectedInstallation(data.installations[0].id);
    }
  }

  async function fetchRepositories(installationId: string) {
    setLoading(true);
    const res = await fetch(`/api/repositories?installation_id=${installationId}`);
    const data = await res.json();
    setRepositories(data.repositories || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2">
                <div className="text-blue-600">
                  <CloudBoltIcon />
                </div>
                <span className="text-xl font-bold text-gray-900">Dashboard</span>
              </Link>
            </div>
            
            <Link href="/" className="hover:opacity-70 transition">
              <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.125 6.62502C18.125 6.32168 17.9423 6.0482 17.662 5.93211C17.3818 5.81603 17.0592 5.88019 16.8447 6.09469L10.5947 12.3447C10.3018 12.6376 10.3018 13.1125 10.5947 13.4054L16.8447 19.6554C17.0592 19.8699 17.3818 19.934 17.662 19.8179C17.9423 19.7018 18.125 19.4284 18.125 19.125V6.62502Z" fill="#323544"/>
                <path d="M13.4053 7.15535C13.6982 6.86246 13.6982 6.38758 13.4053 6.09469C13.1124 5.8018 12.6376 5.8018 12.3447 6.09469L6.09467 12.3447C5.80178 12.6376 5.80178 13.1125 6.09467 13.4054L12.3447 19.6554C12.6376 19.9482 13.1124 19.9482 13.4053 19.6554C13.6982 19.3625 13.6982 18.8876 13.4053 18.5947L7.68566 12.875L13.4053 7.15535Z" fill="#323544"/>
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards - Only 3 cards now */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Repositories</span>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{repositories.length}</div>
            <p className="text-xs text-gray-500 mt-1">Repos being monitored</p>
          </div>

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

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Installations Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">GitHub Accounts</h2>
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
                      href="https://github.com/apps/deplai-dev-rohan/installations/new"
                      target="_blank"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Install GitHub App
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {installations.map((inst) => (
                      <div
                        key={inst.id}
                        className={`p-4 rounded-lg cursor-pointer transition ${
                          selectedInstallation === inst.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                        }`}
                        onClick={() => setSelectedInstallation(inst.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{inst.account_login}</h3>
                            <p className="text-xs text-gray-500">{inst.account_type}</p>
                          </div>
                          {selectedInstallation === inst.id && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Repositories Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Repositories</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {loading ? 'Loading...' : `${repositories.length} repositories connected`}
                    </p>
                  </div>
                  {selectedInstallation && repositories.length > 0 && (
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                      Scan All
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {!selectedInstallation ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Select an installation to view repositories</p>
                  </div>
                ) : loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading repositories...</p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 font-medium mb-2">No repositories found</p>
                    <p className="text-sm text-gray-500">Add repositories to this installation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {repositories.map((repo) => (
                      <div key={repo.id} className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{repo.full_name}</h3>
                              <div className="flex items-center space-x-3 mt-1">
                                <span className="text-xs text-gray-500">
                                  {repo.default_branch}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  repo.is_private 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {repo.is_private ? 'Private' : 'Public'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Scan Now
                          </button>
                        </div>

                        {repo.languages && Object.keys(repo.languages).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {Object.keys(repo.languages).slice(0, 5).map((lang) => (
                              <span
                                key={lang}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Placeholder for scan status */}
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