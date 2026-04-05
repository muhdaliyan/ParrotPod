import { useState, useRef, useEffect } from 'react';
import { Phone, Mic, Brain, Volume2, Bot, Plus, Minus, RefreshCw, Layers, Construction, Network, Database, X, Upload, Trash2, FileText, Settings, TestTube, ChevronDown, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi, apiPut, apiPost, apiUploadFile, apiDelete } from '../hooks/useApi';
import VoiceTestModal from '../components/VoiceTestModal';

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
  phone_number: string;
  sip_dispatch_rule_id: string;
  telegram_enabled: boolean;
  webhook_enabled: boolean;
  webhook_url: string;
}

interface KnowledgeFile {
  id: number;
  agent_id: number;
  filename: string;
  filetype: string;
  filesize: number;
  created_at: string;
}

const VOICE_OPTIONS = [
  { value: 'aura-2-odysseus-en', label: 'Odysseus (Male, EN)' },
  { value: 'aura-2-luna-en', label: 'Luna (Female, EN)' },
  { value: 'aura-2-stella-en', label: 'Stella (Female, EN)' },
  { value: 'aura-2-athena-en', label: 'Athena (Female, EN)' },
  { value: 'aura-2-zeus-en', label: 'Zeus (Male, EN)' },
];

export default function Workflows() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [canvasPos, setCanvasPos] = useState({ x: 0, y: 100 });
  const [zoom, setZoom] = useState(0.7);
  const [canvasKey, setCanvasKey] = useState(0);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load agents
  const { data: agents, loading: agentsLoading, refetch: refetchAgents } = useApi<Agent[]>('/api/agents');
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);
  const activeAgent: Agent | null = agents && agents.length > 0 ? agents[Math.min(activeAgentIndex, agents.length - 1)] : null;

  const { data: files, loading: filesLoading, refetch: refetchFiles } = useApi<KnowledgeFile[]>(
    activeAgent ? `/api/agents/${activeAgent.id}/files` : '',
    [activeAgent?.id]
  );

  // Local editable state for the active agent
  const [form, setForm] = useState({
    name: '', description: '', instructions: '', welcome_message: '', voice: '', llm_model: '',
    telegram_enabled: true, webhook_enabled: false, webhook_url: '',
  });

  const [createForm, setCreateForm] = useState({
    name: '', description: '', instructions: 'You are a helpful AI voice assistant.', welcome_message: 'Hello! How can I help you today?', voice: 'aura-2-luna-en', llm_model: 'gemini-2.5-flash', language: 'en',
    telegram_enabled: true, webhook_enabled: false, webhook_url: '',
  });

  useEffect(() => {
    if (activeAgent) {
      setForm({
        name: activeAgent.name,
        description: activeAgent.description || '',
        instructions: activeAgent.instructions,
        welcome_message: activeAgent.welcome_message,
        voice: activeAgent.voice,
        llm_model: activeAgent.llm_model,
        telegram_enabled: activeAgent.telegram_enabled,
        webhook_enabled: activeAgent.webhook_enabled,
        webhook_url: activeAgent.webhook_url,
      });
    }
  }, [activeAgent?.id]);

  const handleSave = async () => {
    if (!activeAgent) return;
    setSaving(true);
    try {
      await apiPut(`/api/agents/${activeAgent.id}`, form);
      setSaveMsg('Saved!');
      refetchAgents();
    } catch {
      setSaveMsg('Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAgent) return;
    setUploading(true);
    try {
      await apiUploadFile(`/api/agents/${activeAgent.id}/files`, file);
      refetchFiles();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      await apiDelete(`/api/files/${fileId}`);
      refetchFiles();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleDeleteAgent = async (agentId: number) => {
    setDeletingId(agentId);
    try {
      await apiDelete(`/api/agents/${agentId}`);
      refetchAgents();
      setActiveAgentIndex(0);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.description) return;
    setCreating(true);
    try {
      await apiPost<Agent>('/api/agents', createForm);
      refetchAgents();
      setActiveAgentIndex(0);
      setShowCreateModal(false);
      // Reset form
      setCreateForm({
        name: '', description: '', instructions: 'You are a helpful AI voice assistant.', welcome_message: 'Hello! How can I help you today?', voice: 'aura-2-luna-en', llm_model: 'gemini-2.5-flash', language: 'en',
        telegram_enabled: true, webhook_enabled: false, webhook_url: '',
      });
    } catch (err) {
      console.error('Create failed', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUnassignNumber = async () => {
    if (!activeAgent || !activeAgent.phone_number) return;
    try {
      await apiPost('/api/telephony/numbers/unassign', {
        phone_number: activeAgent.phone_number,
        agent_id: activeAgent.id
      });
      refetchAgents();
    } catch (err) {
      console.error('Unassign failed', err);
    }
  };

  const handleResetView = () => {
    setCanvasPos({ x: 0, y: 80 });
    setZoom(0.7);
    setCanvasKey(prev => prev + 1);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));

  const nodes = {
    trigger: { x: 100, y: 150 },
    stt: { x: 350, y: 150 },
    llm: { x: 650, y: 150 },
    tts: { x: 1050, y: 150 },
    agent: { x: 1350, y: 150 },
    tools: { x: 950, y: 350 },
    mcp: { x: 950, y: 450 },
    rag: { x: 950, y: 550 },
  };

  const agentLabel = activeAgent?.name || 'Voice Agent';

  return (
    <main className="flex-1 mt-0 relative overflow-hidden h-[var(--screen-h)] bg-surface">
      {/* Canvas Controls — zoom bottom-left */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10">
        <button onClick={handleZoomIn} className="bg-white/80 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-black/5 hover:bg-white transition-all active:scale-95" title="Zoom In">
          <Plus size={18} className="text-black/70" />
        </button>
        <button onClick={handleZoomOut} className="bg-white/80 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-black/5 hover:bg-white transition-all active:scale-95" title="Zoom Out">
          <Minus size={18} className="text-black/70" />
        </button>
        <button onClick={handleResetView} className="bg-white/80 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-black/5 hover:bg-white transition-all active:scale-95" title="Reset View">
          <RefreshCw size={18} className="text-black/70" />
        </button>
      </div>

      {/* Agent name badge — below navbar, top-left */}
      <div className="absolute top-24 left-8 z-10">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-sm border border-black/5">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-sm font-bold text-primary truncate max-w-[160px]">
            {agentsLoading ? 'Loading...' : (activeAgent?.name || 'No Agent')}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Dot grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="var(--color-outline-variant, #9aa0a6)" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        <motion.div
          key={canvasKey}
          drag
          dragMomentum={false}
          className="relative w-[3000px] h-[2000px] p-20 cursor-grab active:cursor-grabbing origin-top-left"
          initial={{ ...canvasPos, scale: zoom }}
          animate={{ ...canvasPos, scale: zoom }}
        >
          {/* SVG Connectors */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orientation="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#F27D26" />
              </marker>
            </defs>
            {[
              [nodes.trigger.x + 192, nodes.trigger.y + 45, nodes.stt.x, nodes.stt.y + 45],
              [nodes.stt.x + 192, nodes.stt.y + 45, nodes.llm.x, nodes.llm.y + 45],
              [nodes.llm.x + 240, nodes.llm.y + 45, nodes.tts.x, nodes.tts.y + 45],
              [nodes.tts.x + 192, nodes.tts.y + 45, nodes.agent.x, nodes.agent.y + 45],
            ].map(([x1, y1, x2, y2], i) => (
              <motion.path
                key={i}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                className="stroke-secondary stroke-2 fill-none"
                strokeDasharray="8 4"
                animate={{ strokeDashoffset: [0, -24] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            ))}
            {[nodes.tools, nodes.mcp, nodes.rag].map((n, i) => (
              <motion.path
                key={`sub-${i}`}
                d={`M ${nodes.llm.x + 120} ${nodes.llm.y + 180} L ${nodes.llm.x + 120} ${n.y + 30} L ${n.x} ${n.y + 30}`}
                className="stroke-secondary stroke-2 fill-none"
                strokeDasharray="8 4"
                animate={{ strokeDashoffset: [0, -24] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          </svg>

          {/* Node: Trigger */}
          <motion.div style={{ position: 'absolute', left: nodes.trigger.x, top: nodes.trigger.y }} onDoubleClick={() => setSelectedNode('IncomingCall')} className="w-48 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow z-10">
            <div className="bg-secondary p-3 flex items-center gap-2">
              <Phone size={14} className="text-white fill-current" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Triggers</span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-primary text-sm mb-1">Incoming Call</h3>
              <p className="text-xs text-on-surface-variant">LiveKit Room</p>
            </div>
          </motion.div>

          {/* Node: STT */}
          <motion.div style={{ position: 'absolute', left: nodes.stt.x, top: nodes.stt.y }} onDoubleClick={() => setSelectedNode('STT')} className="w-48 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow z-10">
            <div className="bg-secondary-container p-3 flex items-center gap-2">
              <Mic size={14} className="text-on-secondary-container" />
              <span className="text-on-secondary-container text-xs font-bold uppercase tracking-wider">Processing</span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-primary text-sm mb-1">STT Engine</h3>
              <p className="text-xs text-on-surface-variant">Deepgram Nova-3</p>
            </div>
          </motion.div>

          {/* Node: LLM */}
          <motion.div style={{ position: 'absolute', left: nodes.llm.x, top: nodes.llm.y }} onDoubleClick={() => setSelectedNode('LLM')} className="w-60 bg-surface-container-lowest rounded-xl shadow-lg border-2 border-secondary overflow-hidden z-10">
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-white fill-current" />
                <span className="text-white text-xs font-bold uppercase tracking-wider">Intelligence</span>
              </div>
              <Settings size={14} className="text-white opacity-60" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${(activeAgent?.llm_model || '').includes('gemini')
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                  }`}>
                  {(activeAgent?.llm_model || '').includes('gemini') ? 'Google Gemini' : 'OpenAI'}
                </span>
              </div>
              <h3 className="font-bold text-primary text-lg mb-2 truncate" title={activeAgent?.llm_model || 'gpt-4o-mini'}>
                {activeAgent?.llm_model || 'gpt-4o-mini'}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant">Instructions</span>
                  <span className={`font-semibold ${activeAgent?.instructions ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {activeAgent?.instructions ? 'Configured' : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Voice</span>
                  <span className="font-semibold text-secondary truncate max-w-[100px]">{activeAgent?.voice || '—'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sub-nodes */}
          {[
            { n: nodes.tools, icon: Construction, label: 'Tools', sub: '4 tools available' },
            { n: nodes.mcp, icon: Network, label: 'Action Triggers', sub: 'Telegram, Webhooks' },
            { n: nodes.rag, icon: Database, label: 'Knowledge', sub: `${files?.length || 0} file(s)` },
          ].map(({ n, icon: Icon, label, sub }) => (
            <motion.div
              key={label}
              style={{ position: 'absolute', left: n.x, top: n.y }}
              onDoubleClick={() => setSelectedNode(label)}
              className="w-44 bg-surface-container-low rounded-xl p-3 flex items-center gap-3 hover:bg-surface-container-highest transition-colors shadow-sm z-10"
            >
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Icon size={14} className="text-secondary" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-primary">{label}</h4>
                <p className="text-[10px] text-on-surface-variant">{sub}</p>
              </div>
            </motion.div>
          ))}

          {/* Node: TTS */}
          <motion.div style={{ position: 'absolute', left: nodes.tts.x, top: nodes.tts.y }} onDoubleClick={() => setSelectedNode('TTS')} className="w-48 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow z-10">
            <div className="bg-secondary-container p-3 flex items-center gap-2">
              <Volume2 size={14} className="text-on-secondary-container" />
              <span className="text-on-secondary-container text-xs font-bold uppercase tracking-wider">Voice</span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-primary text-sm mb-1">TTS Engine</h3>
              <p className="text-xs text-on-surface-variant">Deepgram Aura-2</p>
            </div>
          </motion.div>

          {/* Node: Agent */}
          <motion.div style={{ position: 'absolute', left: nodes.agent.x, top: nodes.agent.y }} className="w-56 bg-primary p-1 rounded-xl shadow-lg transform hover:-translate-y-1 transition-transform z-10">
            <div className="bg-surface-container-lowest rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-secondary-container p-2 rounded-lg">
                  <Bot size={20} className="text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base truncate max-w-[110px]">{agentLabel}</h3>
                  <span className="inline-block px-2 py-0.5 bg-secondary-container text-[10px] rounded-full text-on-secondary-container font-bold">
                    {agentsLoading ? 'Loading...' : (activeAgent?.status || 'DRAFT').toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(true)}
                disabled={!activeAgent}
                className="w-full py-2 bg-secondary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <TestTube size={14} />
                TEST AGENT
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Config Panel Modal */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 flex items-center justify-between text-on-primary shrink-0">
                <h3 className="text-xl font-bold">Configure: {selectedNode}</h3>
                <button onClick={() => setSelectedNode(null)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-8 space-y-6">
                {/* ── IncomingCall: Welcome Message + Phone Number only ── */}
                {selectedNode === 'IncomingCall' && activeAgent && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Welcome Message</label>
                      <p className="text-xs text-on-surface-variant">First thing the agent says when a call connects.</p>
                      <input
                        type="text"
                        value={form.welcome_message}
                        onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                        placeholder="Hello! How can I help you today?"
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary font-medium outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Assigned Phone Number</label>
                        <p className="text-xs text-on-surface-variant mt-1">This number routes directly to this agent.</p>
                      </div>

                      {activeAgent.phone_number ? (
                        <div className="bg-secondary-container/20 p-4 rounded-2xl border border-secondary/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-secondary text-white p-2 rounded-lg">
                              <Phone size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-primary">{activeAgent.phone_number}</p>
                              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">SIP Active</p>
                            </div>
                          </div>
                          <button
                            onClick={handleUnassignNumber}
                            className="bg-white/50 hover:bg-error-container hover:text-error px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            Unassign
                          </button>
                        </div>
                      ) : (
                        <div className="bg-surface-container-low p-6 rounded-2xl border border-dashed border-outline-variant/30 text-center">
                          <Phone size={24} className="mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-medium text-on-surface-variant">No number assigned</p>
                          <p className="text-[10px] text-on-surface-variant mt-1">Go to Marketplace or Inventory to assign a number.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── LLM: Agent Name, Instructions, Model — no welcome message ── */}
                {selectedNode === 'LLM' && activeAgent && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Agent Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary font-medium outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Agent Description</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="e.g. Sales Assistant, Order Taker"
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary font-medium outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">System Instructions</label>
                      <textarea
                        rows={5}
                        value={form.instructions}
                        onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                        placeholder="You are a helpful AI assistant for..."
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary font-medium outline-none focus:ring-2 focus:ring-secondary resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">LLM Model</label>
                      <select
                        value={form.llm_model}
                        onChange={e => setForm(f => ({ ...f, llm_model: e.target.value }))}
                        className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary outline-none"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
                        <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                        <option value="gpt-4o-mini">GPT-4o Mini (fast, cheap)</option>
                        <option value="gpt-4o">GPT-4o (powerful)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Voice Selection */}
                {selectedNode === 'TTS' && activeAgent && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">TTS Voice</label>
                    <select
                      value={form.voice}
                      onChange={e => setForm(f => ({ ...f, voice: e.target.value }))}
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-primary outline-none"
                    >
                      {VOICE_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ── Tools ── */}
                {selectedNode === 'Tools' && activeAgent && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Agent Tools</label>
                      <p className="text-xs text-on-surface-variant mt-1">Enable or disable capabilities for this agent.</p>
                    </div>

                    <div className="space-y-3 mt-4">
                      {/* Lookup Info */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                        <div>
                          <h4 className="font-bold text-primary text-sm flex items-center gap-2">Lookup Info</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Search knowledge base files</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="peer sr-only" defaultChecked={true} disabled />
                            <div className="block w-10 h-6 rounded-full bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-4 shadow-sm"></div>
                          </div>
                        </label>
                      </div>

                      {/* Trigger Actions */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                        <div>
                          <h4 className="font-bold text-primary text-sm flex items-center gap-2">Trigger Action</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Process orders, bookings, etc.</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="peer sr-only" defaultChecked={true} disabled />
                            <div className="block w-10 h-6 rounded-full bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-4 shadow-sm"></div>
                          </div>
                        </label>
                      </div>

                      {/* Web Search */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                        <div>
                          <h4 className="font-bold text-primary text-sm flex items-center gap-2">Web Search</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Browse the internet for real-time info</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="peer sr-only" defaultChecked={false} />
                            <div className="block w-10 h-6 rounded-full bg-surface-container-highest peer-checked:bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform peer-checked:translate-x-4 shadow-sm"></div>
                          </div>
                        </label>
                      </div>

                      {/* Call Forwarding */}
                      <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
                        <div>
                          <h4 className="font-bold text-primary text-sm flex items-center gap-2">Call Forwarding</h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Transfer active calls to a human agent</p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="peer sr-only" defaultChecked={false} />
                            <div className="block w-10 h-6 rounded-full bg-surface-container-highest peer-checked:bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform peer-checked:translate-x-4 shadow-sm"></div>
                          </div>
                        </label>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── Action Triggers ── */}
                {selectedNode === 'Action Triggers' && activeAgent && (
                  <div className="space-y-6">
                    <div className="p-5 bg-surface-container-low rounded-2xl border border-surface-container-highest">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0088cc]/10 text-[#0088cc] rounded-xl flex items-center justify-center">
                            <Bot size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-primary text-sm">Telegram Bot</h4>
                            <p className="text-[10px] text-on-surface-variant">Admin Notifications</p>
                          </div>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={form.telegram_enabled}
                              onChange={(e) => setForm({ ...form, telegram_enabled: e.target.checked })}
                            />
                            <div className="block w-12 h-7 rounded-full bg-surface-container-highest peer-checked:bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition transform peer-checked:translate-x-5 shadow-sm"></div>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-3 bg-white/50 p-3 rounded-xl border border-outline-variant/10">
                        When enabled, ParrotPod will send a notification to your Telegram bot whenever this agent records an action or order.
                      </p>
                    </div>

                    <div className="p-5 bg-surface-container-low rounded-2xl border border-surface-container-highest">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary-container text-secondary rounded-xl flex items-center justify-center">
                            <Network size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-primary text-sm">Outbound Webhooks</h4>
                            <p className="text-[10px] text-on-surface-variant">External API Integration</p>
                          </div>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={form.webhook_enabled}
                              onChange={(e) => setForm({ ...form, webhook_enabled: e.target.checked })}
                            />
                            <div className="block w-12 h-7 rounded-full bg-surface-container-highest peer-checked:bg-secondary transition-colors"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition transform peer-checked:translate-x-5 shadow-sm"></div>
                          </div>
                        </label>
                      </div>

                      <div className={`space-y-3 transition-opacity ${form.webhook_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Webhook URL</label>
                          <input
                            type="url"
                            placeholder="https://your-api.com/webhook/receive"
                            value={form.webhook_url}
                            onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                            className="w-full bg-white border border-outline-variant/20 rounded-xl px-4 py-2.5 text-primary text-sm font-medium outline-none focus:ring-2 focus:ring-secondary"
                          />
                        </div>
                        <p className="text-[11px] text-on-surface-variant pt-1 leading-relaxed">
                          Whenever the agent completes a tool call like <span className="font-bold">PlaceOrder</span>, a POST request will be sent to this URL with a rich JSON payload.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Knowledge Files */}
                {selectedNode === 'Knowledge' && activeAgent && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Knowledge Base Files</label>
                      <p className="text-xs text-on-surface-variant mt-1">Upload CSV, PDF, or TXT files. The agent will read these to answer questions.</p>
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-outline-variant rounded-xl text-center cursor-pointer hover:bg-surface-container-low transition-colors"
                    >
                      {uploading ? (
                        <Loader2 size={28} className="mx-auto animate-spin text-secondary" />
                      ) : (
                        <Upload size={28} className="mx-auto text-secondary opacity-60" />
                      )}
                      <p className="text-sm font-bold text-primary mt-2">{uploading ? 'Uploading...' : 'Click to upload file'}</p>
                      <p className="text-xs text-on-surface-variant">CSV, PDF, TXT – max 10MB</p>
                      <input ref={fileInputRef} type="file" accept=".csv,.pdf,.txt" onChange={handleFileUpload} className="hidden" />
                    </div>

                    {filesLoading ? (
                      <div className="text-center py-4"><Loader2 size={20} className="animate-spin text-secondary mx-auto" /></div>
                    ) : files && files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-3">
                            <FileText size={18} className="text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-primary truncate">{f.filename}</p>
                              <p className="text-[10px] text-on-surface-variant">{f.filetype.toUpperCase()} • {(f.filesize / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={() => handleDeleteFile(f.id)} className="text-error hover:bg-error-container p-1.5 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant text-center py-4 opacity-60">No files uploaded yet</p>
                    )}
                  </div>
                )}

                {/* Info panels for STT/Tools/Config */}
                {selectedNode === 'STT' && (
                  <div className="text-sm text-on-surface-variant space-y-2">
                    <p className="font-bold text-primary">Deepgram Nova-3 STT</p>
                    <p>Converts user speech to text in real-time. Configured with end-of-turn detection and noise cancellation.</p>
                    <div className="bg-surface-container-low rounded-xl p-4 space-y-1 text-xs">
                      <div className="flex justify-between"><span>Model</span><span className="font-bold">Nova-3-general</span></div>
                      <div className="flex justify-between"><span>Turn Detection</span><span className="font-bold">STT-based</span></div>
                      <div className="flex justify-between"><span>EOT Timeout</span><span className="font-bold">1000ms</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-outline-variant/10 flex gap-3 shrink-0">
                <button onClick={() => setSelectedNode(null)} className="flex-1 py-3 bg-surface-container-high text-primary font-bold rounded-xl hover:bg-surface-container-highest transition-colors">
                  Cancel
                </button>
                {activeAgent && selectedNode !== 'STT' && selectedNode !== 'Tools' && (
                  <button
                    onClick={async () => { await handleSave(); setSelectedNode(null); }}
                    disabled={saving}
                    className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saveMsg || 'Save Changes'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Buttons — bottom-right */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-10">
        <button
          onClick={() => setShowAgentsModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-surface-container-lowest text-primary font-bold rounded-xl shadow-sm active:scale-95 transition-all border border-outline-variant/20"
        >
          <Layers size={16} />
          <span>My Agents</span>
        </button>
        <button
          onClick={() => setShowTestModal(true)}
          disabled={!activeAgent}
          className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-xl active:scale-95 transition-all disabled:opacity-40"
        >
          <TestTube size={16} />
          <span>Test Agent</span>
        </button>
      </div>

      {/* My Agents Modal */}
      <AnimatePresence>
        {showAgentsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-6 flex flex-col gap-5 text-on-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers size={20} />
                    <h3 className="text-xl font-bold">My Agents</h3>
                  </div>
                  <button onClick={() => setShowAgentsModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                    <X size={22} />
                  </button>
                </div>
                <button
                  onClick={() => { setShowAgentsModal(false); setShowCreateModal(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary font-bold rounded-xl shadow-sm hover:bg-surface-container-low transition-colors"
                >
                  <Plus size={16} />
                  Create New Agent
                </button>
              </div>

              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {agentsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-secondary" /></div>
                ) : agents && agents.length > 0 ? agents.map((agent, idx) => (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${idx === activeAgentIndex
                      ? 'border-secondary bg-secondary-container/30'
                      : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                      }`}
                    onClick={() => { setActiveAgentIndex(idx); setShowAgentsModal(false); }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                      <Bot size={18} className="text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary truncate">{agent.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{agent.description || agent.llm_model}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${agent.status === 'published'
                        ? 'bg-secondary-container text-secondary'
                        : 'bg-surface-container text-on-surface-variant'
                        }`}>{agent.status.toUpperCase()}</span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                        disabled={deletingId === agent.id}
                        className="p-1.5 rounded-lg hover:bg-error-container hover:text-error transition-colors text-on-surface-variant disabled:opacity-40"
                        title="Delete agent"
                      >
                        {deletingId === agent.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-on-surface-variant py-8">No agents yet</p>
                )}
              </div>

              <div className="p-6 border-t border-outline-variant/10">
                <button
                  onClick={() => setShowAgentsModal(false)}
                  className="w-full py-3 bg-surface-container-high text-primary font-bold rounded-xl hover:bg-surface-container-highest transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Test Modal */}
      <AnimatePresence>
        {showTestModal && activeAgent && (
          <VoiceTestModal
            agentId={activeAgent.id}
            agentName={activeAgent.name}
            onClose={() => setShowTestModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Create Agent Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-primary p-6 flex items-center justify-between text-on-primary">
                <div className="flex items-center gap-3">
                  <Bot size={20} />
                  <h3 className="text-xl font-bold">Create Voice Agent</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleCreateAgent}>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Agent Name <span className="text-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Front Desk Alex"
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Description <span className="text-error">*</span></label>
                    <input
                      type="text"
                      required
                      value={createForm.description}
                      onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Handles hotel reservations"
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">AI Voice</label>
                    <select
                      value={createForm.voice}
                      onChange={e => setCreateForm(f => ({ ...f, voice: e.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-secondary"
                    >
                      {VOICE_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">LLM Model</label>
                    <select
                      value={createForm.llm_model}
                      onChange={e => setCreateForm(f => ({ ...f, llm_model: e.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-primary outline-none focus:ring-2 focus:ring-secondary"
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                      <option value="gpt-4o">GPT-4o (Powerful)</option>
                    </select>
                  </div>
                </div>

                <div className="p-6 border-t border-outline-variant/10 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-surface-container-high text-primary font-bold rounded-xl hover:bg-surface-container-highest transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createForm.name || !createForm.description}
                    className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Create Agent
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
