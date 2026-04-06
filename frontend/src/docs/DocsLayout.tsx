import React, { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, ChevronRight, Book, Server, Cpu, Globe, Rocket, Terminal, Layers, Sun, Moon, Key, Phone, Zap, MessageSquare, Send } from 'lucide-react';

interface DocsLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onGoToConsole: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function DocsLayout({ children, activeSection, setActiveSection, onGoToConsole, theme, setTheme }: DocsLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'about', label: 'About', icon: Globe },
    { id: 'tools', label: 'Tools Support', icon: Cpu },
    { id: 'integrations', label: 'Integrations', icon: Zap, isNew: true },
    { id: 'keys', label: 'Get Your Keys', icon: Key },
    { id: 'telephony', label: 'Telephony (Voice)', icon: Phone },
    { id: 'setup', label: 'Local Setup', icon: Terminal },
    { id: 'deployment', label: 'Deployment', icon: Rocket },
    { id: 'mcp', label: 'MCP Setup', icon: () => <img src="/mcp.svg" className="w-4 h-4 object-contain" alt="MCP" />, isNew: true },
  ];

  const searchIndex = [
    { id: 'overview', title: 'Overview', category: 'Direct Link', icon: Book, keywords: ['start', 'introduction', 'welcome', 'basics'] },
    { id: 'about', title: 'About ParrotPod', category: 'Direct Link', icon: Globe, keywords: ['vision', 'mission', 'opensource', 'stack'] },
    { id: 'tools', title: 'Tools Support', category: 'Direct Link', icon: Cpu, keywords: ['integrations', 'ecosystem', 'capabilities'] },
    { id: 'keys', title: 'Get Your API Keys', category: 'Direct Link', icon: Key, keywords: ['secrets', 'credentials', 'access'] },
    { id: 'setup', title: 'Local Setup', category: 'Direct Link', icon: Terminal, keywords: ['installation', 'running', 'development'] },
    { id: 'deployment', title: 'Deployment (Cloud)', category: 'Direct Link', icon: Rocket, keywords: ['production', 'hosting', 'render'] },
    { id: 'mcp', title: 'MCP Searcher Setup', category: 'Direct Link', icon: Server, keywords: ['mcp', 'claude', 'antigravity', 'search', 'docs'] },
    { id: 'telephony', title: 'Telephony & Voice', category: 'Direct Link', icon: Phone, keywords: ['phone', 'numbers', 'call', 'webrtc'] },
    { id: 'integrations', title: 'WhatsApp & Telegram', category: 'Integrations', icon: Zap, keywords: ['whatsapp', 'telegram', 'qr', 'link', 'bot', 'token'] },

    // Detailed search sub-items
    { id: 'keys', title: 'OpenAI API Setup', category: 'API Keys', icon: Key, keywords: ['openai', 'gpt', 'billing', 'secret'] },
    { id: 'keys', title: 'Gemini (Google) API', category: 'API Keys', icon: Key, keywords: ['google', 'aistudio', 'gemini', 'flash'] },
    { id: 'keys', title: 'Deepgram (STT) API', category: 'API Keys', icon: Key, keywords: ['deepgram', 'transcription', 'voice'] },
    { id: 'keys', title: 'LiveKit (RTC) Setup', category: 'API Keys', icon: Key, keywords: ['livekit', 'webrtc', 'cloud', 'ws'] },
    { id: 'setup', title: 'Environment (.env) Config', category: 'Configuration', icon: Terminal, keywords: ['env', 'variables', 'dotenv', 'local'] },
    { id: 'setup', title: 'Database (SQLite) Setup', category: 'Backend', icon: Server, keywords: ['sqlite', 'database', 'db', 'storage'] },
    { id: 'deployment', title: 'Docker Configuration', category: 'Cloud', icon: Layers, keywords: ['docker', 'container', 'image', 'build'] },
    { id: 'deployment', title: 'Render Hosting Guide', category: 'Cloud', icon: Globe, keywords: ['render', 'hosting', 'provider'] },
    { id: 'telephony', title: 'Buying Phone Numbers', category: 'Communication', icon: Phone, keywords: ['buy', 'number', 'livekit', 'free'] },
    { id: 'telephony', title: 'ParrotPod Inventory', category: 'Dashbord', icon: Layers, keywords: ['inventory', 'numbers', 'my', 'assign'] },
    { id: 'telephony', title: 'Automatic Dispatch Rules', category: 'Backend', icon: Zap, keywords: ['dispatch', 'rules', 'routing', 'auto'] },
    { id: 'tools', title: 'Speech-to-Text Support', category: 'Integrations', icon: Search, keywords: ['stt', 'recognition', 'audio'] },
  ];

  const filteredResults = searchQuery.trim() === ''
    ? []
    : searchIndex.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSelect = (itemId: string) => {
    setActiveSection(itemId);
    setSearchQuery('');
    setShowResults(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col min-h-screen ${isDark ? 'bg-[#0A0A0B] text-[#E4E4E7]' : 'bg-[#FAFAFA] text-[#18181B]'} font-sans selection:bg-primary/30 transition-colors duration-300`}>
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 h-16 ${isDark ? 'bg-[#0A0A0B]/80 border-[#27272A]' : 'bg-white/80 border-[#E4E4E7]'} backdrop-blur-md border-b z-50 px-6 flex items-center justify-between transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full border ${isDark ? 'border-[#27272A] bg-[#18181B]' : 'border-[#E4E4E7] bg-white'} p-0.5 flex items-center justify-center`}>
              <img src="/logo.png" alt="ParrotPod" className="w-full h-full object-contain" />
            </div>
            <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#18181B]'}`}>
              ParrotPod <span className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>Docs</span>
            </span>
          </div>

          <div ref={searchRef} className="relative hidden md:block">
            <div className={`flex items-center ml-8 px-4 py-1.5 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#F4F4F5] border-[#E4E4E7]'} border rounded-full gap-3 group focus-within:border-primary/50 transition-all duration-300`}>
              <Search size={16} className={`${isDark ? 'text-[#52525B]' : 'text-[#A1A1AA]'} group-focus-within:text-primary transition-colors`} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search docs..."
                className={`bg-transparent border-none outline-none text-sm w-48 ${isDark ? 'text-[#A1A1AA] placeholder:text-[#52525B]' : 'text-[#18181B] placeholder:text-[#A1A1AA]'}`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
              />
              <span className={`text-[10px] font-mono ${isDark ? 'bg-[#27272A] text-[#71717A]' : 'bg-[#E4E4E7] text-[#71717A]'} px-1.5 py-0.5 rounded group-focus-within:text-primary/70`}>/</span>
            </div>

            {/* Search Results Dropdown */}
            {showResults && filteredResults.length > 0 && (
              <div className={`absolute top-full left-8 mt-2 w-64 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200`}>
                <div className="py-2">
                  <p className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#52525B]' : 'text-[#A1A1AA]'} mb-1`}>Results</p>
                  {filteredResults.map((result, idx) => (
                    <button
                      key={`${result.id}-${idx}`}
                      onClick={() => handleSearchSelect(result.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm ${isDark ? 'hover:bg-[#27272A] text-[#E4E4E7]' : 'hover:bg-[#F4F4F5] text-[#18181B]'} transition-colors text-left`}
                    >
                      <div className="flex items-center gap-3">
                        <result.icon size={16} className="text-primary" />
                        <div className="flex flex-col">
                          <span className="font-medium">{result.title}</span>
                          <span className={`text-[10px] ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>{result.category}</span>
                        </div>
                      </div>
                      <ChevronRight size={12} className={isDark ? 'text-[#3F3F46]' : 'text-[#D4D4D8]'} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResults && searchQuery.trim() !== '' && filteredResults.length === 0 && (
              <div className={`absolute top-full left-8 mt-2 w-64 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7]'} border rounded-xl shadow-2xl p-4 text-center z-[60] animate-in fade-in slide-in-from-top-2 duration-200`}>
                <p className={`text-xs ${isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'}`}>No results for "<span className="text-primary font-medium">{searchQuery}</span>"</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border ${isDark ? 'border-[#27272A] text-[#E4E4E7] hover:bg-[#18181B]' : 'border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]'} transition-all`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onGoToConsole}
            className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-[#E4E4E7] text-[#09090B] hover:bg-white' : 'bg-[#18181B] text-white hover:bg-[#27272A]'} rounded-lg text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm`}
          >
            Go to Console
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 bottom-0 w-64 border-r ${isDark ? 'border-[#27272A] bg-[#09090B]' : 'border-[#E4E4E7] bg-white'} py-8 px-4 overflow-y-auto hidden md:block transition-colors duration-300`}>
          <div className="space-y-1">
            <p className={`px-3 text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-[#52525B]' : 'text-[#A1A1AA]'} mb-4`}>Documentation</p>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${activeSection === item.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : `${isDark ? 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]' : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'} border border-transparent`
                  }`}
              >
                <item.icon size={18} className={activeSection === item.id ? 'text-primary' : `${isDark ? 'text-[#52525B] group-hover:text-[#A1A1AA]' : 'text-[#A1A1AA] group-hover:text-[#71717A]'}`} />
                {item.label}
                {item.isNew && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-[4px] bg-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter animate-pulse">New</span>
                )}
                {activeSection === item.id && (
                  <ChevronRight size={14} className="ml-auto text-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-12 px-3">
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gradient-to-br from-[#18181B] to-[#09090B] border-[#27272A]' : 'bg-[#F4F4F5] border-[#E4E4E7]'} border relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Layers size={40} className={isDark ? 'text-white' : 'text-[#18181B]'} />
              </div>
              <p className={`font-bold text-xs mb-1 ${isDark ? 'text-white' : 'text-[#18181B]'}`}>Need Help?</p>
              <p className={`${isDark ? 'text-[#71717A]' : 'text-[#71717A]'} text-[10px] leading-relaxed mb-3`}>Join our community or check GitHub for updates.</p>
              <a
                href="https://github.com/muhdaliyan/ParrotPod"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
              >
                GitHub Repository <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 md:ml-64 p-8 md:p-12 max-w-5xl mx-auto">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>

          <footer className={`mt-20 pt-8 border-t ${isDark ? 'border-[#27272A]' : 'border-[#E4E4E7]'} flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? 'text-[#52525B]' : 'text-[#A1A1AA]'} text-xs transition-colors duration-300`}>
            <p>© 2026 ParrotPod Documentation. Built with ❤️ for AI developers.</p>
            <div className="flex gap-6">
              <span className={`hover:${isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'} cursor-pointer transition-colors`}>Privacy Policy</span>
              <span className={`hover:${isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'} cursor-pointer transition-colors`}>Terms of Service</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
