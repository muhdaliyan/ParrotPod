import { Send, Bot, Hash, Bell, Shield, ExternalLink } from 'lucide-react';

interface TelegramProps {
    theme: 'light' | 'dark';
}

const Telegram = ({ theme }: TelegramProps) => {
    const isDark = theme === 'dark';
    
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12">
                <div className="flex items-center gap-2 text-[#0088CC] text-xs font-bold uppercase tracking-widest mb-3">
                    <span className="w-8 h-px bg-[#0088CC]/30"></span>
                    Integrations
                </div>
                <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#18181B]'} mb-6`}>
                    Telegram Notifications
                </h1>
                <p className={`text-xl ${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} leading-relaxed max-w-2xl`}>
                    Receive instant, secure alerts on your Telegram account whenever your AI agent performs a customer action or records an event.
                </p>
            </header>

            <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Send size={80} className="text-[#0088CC]" />
                </div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4 flex items-center gap-3`}>
                    <Bot className="text-[#0088CC]" />
                    Creating Your Bot
                </h2>
                <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} mb-6 leading-relaxed`}>
                    ParrotPod uses an official Telegram Bot to send notifications. To get started, you'll need to create a bot using the Telegram BotFather.
                </p>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            1
                        </div>
                        <p className={`text-sm ${isDark ? 'text-[#D4D4D8]' : 'text-[#3F3F46]'}`}>
                            Find <strong>@BotFather</strong> on Telegram and send <code>/newbot</code>.
                        </p>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            2
                        </div>
                        <p className={`text-sm ${isDark ? 'text-[#D4D4D8]' : 'text-[#3F3F46]'}`}>
                            Give your bot a name (e.g., <strong>MyParrotPodBot</strong>) and unique username.
                        </p>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            3
                        </div>
                        <p className={`text-sm ${isDark ? 'text-[#D4D4D8]' : 'text-[#3F3F46]'}`}>
                            Copy the <strong>HTTP API Token</strong> provided by BotFather.
                        </p>
                    </div>
                </div>
            </div>

            <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4 flex items-center gap-3`}>
                    <Hash className="text-[#0088CC]" />
                    Finding Your Chat ID
                </h2>
                <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} mb-4 leading-relaxed`}>
                    To receive notifications, the bot needs to know where to send them. You'll need the numeric ID of your account or the target group.
                </p>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 text-xs text-on-surface-variant font-mono leading-loose mb-6">
                    1. Send a message to <strong>@userinfobot</strong> on Telegram.<br />
                    2. It will reply with your unique <strong>ID</strong> (e.g. <code>123456789</code>).
                </div>
                <div className="flex items-center gap-2 text-primary font-bold hover:underline cursor-pointer text-sm">
                    How to find group chat IDs <ExternalLink size={14} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border`}>
                    <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-4">
                        <Bell size={20} />
                    </div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Real-Time Alerts</h3>
                    <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                        Enable Telegram in your Agent Workflow settings. Your bot will send instant notifications for orders, leads, and custom tool-calls.
                    </p>
                </div>
                <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border`}>
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                        <Shield size={20} />
                    </div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-2`}>Private & Secure</h3>
                    <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'} leading-relaxed`}>
                        Your bot token is stored securely in the database. Notifications only go to the specified Chat ID.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Telegram;
