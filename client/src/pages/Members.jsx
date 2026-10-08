import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Menu,
  Search,
  X,
  Plus,
  MoreVertical,
  Shield,
  ShieldCheck,
  AlertCircle,
  Trash2,
  UserCog,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchUsers, updateUserRole } from '../api/users.js';
import { fetchBoards, addBoardMember, removeBoardMember } from '../api/boards.js';
import Sidebar from '../components/Sidebar.jsx';
import Loader from '../components/Loader.jsx';
import toast from 'react-hot-toast';

/* ── Role Badge ──────────────────────────────────────────────────────────── */
const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
  },
  lead: {
    label: 'Lead',
    className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20'
  },
  member: {
    label: 'Member',
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20'
  }
};

const RoleBadge = ({ role }) => {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.member;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
};

/* ── Avatar Initials & Color ─────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'bg-indigo-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-violet-500 text-white',
  'bg-cyan-500 text-white'
];

const getAvatarColor = (id = '') => {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

/* ── Row Actions Dropdown ─────────────────────────────────────────────────── */
const RowActionsMenu = ({
  user,
  isSelf,
  isAdmin,
  isLead,
  hasRemovableBoards,
  onChangeRole,
  onRemoveFromBoard
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Determine which actions are available
  // An admin cannot change their own role, and self-removal is hidden on own row
  if (isSelf) {
    return <span className="text-slate-300 select-none">—</span>;
  }

  const canChangeRole = isAdmin;
  const canRemove = hasRemovableBoards;

  if (!canChangeRole && !canRemove) {
    return <span className="text-slate-300 select-none">—</span>;
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-text hover:bg-slate-100 transition-colors"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl border border-brand-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
          {canChangeRole && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onChangeRole(user);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-slate-50 transition-colors text-left"
            >
              <UserCog className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Change role</span>
            </button>
          )}

          {canRemove && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRemoveFromBoard(user);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Remove from board</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main Members Page Component ─────────────────────────────────────────── */
const Members = () => {
  const { user: currentUser, isAdmin, isLead } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addBoardId, setAddBoardId] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [removeModalUser, setRemoveModalUser] = useState(null);
  const [removeBoardId, setRemoveBoardId] = useState('');
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Load users & boards
  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, boardsData] = await Promise.all([
        fetchUsers(),
        fetchBoards()
      ]);
      setUsers(usersData.users || []);
      setBoards(boardsData.boards || []);
    } catch (err) {
      console.error('Failed to load members or boards:', err);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter users by name or email
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, search]);

  // Eligible boards for "Add Member" modal:
  // Admin: all boards; Lead: boards they own
  const addMemberEligibleBoards = useMemo(() => {
    if (isAdmin) return boards;
    if (isLead) {
      const currentUserId = currentUser?._id?.toString();
      return boards.filter((b) => {
        const ownerId = b.owner?._id ? b.owner._id.toString() : b.owner?.toString();
        return ownerId === currentUserId;
      });
    }
    return [];
  }, [boards, isAdmin, isLead, currentUser]);

  // Compute removable boards for a specific user:
  // Admin can remove from any board user is on (except if user is board owner)
  // Lead can remove from boards they own where user is a member
  const getRemovableBoardsForUser = (targetUser) => {
    if (!targetUser) return [];
    const targetUserId = targetUser._id?.toString();
    const currentUserId = currentUser?._id?.toString();

    return boards.filter((b) => {
      const ownerId = b.owner?._id ? b.owner._id.toString() : b.owner?.toString();

      // Check if target user is actually a member of board b
      const isMemberOfBoard =
        targetUser.boards?.some((id) => id.toString() === b._id.toString()) ||
        b.members?.some((m) => {
          const mUserId = m.user?._id ? m.user._id.toString() : m.user?.toString();
          return mUserId === targetUserId;
        });

      if (!isMemberOfBoard) return false;

      // Cannot remove the board owner
      if (ownerId === targetUserId) return false;

      if (isAdmin) return true;
      if (isLead) return ownerId === currentUserId;

      return false;
    });
  };

  /* ── Change Role Handlers ───────────────────────────────────────────────── */
  const openChangeRoleModal = (user) => {
    setRoleModalUser(user);
    setSelectedRole(user.role || 'member');
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!roleModalUser) return;
    try {
      setIsUpdatingRole(true);
      const res = await updateUserRole(roleModalUser._id, selectedRole);
      toast.success(res.message || 'Role updated successfully');
      setRoleModalUser(null);
      // Refresh user list
      const updated = await fetchUsers();
      setUsers(updated.users || []);
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to update user role';
      toast.error(serverMsg);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  /* ── Add Member Handlers ────────────────────────────────────────────────── */
  const openAddMemberModal = () => {
    if (addMemberEligibleBoards.length > 0) {
      setAddBoardId(addMemberEligibleBoards[0]._id);
    } else {
      setAddBoardId('');
    }
    setAddEmail('');
    setIsAddModalOpen(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const trimmedEmail = addEmail.trim().toLowerCase();
    if (!addBoardId) {
      toast.error('Please select a board');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsAddingMember(true);
      const res = await addBoardMember(addBoardId, trimmedEmail);
      toast.success(res.message || 'Member added to board successfully');
      setIsAddModalOpen(false);
      setAddEmail('');
      // Refresh data
      loadData();
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to add member to board';
      toast.error(serverMsg);
    } finally {
      setIsAddingMember(false);
    }
  };

  /* ── Remove Member Handlers ─────────────────────────────────────────────── */
  const openRemoveMemberModal = (user) => {
    const removable = getRemovableBoardsForUser(user);
    if (removable.length === 0) {
      toast.error('No manageable boards found for this user');
      return;
    }
    setRemoveModalUser(user);
    setRemoveBoardId(removable[0]._id);
  };

  const handleRemoveMember = async () => {
    if (!removeModalUser || !removeBoardId) return;
    try {
      setIsRemovingMember(true);
      const res = await removeBoardMember(removeBoardId, removeModalUser._id);
      toast.success(res.message || 'Member removed from board');
      setRemoveModalUser(null);
      // Refresh data
      loadData();
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to remove member from board';
      toast.error(serverMsg);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const removableBoardsForModal = useMemo(() => {
    return getRemovableBoardsForUser(removeModalUser);
  }, [removeModalUser, boards, isAdmin, isLead, currentUser]);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-brand-border px-4 md:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-brand-text hover:bg-slate-100 transition-colors shrink-0"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-text tracking-tight">
                Members
              </h1>
              <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">
                {isAdmin
                  ? 'Manage your team and their roles.'
                  : 'Manage members on your boards.'}
              </p>
            </div>
          </div>

          {/* Search box & Add Member button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(isAdmin || isLead) && (
              <button
                type="button"
                onClick={openAddMemberModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Add Member</span>
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {loading ? (
            <Loader fullScreen={false} message="Loading members…" />
          ) : users.length === 0 ? (
            /* Empty state (no members at all) */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-brand-primary mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-brand-text mb-1">No members found</h2>
              <p className="text-sm text-brand-text-secondary max-w-sm mb-6">
                Add users to your boards to collaborate with your team.
              </p>
              {(isAdmin || isLead) && (
                <button
                  type="button"
                  onClick={openAddMemberModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              )}
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty search results */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-brand-text mb-1">No members found</h2>
              <p className="text-sm text-brand-text-secondary mb-4">
                Try a different search term.
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-sm text-brand-primary font-semibold hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            /* Members Table */
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-brand-border text-xs font-semibold text-brand-text-secondary uppercase tracking-wider select-none">
                        <th className="px-6 py-3.5">Name</th>
                        <th className="px-6 py-3.5">Email</th>
                        <th className="px-6 py-3.5">Role</th>
                        <th className="px-6 py-3.5">Joined Date</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUsers.map((u) => {
                        const isSelf = u._id?.toString() === currentUser?._id?.toString();
                        const removableBoards = getRemovableBoardsForUser(u);
                        const hasRemovable = removableBoards.length > 0;

                        return (
                          <tr
                            key={u._id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Name + Avatar */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase ${getAvatarColor(
                                    u._id
                                  )}`}
                                >
                                  {getInitials(u.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-brand-text truncate">
                                      {u.name}
                                    </span>
                                    {isSelf && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        (You)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                              {u.email}
                            </td>

                            {/* Role Badge */}
                            <td className="px-6 py-4">
                              <RoleBadge role={u.role || 'member'} />
                            </td>

                            {/* Joined Date */}
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {formatDate(u.createdAt)}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <RowActionsMenu
                                user={u}
                                isSelf={isSelf}
                                isAdmin={isAdmin}
                                isLead={isLead}
                                hasRemovableBoards={hasRemovable}
                                onChangeRole={openChangeRoleModal}
                                onRemoveFromBoard={openRemoveMemberModal}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Change Role Modal (Admin Only) ─────────────────────────────────── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Change Role</h3>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-6 space-y-5">
              {/* Target User Info */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-brand-border">
                <div
                  className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 uppercase ${getAvatarColor(
                    roleModalUser._id
                  )}`}
                >
                  {getInitials(roleModalUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-text truncate">
                    {roleModalUser.name}
                  </p>
                  <p className="text-xs text-brand-text-secondary truncate font-mono">
                    {roleModalUser.email}
                  </p>
                </div>
                <div>
                  <RoleBadge role={roleModalUser.role || 'member'} />
                </div>
              </div>

              {/* Role Select Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                >
                  <option value="admin">Admin — Full system management</option>
                  <option value="lead">Lead — Create & manage owned boards</option>
                  <option value="member">Member — Move cards & subtasks</option>
                </select>
              </div>

              {/* Yellow notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Only Admin can change roles. This takes effect immediately.
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isUpdatingRole ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <span>Update Role</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Modal (Admin & Lead) ────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-brand-text">Add Member</h3>
                <p className="text-xs text-brand-text-secondary mt-0.5">
                  Add an existing user to a project board.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {/* Board Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Board{' '}
                  <span className="text-slate-400 font-normal lowercase">
                    {isAdmin ? '(Admin can see all boards)' : '(Owned by you)'}
                  </span>
                </label>
                {addMemberEligibleBoards.length === 0 ? (
                  <p className="text-xs text-rose-500 italic">
                    No manageable boards available.
                  </p>
                ) : (
                  <select
                    value={addBoardId}
                    onChange={(e) => setAddBoardId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                  >
                    {addMemberEligibleBoards.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  User Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aarav@demo.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The user must already have an account registered.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember || addMemberEligibleBoards.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isAddingMember ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding…</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Member Modal ────────────────────────────────────────────── */}
      {removeModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Remove from Board</h3>
              <button
                type="button"
                onClick={() => setRemoveModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-brand-text-secondary leading-relaxed">
                Choose the board from which you want to remove{' '}
                <span className="font-semibold text-brand-text">
                  {removeModalUser.name}
                </span>
                .
              </p>

              {/* Board Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Select Board
                </label>
                {removableBoardsForModal.length === 0 ? (
                  <p className="text-xs text-rose-500 italic">
                    User is not a member of any board you can manage.
                  </p>
                ) : (
                  <select
                    value={removeBoardId}
                    onChange={(e) => setRemoveBoardId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                  >
                    {removableBoardsForModal.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notice that account will NOT be deleted */}
              <div className="p-3 rounded-xl bg-slate-50 border border-brand-border text-xs text-slate-500 leading-relaxed">
                This removes the user from the selected board only. Their user account will{' '}
                <strong className="text-slate-700">not</strong> be deleted.
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRemoveModalUser(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRemovingMember || removableBoardsForModal.length === 0}
                  onClick={handleRemoveMember}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-500/20"
                >
                  {isRemovingMember ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Removing…</span>
                    </>
                  ) : (
                    <span>Remove Member</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
