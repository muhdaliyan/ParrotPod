import { MessageSquare, QrCode, RefreshCw, Shield, Zap, Send, Bot, Hash, Bell, ExternalLink } from 'lucide-react';

interface IntegrationsDocProps {
    theme: 'light' | 'dark';
}

const Integrations = ({ theme }: IntegrationsDocProps) => {
    const isDark = theme === 'dark';
    
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                    <span className="w-8 h-px bg-primary/30"></span>
                    Channel Support
                </div>
                <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#18181B]'} mb-6`}>
                    Integrations
                </h1>
                <p className={`text-xl ${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} leading-relaxed max-w-2xl`}>
                    Connect ParrotPod with your favorite messaging platforms to expand your AI agent's reach and receive instant notifications.
                </p>
            </header>

            {/* WhatsApp Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center">
                        <MessageSquare size={24} />
                    </div>
                    <h2 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#18181B]'}`}>WhatsApp</h2>
                </div>

                <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <QrCode size={80} className="text-[#25D366]" />
                    </div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4 flex items-center gap-3`}>
                        Linking Your Account
                    </h3>
                    <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} mb-6 leading-relaxed`}>
                        ParrotPod uses a secure Multi-Device protocol. Scan the QR code in the Integrations panel to link your account.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            "Open WhatsApp > Linked Devices",
                            "Tap 'Link a Device'",
                            "Scan the ParrotPod QR code",
                            "Wait for 'Connected' status"
                        ].map((step, i) => (
                            <div key={i} className={`p-4 rounded-2xl ${isDark ? 'bg-[#09090B]' : 'bg-[#FAFAFA]'} border border-outline-variant/10 flex items-center gap-3`}>
                                <div className="w-6 h-6 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center text-[10px] font-black shrink-0">
                                    {i + 1}
                                </div>
                                <span className={`text-xs font-medium ${isDark ? 'text-[#D4D4D8]' : 'text-[#3F3F46]'}`}>{step}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border shadow-sm`}>
                        <RefreshCw className="text-blue-500 mb-3" size={24} />
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Session Persistence</h4>
                        <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                            Sessions are saved in <code>backend/whatsapp_sessions/</code>. No re-scans needed on server restarts.
                        </p>
                    </div>
                    <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border shadow-sm`}>
                        <Shield className="text-yellow-500 mb-3" size={24} />
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Safe Usage</h4>
                        <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                            Use the <strong>Reset & Fix</strong> button if the bridge hangs. Avoid spamming to keep your account safe.
                        </p>
                    </div>
                </div>
            </section>

            {/* Telegram Section */}
            <section className="space-y-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0088CC]/10 text-[#0088CC] rounded-xl flex items-center justify-center">
                        <Send size={24} />
                    </div>
                    <h2 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#18181B]'}`}>Telegram</h2>
                </div>

                <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Bot size={80} className="text-[#0088CC]" />
                    </div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4`}>Bot Setup Guide</h3>
                    <div className="space-y-4">
                        <div className={`p-5 rounded-2xl ${isDark ? 'bg-[#09090B]' : 'bg-[#FAFAFA]'} border border-outline-variant/10`}>
                            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                Step 1: Create Bot
                            </h4>
                            <p className={`text-xs ${isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'} leading-relaxed`}>
                                Message <strong>@BotFather</strong> on Telegram and send <code>/newbot</code>. Copy the provided <strong>HTTP API Token</strong>.
                            </p>
                        </div>
                        <div className={`p-5 rounded-2xl ${isDark ? 'bg-[#09090B]' : 'bg-[#FAFAFA]'} border border-outline-variant/10`}>
                            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                Step 2: Get Chat ID
                            </h4>
                            <p className={`text-xs ${isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'} leading-relaxed`}>
                                Message <strong>@userinfobot</strong> to get your numeric ID (e.g. <code>123456789</code>). Use this in the Integration settings.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border shadow-sm`}>
                        <Bell className="text-green-500 mb-3" size={24} />
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Instant Alerts</h4>
                        <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                            Enable Telegram in your <strong>Agent Workflows</strong> to receive real-time order and event logs.
                        </p>
                    </div>
                    <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border shadow-sm flex flex-col justify-between`}>
                        <div>
                            <Hash className="text-blue-400 mb-3" size={24} />
                            <h4 className={`font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Group Support</h4>
                            <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed mb-4`}>
                                You can also add your bot to a group to notify your entire team.
                            </p>
                        </div>
                        <a href="https://core.telegram.org/bots" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                            Telegram Bot API <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Integrations;
