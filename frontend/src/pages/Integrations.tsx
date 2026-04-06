import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, X, Send, Bot, Hash, AlertCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useApi, apiPost, apiDelete } from '../hooks/useApi';

interface TelegramConfig {
  bot_token?: string;
  chat_id?: string;
  is_integrated: boolean;
}

interface WhatsAppStatus {
  status: string;
  qr_code: string | null;
}

export default function Integrations() {
  // Telegram State
  const { data: telegram, refetch: refetchTelegram } = useApi<TelegramConfig>('/api/config/telegram');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // WhatsApp State
  const { data: whatsapp, refetch: refetchWhatsApp } = useApi<WhatsAppStatus>('/api/config/whatsapp/status');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Poll WhatsApp status when modal is open
  useEffect(() => {
    let interval: any;
    if (showWhatsAppModal) {
      // Immediate fetch on open
      refetchWhatsApp();
      interval = setInterval(() => {
        refetchWhatsApp();
      }, 5000); // Increased to 5s to reduce spam
    }
    return () => clearInterval(interval);
  }, [showWhatsAppModal, refetchWhatsApp]);

  const handleConnectTelegram = () => {
    if (telegram?.is_integrated) {
      setBotToken(telegram.bot_token || '');
      setChatId(telegram.chat_id || '');
    }
    setTelegramTestResult(null);
    setShowTelegramModal(true);
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    setTelegramError(null);
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/api/config/telegram/test', {
        bot_token: botToken,
        chat_id: chatId
      });
      setTelegramTestResult(res);
    } catch (err: any) {
      setTelegramTestResult({ success: false, message: err.message || 'Test failed' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    setTelegramError(null);
    try {
      await apiPost('/api/config/telegram', {
        bot_token: botToken,
        chat_id: chatId
      });
      await refetchTelegram();
      setShowTelegramModal(false);
    } catch (err: any) {
      setTelegramError(err.message || 'Failed to save configuration');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!confirm('Are you sure you want to disconnect Telegram?')) return;
    try {
      await apiDelete('/api/config/telegram');
      await refetchTelegram();
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    try {
      await apiPost('/api/config/whatsapp/disconnect', {});
      await refetchWhatsApp();
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

        {/* WhatsApp Card */}
        <div className="group relative bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 hover:border-[#25D366]/30 transition-all duration-500 hover:shadow-2xl hover:shadow-[#25D366]/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#25D366]/10 transition-colors duration-500"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-[#25D366]/10 rounded-2xl flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform duration-500">
              <MessageSquare size={28} />
            </div>
            {whatsapp?.status === 'CONNECTED' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-success-container/30 text-success rounded-full text-xs font-bold border border-success/20">
                <CheckCircle2 size={12} />
                <span>Linked</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-on-surface-variant/10 text-on-surface-variant rounded-full text-xs font-bold border border-outline-variant/20">
                <span>{whatsapp?.status === 'SCAN_REQUIRED' ? 'Scan Required' : 'Not Linked'}</span>
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-on-surface mb-3">WhatsApp</h3>
          <p className="text-on-surface-variant mb-8 leading-relaxed">
            Connect your personal WhatsApp account by scanning a QR code. Your agent will respond to messages automatically.
          </p>

          <div className="space-y-3">
            <button 
              onClick={() => setShowWhatsAppModal(true)}
              className={`w-full py-4 rounded-2xl font-black tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                whatsapp?.status === 'CONNECTED' 
                ? 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20' 
                : 'bg-[#25D366] text-white hover:shadow-lg hover:shadow-[#25D366]/20 active:scale-[0.98]'
              }`}
            >
              {whatsapp?.status === 'CONNECTED' ? 'Manage' : 'Link Device'}
              <ChevronRight size={18} />
            </button>
            
            {whatsapp?.status === 'CONNECTED' && (
              <button 
                onClick={handleDisconnectWhatsApp}
                className="w-full py-4 text-error text-sm font-bold hover:bg-error/10 rounded-2xl transition-all duration-300"
              >
                Disconnect
              </button>
            )}
          </div>
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

                {telegramTestResult && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm border ${
                    telegramTestResult.success 
                    ? 'bg-success-container/20 border-success/20 text-success' 
                    : 'bg-error-container/20 border-error/20 text-error'
                  }`}>
                    {telegramTestResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                    <p>{telegramTestResult.message}</p>
                  </div>
                )}

                {telegramError && (
                  <div className="p-4 bg-error-container/20 border border-error/20 rounded-2xl flex items-start gap-3 text-error text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{telegramError}</p>
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={isTestingTelegram || !botToken || !chatId}
                      className="flex-1 py-4 rounded-2xl font-bold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isTestingTelegram ? 'Testing...' : 'Test'}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSavingTelegram}
                      className="flex-[2] py-4 rounded-2xl font-black bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingTelegram ? 'Saving...' : 'Save Configuration'}
                      {!isSavingTelegram && <CheckCircle2 size={18} />}
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

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowWhatsAppModal(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-sm rounded-[2rem] border border-outline-variant/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center text-[#25D366]">
                    <MessageSquare size={20} />
                  </div>
                  <h2 className="text-xl font-black text-on-surface tracking-tight">WhatsApp Link</h2>
                </div>
                <button 
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-1.5 hover:bg-on-surface/5 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                {whatsapp?.status === 'CONNECTED' ? (
                  <div className="space-y-4 py-4">
                    <div className="w-16 h-16 bg-success-container/20 text-success rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-on-surface">Successfully Linked!</h3>
                      <p className="text-on-surface-variant text-xs px-2">
                        Parrot Pod is now monitoring your WhatsApp messages.
                      </p>
                    </div>
                    <button 
                      onClick={handleDisconnectWhatsApp}
                      className="mt-2 px-6 py-2 bg-error/10 text-error rounded-lg font-bold hover:bg-error/20 transition-all border border-error/10 text-sm"
                    >
                      Disconnect Account
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-on-surface-variant text-sm leading-tight">
                      Scan the code with your phone's <strong>Linked Devices</strong>.
                    </p>
                    
                    <div className="relative w-48 h-48 bg-white p-3 rounded-2xl border border-outline-variant/20 shadow-inner flex items-center justify-center">
                      {whatsapp?.qr_code ? (
                        <img src={whatsapp.qr_code} alt="WhatsApp QR Code" className="w-full h-full" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                          <Loader2 size={24} className="animate-spin text-primary" />
                          <span className="text-[10px] font-bold">Generating QR Code...</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-2 pt-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => refetchWhatsApp()}
                          className="flex-1 py-2 bg-primary/5 text-primary rounded-xl text-[11px] font-bold hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Loader2 size={12} className={whatsapp?.status === 'DISCONNECTED' ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('This will clear all WhatsApp session data. Continue?')) {
                              await apiPost('/api/config/whatsapp/reset', {});
                              refetchWhatsApp();
                            }
                          }}
                          className="flex-1 py-2 bg-error/5 text-error rounded-xl text-[11px] font-bold hover:bg-error/10 transition-all flex items-center justify-center gap-2"
                        >
                          Reset & Fix
                        </button>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-surface-container border border-outline-variant/10 rounded-xl text-left text-[11px] text-on-surface-variant">
                        <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 font-bold">1</div>
                        <span>Open WhatsApp &gt; <strong>Linked Devices</strong></span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-surface-container border border-outline-variant/10 rounded-xl text-left text-[11px] text-on-surface-variant">
                        <div className="w-5 h-5 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 font-bold">2</div>
                        <span>Tap <strong>Link a Device</strong> and scan the code</span>
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-full py-2 text-on-surface-variant text-sm font-bold hover:bg-on-surface/5 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
