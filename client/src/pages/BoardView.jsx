import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Kanban, Users, Info } from 'lucide-react';
import { fetchBoardById } from '../api/boards.js';
import Sidebar from '../components/Sidebar.jsx';
import Loader from '../components/Loader.jsx';
import toast from 'react-hot-toast';

const BoardView = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        setLoading(true);
        const data = await fetchBoardById(boardId);
        setBoard(data.board);
      } catch (error) {
        console.error('Failed to load board:', error);
        toast.error('Failed to load board details');
      } finally {
        setLoading(false);
      }
    };

    if (boardId) {
      loadBoard();
    }
  }, [boardId]);

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-8 bg-white border-b border-brand-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Link
              to="/boards"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-text hover:bg-slate-100 transition-colors"
              title="Back to boards"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-brand-text leading-tight">
                {board ? board.title : 'Loading board...'}
              </h1>
              {board?.description && (
                <p className="text-xs text-brand-text-secondary line-clamp-1">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          {board && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary bg-slate-50 border border-brand-border px-3 py-1.5 rounded-xl">
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                <span>{board.members?.length || 1} members</span>
              </div>
            </div>
          )}
        </header>

        {/* Placeholder Body (Milestone M4 placeholder) */}
        <div className="flex-1 p-8 flex items-center justify-center">
          {loading ? (
            <Loader fullScreen={false} message="Loading board..." />
          ) : (
            <div className="max-w-md w-full bg-white rounded-2xl border border-brand-border p-8 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center mx-auto">
                <Kanban className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-text mb-1">
                  {board?.title}
                </h2>
                <p className="text-sm text-brand-text-secondary">
                  Board placeholder ready for Milestone M4.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5 text-left">
                <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  Interactive lists, cards, and modal details will be rendered here in{' '}
                  <strong className="text-brand-text">Milestone M4: Board view</strong>.
                </span>
              </div>

              <Link
                to="/boards"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-brand-primary hover:bg-brand-primary-light transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to My Boards</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BoardView;
