import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Workflows from './pages/Workflows';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import Marketplace from './pages/Marketplace';
import Inventory from './pages/Inventory';
import Agent from './pages/Agent';
import PasswordShield from './components/PasswordShield';

export default function App() {
  // Try to get the initial tab from the URL hash, otherwise fallback to localStorage, then default to 'dashboard'
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'workflows', 'settings', 'integrations', 'marketplace', 'inventory', 'agent'];
    
    if (validTabs.includes(hash)) {
      return hash;
    }
    
    const savedTab = localStorage.getItem('currentTab');
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
    
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab());

  // Update hash and localStorage whenever the tab changes
  useEffect(() => {
    window.location.hash = currentTab;
    localStorage.setItem('currentTab', currentTab);
  }, [currentTab]);

  // Listen for hash changes (e.g. browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs = ['dashboard', 'workflows', 'settings', 'integrations', 'marketplace', 'inventory', 'agent'];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
      case 'inventory':
        return <Inventory />;
      case 'agent':
        return <Agent />;
      default:
        return <Dashboard />;
    }
  };

  const showSidebar = true;

  return (
    <PasswordShield>
      <div className="min-h-screen bg-background text-on-surface font-sans">
        <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        {showSidebar && <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />}
        <main className={`transition-all duration-300 ${showSidebar ? 'pl-64' : 'pl-0'}`}>
          {renderContent()}
        </main>
      </div>
    </PasswordShield>
  );
}
