'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Fingerprint, 
  LogOut, 
  Upload, 
  RefreshCw, 
  Shield, 
  Github, 
  FileCode, 
  Lock, 
  LayoutGrid,
  List as ListIcon,
  Search,
  Settings,
  Activity,
  Zap,
  Globe2,
  Trash2,
  PlayCircle,
  Server,
  Ticket,
  XCircle,
  ScanLine,
  Plus,       // From UI Source
  ArrowRight, // From UI Source
  FileText    // From UI Source
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Background Effect Component ---
const BackgroundCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const particles: {x: number, y: number, vx: number, vy: number, size: number, alpha: number}[] = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2,
        alpha: Math.random() * 0.2 + 0.05
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw connections
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)'; // Very faint indigo
      ctx.lineWidth = 1;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Move
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw particle
        ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha})`; 
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect near particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-50" />;
};

export default function Dashboard() {
  const router = useRouter();
  
  // -- State Management (Using Logic from Target) --
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [installations, setInstallations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ localCount: 0, githubCount: 0, totalCount: 0 });
  const [securityMetrics, setSecurityMetrics] = useState({
    healthScore: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    totalVulnerabilities: 0,
    scannedProjects: 0
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dastLoading, setDastLoading] = useState(false);
  const [refreshingInstallations, setRefreshingInstallations] = useState(false);
  const [scanningProjects, setScanningProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Authentication & Initial Load (Logic) --
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Load Data
      await setupInstallations();
      fetchInstallations();
      fetchProjects();
      fetchSecurityMetrics();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    }
  }

  // -- Data Fetching (Logic) --
  async function setupInstallations() {
    try { await fetch('/api/installations/setup', { method: 'POST' }); } catch (e) { console.error(e); }
  }

  async function fetchInstallations() {
    try {
      const res = await fetch('/api/installations');
      const data = await res.json();
      setInstallations(data.installations || []);
    } catch (e) { console.error(e); }
  }

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
      setStats(data.stats || { localCount: 0, githubCount: 0, totalCount: 0 });
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }

  async function fetchSecurityMetrics() {
    try {
      const res = await fetch('/api/security/metrics');
      const data = await res.json();
      
      if (data.success) {
        setSecurityMetrics(data.metrics);
      }
    } catch (e) { 
      console.error('Failed to fetch security metrics:', e);
    }
  }

  async function handleRefreshInstallations() {
    setRefreshingInstallations(true);
    try {
      await fetch('/api/installations/setup', { method: 'POST' });
      await fetchInstallations();
      await fetchProjects();
      await fetchSecurityMetrics();
    } catch (e) { alert('Failed to refresh'); } 
    finally { setRefreshingInstallations(false); }
  }

  // -- Actions (Logic) --
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) return alert('Please upload a .zip file');
    
    const projectName = prompt('Enter project name:');
    if (!projectName?.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', projectName.trim());
      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      if (res.ok) { fetchProjects(); } else { const d = await res.json(); alert(d.error); }
    } catch (e) { alert('Upload failed'); } 
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function handleDeleteProject(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProjects();
        fetchSecurityMetrics();
      }
    } catch (e) { alert('Delete failed'); }
  }

  async function handleTriggerSastScan(id: string, name: string) {
    if (scanningProjects.has(id)) return;
    if (!confirm(`Start SAST security scan for "${name}"?`)) return;

    setScanningProjects(prev => new Set(prev).add(id));
    
    try {
      const res = await fetch('/api/scans/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, scanType: 'full' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/dashboard/scans/${data.scanId}`);
      } else { throw new Error(data.error); }
    } catch (e: any) {
      alert(e.message);
      setScanningProjects(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  // Navigation Helper (From UI Source)
  function handleShowAnalysis(id: string) {
    console.log(`Navigating to analysis results for ${id}`);
    router.push(`/dashboard/scans/${id}`);
  }

  // UI-Only: Stop Scan (Optimistic)
  async function handleStopScan(id: string, name: string) {
    if (!confirm(`Stop scanning "${name}"?`)) return;
    
    // Optimistically remove from scanning set as backend doesn't support cancel yet
    setScanningProjects(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }

  // Global DAST Handler (UI Feature)
  async function handleGlobalDastScan() {
    const targetUrl = prompt("Enter the target URL for Dynamic Analysis:\n(e.g., https://staging.myapp.com)");
    if (!targetUrl) return;

    try {
      new URL(targetUrl); // Basic validation
    } catch {
      alert("Invalid URL format. Please include http:// or https://");
      return;
    }

    setDastLoading(true);
    // Simulate DAST initiation UI before redirect
    setTimeout(() => {
        setDastLoading(false);
        router.push(`/dashboard/scans/dast-monitor?target=${encodeURIComponent(targetUrl)}`);
    }, 1500);
  }

  async function handleRaiseTicket(id: string, name: string) {
    const issue = prompt(`Raise Slack ticket for "${name}"?\n\nDescribe the issue or vulnerability to report:`);
    if (!issue || !issue.trim()) return;

    // Simulate API call to Slack integration
    const mockTicketId = `INC-${Math.floor(Math.random() * 10000)}`;
    const mockChannel = "#security-ops";
    
    alert(`✅ Ticket Created Successfully!\n\nTicket ID: ${mockTicketId}\nChannel: ${mockChannel}\nStatus: Triage Pending`);
  }

  function handleProjectClick(project: any) {
    const url = project.type === 'local' 
      ? `/dashboard/repo?project_id=${project.id}&type=local`
      : `/dashboard/repo?owner=${project.owner}&repo=${project.repo}&type=github`;
    router.push(url);
  }

  // -- Filtering --
  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.repo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper for UI health color (used in logic context, kept for completeness)
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return { color: 'emerald', text: 'Secure', shadow: 'emerald-500' };
    if (score >= 70) return { color: 'blue', text: 'Good', shadow: 'blue-500' };
    if (score >= 50) return { color: 'yellow', text: 'At Risk', shadow: 'yellow-500' };
    return { color: 'red', text: 'Critical', shadow: 'red-500' };
  };

  const healthStatus = getHealthScoreColor(securityMetrics.healthScore);

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 rounded-full border-t-transparent"/></div>;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 relative">
      
      <BackgroundCanvas />

      {/* --- SIDEBAR --- */}
      <aside className="w-16 lg:w-64 border-r border-white/5 bg-[#0B1120]/80 backdrop-blur-md flex flex-col justify-between transition-all duration-300 z-20">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
            <div className="p-1.5 bg-indigo-600/20 rounded-lg border border-indigo-500/30 text-indigo-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className="ml-3 font-bold text-white tracking-wide hidden lg:block font-mono">DEPL_AI</span>
          </div>

          <nav className="p-4 space-y-2">
            <NavItem href="/dashboard" icon={<LayoutGrid size={20} />} label="Overview" active />
            <NavItem href="/dashboard/scans" icon={<Activity size={20} />} label="Scans" />
            <NavItem href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
          </nav>
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
            <img 
              src={user?.avatarUrl || 'https://github.com/ghost.png'} 
              alt="User" 
              className="w-8 h-8 rounded-full border border-white/10 ring-2 ring-transparent group-hover:ring-indigo-500/30 transition-all"
            />
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.login || 'User'}</p>
              <button onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/'))} className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 mt-0.5">
                <LogOut size={10} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden z-10">
        {/* Top Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />

        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#020617]/50 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center text-sm breadcrumbs text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Dashboard</span>
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-indigo-100 font-medium tracking-wide">Command Center</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Header 'Add Org' button is still useful as a fallback, but less prominent now */}
            <a 
               href="https://github.com/apps/deplai-gitapp-aj/installations/new"
               target="_blank"
               className="hidden sm:flex text-xs bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-slate-600 transition-all items-center gap-2 group backdrop-blur-sm"
             >
              <Github size={12} className="group-hover:text-white transition-colors" /> 
              <span className="group-hover:text-white transition-colors font-medium">
                {installations.length === 0 ? 'Connect GitHub' : 'Manage Org'}
              </span>
            </a>

            <div className="hidden sm:block h-4 w-px bg-slate-800" />
            <button onClick={handleRefreshInstallations} disabled={refreshingInstallations} className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full">
              <RefreshCw size={16} className={refreshingInstallations ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Stat 1: Total Projects */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/60 border border-white/5 relative group overflow-hidden backdrop-blur-sm hover:border-white/10 transition-colors">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Server size={60} />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Repositories</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{stats.totalCount}</span>
                  <span className="text-xs text-slate-500 font-medium">active</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-400 border border-white/5 flex items-center gap-1">
                     <Github size={10} /> {stats.githubCount} remote
                  </div>
                  <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-slate-400 border border-white/5 flex items-center gap-1">
                     <FileCode size={10} /> {stats.localCount} local
                  </div>
                </div>
              </div>

              {/* Stat 2: REPLACED Security Score with BIG ADD REPOS BUTTON */}
              <a 
                href="https://github.com/apps/deplai-gitapp-aj/installations/new"
                target="_blank"
                className="group relative p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 hover:border-indigo-400/50 cursor-pointer transition-all overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                <div className="absolute right-[-10px] top-[-10px] bg-indigo-500/20 w-24 h-24 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-all" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                        <Plus size={20} />
                     </div>
                     <span className="text-indigo-200 font-semibold tracking-wide">Add Repository</span>
                  </div>
                  <p className="text-indigo-200/60 text-xs leading-relaxed max-w-[90%]">
                    Connect more GitHub repositories to secure your supply chain.
                  </p>
                </div>
                
                <div className="relative z-10 flex items-center gap-2 text-indigo-300 text-xs font-medium mt-4 group-hover:text-indigo-200 transition-colors">
                   Connect now <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Stat 3: DAST Action Card */}
              <div className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-purple-500/30 via-pink-500/10 to-transparent relative group overflow-hidden">
                 <div className="absolute inset-0 bg-[#0F172A] rounded-[14px] m-[1px]" />
                 <div className="relative h-full p-5 flex flex-col justify-between rounded-2xl backdrop-blur-sm">
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                      <Globe2 size={100} className="text-purple-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-purple-300 font-semibold flex items-center gap-2 mb-1">
                         <Zap size={16} className="text-purple-400 fill-purple-400/20" /> Dynamic Analysis
                      </h3>
                      <p className="text-purple-200/50 text-xs leading-relaxed max-w-[90%]">
                        Scan live endpoints for runtime vulnerabilities.
                      </p>
                    </div>

                    <button 
                      onClick={handleGlobalDastScan}
                      disabled={dastLoading}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-900/20 border border-white/10 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                      {dastLoading ? (
                         <RefreshCw size={16} className="animate-spin" />
                      ) : (
                         <PlayCircle size={16} className="fill-white/20" />
                      )}
                      <span className="relative z-10">{dastLoading ? 'Initiating...' : 'Start DAST Scan'}</span>
                    </button>
                 </div>
              </div>

              {/* Stat 4: Upload Action */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl bg-[#0F172A]/60 hover:bg-[#1E293B]/80 cursor-pointer transition-all border border-white/5 hover:border-white/10 flex flex-col justify-center items-center group relative overflow-hidden backdrop-blur-sm"
              >
                <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {uploading ? (
                  <RefreshCw className="animate-spin text-blue-400 w-8 h-8" />
                ) : (
                  <>
                    <div className="p-3 bg-blue-500/10 rounded-xl mb-3 group-hover:scale-110 transition-transform border border-blue-500/20 text-blue-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">Upload Project</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">.zip supported</span>
                  </>
                )}
              </div>
            </div>

            {/* Projects Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                   <h2 className="text-xl font-bold text-white">Repositories</h2>
                   <span className="text-xs font-semibold text-slate-500 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700/50">{projects.length}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative group w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search repositories..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0F172A]/80 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-[#131C33]"
                    />
                  </div>
                  <div className="bg-[#0F172A]/80 border border-white/10 rounded-lg p-1 flex shrink-0">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <ListIcon size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects List/Grid */}
              <div className={`
                ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-2'}
              `}>
                <AnimatePresence>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-[#0F172A]/50 rounded-xl animate-pulse border border-white/5" />
                    ))
                  ) : filteredProjects.length === 0 ? (
                    <div className="col-span-full py-24 text-center border border-dashed border-slate-800 rounded-xl bg-[#0F172A]/30 backdrop-blur-sm">
                      <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <FileCode className="text-slate-600" size={32} />
                      </div>
                      <p className="text-slate-400 font-medium">No projects found</p>
                      <p className="text-sm text-slate-600 mt-1">Try adjusting filters or connect a new repository</p>
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        viewMode={viewMode}
                        isScanning={scanningProjects.has(project.id)}
                        onScan={() => handleTriggerSastScan(project.id, project.name)}
                        onShowAnalysis={() => handleShowAnalysis(project.id)}
                        onStopScan={() => handleStopScan(project.id, project.name)}
                        onTicket={() => handleRaiseTicket(project.id, project.name)}
                        onDelete={() => handleDeleteProject(project.id, project.name)}
                        onClick={() => handleProjectClick(project)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub Components ---

const NavItem = ({ icon, label, active = false, href }: { icon: React.ReactNode, label: string, active?: boolean, href: string }) => (
  <a href={href} className="block">
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative
      ${active ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}
    `}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
      <div className="relative z-10">{icon}</div>
      <span className="font-medium text-sm hidden lg:block relative z-10">{label}</span>
    </div>
  </a>
);

const ProjectCard = ({ project, viewMode, isScanning, onScan, onShowAnalysis, onStopScan, onTicket, onDelete, onClick }: any) => {
  const isList = viewMode === 'list';
  // Determine if we should show the "Show Analysis" button (prevents redundant runs)
  const hasAnalysis = !!project.lastScan;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={`
        group relative bg-[#0F172A]/60 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden backdrop-blur-sm
        ${isList ? 'rounded-xl p-3 flex items-center gap-6 hover:bg-[#131C33]/80' : 'rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20'}
      `}
    >
      {/* Scan Progress Bar */}
      {isScanning && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-800 overflow-hidden">
             <div className="h-full bg-indigo-500 animate-progress-indeterminate" />
        </div>
      )}

      {/* Icon */}
      <div className={`
        flex items-center justify-center rounded-lg border shrink-0 transition-colors
        ${project.type === 'local' 
           ? 'bg-purple-500/5 border-purple-500/10 text-purple-400 group-hover:bg-purple-500/10' 
           : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/10'}
        ${isList ? 'w-10 h-10' : 'w-12 h-12'}
      `}>
        {project.type === 'local' ? <FileCode size={isList ? 20 : 24} /> : <Github size={isList ? 20 : 24} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-200 group-hover:text-white truncate transition-colors text-sm md:text-base">
            {project.type === 'local' ? project.name : project.repo}
          </h3>
          {project.access === 'Private' && <Lock size={12} className="text-amber-500/70" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="capitalize">{project.type}</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          {project.branch && <span className="font-mono text-slate-400">{project.branch}</span>}
          {project.lastScan && isList && <span className="ml-2 text-emerald-400/80">• Scanned {project.lastScan}</span>}
        </div>
      </div>

      {/* List View Metadata */}
      {isList && (
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
           {project.languages && (
             <div className="flex gap-1">
                 {Object.keys(project.languages).slice(0, 3).map(l => (
                   <span key={l} className="px-2 py-0.5 rounded text-xs bg-slate-800/50 border border-slate-700/50">{l}</span>
                 ))}
             </div>
           )}
          <div className="w-24 flex justify-end">
             <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${
               project.access === 'Private' ? 'bg-amber-900/10 text-amber-500 border-amber-900/20' : 'bg-emerald-900/10 text-emerald-500 border-emerald-900/20'
             }`}>
               {project.access}
             </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-2 ${isList ? '' : 'mt-auto pt-4 border-t border-white/5'}`}>
        
        {/* ACTION BUTTON LOGIC */}
        {isScanning ? (
           <div className="flex items-center gap-1">
              <button 
                disabled
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-wait flex items-center gap-2"
              >
                <RefreshCw size={14} className="animate-spin" />
                Scanning...
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStopScan(); }}
                className="p-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                title="Stop Scan"
              >
                <XCircle size={14} />
              </button>
           </div>
        ) : hasAnalysis ? (
           <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onShowAnalysis(); }}
                className="group/scan relative overflow-hidden px-4 py-1.5 rounded-md text-xs font-bold text-white transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                title="View Scan Results"
              >
                 <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90 group-hover/scan:opacity-100 transition-opacity" />
                 <span className="relative flex items-center gap-2">
                    <FileText size={14} className="text-white" />
                    Show Analysis
                 </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onScan(); }}
                className="p-1.5 rounded-md text-xs font-medium bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                title="Re-run Analysis"
              >
                <RefreshCw size={14} />
              </button>
           </div>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onScan(); }}
            className="group/scan relative overflow-hidden px-4 py-1.5 rounded-md text-xs font-bold text-white transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
            title="Run Static Analysis"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover/scan:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">
               <ScanLine size={14} className="text-white" />
               Run Analysis
            </span>
          </button>
        )}

        {/* Raise Ticket */}
        <button 
          onClick={(e) => { e.stopPropagation(); onTicket(); }}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 bg-slate-800/50 hover:bg-[#E01E5A] hover:text-white text-slate-400 border border-slate-700/50 hover:border-transparent"
          title="Raise a Ticket"
        >
          <Ticket size={14} />
          <span className="hidden sm:inline">Raise Ticket</span>
        </button>

        {/* Delete */}
        <div className="relative group/menu ml-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
              title="Delete Project"
            >
              <Trash2 size={16} />
            </button>
        </div>
      </div>
    </motion.div>
  );
}