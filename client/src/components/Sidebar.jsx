import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, LogOut, Kanban } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-brand-navy-sidebar flex flex-col justify-between shrink-0 min-h-screen text-slate-300 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-brand-navy-border">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <Kanban className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">KanbanBoard</span>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <NavLink
            to="/boards"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-brand-navy-light text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-brand-navy-light/50'
              }`
            }
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Boards</span>
          </NavLink>

          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-slate-200 hover:bg-brand-navy-light/50 cursor-pointer transition-colors"
            onClick={() => toast('Select a board to manage members (available in Milestone M7)', { icon: '👥' })}
          >
            <Users className="w-4 h-4" />
            <span>Members</span>
          </div>
        </nav>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-brand-navy-border space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-navy-light/60">
            <div className="w-8 h-8 rounded-full bg-brand-primary text-white font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
              {user.name ? user.name.slice(0, 2) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-brand-navy-light transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
