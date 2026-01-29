'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  ChevronRight, 
  Terminal, 
  Lock,
  AlertTriangle as AlertTriangleIcon,
  Fingerprint
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/session');
      
      if (!res.ok) {
        console.error('Session check failed:', res.status);
        setLoading(false);
        return;
      }
      
      const session = await res.json();
      
      if (session.isLoggedIn) {
        router.push('/dashboard');
        return;
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  }

  // Handle login button click
  const handleLogin = () => {
    // Use window.location for full page navigation to auth endpoint
    window.location.href = '/api/auth/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-t-2 border-emerald-500 rounded-full animate-spin-slow"></div>
          </div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Initializing System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 selection:bg-blue-500/30 font-sans overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      {/* Navigation */}
      <motion.nav 
        className="relative z-50 border-b border-slate-800/50 backdrop-blur-md bg-[#0B1120]/70"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-500 p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Fingerprint className="w-6 h-6" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">DeplAI</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#docs" className="hover:text-white transition-colors">Documentation</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          {/* FIXED: Using button with window.location for proper server-side redirect */}
          <button 
            onClick={handleLogin}
            className="text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center space-x-2 bg-slate-900/80 border border-slate-700 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm shadow-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 text-xs font-medium tracking-wide uppercase">Next-Gen Security Pipeline</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Secure Your Code
            </motion.div>
            <motion.div
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 pb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Before Deployment.
            </motion.div>
          </h1>

          <motion.p 
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Automated vulnerability scanning, intelligent remediation suggestions, and real-time security insights for your modern development workflow.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            {/* FIXED: Using button with window.location for proper server-side redirect */}
            <button 
              onClick={handleLogin}
              className="group w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-500/20 cursor-pointer"
            >
              <span>Start Scanning</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#demo"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#151E32] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 px-8 py-4 rounded-xl font-semibold transition-all"
            >
              <Terminal className="w-4 h-4 text-slate-500" />
              <span>View Demo</span>
            </a>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div 
          id="features"
          className="grid md:grid-cols-3 gap-6 mt-32 max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {[
            {
              icon: Shield,
              title: "Vulnerability Scanning",
              desc: "Detect CVEs and security flaws in your dependencies and source code automatically.",
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20"
            },
            {
              icon: Zap,
              title: "AI Remediation",
              desc: "Get intelligent, context-aware code fixes and patch suggestions powered by AI.",
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              border: "border-blue-500/20"
            },
            {
              icon: Lock,
              title: "Zero Config",
              desc: "Connect your GitHub repository and start scanning in seconds. No complex setup.",
              color: "text-purple-400",
              bg: "bg-purple-500/10",
              border: "border-purple-500/20"
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              className="group p-8 rounded-2xl bg-[#151E32]/50 border border-slate-800 hover:border-slate-700 hover:bg-[#151E32] transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.bg} ${feature.border} border`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Code/Terminal Preview Mock */}
        <motion.div
          id="demo"
          className="mt-24 max-w-4xl mx-auto rounded-xl overflow-hidden border border-slate-800 bg-[#0D1117] shadow-2xl shadow-black/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-[#151E32]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
            </div>
            <div className="ml-4 px-3 py-1 rounded-md bg-[#0B1120] border border-slate-800 text-xs font-mono text-slate-500 flex items-center gap-2">
              <Lock className="w-3 h-3" />
              deplai-scanner --target ./production
            </div>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed">
            <div className="flex gap-4 text-slate-500 mb-2">
              <span>$</span>
              <span className="text-white">initiate scan --deep</span>
            </div>
            <div className="text-blue-400 mb-1">➜ Analyzing dependency tree...</div>
            <div className="text-blue-400 mb-1">➜ Parsing static assets...</div>
            <div className="text-emerald-400 mb-4">✓ Scan complete in 1.4s</div>
            
            <div className="bg-[#151E32]/50 p-4 rounded-lg border border-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  CRITICAL VULNERABILITY FOUND
                </span>
                <span className="text-slate-500 text-xs">CVE-2024-1234</span>
              </div>
              <p className="text-slate-300 mb-3">SQL Injection vulnerability detected in login handler.</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/20">
                  Automated Fix Available
                </span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 border-t border-slate-800 bg-[#0B1120]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-blue-500 p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <span className="text-white text-xl font-bold">DeplAI</span>
              </div>
              <p className="text-slate-500 text-sm max-w-xs">
                Securing the future of software delivery with AI-driven pipeline intelligence.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Scanning Engine</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} DeplAI Inc. Built for developers, by developers.
          </div>
        </div>
      </motion.footer>
    </div>
  );
}