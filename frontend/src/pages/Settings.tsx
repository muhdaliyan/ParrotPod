import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi, apiPut } from '../hooks/useApi';

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

export default function Settings() {
  const { data: agents, loading, refetch: refetchAgents } = useApi<Agent[]>('/api/agents');
  const [toggling, setToggling] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleToggle = async (agent: Agent) => {
    setToggling(agent.id);
    const newStatus = agent.status === 'published' ? 'draft' : 'published';
    try {
      // Send the full agent object with updated status just in case backend expects all fields
      await apiPut(`/api/agents/${agent.id}`, {
        name: agent.name,
        description: agent.description || '',
        instructions: agent.instructions || '',
        welcome_message: agent.welcome_message || '',
        voice: agent.voice || 'aura-2-odysseus-en',
        llm_model: agent.llm_model || 'gpt-4o-mini',
        language: agent.language || 'en',
        status: newStatus
      });
      refetchAgents();
      showToast(`Agent "${agent.name}" is now ${newStatus}`);
    } catch {
      showToast('Failed to update agent status');
    } finally {
      setToggling(null);
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
    <main className="pt-32 px-8 pb-12 bg-surface min-h-screen">
      <div className="max-w-4xl mx-auto">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-10">
          <h1 className="text-3xl font-black text-primary mb-2 tracking-tight">Agent Publish Settings</h1>
          <p className="text-on-surface-variant font-medium">Manage the live status of your voice agents.</p>
        </div>

        {agents && agents.length > 0 ? (
          <div className="space-y-4">
            {agents.map((agent) => {
              const isLive = agent.status === 'published';
              const isLoading = toggling === agent.id;

              return (
                <div key={agent.id} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex items-center justify-between border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
                      <Bot size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        {agent.name}
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-full ${isLive ? 'bg-secondary-container text-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                          {isLive ? 'LIVE' : 'DRAFT'}
                        </span>
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-1">{agent.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isLoading && <Loader2 size={16} className="animate-spin text-secondary" />}
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(agent)}
                      disabled={isLoading}
                      className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${isLive ? 'bg-secondary' : 'bg-surface-container-highest'}`}
                      aria-pressed={isLive}
                    >
                      <span className="sr-only">Toggle agent live status</span>
                      <motion.div
                        className="w-6 h-6 bg-white rounded-full shadow-md"
                        layout
                        initial={false}
                        animate={{
                          x: isLive ? 24 : 0
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl">
            <Bot size={48} className="mx-auto mb-4 text-secondary/30" />
            <p className="text-on-surface-variant font-medium text-lg">No agents found.</p>
            <p className="text-sm text-on-surface-variant/70 mt-1">Create an agent in other sections first to manage its status here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
