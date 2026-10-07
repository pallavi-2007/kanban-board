import React, { useState } from 'react';
import { X, Users, Mail, UserPlus, Loader2, ShieldCheck, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { addBoardMember } from '../api/boards.js';
import { useAuth } from '../context/AuthContext.jsx';

const MemberAvatar = ({ user, size = 'sm', title }) => {
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : '??';
  const colours = [
    'bg-indigo-400 text-white',
    'bg-emerald-400 text-white',
    'bg-amber-400 text-white',
    'bg-rose-400 text-white',
    'bg-violet-400 text-white',
    'bg-cyan-400 text-white',
  ];
  const idx = user?._id
    ? [...user._id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colours.length
    : 0;

  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs';

  return (
    <div
      className={`${sz} ${colours[idx]} rounded-full font-bold flex items-center justify-center ring-2 ring-white shrink-0`}
      title={title || user?.name}
    >
      {initials}
    </div>
  );
};

const MembersModal = ({ board, isOpen, onClose, onBoardUpdated }) => {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !board) return null;

  const currentUserId = currentUser?._id?.toString();
  const ownerId = typeof board.owner === 'string' ? board.owner : board.owner?._id?.toString();

  const isOwner =
    ownerId === currentUserId ||
    board.members?.some(
      (m) =>
        (typeof m.user === 'string' ? m.user : m.user?._id?.toString()) === currentUserId &&
        m.role === 'owner'
    );

  const members = board.members || [];

  const handleInvite = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await addBoardMember(board._id, trimmed);
      toast.success(data.message || 'Member added successfully');
      setEmail('');
      if (data.board) {
        onBoardUpdated(data.board);
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || 'Failed to add member to board';
      toast.error(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-brand-border shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-text leading-tight">Board Members</h2>
              <p className="text-xs text-brand-text-secondary">
                {members.length} {members.length === 1 ? 'member' : 'members'} on this board
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-slate-200/60 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite by Email (Owner Only) */}
          {isOwner && (
            <div className="p-4 rounded-xl bg-slate-50 border border-brand-border space-y-2.5">
              <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-brand-primary" /> Invite by email
              </span>
              <form onSubmit={handleInvite} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter user's email address..."
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 text-xs text-brand-text bg-white rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Inviting...</span>
                    </>
                  ) : (
                    <span>Invite</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block">
              Current Members
            </span>
            <div className="space-y-1.5 divide-y divide-slate-100">
              {members.map((member) => {
                const u = member.user;
                const memberRole = member.role || 'member';
                return (
                  <div
                    key={u._id}
                    className="pt-2 first:pt-0 flex items-center justify-between gap-3 py-1.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar user={u} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-text truncate leading-tight">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-brand-text-secondary truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {memberRole === 'owner' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                          <ShieldCheck className="w-3 h-3" />
                          Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
                          <Shield className="w-3 h-3 text-slate-400" />
                          Member
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-brand-border bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-brand-border text-xs font-semibold text-brand-text hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MembersModal;
