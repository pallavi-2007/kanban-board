import React, { useState, useEffect, useMemo } from 'react';
import { Plus, LayoutGrid, X, Menu, Search } from 'lucide-react';
import { fetchBoards, createBoard, updateBoard, deleteBoard } from '../api/boards.js';
import Sidebar from '../components/Sidebar.jsx';
import BoardCard from '../components/BoardCard.jsx';
import Loader from '../components/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const Boards = () => {
  const { user, isAdmin, isLead } = useAuth();
  const canCreate = isAdmin || isLead;

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editBoard, setEditBoard] = useState(null); // board object being edited
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const data = await fetchBoards();
      setBoards(data.boards || []);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return boards;
    const q = search.trim().toLowerCase();
    return boards.filter((b) => b.title.toLowerCase().includes(q));
  }, [boards, search]);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) { toast.error('Please enter a board title'); return; }
    setCreating(true);
    try {
      const res = await createBoard({ title: newTitle.trim(), description: newDescription.trim() });
      toast.success('Board created!');
      setBoards((prev) => [res.board, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (board) => {
    setEditBoard(board);
    setEditTitle(board.title);
    setEditDescription(board.description || '');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) { toast.error('Title cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await updateBoard(editBoard._id, { title: editTitle.trim(), description: editDescription.trim() });
      toast.success('Board updated!');
      setBoards((prev) => prev.map((b) => b._id === editBoard._id ? res.board : b));
      setEditBoard(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update board');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBoard(deleteTarget._id);
      toast.success('Board deleted');
      setBoards((prev) => prev.filter((b) => b._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  // ── Permission helpers ───────────────────────────────────────────────────
  const showMenuFor = (board) => {
    if (isAdmin) return true;
    if (isLead && board.owner?._id === user?._id) return true;
    if (isLead && board.owner?.toString?.() === user?._id?.toString?.()) return true;
    return false;
  };

  // ── Derived state ────────────────────────────────────────────────────────
  const pageTitle = isAdmin ? 'All Boards' : 'My Boards';

  const noBoards   = !loading && boards.length === 0;
  const noMatches  = !loading && boards.length > 0 && filtered.length === 0;

  // ── Empty state copy ─────────────────────────────────────────────────────
  const emptyMessage = !canCreate
    ? "You haven't been added to any board yet."
    : 'Get started by creating your first collaborative board for your project or team.';

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 px-4 md:px-8 bg-white border-b border-brand-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-brand-text hover:bg-slate-100 transition-colors shrink-0"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-brand-text tracking-tight truncate">{pageTitle}</h1>

            {/* Search */}
            <div className="relative hidden sm:flex items-center ml-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search boards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors w-48 md:w-64"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* New Board button – admin / lead only */}
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">New Board</span>
            </button>
          )}
        </header>

        {/* Mobile search bar */}
        <div className="sm:hidden px-4 pt-3 pb-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search boards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-colors w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {loading ? (
            <Loader fullScreen={false} message="Loading your boards…" />
          ) : noBoards ? (
            /* ── No boards at all ── */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary mb-4">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-brand-text mb-1">
                {canCreate ? 'No boards yet' : 'No boards assigned'}
              </h2>
              <p className="text-sm text-brand-text-secondary max-w-sm mb-6">
                {emptyMessage}
              </p>
              {canCreate && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create board</span>
                </button>
              )}
            </div>
          ) : noMatches ? (
            /* ── Search produced no results ── */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-base font-semibold text-brand-text mb-1">No boards match your search.</p>
              <p className="text-sm text-brand-text-secondary">
                Try a different keyword or{' '}
                <button onClick={() => setSearch('')} className="text-brand-primary hover:underline font-medium">
                  clear the filter
                </button>.
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Create New Board tile – admin / lead only */}
                {canCreate && !search && (
                  <div
                    onClick={() => setIsCreateOpen(true)}
                    className="group bg-brand-surface rounded-2xl border-2 border-dashed border-brand-border-dashed hover:border-brand-primary hover:bg-white transition-all duration-200 cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-[185px] select-none"
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-100 group-hover:bg-brand-primary-light text-slate-500 group-hover:text-brand-primary flex items-center justify-center transition-colors mb-3">
                      <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="font-semibold text-sm text-brand-text group-hover:text-brand-primary transition-colors">
                      Create New Board
                    </span>
                    <span className="text-xs text-brand-text-muted mt-0.5">
                      Add a new project board
                    </span>
                  </div>
                )}

                {/* Board cards */}
                {filtered.map((board, index) => (
                  <BoardCard
                    key={board._id}
                    board={board}
                    index={index}
                    showMenu={showMenuFor(board)}
                    showOwner={isAdmin}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Create Board Modal ─────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Create New Board</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Board Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Marketing Launch, Sprint 23"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this board for?"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm transition-colors resize-none"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Creating…</span></>
                  ) : <span>Create Board</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Board Modal ───────────────────────────────────────────────── */}
      {editBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Edit Board</h3>
              <button onClick={() => setEditBoard(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Board Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary mb-2">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm transition-colors resize-none"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditBoard(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving…</span></>
                  ) : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Delete Board</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-brand-text-secondary">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-brand-text">"{deleteTarget.title}"</span>?
                All lists and cards will be permanently removed.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Deleting…</span></>
                  ) : <span>Delete</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Boards;
