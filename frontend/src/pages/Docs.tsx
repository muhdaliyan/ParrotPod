import { useState, useEffect } from 'react';
import DocsLayout from '../docs/DocsLayout';
import Overview from '../docs/pages/Overview';
import About from '../docs/pages/About';
import ToolsSupport from '../docs/pages/ToolsSupport';
import GetKeys from '../docs/pages/GetKeys';
import SetupGuide from '../docs/pages/SetupGuide';
import DeploymentGuide from '../docs/pages/DeploymentGuide';

interface DocsProps {
  setCurrentTab: (tab: string) => void;
}

export default function Docs({ setCurrentTab }: DocsProps) {
  // Sync section with URL hash if possible, e.g. #docs/setup
  const getInitialSection = () => {
    const hash = window.location.hash.split('/')[1] || 'overview';
    const validSections = ['overview', 'about', 'tools', 'keys', 'setup', 'deployment'];
    return validSections.includes(hash) ? hash : 'overview';
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('docsTheme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Update hash when section changes
  useEffect(() => {
    window.location.hash = `docs/${activeSection}`;
  }, [activeSection]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('docsTheme', theme);
  }, [theme]);

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview theme={theme} />;
      case 'about':
        return <About theme={theme} />;
      case 'tools':
        return <ToolsSupport theme={theme} />;
      case 'keys':
        return <GetKeys theme={theme} />;
      case 'setup':
        return <SetupGuide theme={theme} />;
      case 'deployment':
        return <DeploymentGuide theme={theme} />;
      default:
        return <Overview theme={theme} />;
    }
  };

  return (
    <DocsLayout 
      activeSection={activeSection} 
      setActiveSection={setActiveSection}
      theme={theme}
      setTheme={setTheme}
      onGoToConsole={() => setCurrentTab('dashboard')}
    >
      {renderSection()}
    </DocsLayout>
  );
}
