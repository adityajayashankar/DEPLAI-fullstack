import { Suspense } from 'react';
import Link from 'next/link';
import ScanResults from '@/components/scanresults';
import CloudBoltIcon from '@/components/CloudBoltIcon';

// ✅ CORRECT: This is a Server Component (Async, No 'use client')
export default async function ScanDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  // Await the params (Next.js 15+ requirement)
  const params = await props.params;
  const { id } = params;

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
                <span className="text-xl font-bold text-gray-900">Scan Results</span>
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Security Scan Report</h1>
          <p className="text-gray-500 text-sm mt-1">Scan ID: {id}</p>
        </div>

        {/* Pass ID to the Client Component */}
        <Suspense fallback={<div>Loading scan...</div>}>
          <ScanResults scanId={id} />
        </Suspense>
      </main>
    </div>
  );
}