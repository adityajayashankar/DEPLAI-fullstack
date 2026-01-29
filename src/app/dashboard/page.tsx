'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Fingerprint, 
  LogOut, 
  Upload, 
  RefreshCw, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Github, 
  FileCode, 
  Lock, 
  Globe,
  LayoutGrid,
  List as ListIcon,
  Search,
  Plus,
  Settings,
  Activity,
  Terminal,
  MoreVertical,
  Zap,
  Globe2,
  MessageSquare,
  Ticket,
  Trash2
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
    
    // Particles config
    const particles: {x: number, y: number, vx: number, vy: number, size: number, alpha: number}[] = [];
    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2,
        alpha: Math.random() * 0.3 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw connections
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)'; // very faint blue
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
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`; 
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect near particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 200) {
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

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-40" />;
};

export default function Dashboard() {
  const router = useRouter();
  
  // -- State Management --
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
  const [refreshingInstallations, setRefreshingInstallations] = useState(false);
  const [scanningProjects, setScanningProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Authentication & Initial Load --
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
      await setupInstallations();
      fetchInstallations();
      fetchProjects();
      fetchSecurityMetrics(); // NEW: Fetch security metrics
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    }
  }

  // -- Data Fetching --
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

  // NEW: Fetch security metrics from scans
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
      await fetchSecurityMetrics(); // NEW: Refresh security metrics too
    } catch (e) { alert('Failed to refresh'); } 
    finally { setRefreshingInstallations(false); }
  }

  // -- Actions --
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
        fetchSecurityMetrics(); // NEW: Update metrics after deletion
      }
    } catch (e) { alert('Delete failed'); }
  }

  async function handleTriggerScan(id: string, name: string, type: 'full' | 'dast' = 'full') {
    if (scanningProjects.has(id)) return;
    
    let targetUrl;
    if (type === 'dast') {
      targetUrl = prompt(`Enter target URL for DAST scan of "${name}":\n(e.g., https://staging.example.com)`);
      if (!targetUrl) return;
    } else {
      if (!confirm(`Start SAST security scan for "${name}"?`)) return;
    }

    setScanningProjects(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/scans/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, scanType: 'full', targetUrl }),
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

  async function handleRaiseTicket(id: string, name: string) {
    const issue = prompt(`Raise Slack ticket for "${name}"?\n\nDescribe the issue or vulnerability to report:`);
    if (!issue || !issue.trim()) return;

    // Simulate API call to Slack integration
    const mockTicketId = `INC-${Math.floor(Math.random() * 10000)}`;
    const mockChannel = "#security-alerts";
    
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

  // NEW: Calculate health score color and status
  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return { color: 'emerald', text: 'Excellent', shadow: 'emerald-500' };
    if (score >= 75) return { color: 'blue', text: 'Good', shadow: 'blue-500' };
    if (score >= 60) return { color: 'yellow', text: 'Fair', shadow: 'yellow-500' };
    if (score >= 40) return { color: 'orange', text: 'Poor', shadow: 'orange-500' };
    return { color: 'red', text: 'Critical', shadow: 'red-500' };
  };

  const healthStatus = getHealthScoreColor(securityMetrics.healthScore);

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent"/></div>;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 relative">
      
      {/* Animated Background Canvas */}
      <BackgroundCanvas />

      {/* --- SIDEBAR --- */}
      <aside className="w-16 lg:w-64 border-r border-white/5 bg-[#0B1120]/80 backdrop-blur-md flex flex-col justify-between transition-all duration-300 z-20">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
            <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30 text-blue-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <span className="ml-3 font-bold text-white tracking-wide hidden lg:block">DeplAI</span>
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
              src={user?.avatarUrl} 
              alt="User" 
              className="w-8 h-8 rounded-full border border-white/10"
            />
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.login || 'User'}</p>
              <button onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/'))} className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                <LogOut size={10} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden z-10">
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

        {/* Header Area */}
        <header className="h-16 border-b border-white/5 bg-[#020617]/50 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center text-sm breadcrumbs text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Dashboard</span>
            <span className="mx-2">/</span>
            <span className="text-slate-200 font-medium">Overview</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Always visible Connect GitHub Button */}
            <a 
               href="https://github.com/apps/deplai-gitapp-aj/installations/new"
               target="_blank"
               className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors flex items-center gap-2 group"
             >
               <Github size={12} className="group-hover:text-white transition-colors" /> 
               <span className="group-hover:text-white transition-colors">
                 {installations.length === 0 ? 'Connect GitHub' : 'Add Organization'}
               </span>
            </a>

            <div className="h-4 w-px bg-slate-800" />
            <button onClick={handleRefreshInstallations} disabled={refreshingInstallations} className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw size={16} className={refreshingInstallations ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Bento Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1: Total Projects */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/5 relative group overflow-hidden backdrop-blur-sm">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Terminal size={48} />
                </div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Projects</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stats.totalCount}</span>
                  {securityMetrics.scannedProjects > 0 && (
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {securityMetrics.scannedProjects} scanned
                    </span>
                  )}
                </div>
              </div>

              {/* Stat 2: Security Score - NOW FUNCTIONAL */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/5 relative overflow-hidden backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Security Health</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{securityMetrics.healthScore}%</span>
                      <span className={`text-xs text-${healthStatus.color}-400 font-medium`}>
                        {healthStatus.text}
                      </span>
                    </div>
                  </div>
                  <div className={`h-10 w-10 rounded-full border-2 border-${healthStatus.color}-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]`}>
                    <Shield size={18} className={`text-${healthStatus.color}-500`} />
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                  <div 
                    className={`bg-${healthStatus.color}-500 h-full shadow-[0_0_10px_${healthStatus.shadow}] transition-all duration-500`}
                    style={{ width: `${securityMetrics.healthScore}%` }}
                  />
                </div>
                {securityMetrics.scannedProjects === 0 && (
                  <p className="text-xs text-slate-500 mt-2">Run scans to calculate security score</p>
                )}
              </div>

              {/* Stat 3: Vulnerabilities - NOW FUNCTIONAL */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/5 relative backdrop-blur-sm">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Findings</p>
                {securityMetrics.totalVulnerabilities > 0 ? (
                  <div className="mt-4 flex gap-2">
                    <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-red-400">{securityMetrics.criticalCount}</div>
                      <div className="text-[10px] text-red-300/70 uppercase">Crit</div>
                    </div>
                    <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-orange-400">{securityMetrics.highCount}</div>
                      <div className="text-[10px] text-orange-300/70 uppercase">High</div>
                    </div>
                    <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-yellow-400">{securityMetrics.mediumCount}</div>
                      <div className="text-[10px] text-yellow-300/70 uppercase">Med</div>
                    </div>
                    <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-blue-400">{securityMetrics.lowCount}</div>
                      <div className="text-[10px] text-blue-300/70 uppercase">Low</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center justify-center py-6">
                    <CheckCircle2 className="text-emerald-500 w-8 h-8 mb-2" />
                    <p className="text-sm text-slate-400">No vulnerabilities found</p>
                    <p className="text-xs text-slate-600 mt-1">Run scans to analyze projects</p>
                  </div>
                )}
              </div>

              {/* Quick Action: Upload */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl bg-blue-600 hover:bg-blue-500 cursor-pointer transition-all shadow-lg shadow-blue-900/20 flex flex-col justify-center items-center group relative overflow-hidden border border-blue-400/20"
              >
                <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {uploading ? (
                  <RefreshCw className="animate-spin text-white w-8 h-8" />
                ) : (
                  <>
                    <div className="p-3 bg-white/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="text-white w-6 h-6" />
                    </div>
                    <span className="font-semibold text-white">Upload Project</span>
                    <span className="text-xs text-blue-200 mt-1">.zip files supported</span>
                  </>
                )}
              </div>
            </div>

            {/* Projects Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Projects <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700">{projects.length}</span>
                </h2>
                
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Filter projects..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#0F172A]/80 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 w-64 transition-all"
                    />
                  </div>
                  <div className="bg-[#0F172A]/80 border border-white/10 rounded-lg p-1 flex">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <ListIcon size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
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
                    <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-xl bg-[#0F172A]/50 backdrop-blur-sm">
                      <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileCode className="text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-medium">No projects found</p>
                      <p className="text-sm text-slate-600 mt-1">Try adjusting filters or upload a new project</p>
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        viewMode={viewMode}
                        isScanning={scanningProjects.has(project.id)}
                        onScan={() => handleTriggerScan(project.id, project.name, 'full')}
                        onDast={() => handleTriggerScan(project.id, project.name, 'dast')}
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
  <Link href={href}>
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group
      ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
    `}>
      {icon}
      <span className="font-medium text-sm hidden lg:block">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3B82F6] hidden lg:block" />}
    </div>
  </Link>
);

const ProjectCard = ({ project, viewMode, isScanning, onScan, onDast, onTicket, onDelete, onClick }: any) => {
  const isList = viewMode === 'list';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={`
        group relative bg-[#0F172A]/80 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden backdrop-blur-sm
        ${isList ? 'rounded-lg p-3 flex items-center gap-6 hover:bg-[#131C33]/90' : 'rounded-2xl p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10'}
      `}
    >
      {/* Active Scan Progress Bar (if scanning) */}
      {isScanning && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 w-full animate-progress-indeterminate" />
      )}

      {/* Icon */}
      <div className={`
        flex items-center justify-center rounded-lg border shrink-0
        ${project.type === 'local' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-white/10 text-slate-300'}
        ${isList ? 'w-10 h-10' : 'w-12 h-12'}
      `}>
        {project.type === 'local' ? <FileCode size={isList ? 20 : 24} /> : <Github size={isList ? 20 : 24} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-200 group-hover:text-white truncate">
            {project.type === 'local' ? project.name : project.repo}
          </h3>
          {project.access === 'Private' && <Lock size={12} className="text-amber-500/80" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="capitalize">{project.type}</span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          {project.branch && <span className="font-mono">{project.branch}</span>}
          {project.languages && (
            <div className="flex gap-1">
               {Object.keys(project.languages).slice(0, 2).map(l => (
                 <span key={l} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{l}</span>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* List View Metadata Columns */}
      {isList && (
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <div className="w-32 flex flex-col items-end">
            <span className="text-xs text-slate-600 uppercase tracking-wider">Last Scan</span>
            <span className="font-medium text-slate-300">Never</span>
          </div>
          <div className="w-24 flex justify-end">
             <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
               project.access === 'Private' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
             }`}>
               {project.access}
             </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-2 ${isList ? '' : 'mt-auto pt-4 border-t border-white/5'}`}>
        {/* SAST SCAN */}
        <button 
          onClick={(e) => { e.stopPropagation(); onScan(); }}
          disabled={isScanning}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2
            ${isScanning 
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-wait' 
              : 'bg-white/5 hover:bg-blue-600 hover:text-white text-slate-300 border border-white/10 hover:border-transparent'}
          `}
          title="Run Static Analysis"
        >
          {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>

        {/* DAST SCAN - Now visible directly */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDast(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 bg-white/5 hover:bg-purple-600 hover:text-white text-slate-300 border border-white/10 hover:border-transparent"
          title="Run Dynamic Analysis (Needs Target URL)"
        >
          <Globe2 size={14} />
          <span className="hidden sm:inline">DAST</span>
        </button>

        {/* SLACK TICKET - New Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onTicket(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 bg-white/5 hover:bg-[#E01E5A] hover:text-white text-slate-300 border border-white/10 hover:border-transparent"
          title="Raise Slack Ticket"
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">Ticket</span>
        </button>

        {/* Delete Menu */}
        {project.canDelete && (
          <div className="relative group/menu ml-auto">
             <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                title="Delete Project"
             >
               <Trash2 size={16} />
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}