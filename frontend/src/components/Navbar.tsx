import { Bell, HelpCircle, User } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const navItems = [
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'agent', label: 'Agent' },
    { id: 'dashboard', label: 'Overview' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-fit rounded-full border border-white/20 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-6 py-2 transition-all duration-300 hover:bg-white/80">
      <nav className="flex items-center justify-center gap-6 font-medium text-sm tracking-tight">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`relative py-1 px-2 transition-all duration-200 whitespace-nowrap rounded-md hover:bg-black/5 ${
              currentTab === item.id
                ? 'text-black font-semibold'
                : 'text-black/50 hover:text-black'
            }`}
          >
            {item.label}
            {currentTab === item.id && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </header>
  );
}
