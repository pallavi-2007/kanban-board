import React, { useState } from 'react';
import { Users, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar.jsx';

const Members = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 px-4 md:px-8 bg-white border-b border-brand-border flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-brand-text hover:bg-slate-100 transition-colors"
            title="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-brand-text tracking-tight">Members</h1>
        </header>

        {/* Placeholder body */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-brand-primary">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-brand-text">Members</h2>
          <p className="text-sm text-brand-text-secondary max-w-sm">
            Full member management is coming in the next step.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Members;
