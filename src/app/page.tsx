import Link from 'next/link';
import CloudBoltIcon from '@/components/CloudBoltIcon';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-white">
              <CloudBoltIcon />
            </div>
            <span className="text-white text-2xl font-bold">DeplAI</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-blue-300 text-sm">AI-Powered Security Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Deploy Anywhere.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Test Everything.
            </span>
          </h1>

          {/* CTA Button - Only Dashboard button now */}
          <div className="flex justify-center mt-12">
            <Link 
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/10 absolute bottom-0 left-0 right-0">
        <div className="text-center">
          <div className="text-gray-400 text-sm">
            © 2026 DeplAI. Built for developers, by developers.
          </div>
        </div>
      </footer>
    </div>
  );
}