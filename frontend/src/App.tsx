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
import Docs from './pages/Docs';
import PasswordShield from './components/PasswordShield';

export default function App() {
  // Get the initial tab from the URL path, fallback to localStorage, then 'dashboard'
  const getInitialTab = () => {
    const path = window.location.pathname.split('/')[1];
    const validTabs = ['dashboard', 'workflows', 'settings', 'integrations', 'marketplace', 'inventory', 'agent', 'docs'];
    
    if (validTabs.includes(path)) {
      return path;
    }
    
    // Default to 'dashboard' for root / or invalid paths
    if (path === '' || path === undefined) {
      const savedTab = localStorage.getItem('currentTab');
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab;
      }
      return 'dashboard';
    }
    
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState(getInitialTab());

  // Update path and localStorage whenever the tab changes
  useEffect(() => {
    const path = currentTab === 'dashboard' ? '/' : `/${currentTab}`;
    // If we are navigating to docs, only push if we aren't already in the docs area
    if (currentTab === 'docs') {
      if (!window.location.pathname.startsWith('/docs')) {
        window.history.pushState({ tab: 'docs' }, '', '/docs/overview');
      }
    } else {
      if (window.location.pathname !== path) {
        window.history.pushState({ tab: currentTab }, '', path);
      }
    }
    localStorage.setItem('currentTab', currentTab);
  }, [currentTab]);

  // Listen for browser navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.split('/')[1] || 'dashboard';
      const validTabs = ['dashboard', 'workflows', 'settings', 'integrations', 'marketplace', 'inventory', 'agent', 'docs'];
      if (validTabs.includes(path)) {
        setCurrentTab(path);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      case 'docs':
        return <Docs setCurrentTab={setCurrentTab} />;
      default:
        return <Dashboard />;
    }
  };

  const showSidebar = true;

  const content = (
    <div className={`min-h-screen ${currentTab === 'docs' ? 'bg-[#FAFAFA]' : 'bg-background'} text-on-surface font-sans`}>
      {currentTab !== 'docs' && (
        <>
          <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </>
      )}
      <main className={`transition-all duration-300 ${currentTab === 'docs' ? 'pl-0' : 'pl-64'}`}>
        {renderContent()}
      </main>
    </div>
  );

  if (currentTab === 'docs') {
    return content;
  }

  return (
    <PasswordShield>
      {content}
    </PasswordShield>
  );
}
