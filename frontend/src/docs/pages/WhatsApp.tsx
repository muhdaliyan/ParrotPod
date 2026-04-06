import { MessageSquare, QrCode, RefreshCw, Shield, Zap } from 'lucide-react';

interface WhatsAppProps {
    theme: 'light' | 'dark';
}

const WhatsApp = ({ theme }: WhatsAppProps) => {
    const isDark = theme === 'dark';
    
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12">
                <div className="flex items-center gap-2 text-[#25D366] text-xs font-bold uppercase tracking-widest mb-3">
                    <span className="w-8 h-px bg-[#25D366]/30"></span>
                    Integrations
                </div>
                <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#18181B]'} mb-6`}>
                    WhatsApp Integration
                </h1>
                <p className={`text-xl ${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} leading-relaxed max-w-2xl`}>
                    Connect your personal or business WhatsApp account to ParrotPod to enable automated AI responses and real-time event notifications.
                </p>
            </header>

            <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <MessageSquare size={80} className="text-[#25D366]" />
                </div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4 flex items-center gap-3`}>
                    <QrCode className="text-[#25D366]" />
                    Linking Your Device
                </h2>
                <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} mb-6 leading-relaxed`}>
                    ParrotPod uses the official Multi-Device protocol to link with your WhatsApp account. This process is secure and does not require your password.
                </p>
                <div className="space-y-4">
                    {[
                        "Open WhatsApp on your phone.",
                        "Navigate to Settings > Linked Devices.",
                        "Tap 'Link a Device'.",
                        "Scan the QR code displayed in the ParrotPod Integrations panel."
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                                {i + 1}
                            </div>
                            <p className={`text-sm ${isDark ? 'text-[#D4D4D8]' : 'text-[#3F3F46]'}`}>{step}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border`}>
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                        <RefreshCw size={20} />
                    </div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Session Persistence</h3>
                    <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                        Once linked, your session is saved locally in the `backend/whatsapp_sessions` directory. You won't need to re-scan the QR code even if you restart the server.
                    </p>
                </div>
                <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border`}>
                    <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mb-4">
                        <Zap size={20} />
                    </div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Instant Notifications</h3>
                    <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                        Enable WhatsApp in your Agent Workflows to receive instant order summaries and lead alerts directly on your personal phone.
                    </p>
                </div>
            </div>

            <section className={`p-8 rounded-3xl bg-yellow-500/5 border border-yellow-500/20`}>
                <div className="flex items-start gap-4">
                    <Shield className="text-yellow-500 shrink-0 mt-1" size={24} />
                    <div>
                        <h3 className="font-bold text-yellow-600 mb-2">Troubleshooting & Safety</h3>
                        <p className={`text-sm ${isDark ? 'text-yellow-200/60' : 'text-yellow-800/70'} leading-relaxed`}>
                            If the connection becomes unstable or fails to link, use the <strong>Reset & Fix</strong> button in the Integrations panel. This clears corrupted session data and regenerates a fresh QR code. Avoid sending excessive automated messages to unknown numbers to prevent account flagging.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default WhatsApp;
