import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // collapsed: when true the sidebar shows icons only and is narrow
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--app-bg)] text-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 min-h-screen transition-all">
        <header className="bg-transparent p-4">
          <div className="app-container">
            <TopBar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
          </div>
        </header>
        <main className="app-container py-6">
          {/* Render page content directly so pages control cards/layout width */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
