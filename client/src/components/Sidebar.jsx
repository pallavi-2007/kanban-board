import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  LogOut,
  Kanban,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchBoards } from '../api/boards.js';
import toast from 'react-hot-toast';

/* ── Role badge ─────────────────────────────────────────────────────────── */
const ROLE_BADGE = {
  admin:  { label: 'Admin',  cls: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' },
  lead:   { label: 'Lead',   cls: 'bg-indigo-500/20  text-indigo-300  ring-1 ring-indigo-500/30'  },
  member: { label: 'Member', cls: 'bg-slate-600/40   text-slate-400   ring-1 ring-slate-500/30'   },
};

const RoleBadge = ({ role }) => {
  const { label, cls } = ROLE_BADGE[role] || ROLE_BADGE.member;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout, isAdmin, isLead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [boardsOpen, setBoardsOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);

  const role = user?.role || 'member';
  const canSeeMembers = isAdmin || isLead;

  // Determine the current boardId from the URL so we can highlight it
  const currentBoardId = location.pathname.startsWith('/boards/')
    ? location.pathname.split('/')[2]
    : null;

  // Keep dropdown open whenever a board is active
  useEffect(() => {
    if (currentBoardId) setBoardsOpen(true);
  }, [currentBoardId]);

  // Load board list when dropdown opens
  useEffect(() => {
    if (!boardsOpen) return;
    let cancelled = false;
    setBoardsLoading(true);
    fetchBoards()
      .then((data) => { if (!cancelled) setBoards(data.boards || []); })
      .catch(() => { if (!cancelled) setBoards([]); })
      .finally(() => { if (!cancelled) setBoardsLoading(false); });
    return () => { cancelled = true; };
  }, [boardsOpen]);

  const handleLogout = () => {
    logout();
    onClose?.();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isBoardsActive =
    location.pathname === '/boards' || Boolean(currentBoardId);

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'U';

  const navItem = (isActive) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
      isActive
        ? 'bg-brand-navy-light text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-brand-navy-light/50'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          w-64 bg-brand-navy-sidebar flex flex-col justify-between shrink-0 text-slate-300 select-none
          fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:min-h-screen
          ${isOpen ? 'translate-x-0' : '-translate-x-full hidden md:flex'}
        `}
      >
        {/* ── Top section ─────────────────────────────────────────────── */}
        <div className="flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-brand-navy-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
                <Kanban className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">KanbanBoard</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-navy-light transition-colors"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role badge strip */}
          {user && (
            <div className="px-6 py-2.5 border-b border-brand-navy-border/50 shrink-0">
              <RoleBadge role={role} />
            </div>
          )}

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            {/* ── Boards (with dropdown) ─── */}
            <div>
              <button
                type="button"
                onClick={() => {
                  navigate('/boards');
                  setBoardsOpen((o) => !o);
                  onClose?.();
                }}
                className={`w-full ${navItem(isBoardsActive)}`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Boards</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setBoardsOpen((o) => !o);
                  }}
                  className="p-0.5 rounded hover:bg-brand-navy-light/50 transition-colors"
                >
                  {boardsOpen
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Board list dropdown */}
              {boardsOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-brand-navy-border/60 space-y-0.5">
                  {boardsLoading ? (
                    <p className="py-2 px-2 text-[11px] text-slate-500 italic">Loading…</p>
                  ) : boards.length === 0 ? (
                    <p className="py-2 px-2 text-[11px] text-slate-500 italic">No boards yet</p>
                  ) : (
                    boards.map((b) => {
                      const active = currentBoardId === b._id;
                      return (
                        <NavLink
                          key={b._id}
                          to={`/boards/${b._id}`}
                          onClick={() => onClose?.()}
                          className={`block px-3 py-1.5 rounded-lg text-xs font-medium truncate transition-colors ${
                            active
                              ? 'bg-brand-primary/20 text-indigo-300'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-brand-navy-light/40'
                          }`}
                          title={b.title}
                        >
                          {b.title}
                        </NavLink>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ── Members (Admin / Lead only) ─── */}
            {canSeeMembers && (
              <NavLink
                to="/members"
                onClick={() => onClose?.()}
                className={({ isActive }) => navItem(isActive)}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Members</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* ── Bottom: user menu ────────────────────────────────────────── */}
        <div className="p-4 border-t border-brand-navy-border space-y-3 shrink-0">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-navy-light/60">
              <div className="w-8 h-8 rounded-full bg-brand-primary text-white font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                {initials}
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
    </>
  );
};

export default Sidebar;
