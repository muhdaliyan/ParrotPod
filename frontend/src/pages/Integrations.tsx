import { useState } from 'react';
import { Puzzle, CheckCircle2, ChevronRight, X, Send, Bot, Hash, AlertCircle } from 'lucide-react';
import { useApi, apiPost, apiDelete } from '../hooks/useApi';

interface TelegramConfig {
  bot_token?: string;
  chat_id?: string;
  is_integrated: boolean;
}

export default function Integrations() {
  const { data: telegram, loading, refetch } = useApi<TelegramConfig>('/api/config/telegram');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnectTelegram = () => {
    if (telegram?.is_integrated) {
      setBotToken(telegram.bot_token || '');
      setChatId(telegram.chat_id || '');
    }
    setTestResult(null);
    setShowTelegramModal(true);
  };

  const handleTestTelegram = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/api/config/telegram/test', {
        bot_token: botToken,
        chat_id: chatId
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiPost('/api/config/telegram', {
        bot_token: botToken,
        chat_id: chatId
      });
      await refetch();
      setShowTelegramModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('Are you sure you want to disconnect Telegram?')) return;
    try {
      await apiDelete('/api/config/telegram');
      await refetch();
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message);
    }
  };

  return (
    <div className="pt-32 px-8 pb-12 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-on-surface mb-2 tracking-tight">Integrations</h1>
        <p className="text-on-surface-variant text-lg">Connect Parrot Pod with your favorite tools to automate your workflow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Telegram Card */}
        <div className="group relative bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
              <Send size={28} />
            </div>
            {telegram?.is_integrated ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-success-container/30 text-success rounded-full text-xs font-bold border border-success/20">
                <CheckCircle2 size={12} />
                <span>Connected</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-on-surface-variant/10 text-on-surface-variant rounded-full text-xs font-bold border border-outline-variant/20">
                <span>Not Connected</span>
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-on-surface mb-3">Telegram Bot</h3>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            Get instant notifications on Telegram whenever your AI agent takes an action or records an order.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleConnectTelegram}
              className={`w-full py-4 rounded-2xl font-black tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                telegram?.is_integrated 
                ? 'bg-secondary/10 text-secondary hover:bg-secondary/20' 
                : 'bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]'
              }`}
            >
              {telegram?.is_integrated ? 'Configure' : 'Connect Now'}
              <ChevronRight size={18} />
            </button>
            
            {telegram?.is_integrated && (
              <button 
                onClick={handleDisconnectTelegram}
                className="w-full py-4 text-error text-sm font-bold hover:bg-error/10 rounded-2xl transition-all duration-300"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp Card (Placeholder) */}
        <div className="group relative bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366]">
              <Puzzle size={28} />
            </div>
            <div className="px-3 py-1 bg-on-surface-variant/10 text-on-surface-variant rounded-full text-xs font-bold border border-outline-variant/20">
              <span>Coming Soon</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-3">WhatsApp</h3>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            Connect with your customers directly on WhatsApp for seamless voice-to-chat experiences.
          </p>
          <button disabled className="w-full py-4 bg-on-surface-variant/10 text-on-surface-variant rounded-2xl font-black cursor-not-allowed">
            Locked
          </button>
        </div>
      </div>

      {/* Telegram Setup Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowTelegramModal(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-md rounded-[2.5rem] border border-outline-variant/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Send size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tight">Telegram Setup</h2>
                </div>
                <button 
                  onClick={() => setShowTelegramModal(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTelegram} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant flex items-center gap-2 ml-1">
                    <Bot size={14} />
                    Bot Token
                  </label>
                  <input 
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Enter your Bot Token"
                    className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/30"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant/60 ml-1">
                    Get this from @BotFather on Telegram.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant flex items-center gap-2 ml-1">
                    <Hash size={14} />
                    Chat ID
                  </label>
                  <input 
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/30"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant/60 ml-1">
                    The numeric ID of the chat/user where alerts will be sent.
                  </p>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm border ${
                    testResult.success 
                    ? 'bg-success-container/20 border-success/20 text-success' 
                    : 'bg-error-container/20 border-error/20 text-error'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                    <p>{testResult.message}</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-error-container/20 border border-error/20 rounded-2xl flex items-start gap-3 text-error text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={isTesting || !botToken || !chatId}
                      className="flex-1 py-4 rounded-2xl font-bold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isTesting ? 'Testing...' : 'Test'}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-[2] py-4 rounded-2xl font-black bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? 'Saving...' : 'Save Configuration'}
                      {!isSaving && <CheckCircle2 size={18} />}
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowTelegramModal(false)}
                    className="w-full py-3 rounded-2xl font-bold text-on-surface-variant hover:bg-on-surface/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
