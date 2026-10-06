import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MoreVertical } from 'lucide-react';

const GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-rose-400',
  'from-purple-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-yellow-400 to-amber-500',
];

const BoardCard = ({ board, index = 0 }) => {
  const navigate = useNavigate();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const members = board.members || [];
  const memberCount = members.length;

  const handleClick = () => {
    navigate(`/boards/${board._id}`);
  };

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

  return (
    <div
      onClick={handleClick}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="text-brand-text-muted hover:text-brand-text p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

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
