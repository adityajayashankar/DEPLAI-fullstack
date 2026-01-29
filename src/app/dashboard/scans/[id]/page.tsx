import { Suspense } from 'react';
import Link from 'next/link';
import ScanResults from '@/components/scanresults';
import { Fingerprint, ArrowLeft } from 'lucide-react';

// ✅ CORRECT: This is a Server Component (Async, No 'use client')
export default async function ScanDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  // Await the params (Next.js 15+ requirement)
  const params = await props.params;
  const { id } = params;

  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#151E32]/50 border-b border-slate-800/50 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition">
                <div className="text-blue-500 p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white">Scan Results</span>
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-white flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Security Scan Report</h1>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-sm">Scan ID:</span>
            <code className="px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-blue-400 text-sm font-mono">
              {id}
            </code>
          </div>
        </div>

        {/* Pass ID to the Client Component */}
        <Suspense 
          fallback={
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-t-2 border-emerald-500 rounded-full animate-spin-slow"></div>
              </div>
              <p className="text-slate-400 font-mono text-sm">Loading scan results...</p>
            </div>
          }
        >
          <ScanResults scanId={id} />
        </Suspense>
      </main>
    </div>
  );
}