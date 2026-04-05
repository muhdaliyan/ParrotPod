import React from 'react';
import { Search, ExternalLink, ChevronRight, Book, Server, Cpu, Globe, Rocket, Terminal, Layers, Sun, Moon, Key } from 'lucide-react';

interface DocsLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onGoToConsole: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function DocsLayout({ children, activeSection, setActiveSection, onGoToConsole, theme, setTheme }: DocsLayoutProps) {
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'about', label: 'About', icon: Globe },
    { id: 'tools', label: 'Tools Support', icon: Cpu },
    { id: 'keys', label: 'Get Your Keys', icon: Key },
    { id: 'setup', label: 'Local Setup', icon: Terminal },
    { id: 'deployment', label: 'Deployment', icon: Rocket },
  ];

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

          <div className={`hidden md:flex items-center ml-8 px-4 py-1.5 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#F4F4F5] border-[#E4E4E7]'} border rounded-full gap-3 group focus-within:border-primary/50 transition-all duration-300`}>
            <Search size={16} className={`${isDark ? 'text-[#52525B]' : 'text-[#A1A1AA]'} group-focus-within:text-primary transition-colors`} />
            <input
              type="text"
              placeholder="Search docs..."
              className={`bg-transparent border-none outline-none text-sm w-48 ${isDark ? 'text-[#A1A1AA] placeholder:text-[#52525B]' : 'text-[#18181B] placeholder:text-[#A1A1AA]'}`}
              readOnly
            />
            <span className={`text-[10px] font-mono ${isDark ? 'bg-[#27272A] text-[#71717A]' : 'bg-[#E4E4E7] text-[#71717A]'} px-1.5 py-0.5 rounded group-focus-within:text-primary/70`}>/</span>
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
