import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Pencil
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import {
  fetchBoardById,
  moveCardApi,
  moveListApi,
  createListApi,
  updateListApi,
  deleteListApi,
  createCardApi
} from '../api/boards.js';
import socket, { connectSocket } from '../lib/socket.js';
import Sidebar from '../components/Sidebar.jsx';
import Loader from '../components/Loader.jsx';
import CardDetailModal from '../components/CardDetailModal.jsx';
import MembersModal from '../components/MembersModal.jsx';

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
   CardItem  – draggable card tile
───────────────────────────────────────────────────────────────────────── */
const CardItem = ({ card, index, onCardClick, isDragInProgress }) => {
  const hasAssignees = card.assignees?.length > 0;
  const hasDueDate = !!card.dueDate;
  const checklistTotal = card.checklist?.length || 0;
  const checklistDone = card.checklist?.filter((i) => i.done).length || 0;

  const formatDue = (date) =>
    new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => {
            if (isDragInProgress?.() || snapshot.isDragging) return;
            onCardClick?.(card);
          }}
          className={`bg-white rounded-xl border border-brand-border px-3.5 py-3 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all duration-150 cursor-pointer group
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-brand-primary/30 rotate-1 !cursor-grabbing' : ''}`}
        >
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
          <p className="text-sm font-medium text-brand-text leading-snug break-words">{card.title}</p>

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
                {hasDueDate && <span>{formatDue(card.dueDate)}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ListColumn  – one draggable kanban column
───────────────────────────────────────────────────────────────────────── */
const ListColumn = ({
  list,
  cards,
  index,
  onCardClick,
  isDragInProgress,
  onUpdateListTitle,
  onDeleteList,
  onCreateCard
}) => {
  // Rename list state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);

  // Delete list confirm state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add card inline state
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  useEffect(() => {
    setTitleInput(list.title);
  }, [list.title]);

  const handleSaveTitle = async (e) => {
    e?.preventDefault();
    const trimmed = titleInput.trim();
    if (!trimmed) {
      toast.error('List title cannot be empty');
      setTitleInput(list.title);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed === list.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await onUpdateListTitle(list._id, trimmed);
      setIsEditingTitle(false);
    } catch {
      setTitleInput(list.title);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDeleteList(list._id);
    } catch {
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCardSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;

    try {
      setIsSubmittingCard(true);
      await onCreateCard(list._id, trimmed);
      setNewCardTitle('');
      setIsAddingCard(false);
    } finally {
      setIsSubmittingCard(false);
    }
  };

  return (
    <Draggable draggableId={list._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`w-72 shrink-0 flex flex-col bg-slate-100/80 rounded-2xl border border-brand-border overflow-hidden
            ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-brand-primary/20' : ''}`}
        >
          {/* Column header – drag handle for the whole list */}
          <div
            {...provided.dragHandleProps}
            className="px-4 py-3 bg-white/70 border-b border-brand-border cursor-grab active:cursor-grabbing"
          >
            {isConfirmingDelete ? (
              <div
                className="flex items-center justify-between gap-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-semibold text-red-600 truncate">Delete list?</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? '...' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-brand-text text-[11px] font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isEditingTitle ? (
              <form
                onSubmit={handleSaveTitle}
                className="flex items-center gap-1.5"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setTitleInput(list.title);
                    }
                  }}
                  autoFocus
                  className="flex-1 px-2 py-0.5 text-sm font-bold text-brand-text bg-white border border-brand-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </form>
            ) : (
              <div className="flex items-center justify-between group/header">
                <div
                  className="flex items-center gap-1.5 min-w-0 flex-1 mr-2 cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Click to rename list"
                >
                  <h3 className="text-sm font-bold text-brand-text truncate hover:text-brand-primary transition-colors">
                    {list.title}
                  </h3>
                  <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0" />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-brand-text-secondary text-[11px] font-bold flex items-center justify-center">
                    {cards.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover/header:opacity-100"
                    title="Delete list"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Droppable card area */}
          <Droppable droppableId={list._id} type="CARD">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-17rem)] transition-colors duration-150
                  ${dropSnapshot.isDraggingOver ? 'bg-brand-primary/5' : ''}`}
              >
                {cards.length === 0 && !dropSnapshot.isDraggingOver ? (
                  <div className="py-6 text-center text-xs text-brand-text-muted border-2 border-dashed border-slate-200 rounded-xl">
                    No cards
                  </div>
                ) : (
                  cards.map((card, cardIndex) => (
                    <CardItem
                      key={card._id}
                      card={card}
                      index={cardIndex}
                      onCardClick={onCardClick}
                      isDragInProgress={isDragInProgress}
                    />
                  ))
                )}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add card at bottom of list */}
          <div className="p-2 pt-0">
            {isAddingCard ? (
              <form onSubmit={handleAddCardSubmit} className="space-y-2 bg-white p-2.5 rounded-xl border border-brand-border shadow-sm">
                <textarea
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddCardSubmit();
                    } else if (e.key === 'Escape') {
                      setIsAddingCard(false);
                      setNewCardTitle('');
                    }
                  }}
                  autoFocus
                  placeholder="Enter a title for this card..."
                  rows={2}
                  className="w-full text-xs text-brand-text p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white resize-none"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={isSubmittingCard || !newCardTitle.trim()}
                    className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmittingCard ? 'Adding...' : 'Add Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCard(false);
                      setNewCardTitle('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-text hover:bg-slate-100 transition-colors"
                    title="Cancel (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCard(true)}
                className="w-full py-2 px-3 flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary hover:text-brand-text hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a card</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   BoardView  – main page
───────────────────────────────────────────────────────────────────────── */

// All events the server can broadcast into a board room
const BOARD_EVENTS = [
  'card:created',
  'card:updated',
  'card:deleted',
  'card:moved',
  'list:created',
  'list:updated',
  'list:deleted',
  'list:moved',
];

const BoardView = () => {
  const { boardId } = useParams();

  const [board, setBoard]                   = useState(null);
  const [lists, setLists]                   = useState([]);
  const [cards, setCards]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Add list inline state
  const [isAddingList, setIsAddingList]     = useState(false);
  const [newListTitle, setNewListTitle]     = useState('');
  const [isSubmittingList, setIsSubmittingList] = useState(false);

  // True while a drag gesture is in progress – guards against mid-drag refetches
  const isDraggingRef = useRef(false);
  // Guard against click triggering modal immediately after a drag release
  const dragJustEndedRef = useRef(false);
  // If a broadcast arrived during a drag, refetch once the drag finishes
  const pendingRefetchRef = useRef(false);

  /* ── Data loading ── */
  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBoardById(boardId);
      setBoard(data.board);
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

  /* ── Socket.io setup ── */
  useEffect(() => {
    if (!boardId) return;

    // Ensure connected (no-op if already connected)
    connectSocket();

    const joinRoom = () => {
      socket.emit('board:join', boardId);
    };

    // Join immediately if already connected, or once the connection is up
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    // Re-join after any reconnect
    socket.on('connect', joinRoom);

    // Handler: schedule a refetch, but guard against mid-drag interruptions
    const handleBoardEvent = () => {
      if (isDraggingRef.current) {
        pendingRefetchRef.current = true;
      } else {
        loadBoard();
      }
    };

    BOARD_EVENTS.forEach((evt) => socket.on(evt, handleBoardEvent));

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('connect', joinRoom);
      BOARD_EVENTS.forEach((evt) => socket.off(evt, handleBoardEvent));
    };
  }, [boardId, loadBoard]);

  /* ── Helpers ── */
  const cardsForList = (listId) =>
    [...cards.filter((c) => c.list === listId)].sort((a, b) => a.position - b.position);

  const isDragInProgress = useCallback(() => {
    return isDraggingRef.current || dragJustEndedRef.current;
  }, []);

  const handleCardClick = useCallback((card) => {
    if (isDragInProgress()) return;
    setSelectedCardId(card._id);
  }, [isDragInProgress]);

  const handleCardUpdated = useCallback((updatedCard) => {
    setCards((prevCards) =>
      prevCards.map((c) => (c._id === updatedCard._id ? updatedCard : c))
    );
  }, []);

  const handleCardDeleted = useCallback((cardId) => {
    setCards((prevCards) => prevCards.filter((c) => c._id !== cardId));
    setSelectedCardId(null);
  }, []);

  const activeCard = selectedCardId
    ? cards.find((c) => c._id === selectedCardId)
    : null;

  /* ── CRUD Actions ── */
  const handleCreateList = async (e) => {
    e?.preventDefault();
    const trimmed = newListTitle.trim();
    if (!trimmed) return;

    try {
      setIsSubmittingList(true);
      const data = await createListApi(boardId, trimmed);
      if (data?.list) {
        setLists((prev) => [...prev, data.list]);
      }
      setNewListTitle('');
      setIsAddingList(false);
      toast.success('List created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create list');
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleUpdateListTitle = async (listId, newTitle) => {
    try {
      const data = await updateListApi(listId, newTitle);
      if (data?.list) {
        setLists((prev) =>
          prev.map((l) => (l._id === listId ? { ...l, title: data.list.title } : l))
        );
      }
      toast.success('List renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename list');
      throw err;
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await deleteListApi(listId);
      setLists((prev) => prev.filter((l) => l._id !== listId));
      setCards((prev) => prev.filter((c) => c.list !== listId));
      toast.success('List deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete list');
      throw err;
    }
  };

  const handleCreateCard = async (listId, title) => {
    try {
      const data = await createCardApi(listId, { title });
      if (data?.card) {
        setCards((prev) => [...prev, data.card]);
      }
      toast.success('Card created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create card');
      throw err;
    }
  };

  /* ── Drag-and-drop ── */
  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onDragEnd = useCallback(
    async (result) => {
      isDraggingRef.current = false;
      dragJustEndedRef.current = true;
      setTimeout(() => {
        dragJustEndedRef.current = false;
      }, 200);

      // If a socket event came in while dragging, refetch now that it's safe
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false;
        loadBoard();
        return; // State will be refreshed from server; skip optimistic apply
      }

      const { type, source, destination, draggableId } = result;

      // Dropped outside any droppable or no movement
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      /* ── LIST reorder ── */
      if (type === 'LIST') {
        const prevLists = lists;
        const next = Array.from(lists);
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);

        // Optimistic update
        setLists(next);

        try {
          await moveListApi(draggableId, destination.index);
        } catch (err) {
          setLists(prevLists);
          toast.error(
            err.response?.data?.message || 'Failed to reorder list. Changes reverted.'
          );
        }
        return;
      }

      /* ── CARD reorder / move ── */
      if (type === 'CARD') {
        const fromListId = source.droppableId;
        const toListId   = destination.droppableId;
        const prevCards  = cards;

        if (fromListId === toListId) {
          const listCards = cardsForList(fromListId);
          const [movedCard] = listCards.splice(source.index, 1);
          listCards.splice(destination.index, 0, movedCard);

          const updatedPositions = listCards.map((c, i) => ({ ...c, position: i }));
          const otherCards = cards.filter((c) => c.list !== fromListId);
          setCards([...otherCards, ...updatedPositions]);
        } else {
          const fromCards = cardsForList(fromListId);
          const toCards   = cardsForList(toListId);
          const [movedCard] = fromCards.splice(source.index, 1);
          const updatedMovedCard = { ...movedCard, list: toListId };
          toCards.splice(destination.index, 0, updatedMovedCard);

          const updatedFrom = fromCards.map((c, i) => ({ ...c, position: i }));
          const updatedTo   = toCards.map((c, i) => ({ ...c, position: i }));
          const untouchedCards = cards.filter(
            (c) => c.list !== fromListId && c.list !== toListId
          );
          setCards([...untouchedCards, ...updatedFrom, ...updatedTo]);
        }

        try {
          await moveCardApi(draggableId, toListId, destination.index);
        } catch (err) {
          setCards(prevCards);
          toast.error(
            err.response?.data?.message || 'Failed to move card. Changes reverted.'
          );
        }
      }
    },
    [lists, cards, cardsForList, loadBoard]
  );

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
              <div
                className="flex -space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsMembersModalOpen(true)}
                title="View board members"
              >
                {board.members?.slice(0, 4).map((m) => (
                  <MemberAvatar key={m.user._id} user={m.user} size="md" title={`${m.user.name} (${m.role})`} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-brand-text-secondary bg-slate-50 border border-brand-border px-2.5 py-1.5 rounded-lg hover:bg-slate-100 hover:text-brand-text hover:border-brand-primary/30 transition-all cursor-pointer"
                title="Manage board members"
              >
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                <span>{board.members?.length || 1} members</span>
              </button>
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
              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <Droppable droppableId="board" type="LIST" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex gap-4 p-6 h-full items-start min-w-max"
                    >
                      {lists.map((list, index) => (
                        <ListColumn
                          key={list._id}
                          list={list}
                          cards={cardsForList(list._id)}
                          index={index}
                          onCardClick={handleCardClick}
                          isDragInProgress={isDragInProgress}
                          onUpdateListTitle={handleUpdateListTitle}
                          onDeleteList={handleDeleteList}
                          onCreateCard={handleCreateCard}
                        />
                      ))}
                      {provided.placeholder}

                      {/* ── Add List Column at End ── */}
                      <div className="w-72 shrink-0">
                        {isAddingList ? (
                          <form
                            onSubmit={handleCreateList}
                            className="bg-slate-100/90 rounded-2xl border border-brand-border p-3 space-y-2.5 shadow-sm"
                          >
                            <input
                              type="text"
                              value={newListTitle}
                              onChange={(e) => setNewListTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setIsAddingList(false);
                                  setNewListTitle('');
                                }
                              }}
                              autoFocus
                              placeholder="Enter list title..."
                              className="w-full px-3 py-2 text-sm font-medium text-brand-text bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="submit"
                                disabled={isSubmittingList || !newListTitle.trim()}
                                className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                              >
                                {isSubmittingList ? 'Adding...' : 'Add List'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingList(false);
                                  setNewListTitle('');
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-brand-text hover:bg-slate-200/60 transition-colors"
                                title="Cancel (Esc)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingList(true)}
                            className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand-primary/40 bg-white/40 hover:bg-white text-xs font-semibold text-brand-text-secondary hover:text-brand-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add another list</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>
      </div>

      {/* ── Card Detail Modal ── */}
      {activeCard && (
        <CardDetailModal
          card={activeCard}
          boardMembers={board?.members || []}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={handleCardDeleted}
        />
      )}

      {/* ── Board Members Modal ── */}
      <MembersModal
        board={board}
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        onBoardUpdated={(updatedBoard) => setBoard(updatedBoard)}
      />
    </div>
  );
};

export default BoardView;
