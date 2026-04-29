import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  MessageSquare, 
  Key, 
  Settings, 
  Smartphone,
  RefreshCw,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API_BASE = import.meta.env.VITE_API_URL;

// --- Utils ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Sidebar = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="w-[280px] h-screen sticky top-0 bg-slate-900/60 backdrop-blur-md border-r border-white/5 p-8 flex flex-col">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight font-outfit">WA SaaS</span>
      </div>
      
      <nav className="flex-1 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Terminal</p>
        <Link 
          to="/" 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            activeTab === 'dashboard' ? "bg-secondary/10 text-secondary font-semibold" : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link 
          to="/settings" 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
            activeTab === 'settings' ? "bg-secondary/10 text-secondary font-semibold" : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <Settings size={20} /> Settings
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-inner">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">{user?.email.split('@')[0]}</p>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
               <CheckCircle2 size={10} /> PRO ACCOUNT
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium">
          <LogOut size={16} /> Logout System
        </button>
      </div>
    </div>
  );
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verification email sent!');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-2 font-outfit">{isLogin ? 'Welcome' : 'Register'}</h2>
          <p className="text-slate-400 text-sm">Access the WhatsApp Infrastructure</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Email Address</label>
            <input 
              type="email" 
              placeholder="admin@enterprise.com" 
              className="input-field w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Secure Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input-field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button disabled={loading} className="btn-primary w-full mt-4 h-14">
            {loading ? <RefreshCw className="animate-spin" /> : (isLogin ? 'Login to Terminal' : 'Initialize Account')}
          </button>
        </form>
        
        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            {isLogin ? "Need access? Request an account" : "Existing user? Access portal"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user }) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');

  const fetchApps = async () => {
    const { data } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 5000);
    return () => clearInterval(interval);
  }, []);

  const createApp = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    await axios.post(`${API_BASE}/api/apps`, { name: newAppName }, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setNewAppName('');
    setIsOpen(false);
    fetchApps();
  };

  return (
    <div className="flex-1 p-12 overflow-y-auto bg-slate-950/20">
      <header className="flex items-center justify-between mb-16">
        <div>
          <h1 className="text-5xl font-bold mb-2 font-outfit tracking-tighter">System Console</h1>
          <p className="text-slate-500 font-medium">Monitoring {apps.length} cluster nodes</p>
        </div>
        <button onClick={() => setIsOpen(true)} className="btn-primary flex items-center gap-3 px-8 shadow-cyan-500/20">
          <Plus size={24} /> New Instance
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <RefreshCw className="animate-spin text-secondary" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence>
            {apps.map((app) => (
              <AppCard key={app.id} app={app} onRefresh={fetchApps} />
            ))}
          </AnimatePresence>
          
          {apps.length === 0 && (
            <div className="col-span-full py-32 text-center glass-card border-dashed border-white/5 opacity-50">
              <Smartphone className="mx-auto mb-6 text-slate-600" size={64} />
              <h3 className="text-3xl font-bold mb-2">No Instances Connected</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Deploy your first WhatsApp instance to start utilizing the system infrastructure.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <Dialog.Panel className="glass-card max-w-lg w-full p-10">
            <Dialog.Title className="text-3xl font-bold mb-2 font-outfit">Deploy Instance</Dialog.Title>
            <Dialog.Description className="text-slate-400 mb-8">
              Allocate resources for a new WhatsApp terminal node.
            </Dialog.Description>

            <form onSubmit={createApp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Instance Label</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="e.g. Production Cluster A" 
                  className="input-field w-full h-14"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-bold">Cancel</button>
                <button type="submit" className="btn-primary flex-1 h-14">Deploy Node</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

const AppCard = ({ app, onRefresh }) => {
  const deleteApp = async (e) => {
    e.stopPropagation();
    if (!confirm('Destroy this instance node? All session data will be lost.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await axios.delete(`${API_BASE}/api/apps/${app.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    onRefresh();
  };

  const navigate = useNavigate();

  const connectApp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await axios.post(`${API_BASE}/api/connect/${app.id}`, {}, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      // Auto-navigate to the QR page immediately
      navigate(`/app/${app.id}`);
    } catch (err) {
      console.error('Connection failed:', err);
      alert('Failed to initialize terminal. Please check backend logs.');
    }
  };

  const isConnected = app.status === 'connected';
  const isConnecting = app.status === 'connecting';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 flex flex-col gap-8 group hover:border-secondary/40 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
          isConnected ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
          isConnecting ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" : 
          "bg-slate-500/10 text-slate-500 border-slate-500/20"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full bg-current", isConnected && "shadow-[0_0_8px_#10b981]")} />
          {app.status}
        </div>
        <button onClick={deleteApp} className="text-slate-600 hover:text-red-500 transition-colors p-1">
          <Trash2 size={18} />
        </button>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-1 truncate font-outfit">{app.name}</h3>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">Node ID: {app.id.slice(0, 12)}</p>
      </div>

      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Throughput</span>
          <span className="text-xs font-mono text-secondary">{app.api_usage_count || 0} hits</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-secondary to-primary shadow-[0_0_12px_rgba(6,182,212,0.4)]" style={{ width: `${Math.min((app.api_usage_count / 1000) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isConnected ? (
          <>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <Smartphone size={20} className="text-emerald-500" />
              <span className="text-lg font-bold text-emerald-400">+{app.phone_number}</span>
            </div>
            <div className="flex items-center gap-3 p-3 px-4 rounded-xl bg-slate-950/80 text-[10px] font-mono text-slate-500 border border-white/5">
              <Key size={14} className="text-secondary" />
              <span className="truncate">{app.api_key}</span>
            </div>
          </>
        ) : (
          <button onClick={connectApp} className="btn-primary w-full h-14 justify-center">
            {isConnecting ? <RefreshCw className="animate-spin" /> : 'Authorize Terminal'}
          </button>
        )}
        
        {isConnecting && (
           <Link to={`/app/${app.id}`} className="text-center text-[10px] font-bold text-secondary tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 uppercase">
             Open Link Terminal <ChevronRight size={14} />
           </Link>
        )}
      </div>
    </motion.div>
  );
};

const AppDetails = ({ user }) => {
  const appId = window.location.pathname.split('/').pop();
  const [status, setStatus] = useState(null);

  const fetchStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await axios.get(`${API_BASE}/api/status/${appId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setStatus(data.data);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (status?.connected) return <Navigate to="/" />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950/40">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-xl p-16 text-center relative overflow-hidden"
      >
        {/* Decorative element */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
        
        <h2 className="text-4xl font-bold mb-4 font-outfit tracking-tighter">Terminal Link</h2>
        <p className="text-slate-400 mb-12 text-sm max-w-sm mx-auto">Establish a secure handshake with the WhatsApp network by scanning the generated identifier.</p>
        
        <div className="aspect-square w-full max-w-[340px] mx-auto bg-white rounded-[40px] p-10 mb-12 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
          {status?.qr ? (
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(status.qr)}`} alt="QR Code" className="w-full h-full mix-blend-multiply" />
          ) : (
            <div className="flex flex-col items-center gap-6 text-slate-300">
                <RefreshCw className="animate-spin text-secondary" size={64} />
                <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await axios.post(`${API_BASE}/api/connect/${appId}`, {}, {
                      headers: { Authorization: `Bearer ${session.access_token}` }
                    });
                    fetchStatus();
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary hover:text-white transition-colors"
                >
                  Re-Initialize Protocol
                </button>
            </div>
          )}
        </div>

        <Link to="/" className="text-slate-500 hover:text-white font-bold text-xs tracking-widest transition-colors flex items-center justify-center gap-2">
           <LogOut size={14} className="rotate-180" /> TERMINATE SESSION
        </Link>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <Auth />;

  return (
    <Router>
      <div className="flex min-h-screen font-sans">
        <Sidebar user={session.user} onLogout={() => supabase.auth.signOut()} />
        <Routes>
          <Route path="/" element={<Dashboard user={session.user} />} />
          <Route path="/app/:appId" element={<AppDetails user={session.user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}
