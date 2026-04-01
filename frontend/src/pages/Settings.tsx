import { useState, useEffect, useRef } from 'react';
import { User, Mic, Share2, Sparkles, Upload, PlayCircle, Trash2, Loader2, Save, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi, apiPut, apiUploadFile, apiDelete } from '../hooks/useApi';

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

export default function Settings() {
  const { data: agents, loading, refetch: refetchAgents } = useApi<Agent[]>('/api/agents');
  const activeAgent: Agent | null = agents && agents.length > 0 ? agents[0] : null;

  const { data: files, loading: filesLoading, refetch: refetchFiles } = useApi<KnowledgeFile[]>(
    activeAgent ? `/api/agents/${activeAgent.id}/files` : '',
    [activeAgent?.id]
  );

  const [form, setForm] = useState({
    name: '',
    description: '',
    instructions: '',
    welcome_message: '',
    voice: 'aura-2-odysseus-en',
    llm_model: 'gpt-4o-mini',
    language: 'en',
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeAgent) {
      setForm({
        name: activeAgent.name,
        description: activeAgent.description || '',
        instructions: activeAgent.instructions || '',
        welcome_message: activeAgent.welcome_message || '',
        voice: activeAgent.voice || 'aura-2-odysseus-en',
        llm_model: activeAgent.llm_model || 'gpt-4o-mini',
        language: activeAgent.language || 'en',
      });
    }
  }, [activeAgent?.id]);

  const handleSave = async () => {
    if (!activeAgent) return;
    setSaving(true);
    try {
      await apiPut(`/api/agents/${activeAgent.id}`, form);
      setSaveMsg('Saved successfully!');
      refetchAgents();
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
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

  if (loading) {
    return (
      <main className="pt-32 px-8 pb-12 bg-surface min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary" />
      </main>
    );
  }

  if (!activeAgent) {
    return (
      <main className="pt-32 px-8 pb-12 bg-surface min-h-screen">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-on-surface-variant font-medium">No agents found. Create one in Workflows first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 px-8 pb-12 bg-surface min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">

          {/* Section: Identity */}
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Agent Identity</h2>
                <p className="text-sm text-on-surface-variant">Configure the public profile of your voice agent</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Agent Name</label>
                <input
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  placeholder="e.g. Hotel Support Bot"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">LLM Model</label>
                <select
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  value={form.llm_model}
                  onChange={e => setForm(f => ({ ...f, llm_model: e.target.value }))}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (fast, affordable)</option>
                  <option value="gpt-4o">GPT-4o (high quality)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (budget)</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Description</label>
                <input
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  placeholder="Brief description of what this agent does"
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Welcome Message</label>
                <input
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  placeholder="Hello! How can I help you today?"
                  type="text"
                  value={form.welcome_message}
                  onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Section: Instructions */}
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">System Instructions</h2>
                <p className="text-sm text-on-surface-variant">Tell the AI how to behave, its role, and any rules</p>
              </div>
            </div>
            <textarea
              rows={8}
              className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none resize-none"
              placeholder={"You are [Agent Name], a helpful voice assistant for [Business Name].\n\nRules:\n- Always be polite and professional\n- If asked about pricing, check the knowledge base\n- For orders, use the place_order function\n- Keep responses brief (max 2-3 sentences for voice)"}
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            />
          </section>

          {/* Section: Voice */}
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <Mic size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Voice Architecture</h2>
                <p className="text-sm text-on-surface-variant">Configure the sonic personality of your agent</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">TTS Voice</label>
                <select
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  value={form.voice}
                  onChange={e => setForm(f => ({ ...f, voice: e.target.value }))}
                >
                  {VOICE_OPTIONS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Language</label>
                <select
                  className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-secondary rounded-lg px-4 py-3 text-on-surface transition-all outline-none"
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="ar">Arabic</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Knowledge Files */}
          <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Knowledge Base</h2>
                <p className="text-sm text-on-surface-variant">Upload files the agent reads to answer questions (CSV, PDF, TXT)</p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border border-dashed border-outline-variant bg-surface-container-low rounded-xl text-center group hover:bg-surface-container transition-colors cursor-pointer mb-4"
            >
              <div className="mb-4">
                {uploading
                  ? <Loader2 size={40} className="text-secondary mx-auto animate-spin" />
                  : <Upload size={40} className="text-secondary opacity-60 group-hover:scale-110 transition-transform mx-auto" />
                }
              </div>
              <h3 className="font-bold text-primary mb-1">{uploading ? 'Uploading...' : 'Upload Knowledge File'}</h3>
              <p className="text-sm text-on-surface-variant mb-4">Drag and drop or click to upload CSV, PDF, or TXT files</p>
              <div className="flex justify-center gap-2">
                <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-on-surface-variant">MAX 10MB</span>
                <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-on-surface-variant">CSV • PDF • TXT</span>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.pdf,.txt" onChange={handleFileUpload} className="hidden" />
            </div>

            {filesLoading ? (
              <div className="text-center py-4"><Loader2 size={20} className="animate-spin text-secondary mx-auto" /></div>
            ) : files && files.length > 0 ? (
              <div className="space-y-2">
                {files.map(f => (
                  <div key={f.id} className="bg-surface-container rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText size={24} className="text-secondary" />
                      <div>
                        <p className="text-sm font-bold text-primary">{f.filename}</p>
                        <p className="text-xs text-on-surface-variant">{f.filetype.toUpperCase()} • {(f.filesize / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteFile(f.id)} className="text-error hover:bg-error-container p-2 rounded-full transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-4 opacity-60">No files uploaded yet</p>
            )}
          </section>

          {/* Section: Routing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
              <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
                <Share2 size={20} className="text-secondary" />
                Routing Logic
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Auto-Reply Orders via Telegram', sub: 'Send summary to admin on every order' },
                  { label: 'Wait Confirmation Message', sub: 'Tell caller "please wait while I search..."' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-on-surface-variant">{item.sub}</p>
                    </div>
                    <div className="w-12 h-6 bg-secondary-container rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary text-on-primary rounded-xl p-8 flex flex-col justify-between shadow-lg">
              <div>
                <Sparkles size={32} className="mb-4 opacity-50" />
                <h3 className="font-bold text-xl leading-tight">Parrot Pod AI</h3>
                <p className="text-xs mt-2 opacity-70">Powered by Deepgram + OpenAI + LiveKit. Your voice, your rules.</p>
              </div>
              <div className="mt-6 text-xs opacity-70 space-y-1">
                <p>🎙️ STT: Deepgram Nova-2</p>
                <p>🧠 LLM: {form.llm_model}</p>
                <p>🔊 TTS: Deepgram Aura-2</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-10 flex items-center justify-between border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant opacity-60">
              {saveMsg || `Last updated: ${activeAgent.updated_at?.split('T')[0] || 'never'}`}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setForm({
                  name: activeAgent.name,
                  description: activeAgent.description || '',
                  instructions: activeAgent.instructions || '',
                  welcome_message: activeAgent.welcome_message || '',
                  voice: activeAgent.voice,
                  llm_model: activeAgent.llm_model,
                  language: activeAgent.language,
                })}
                className="px-8 py-3 text-secondary font-bold hover:bg-surface-container-high rounded-lg transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-10 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saveMsg || 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        <footer className="py-12 text-center">
          <p className="text-xs text-on-surface-variant opacity-50 font-medium tracking-widest uppercase">Parrot Pod Voice Agent Builder v1.0</p>
        </footer>
      </div>
    </main>
  );
}
