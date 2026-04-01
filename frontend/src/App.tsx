import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Workflows from './pages/Workflows';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import Marketplace from './pages/Marketplace';
import Agent from './pages/Agent';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'workflows':
        return <Workflows />;
      case 'settings':
        return <Settings />;
      case 'integrations':
        return <Integrations />;
      case 'marketplace':
        return <Marketplace />;
      case 'agent':
        return <Agent />;
      default:
        return <Dashboard />;
    }
  };

  const showSidebar = true;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {showSidebar && <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />}
      <main className={`transition-all duration-300 ${showSidebar ? 'pl-64' : 'pl-0'}`}>
        {renderContent()}
      </main>
    </div>
  );
}
