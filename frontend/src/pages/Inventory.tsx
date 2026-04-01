import { useState } from 'react';
import { Phone, Bot, Loader2, CheckCircle, Link, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi, apiPost } from '../hooks/useApi';

interface Agent {
  id: number;
  name: string;
  description: string;
  status: string;
  phone_number: string;
  created_at: string;
}

interface PhoneNumber {
  id: string;
  e164_format: string;
  alias?: string;
  sip_dispatch_rule_id?: string;
  sip_dispatch_rule_ids?: string[];
}

export default function Inventory() {
  const [toast, setToast] = useState('');
  const [assigning, setAssigning] = useState<PhoneNumber | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: agents, loading: agentsLoading } = useApi<Agent[]>('/api/agents');
  const { data: numbersData, loading: numbersLoading, refetch: refetchNumbers } = useApi<{items: PhoneNumber[]}>('/api/telephony/numbers');
  const numbers = numbersData?.items || [];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAssign = async (agentId: number, force = false) => {
    if (!assigning) return;
    
    // Check if number is already assigned to someone else
    const previousAgent = agents?.find(a => a.phone_number === assigning.e164_format);
    if (previousAgent && previousAgent.id !== agentId && !force) {
      if (!confirm(`This number is already assigned to "${previousAgent.name}". Are you sure you want to re-assign it to this agent?`)) {
        return;
      }
    }

    setIsAssigning(true);
    try {
      await apiPost('/api/telephony/numbers/assign', {
        phone_number: assigning.e164_format,
        agent_id: agentId
      });
      showToast(`✅ Number assigned to agent!`);
      setAssigning(null);
      refetchNumbers();
    } catch (err) {
      showToast('❌ Failed to assign number');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="pt-32 px-8 pb-12 bg-surface min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Toast */}
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

        {/* Modal for Assigning Agent */}
        <AnimatePresence>
          {assigning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-primary">Assign Agent to {assigning.e164_format}</h3>
                  <button onClick={() => setAssigning(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <p className="text-sm text-on-surface-variant mb-6">Select an agent to route incoming calls from this number.</p>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {agents?.map(agent => (
                    <button
                      key={agent.id}
                      disabled={isAssigning}
                      onClick={() => handleAssign(agent.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors text-left border border-outline-variant/10 group"
                    >
                      <div className="w-10 h-10 bg-secondary-container flex items-center justify-center rounded-xl text-secondary group-hover:scale-110 transition-transform">
                        <Bot size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-primary">{agent.name}</p>
                        <p className="text-[10px] text-on-surface-variant line-clamp-1">{agent.description || 'No description'}</p>
                      </div>
                    </button>
                  ))}
                  {(!agents || agents.length === 0) && (
                    <p className="text-center py-8 text-on-surface-variant opacity-60">No agents found</p>
                  )}
                </div>

                {isAssigning && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-secondary font-bold">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Assigning...</span>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Your Agents Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Bot size={24} className="text-secondary" />
              Your Agents
            </h2>
          </div>
          {agentsLoading ? (
            <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-secondary mx-auto" /></div>
          ) : agents && agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {agents.map(agent => (
                <motion.div key={agent.id} whileHover={{ y: -4 }} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary">
                      <Bot size={20} />
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${agent.status === 'published' ? 'bg-secondary-container text-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2 leading-tight">{agent.name}</h3>
                  <p className="text-xs text-on-surface-variant mb-4 flex-1">{agent.description || 'No description set'}</p>
                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                    <CheckCircle size={12} className="text-secondary" />
                    Created {new Date(agent.created_at).toLocaleDateString()}
                  </div>
                  {agent.phone_number && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/5 flex items-center gap-2">
                       <Phone size={12} className="text-secondary" />
                       <span className="text-[10px] font-bold text-primary">{agent.phone_number}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-surface-container-lowest rounded-2xl">
              <Bot size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-on-surface-variant font-medium">No agents yet</p>
            </div>
          )}
        </section>

        {/* Phone Numbers Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Phone size={24} className="text-secondary" />
              Your Numbers
            </h2>
          </div>
          {numbersLoading ? (
            <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-secondary mx-auto" /></div>
          ) : numbers && numbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {numbers.map(num => (
                <motion.div key={num.id} whileHover={{ y: -5 }} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${
                      (num.sip_dispatch_rule_id || num.sip_dispatch_rule_ids?.length) 
                        ? 'bg-secondary-container text-secondary' 
                        : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      {(num.sip_dispatch_rule_id || num.sip_dispatch_rule_ids?.length) ? 'Active' : 'Unassigned'}
                    </span>
                    <Phone size={16} className="text-secondary opacity-40" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-1">{num.e164_format}</h3>
                  <p className="text-sm text-on-surface-variant mb-6">{num.alias || 'LiveKit Number'}</p>
                  <button
                    onClick={() => setAssigning(num)}
                    className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity font-bold"
                  >
                    <Link size={16} />
                    Assign to Agent
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-outline-variant/20">
              <Phone size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-on-surface-variant font-medium">No phone numbers found in your LiveKit account</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
