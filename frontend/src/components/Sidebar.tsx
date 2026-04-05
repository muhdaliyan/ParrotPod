import { LayoutDashboard, Puzzle, Bot, Settings, GitBranch, Package, Bell, HelpCircle } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 overflow-y-auto bg-[#f5fdfb] flex flex-col py-6 border-r border-outline-variant/20 z-40">
      <div className="px-6 mb-10 flex items-center gap-3">
        <img src="/logo.png" alt="Parrot Pod Logo" className="w-12 h-12" />
        <span className="text-2xl font-bold tracking-tighter text-black">Parrot Pod</span>
      </div>

      <nav className="flex-1 space-y-1 font-headline text-sm font-semibold">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`w-[calc(100%-16px)] mx-2 px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${currentTab === item.id
              ? 'bg-primary text-white shadow-sm font-bold'
              : 'text-neutral-900 font-bold hover:bg-surface-variant'
              }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-4 space-y-4">
        <div className="flex items-center justify-around bg-surface-container-low/50 p-2 rounded-xl border border-outline-variant/10">
          <button
            onClick={() => setCurrentTab('docs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${currentTab === 'docs' ? 'text-primary bg-white shadow-sm' : 'text-on-surface-variant hover:text-primary hover:bg-white'
              }`}
          >
            <GitBranch size={20} />
            <span className="text-xs font-bold font-headline">Docs</span>
          </button>
          <div className="w-px h-6 bg-outline-variant/20 mx-1" />
          <button
            onClick={() => setCurrentTab('settings')}
            className={`p-2 rounded-lg transition-all ${currentTab === 'settings' ? 'text-primary bg-white shadow-sm' : 'text-on-surface-variant hover:text-primary hover:bg-white'
              }`}
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary/20">
            <img
              src="/user.png"
              alt="User profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary truncate">M Aliyan</p>
            <p className="text-[10px] text-on-surface-variant font-medium truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
