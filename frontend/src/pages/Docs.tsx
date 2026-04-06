import { useState, useEffect } from 'react';
import DocsLayout from '../docs/DocsLayout';
import Overview from '../docs/pages/Overview';
import About from '../docs/pages/About';
import ToolsSupport from '../docs/pages/ToolsSupport';
import GetKeys from '../docs/pages/GetKeys';
import SetupGuide from '../docs/pages/SetupGuide';
import DeploymentGuide from '../docs/pages/DeploymentGuide';
import Telephony from '../docs/pages/Telephony';
import Integrations from '../docs/pages/Integrations';
import McpGuide from '../docs/pages/McpGuide';

interface DocsProps {
  setCurrentTab: (tab: string) => void;
}

export default function Docs({ setCurrentTab }: DocsProps) {
  // Sync section with URL path, e.g. /docs/setup
  const getInitialSection = () => {
    const pathParts = window.location.pathname.split('/');
    const section = pathParts[2] || 'overview'; // Expecting /docs/{section}
    const validSections = ['overview', 'about', 'tools', 'keys', 'setup', 'deployment', 'mcp', 'telephony', 'integrations'];
    return validSections.includes(section) ? section : 'overview';
  };

  const [activeSection, setActiveSection] = useState(getInitialSection());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('docsTheme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Update path when section changes
  useEffect(() => {
    const path = `/docs/${activeSection}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ section: activeSection }, '', path);
    }
  }, [activeSection]);

  // Handle browser back/forward buttons specifically for docs sections
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/');
      if (pathParts[1] === 'docs') {
        const section = pathParts[2] || 'overview';
        const validSections = ['overview', 'about', 'tools', 'keys', 'setup', 'deployment', 'mcp', 'telephony', 'integrations'];
        if (validSections.includes(section)) {
          setActiveSection(section);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      case 'mcp':
        return <McpGuide theme={theme} />;
      case 'telephony':
        return <Telephony theme={theme} />;
      case 'integrations':
        return <Integrations theme={theme} />;
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
