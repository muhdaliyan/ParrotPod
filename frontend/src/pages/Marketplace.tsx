import { useState } from 'react';
import { Bot, Search, Filter, Star, ArrowRight, Plus, Loader2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiPost } from '../hooks/useApi';


const TEMPLATE_AGENTS = [
  { id: 'tpl-1', name: 'Customer Support Agent', description: 'Handles common inquiries, support tickets, and FAQs with a friendly tone.', rating: 4.8, users: '2.4k', category: 'Support', instructions: 'You are a helpful customer support agent. Answer questions politely and concisely. For orders, use the place_order function.' },
  { id: 'tpl-2', name: 'Hotel Booking Assistant', description: 'Specialized in room reservations, amenities info, and guest services.', rating: 4.9, users: '1.2k', category: 'Hospitality', instructions: 'You are a hotel concierge. Help guests with room bookings, amenities, restaurant reservations, and local attraction info. Always check the knowledge base for pricing.' },
  { id: 'tpl-3', name: 'Real Estate Concierge', description: 'Qualifies leads, schedules property viewings, and answers listing questions.', rating: 4.7, users: '800', category: 'Real Estate', instructions: 'You are a professional real estate assistant. Help qualify buyers and sellers, answer questions about properties, and schedule viewings.' },
  { id: 'tpl-4', name: 'Restaurant Order Bot', description: 'Takes food orders, handles special requests, and gives menu info.', rating: 4.6, users: '1.5k', category: 'Food & Beverage', instructions: 'You are a restaurant voice assistant. Help customers with menu questions and take orders. Always use the place_order function when a customer wants to order food.' },
];

const NUMBERS = [
  { id: 1, number: '+1 (555) 012-3456', location: 'New York, USA', price: '$15/mo', type: 'Local' },
  { id: 2, number: '+44 20 7946 0958', location: 'London, UK', price: '$12/mo', type: 'Toll-Free' },
  { id: 3, number: '+61 2 9876 5432', location: 'Sydney, AU', price: '$18/mo', type: 'Local' },
];

export default function Marketplace() {
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDeployTemplate = async (tpl: typeof TEMPLATE_AGENTS[0]) => {
    setCreating(tpl.id);
    try {
      await apiPost('/api/agents', {
        name: tpl.name,
        description: tpl.description,
        instructions: tpl.instructions,
        welcome_message: `Hello! I'm ${tpl.name}. How can I help you today?`,
        voice: 'aura-2-odysseus-en',
        llm_model: 'gpt-4o-mini',
      });
      showToast(`✅ "${tpl.name}" added to your agents!`);
    } catch {
      showToast('❌ Failed to create agent');
    } finally {
      setCreating(null);
    }
  };

  const filteredTemplates = TEMPLATE_AGENTS.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agent templates..."
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-secondary outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-4 bg-surface-container-low rounded-2xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
            <Filter size={20} />
            Filters
          </button>
        </div>

        {/* Phone Numbers Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Phone size={24} className="text-secondary" />
              Available Phone Numbers
            </h2>
            <span className="px-3 py-1 bg-secondary-container text-secondary text-xs font-bold rounded-full">Coming Soon</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NUMBERS.map(num => (
              <motion.div key={num.id} whileHover={{ y: -5 }} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 opacity-60">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-widest">{num.type}</span>
                  <span className="text-lg font-black text-primary">{num.price}</span>
                </div>
                <h3 className="text-xl font-bold text-primary mb-1">{num.number}</h3>
                <p className="text-sm text-on-surface-variant mb-6">{num.location}</p>
                <button
                  onClick={() => showToast('📞 Phone number purchasing coming soon!')}
                  className="w-full py-3 bg-surface-container text-on-surface-variant font-bold rounded-xl cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Agent Templates Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Bot size={24} className="text-secondary" />
              Agent Templates
            </h2>
            <button className="text-secondary font-bold text-sm flex items-center gap-1 hover:underline">
              View All <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTemplates.map(agent => (
              <motion.div key={agent.id} whileHover={{ y: -5 }} className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary">
                    <Bot size={20} />
                  </div>
                  <div className="flex items-center gap-1 text-secondary font-bold text-xs">
                    <Star size={14} className="fill-current" />
                    {agent.rating}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full w-fit mb-2">{agent.category}</span>
                <h3 className="text-lg font-bold text-primary mb-2 leading-tight">{agent.name}</h3>
                <p className="text-xs text-on-surface-variant mb-4 flex-1">{agent.description}</p>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{agent.users} users</span>
                </div>
                <button
                  onClick={() => handleDeployTemplate(agent)}
                  disabled={creating === agent.id}
                  className="w-full py-3 bg-surface-container-high text-primary font-bold rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {creating === agent.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creating === agent.id ? 'Adding...' : 'Add to My Agents'}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
