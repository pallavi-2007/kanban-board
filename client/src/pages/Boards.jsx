import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, X } from 'lucide-react';
import { fetchBoards, createBoard } from '../api/boards.js';
import Sidebar from '../components/Sidebar.jsx';
import BoardCard from '../components/BoardCard.jsx';
import Loader from '../components/Loader.jsx';
import toast from 'react-hot-toast';

const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

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

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a board title');
      return;
    }

    setCreating(true);
    try {
      const res = await createBoard({
        title: newTitle.trim(),
        description: newDescription.trim()
      });
      toast.success('Board created successfully!');
      setBoards((prev) => [res.board, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setIsModalOpen(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create board';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 px-8 bg-white border-b border-brand-border flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-brand-text tracking-tight">My Boards</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Board</span>
          </button>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <Loader fullScreen={false} message="Loading your boards..." />
          ) : (
            <div className="max-w-7xl mx-auto">
              {boards.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary mb-4">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-brand-text mb-1">No boards yet</h2>
                  <p className="text-sm text-brand-text-secondary max-w-sm mb-6">
                    Get started by creating your first collaborative board for your project or team.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Board</span>
                  </button>
                </div>
              ) : (
                /* Boards Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Create New Board Tile */}
                  <div
                    onClick={() => setIsModalOpen(true)}
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

                  {/* Existing Board Cards */}
                  {boards.map((board, index) => (
                    <BoardCard key={board._id} board={board} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-brand-text">Create New Board</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Board</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Boards;
