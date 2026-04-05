import { useState, useEffect } from 'react';
import { 
  Bot, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Mic2, 
  MessageSquare, 
  Bell, 
  Webhook, 
  Save, 
  Settings2,
  Globe,
  CheckCircle2,
  Key,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Settings as SettingsIcon,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi, apiPut, apiPost } from '../hooks/useApi';

interface Agent {
  id: number;
  name: string;
  description: string;
  instructions: string;
  welcome_message: string;
  voice: string;
  llm_model: string;
  language: string;
  status: string;
  telegram_enabled: boolean;
  webhook_enabled: boolean;
  webhook_url: string;
}

interface Voice {
  id: string;
  name: string;
  language: string;
  description: string;
}

interface ConfigStatus {
  password_required: boolean;
}

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
];

const LANGUAGES = [
  { id: 'en', name: 'English' },
];

export default function Settings() {
  const { data: agents, loading, refetch: refetchAgents } = useApi<Agent[]>('/api/agents');
  const { data: voices, loading: loadingVoices } = useApi<Voice[]>('/api/voices');
  const { data: configStatus, refetch: refetchConfig } = useApi<ConfigStatus>('/api/config/status');
  
  const [activeTab, setActiveTab] = useState<'agent' | 'credentials'>('credentials');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Agent>>({});
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleToggleExpand = (agent: Agent) => {
    if (expandedId === agent.id) {
      setExpandedId(null);
      setEditData({});
    } else {
      setExpandedId(agent.id);
      setEditData({ ...agent });
    }
  };

  const handleUpdateField = (field: keyof Agent, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (agentId: number) => {
    setIsSaving(agentId);
    try {
      await apiPut(`/api/agents/${agentId}`, editData);
      await refetchAgents();
      showToast('Settings saved successfully');
      setExpandedId(null);
    } catch (err) {
      showToast('Failed to save settings');
    } finally {
      setIsSaving(null);
    }
  };

  const handleTogglePublish = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(agent.id);
    const newStatus = agent.status === 'published' ? 'draft' : 'published';
    try {
      await apiPut(`/api/agents/${agent.id}`, { ...agent, status: newStatus });
      await refetchAgents();
      showToast(`Agent "${agent.name}" is now ${newStatus}`);
    } catch {
      showToast('Failed to update agent status');
    } finally {
      setToggling(null);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 4) {
      setPassError('Password must be at least 4 characters');
      return;
    }

    setIsChangingPass(true);
    try {
      await apiPost('/api/config/password', {
        current_password: currentPassword || null,
        new_password: newPassword
      });
      showToast('Master password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      refetchConfig();
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPass(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-32 px-8 pb-12 bg-surface min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="pt-32 px-8 pb-12 bg-surface min-h-screen relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/2 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-24 left-1/2 z-50 bg-primary text-on-primary px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <SettingsIcon size={24} />
              </div>
              <h1 className="text-4xl font-black text-primary tracking-tight">Settings</h1>
            </div>
            <p className="text-on-surface-variant font-medium">Manage your credentials, system configuration, and agent status.</p>
          </div>

          {/* New Tabs / Segmented Control */}
          <div className="bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10 flex items-center shadow-inner">
            <button 
              onClick={() => setActiveTab('credentials')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'credentials' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <Key size={16} />
              Credentials
            </button>
            <button 
              onClick={() => setActiveTab('agent')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'agent' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <Bot size={16} />
              Agent Status
            </button>
          </div>
        </div>

        {activeTab === 'agent' ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {agents && agents.length > 0 ? (
              agents.map((agent) => {
                const isLive = agent.status === 'published';
                const isExpanded = expandedId === agent.id;
                const isSpinning = toggling === agent.id;

                return (
                  <motion.div 
                    key={agent.id}
                    layout
                    className={`glass ambient-shadow rounded-[var(--radius-default)] overflow-hidden border border-outline-variant/10 transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20 bg-white/90' : 'hover:bg-white/80'}`}
                  >
                    {/* Header Component */}
                    <div 
                      className="p-6 flex items-center justify-between cursor-pointer"
                      onClick={() => handleToggleExpand(agent)}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isLive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          <Bot size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-primary">{agent.name}</h3>
                            <span className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-full ${isLive ? 'bg-secondary-container text-secondary' : 'bg-surface-container-highest text-on-surface-variant/70'}`}>
                              {isLive ? 'LIVE' : 'DRAFT'}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant mt-1 font-medium italic">
                            Using {(agent.llm_model || 'gpt-4o-mini').toUpperCase()} • {(agent.voice || 'odysseus').split('-').pop()?.toUpperCase()} Voice
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => handleTogglePublish(agent, e)}
                          disabled={isSpinning}
                          className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${isLive ? 'bg-secondary' : 'bg-surface-container-highest opacity-60 hover:opacity-100'}`}
                        >
                          <motion.div
                            className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
                            animate={{ x: isLive ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            {isSpinning && <Loader2 size={12} className="animate-spin text-secondary" />}
                          </motion.div>
                        </button>
                        <div className="w-10 h-10 rounded-full hover:bg-primary/5 flex items-center justify-center transition-colors">
                          {isExpanded ? <ChevronUp size={24} className="text-primary" /> : <ChevronDown size={24} className="text-on-surface-variant" />}
                        </div>
                      </div>
                    </div>

                    {/* Expansion Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-outline-variant/10"
                        >
                          <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Core Config */}
                              <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                  <Settings2 size={18} className="text-primary" />
                                  <h4 className="font-bold text-primary uppercase tracking-wider text-xs">Core Configuration</h4>
                                </div>
                                <div className="space-y-4">
                                  <label className="block">
                                    <span className="text-sm font-bold text-on-surface-variant flex items-center gap-2 mb-2 italic"><Cpu size={14} /> Brain Model</span>
                                    <select className="input-field w-full" value={editData.llm_model} onChange={(e) => handleUpdateField('llm_model', e.target.value)}>
                                      {MODELS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>)}
                                    </select>
                                  </label>
                                  <label className="block">
                                    <span className="text-sm font-bold text-on-surface-variant flex items-center gap-2 mb-2 italic"><Mic2 size={14} /> Voice Profile</span>
                                    <select className="input-field w-full" value={editData.voice} onChange={(e) => handleUpdateField('voice', e.target.value)}>
                                      {voices?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.language.toUpperCase()})</option>)}
                                    </select>
                                  </label>
                                  <label className="block">
                                    <span className="text-sm font-bold text-on-surface-variant flex items-center gap-2 mb-2 italic"><Globe size={14} /> Default Language</span>
                                    <select className="input-field w-full" value={editData.language} onChange={(e) => handleUpdateField('language', e.target.value)}>
                                      {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                  </label>
                                </div>
                              </div>

                              {/* Integrations */}
                              <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                  <Bell size={18} className="text-primary" />
                                  <h4 className="font-bold text-primary uppercase tracking-wider text-xs">Integrations</h4>
                                </div>
                                <div className="bg-surface-container-low rounded-2xl p-6 space-y-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Bot size={20} /></div>
                                      <div>
                                        <p className="text-sm font-black text-primary">Telegram</p>
                                        <p className="text-[10px] text-on-surface-variant font-bold">Alerts on triggers</p>
                                      </div>
                                    </div>
                                    <button onClick={() => handleUpdateField('telegram_enabled', !editData.telegram_enabled)} className={`w-12 h-6 rounded-full relative transition-colors ${editData.telegram_enabled ? 'bg-primary' : 'bg-outline-variant/30'}`}>
                                      <motion.div className="w-4 h-4 bg-white rounded-full absolute top-1" animate={{ x: editData.telegram_enabled ? 26 : 4 }} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary"><Webhook size={20} /></div>
                                      <div>
                                        <p className="text-sm font-black text-primary">Webhooks</p>
                                        <p className="text-[10px] text-on-surface-variant font-bold">Post to external API</p>
                                      </div>
                                    </div>
                                    <button onClick={() => handleUpdateField('webhook_enabled', !editData.webhook_enabled)} className={`w-12 h-6 rounded-full relative transition-colors ${editData.webhook_enabled ? 'bg-secondary' : 'bg-outline-variant/30'}`}>
                                      <motion.div className="w-4 h-4 bg-white rounded-full absolute top-1" animate={{ x: editData.webhook_enabled ? 26 : 4 }} />
                                    </button>
                                  </div>
                                  {editData.webhook_enabled && (
                                    <input className="input-field w-full text-xs font-mono" placeholder="Webhook URL" value={editData.webhook_url} onChange={(e) => handleUpdateField('webhook_url', e.target.value)} />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Personality Content */}
                            <div className="space-y-6 pt-6 border-t border-outline-variant/10">
                              <div className="flex items-center gap-3 mb-2">
                                <MessageSquare size={18} className="text-primary" />
                                <h4 className="font-bold text-primary uppercase tracking-wider text-xs">Personality</h4>
                              </div>
                              <label className="block">
                                <span className="text-xs font-black uppercase text-on-surface-variant ml-2 mb-2 block">Welcome Message</span>
                                <input className="input-field w-full" value={editData.welcome_message} onChange={(e) => handleUpdateField('welcome_message', e.target.value)} />
                              </label>
                              <label className="block">
                                <span className="text-xs font-black uppercase text-on-surface-variant ml-2 mb-2 block">Instructions</span>
                                <textarea rows={4} className="input-field w-full resize-none font-medium text-sm leading-relaxed" value={editData.instructions} onChange={(e) => handleUpdateField('instructions', e.target.value)} />
                              </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                              <button onClick={() => setExpandedId(null)} className="px-6 py-3 font-bold text-on-surface-variant hover:text-primary transition-colors">Cancel</button>
                              <button onClick={() => handleSave(agent.id)} disabled={isSaving === agent.id} className="btn-primary flex items-center gap-2 px-10 py-3 rounded-2xl shadow-xl shadow-primary/20">
                                {isSaving === agent.id ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Save Config
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-24 glass rounded-3xl opacity-60">
                <Bot size={48} className="mx-auto mb-4" />
                <p className="font-bold">No agents found</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* Credentials & Security Tab */
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="glass p-10 rounded-[var(--radius-default)] ambient-shadow border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary-fixed flex items-center justify-center text-secondary">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary">Global Security Layer</h3>
                  <p className="text-on-surface-variant font-medium">Protect your entire application with a master password.</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`p-4 rounded-2xl flex items-center gap-4 mb-10 ${configStatus?.password_required ? 'bg-secondary-container/30 border border-secondary/10' : 'bg-surface-container-high/30 border border-outline-variant/20'}`}>
                <div className={`w-3 h-3 rounded-full animate-pulse ${configStatus?.password_required ? 'bg-secondary' : 'bg-on-surface-variant/30'}`} />
                <span className="text-sm font-black text-primary uppercase tracking-widest">
                  System Shield: {configStatus?.password_required ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {!configStatus?.password_required && (
                  <span className="text-xs font-bold text-on-surface-variant italic">(Site is currently public)</span>
                )}
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-8 max-w-lg">
                {configStatus?.password_required && (
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-4 italic">Confirm Current Password</label>
                    <div className="relative">
                      <input 
                        type={showPass ? "text" : "password"} 
                        className="input-field w-full pr-12"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-4 italic">New Master Password</label>
                    <input 
                      type="password" 
                      className="input-field w-full"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 4 chars"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-4 italic">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="input-field w-full"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {passError && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-error-container/30 text-error p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-error/10"
                    >
                      <ShieldAlert size={18} />
                      {passError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-4 pt-4">
                  <button 
                    disabled={isChangingPass}
                    className="btn-primary flex items-center gap-3 px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {isChangingPass ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Key size={20} />
                    )}
                    <span className="font-black italic uppercase tracking-wider">Update Master Shield</span>
                  </button>
                  
                  {configStatus?.password_required && (
                    <p className="text-[10px] text-on-surface-variant font-bold leading-tight max-w-[150px]">
                      Updating will invalidate all current visitor sessions.
                    </p>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 opacity-70">
              <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-6">Security Best Practices</h4>
              <ul className="space-y-3">
                <li className="text-xs text-on-surface-variant font-bold flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  Your password is cryptographically hashed using Argon2.
                </li>
                <li className="text-xs text-on-surface-variant font-bold flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  Sessions expire automatically after 7 days of inactivity.
                </li>
                <li className="text-xs text-on-surface-variant font-bold flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  Ensure you are accessing over HTTPS for production deployments.
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
