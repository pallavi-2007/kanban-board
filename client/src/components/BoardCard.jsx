import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

const GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-rose-400',
  'from-purple-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-yellow-400 to-amber-500',
];

/**
 * BoardCard
 *
 * Props:
 *   board        – board object (with owner populated for admin)
 *   index        – position in list (for gradient)
 *   showMenu     – boolean: whether the three-dot menu should appear at all
 *   showOwner    – boolean: show "Owner: <name>" line (admin only)
 *   onEdit       – (board) => void
 *   onDelete     – (board) => void
 */
const BoardCard = ({ board, index = 0, showMenu = false, showOwner = false, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const members = board.members || [];
  const memberCount = members.length;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const ownerName = board.owner?.name || board.owner?.email || null;

  return (
    <div
      onClick={() => navigate(`/boards/${board._id}`)}
      className="group bg-brand-surface rounded-2xl border border-brand-border overflow-hidden shadow-sm hover:shadow-md hover:border-brand-primary/40 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Top Banner Gradient */}
      <div className={`h-16 bg-gradient-to-r ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-brand-text text-base leading-snug group-hover:text-brand-primary transition-colors line-clamp-1">
            {board.title}
          </h3>

          {/* Three-dot menu */}
          {showMenu && (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                className="text-brand-text-muted hover:text-brand-text p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Board options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 z-20 w-36 bg-white rounded-xl border border-brand-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit?.(board);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete?.(board);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Owner line (admin only) */}
        {showOwner && ownerName && (
          <p className="text-[11px] text-brand-text-muted mt-0.5">
            Owner: <span className="font-medium text-brand-text-secondary">{ownerName}</span>
          </p>
        )}

        {board.description && (
          <p className="text-xs text-brand-text-secondary line-clamp-2 mt-1 mb-2">
            {board.description}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          {/* Member Avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 overflow-hidden">
              {members.slice(0, 3).map((m, i) => {
                const name = m.user?.name || 'Member';
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={m.user?._id || i}
                    title={name}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center"
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-brand-text-secondary font-medium">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          <span className="text-[11px] text-brand-text-muted">
            Updated {formatDate(board.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BoardCard;
