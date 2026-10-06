import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchBoardById } from '../api/boards.js';
import Sidebar from '../components/Sidebar.jsx';
import Loader from '../components/Loader.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   MemberAvatar  – initials circle for a user object
───────────────────────────────────────────────────────────────────────── */
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
  // Stable colour derived from the user id string
  const idx = user?._id
    ? [...user._id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colours.length
    : 0;

  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';

  return (
    <div
      className={`${sz} ${colours[idx]} rounded-full font-bold flex items-center justify-center ring-2 ring-white shrink-0`}
      title={title || user?.name}
    >
      {initials}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   CardItem  – read-only card tile
───────────────────────────────────────────────────────────────────────── */
const CardItem = ({ card }) => {
  const hasAssignees = card.assignees?.length > 0;
  const hasDueDate = !!card.dueDate;
  const checklistTotal = card.checklist?.length || 0;
  const checklistDone = card.checklist?.filter((i) => i.done).length || 0;

  const formatDue = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-brand-border px-3.5 py-3 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all duration-150 cursor-default group">
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((label, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-primary-light text-brand-primary"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-brand-text leading-snug">{card.title}</p>

      {/* Footer row */}
      {(hasAssignees || hasDueDate || checklistTotal > 0) && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {/* Assignee avatars */}
          <div className="flex -space-x-1.5">
            {card.assignees?.slice(0, 3).map((u) => (
              <MemberAvatar key={u._id} user={u} size="sm" />
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-brand-text-muted">
            {/* Checklist progress */}
            {checklistTotal > 0 && (
              <span className="font-medium">
                {checklistDone}/{checklistTotal}
              </span>
            )}
            {/* Due date */}
            {hasDueDate && (
              <span>{formatDue(card.dueDate)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ListColumn  – one kanban column
───────────────────────────────────────────────────────────────────────── */
const ListColumn = ({ list, cards }) => {
  return (
    <div className="w-72 shrink-0 flex flex-col bg-slate-100/80 rounded-2xl border border-brand-border overflow-hidden">
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/70 border-b border-brand-border">
        <h3 className="text-sm font-bold text-brand-text truncate pr-2">{list.title}</h3>
        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-200 text-brand-text-secondary text-[11px] font-bold flex items-center justify-center">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-14rem)]">
        {cards.length === 0 ? (
          <div className="py-6 text-center text-xs text-brand-text-muted border-2 border-dashed border-slate-200 rounded-xl">
            No cards
          </div>
        ) : (
          cards.map((card) => <CardItem key={card._id} card={card} />)
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   BoardView  – main page
───────────────────────────────────────────────────────────────────────── */
const BoardView = () => {
  const { boardId } = useParams();

  const [board, setBoard]   = useState(null);
  const [lists, setLists]   = useState([]);
  const [cards, setCards]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBoardById(boardId);
      setBoard(data.board);
      // Sort lists and cards by position ascending
      setLists([...(data.lists || [])].sort((a, b) => a.position - b.position));
      setCards(data.cards || []);
    } catch (err) {
      console.error('Failed to load board:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 403 ? 'You are not a member of this board.' : 'Failed to load board.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Get sorted cards for a given list id
  const cardsForList = (listId) =>
    [...cards.filter((c) => c.list === listId)].sort((a, b) => a.position - b.position);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Top Header ── */}
        <header className="h-16 px-6 bg-white border-b border-brand-border flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/boards"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-text hover:bg-slate-100 transition-colors shrink-0"
              title="Back to boards"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-brand-text truncate leading-tight">
                {board ? board.title : 'Loading…'}
              </h1>
              {board?.description && (
                <p className="text-xs text-brand-text-secondary truncate">{board.description}</p>
              )}
            </div>
          </div>

          {board && (
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {/* Member avatars */}
              <div className="flex -space-x-2">
                {board.members?.slice(0, 4).map((m) => (
                  <MemberAvatar key={m.user._id} user={m.user} size="md" title={`${m.user.name} (${m.role})`} />
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary bg-slate-50 border border-brand-border px-2.5 py-1.5 rounded-lg">
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                <span>{board.members?.length || 1} members</span>
              </div>
            </div>
          )}
        </header>

        {/* ── Board Body ── */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-bg">
              <Loader fullScreen={false} message="Loading board…" />
            </div>
          )}

          {!loading && error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="bg-white rounded-2xl border border-red-200 shadow p-8 max-w-sm w-full text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-brand-text mb-1">Could not load board</h2>
                  <p className="text-sm text-brand-text-secondary">{error}</p>
                </div>
                <button
                  onClick={loadBoard}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            /* Horizontal scroll container */
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex gap-4 p-6 h-full items-start min-w-max">
                {lists.map((list) => (
                  <ListColumn
                    key={list._id}
                    list={list}
                    cards={cardsForList(list._id)}
                  />
                ))}

                {lists.length === 0 && (
                  <div className="flex items-center justify-center w-72 h-48 rounded-2xl border-2 border-dashed border-brand-border text-sm text-brand-text-muted">
                    No lists yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardView;
