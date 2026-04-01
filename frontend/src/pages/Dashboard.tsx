import { PhoneIncoming, PhoneForwarded, Timer, ArrowRight, Bot, Mic, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';

interface DashboardStats {
  total_agents: number;
  active_agents: number;
  total_sessions: number;
  sessions_today: number;
  total_orders: number;
  avg_duration_seconds: number;
  recent_sessions: {
    id: number;
    caller_id: string;
    livekit_room: string;
    duration_seconds: number;
    status: string;
    created_at: string;
    agent_name: string | null;
  }[];
  sessions_chart: { day: string; count: number }[];
}

function formatDuration(secs: number): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { data: stats, loading, error } = useApi<DashboardStats>('/api/dashboard/stats');

  if (loading) {
    return (
      <div className="pt-32 px-8 pb-12 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-on-surface-variant font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-32 px-8 pb-12">
        <div className="bg-error-container text-error rounded-2xl p-8 text-center">
          <p className="font-bold text-lg mb-2">Backend not reachable</p>
          <p className="text-sm opacity-80">Make sure <code>uvicorn main:app --reload</code> is running in the backend folder.</p>
        </div>
      </div>
    );
  }

  const s = stats!;

  // Chart normalization — guarantee exactly 7 columns so single days don't stretch to 100% width
  let chartBars = s.sessions_chart || [];
  if (chartBars.length < 7) {
    const padCount = 7 - chartBars.length;
    const padding = Array(padCount).fill(null).map((_, i) => ({ day: `Pad ${i}`, count: 0 }));
    chartBars = [...padding, ...chartBars];
  }
  const maxCount = Math.max(...chartBars.map((c) => c.count), 1);

  return (
    <div className="pt-32 px-8 pb-12">
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-12 gap-6 mb-12">
        {/* Large Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-3xl p-8 relative overflow-hidden group shadow-sm"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-secondary text-[10px] font-bold tracking-widest uppercase mb-4">
                Platform Overview
              </span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-6xl font-black text-primary">{s.total_sessions}</h3>
                <span className="text-secondary font-bold text-lg">total sessions</span>
              </div>
            </div>
            <div className="mt-8 flex gap-6 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Total Agents</span>
                <span className="text-2xl font-bold text-primary">{s.total_agents}</span>
              </div>
              <div className="w-px h-10 bg-outline-variant/20 mx-2" />
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Active</span>
                <span className="text-2xl font-bold text-primary">{s.active_agents}</span>
              </div>
              <div className="w-px h-10 bg-outline-variant/20 mx-2" />
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Orders</span>
                <span className="text-2xl font-bold text-primary">{s.total_orders}</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-surface-container rounded-full group-hover:scale-110 transition-transform duration-500" />
        </motion.div>

        {/* Sessions Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-5 bg-primary rounded-3xl p-8 text-on-primary flex flex-col justify-between relative overflow-hidden shadow-lg"
        >
          <div className="relative z-10">
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-primary-container opacity-70">Sessions Today</span>
            <h3 className="text-4xl font-extrabold mt-2">{s.sessions_today} Sessions</h3>
            <p className="text-on-primary-container text-sm mt-2 opacity-80">
              Avg duration: {formatDuration(Math.round(s.avg_duration_seconds))}
            </p>
          </div>
          <div className="flex items-end gap-1 mt-6 h-12 z-10">
            {chartBars.map((c, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${i === chartBars.length - 1 ? 'bg-white' : 'bg-white/30'}`}
                style={{ height: `${Math.max(8, (c.count / maxCount) * 100)}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Stat Cards */}
        {[
          { label: 'Total Sessions', value: s.total_sessions.toString(), sub: 'All time voice sessions', icon: PhoneIncoming },
          { label: 'Today', value: s.sessions_today.toString(), sub: 'Sessions started today', icon: PhoneForwarded },
          { label: 'Avg Duration', value: formatDuration(Math.round(s.avg_duration_seconds)), sub: 'Average session length', icon: Timer },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="col-span-12 md:col-span-4 bg-surface-container-low rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="text-secondary bg-surface-container-lowest p-2 rounded-lg" size={40} />
              <span className="text-on-surface-variant text-xs font-bold">{stat.label}</span>
            </div>
            <h4 className="text-2xl font-bold text-primary">{stat.value}</h4>
            <p className="text-xs text-on-surface-variant mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Sessions Table */}
      <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight">Recent Sessions</h2>
            <p className="text-sm text-on-surface-variant">Live feed of all voice agent sessions</p>
          </div>
          <button className="text-secondary font-bold text-sm flex items-center gap-1 hover:underline">
            View All
            <ArrowRight size={16} />
          </button>
        </div>

        {s.recent_sessions.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <Mic size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm opacity-70">Start testing your agents to see sessions here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-4">Agent / Caller</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-4">Time</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-4">Duration</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant px-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {s.recent_sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center">
                          <Bot size={16} className="text-secondary" />
                        </div>
                        <div>
                          <p className="font-bold text-primary">{session.agent_name || 'Unknown Agent'}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium">{session.caller_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-on-surface-variant font-medium">{formatTime(session.created_at)}</td>
                    <td className="py-5 px-4 text-on-surface-variant font-medium">
                      {session.status === 'active'
                        ? <span className="text-secondary text-[10px] font-bold bg-secondary-container px-2 py-0.5 rounded-full">● IN PROGRESS</span>
                        : formatDuration(session.duration_seconds)}
                    </td>
                    <td className="py-5 px-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        session.status === 'active'
                          ? 'bg-secondary-container text-secondary'
                          : session.status === 'ended'
                          ? 'bg-surface-container text-on-surface-variant'
                          : 'bg-error-container text-error'
                      }`}>
                        {session.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
