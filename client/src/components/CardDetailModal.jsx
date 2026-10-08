import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckSquare,
  Square,
  AlignLeft,
  Users,
  Calendar,
  Loader2,
  Trash2,
  Pencil,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCardApi, aiBreakdownCardApi, deleteCardApi } from '../api/boards.js';

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

const CardDetailModal = ({
  card,
  boardMembers = [],
  onClose,
  onCardUpdated,
  onCardDeleted,
  canEditDetails = false,
  canManageAssignees = false,
  canDeleteCard = false,
  canRunAi = false,
  canTickChecklist = false
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);
  const [updatingAssignees, setUpdatingAssignees] = useState(false);

  // Edit title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(card?.title || '');
  const [savingTitle, setSavingTitle] = useState(false);

  // Edit description state
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(card?.description || '');
  const [savingDesc, setSavingDesc] = useState(false);

  // Delete card confirm state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);

  // Keep inputs updated when card changes from outside (e.g. socket events)
  useEffect(() => {
    if (card) {
      if (!isEditingTitle) setTitleInput(card.title || '');
      if (!isEditingDesc) setDescInput(card.description || '');
    }
  }, [card, isEditingTitle, isEditingDesc]);

  if (!card) return null;

  const checklist = card.checklist || [];
  const totalItems = checklist.length;
  const completedItems = checklist.filter((item) => item.done).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const formatDue = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  const handleSaveTitle = async (e) => {
    e?.preventDefault();
    if (!canEditDetails) return;
    const trimmed = titleInput.trim();
    if (!trimmed) {
      toast.error('Card title cannot be empty');
      return;
    }
    if (trimmed === card.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setSavingTitle(true);
      const data = await updateCardApi(card._id, { title: trimmed });
      if (data?.card) {
        onCardUpdated(data.card);
      }
      setIsEditingTitle(false);
      toast.success('Card title updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update title');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveDesc = async () => {
    if (!canEditDetails) return;
    const trimmed = descInput.trim();
    if (trimmed === (card.description || '')) {
      setIsEditingDesc(false);
      return;
    }

    try {
      setSavingDesc(true);
      const data = await updateCardApi(card._id, { description: trimmed });
      if (data?.card) {
        onCardUpdated(data.card);
      }
      setIsEditingDesc(false);
      toast.success('Description updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update description');
    } finally {
      setSavingDesc(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!canDeleteCard) return;
    try {
      setDeletingCard(true);
      await deleteCardApi(card._id);
      toast.success('Card deleted');
      onCardDeleted?.(card._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete card');
      setIsConfirmingDelete(false);
    } finally {
      setDeletingCard(false);
    }
  };

  const handleToggleAssignee = async (memberUserId) => {
    if (!canManageAssignees) return;
    if (updatingAssignees) return;

    const currentAssigneeIds = (card.assignees || []).map((u) =>
      typeof u === 'string' ? u : u._id
    );
    const isAssigned = currentAssigneeIds.includes(memberUserId);

    const newAssigneeIds = isAssigned
      ? currentAssigneeIds.filter((id) => id !== memberUserId)
      : [...currentAssigneeIds, memberUserId];

    const previousAssignees = card.assignees;
    const newPopulatedAssignees = newAssigneeIds.map((id) => {
      const existing = card.assignees?.find(
        (u) => (typeof u === 'string' ? u : u._id) === id
      );
      if (existing) return existing;
      const memberObj = boardMembers.find((m) => m.user._id === id);
      return memberObj?.user || { _id: id, name: 'User' };
    });

    onCardUpdated({
      ...card,
      assignees: newPopulatedAssignees
    });

    try {
      setUpdatingAssignees(true);
      const data = await updateCardApi(card._id, { assignees: newAssigneeIds });
      if (data?.card) {
        onCardUpdated(data.card);
      }
    } catch (err) {
      onCardUpdated({
        ...card,
        assignees: previousAssignees
      });
      toast.error(err.response?.data?.message || 'Failed to update assignees');
    } finally {
      setUpdatingAssignees(false);
    }
  };

  const handleToggleChecklistItem = async (index) => {
    if (!canTickChecklist) return;
    if (updatingChecklist) return;

    const previousChecklist = [...checklist];
    const updatedChecklist = checklist.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          done: !item.done
        };
      }
      return item;
    });

    // Optimistically update
    onCardUpdated({
      ...card,
      checklist: updatedChecklist
    });

    try {
      setUpdatingChecklist(true);
      const data = await updateCardApi(card._id, {
        checklist: updatedChecklist
      });
      if (data?.card) {
        onCardUpdated(data.card);
      }
    } catch (err) {
      // Revert on error
      onCardUpdated({
        ...card,
        checklist: previousChecklist
      });
      toast.error(
        err.response?.data?.message || 'Failed to update subtask'
      );
    } finally {
      setUpdatingChecklist(false);
    }
  };

  const handleAiBreakdown = async () => {
    if (!canRunAi) return;
    if (aiLoading) return;

    try {
      setAiLoading(true);
      const data = await aiBreakdownCardApi(card._id);
      if (data?.card) {
        onCardUpdated(data.card);
      }
      toast.success('Task broken down with AI!');
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || 'Failed to generate task breakdown';
      toast.error(serverMessage);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-brand-border shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-brand-border flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex-1 min-w-0">
            {/* Labels */}
            {card.labels?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {card.labels.map((label, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-primary-light text-brand-primary"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Title: Editable or Read-only */}
            {canEditDetails && isEditingTitle ? (
              <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setTitleInput(card.title);
                    }
                  }}
                  autoFocus
                  disabled={savingTitle}
                  className="flex-1 px-2.5 py-1 text-base font-bold text-brand-text border border-brand-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <button
                  type="submit"
                  disabled={savingTitle}
                  className="px-3 py-1 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  {savingTitle ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(false);
                    setTitleInput(card.title);
                  }}
                  className="px-2.5 py-1 bg-slate-200 text-brand-text text-xs font-semibold rounded-xl hover:bg-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h2
                  onClick={() => canEditDetails && setIsEditingTitle(true)}
                  className={`text-lg font-bold text-brand-text leading-snug break-words ${
                    canEditDetails
                      ? 'cursor-pointer hover:bg-slate-200/50 px-1 -mx-1 rounded-lg transition-colors'
                      : ''
                  }`}
                  title={canEditDetails ? 'Click to edit title' : ''}
                >
                  {card.title}
                </h2>
                {canEditDetails && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover/title:opacity-100 p-1 text-brand-text-muted hover:text-brand-text transition-opacity cursor-pointer"
                    title="Edit title"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Row: Due Date */}
          {card.dueDate && (
            <div>
              <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-text-muted" /> Due Date
              </span>
              <span className="text-brand-text font-medium px-2.5 py-1 rounded-lg bg-slate-100 border border-brand-border text-xs">
                {formatDue(card.dueDate)}
              </span>
            </div>
          )}

          {/* Assignees Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-text-muted" /> Assignees
              </span>
              {canManageAssignees && (
                <span className="text-[11px] text-brand-text-muted">
                  Click member to assign / unassign
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManageAssignees ? (
                boardMembers.length > 0 ? (
                  boardMembers.map((member) => {
                    const u = member.user;
                    const isAssigned = (card.assignees || []).some(
                      (a) => (typeof a === 'string' ? a : a._id) === u._id
                    );
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => handleToggleAssignee(u._id)}
                        disabled={updatingAssignees}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isAssigned
                            ? 'bg-brand-primary-light border-brand-primary/40 text-brand-primary shadow-xs'
                            : 'bg-white border-brand-border text-brand-text-secondary hover:bg-slate-50 hover:text-brand-text'
                        }`}
                        title={isAssigned ? `Unassign ${u.name}` : `Assign ${u.name}`}
                      >
                        <MemberAvatar user={u} size="sm" />
                        <span>{u.name}</span>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-brand-text-muted italic">No board members found</span>
                )
              ) : (
                /* Read-only assignees */
                (card.assignees || []).length > 0 ? (
                  (card.assignees || []).map((a) => {
                    const u = typeof a === 'string' ? boardMembers.find((m) => m.user._id === a)?.user || { _id: a, name: 'User' } : a;
                    return (
                      <div
                        key={u._id}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-brand-border bg-slate-50 text-xs font-medium text-brand-text"
                      >
                        <MemberAvatar user={u} size="sm" />
                        <span>{u.name}</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-brand-text-muted italic">No assignees</span>
                )
              )}
            </div>
          </div>

          {/* Description Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-brand-text-muted" /> Description
              </h3>
              {canEditDetails && !isEditingDesc && (
                <button
                  type="button"
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-brand-primary hover:text-brand-primary-hover font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            {canEditDetails && isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  rows={4}
                  autoFocus
                  disabled={savingDesc}
                  placeholder="Add a more detailed description..."
                  className="w-full p-3 bg-white rounded-xl border border-brand-primary text-sm text-brand-text leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-y"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDesc}
                    disabled={savingDesc}
                    className="px-3.5 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-xl hover:bg-brand-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingDesc ? 'Saving...' : 'Save Description'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDesc(false);
                      setDescInput(card.description || '');
                    }}
                    className="px-3.5 py-1.5 bg-slate-200 text-brand-text text-xs font-semibold rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => canEditDetails && setIsEditingDesc(true)}
                className={`p-3.5 bg-slate-50/80 rounded-xl border border-brand-border text-sm text-brand-text leading-relaxed whitespace-pre-wrap ${
                  canEditDetails ? 'hover:bg-slate-100/60 transition-colors cursor-pointer' : ''
                }`}
                title={canEditDetails ? 'Click to edit description' : ''}
              >
                {card.description?.trim() ? (
                  card.description
                ) : (
                  <span className="text-brand-text-muted italic">
                    {canEditDetails ? 'Click to add a description...' : 'No description'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Checklist / Subtasks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-brand-text-muted" /> Subtasks
                </h3>
                {totalItems > 0 && (
                  <span className="text-xs text-brand-text-muted mt-0.5 block">
                    {completedItems} of {totalItems} completed ({progressPercent}%)
                  </span>
                )}
              </div>

              {/* Break down with AI button – shown only if canRunAi */}
              {canRunAi && (
                <button
                  type="button"
                  onClick={handleAiBreakdown}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 text-white text-xs font-semibold shadow-sm hover:from-brand-primary-hover hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Breaking down...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Break down with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress bar */}
            {totalItems > 0 && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2 pt-1">
              {totalItems === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-brand-text-muted border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  {canRunAi
                    ? 'No subtasks yet. Click "Break down with AI" to generate actionable subtasks.'
                    : 'No subtasks yet.'}
                </div>
              ) : (
                checklist.map((item, idx) => {
                  const displayText = item.title || item.text || 'Untitled subtask';
                  return (
                    <div
                      key={item._id || idx}
                      onClick={() => canTickChecklist && handleToggleChecklistItem(idx)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all select-none ${
                        canTickChecklist
                          ? 'cursor-pointer hover:border-brand-primary/40 hover:bg-slate-50/50'
                          : 'cursor-default'
                      } ${
                        item.done
                          ? 'bg-slate-50/70 border-slate-200 text-brand-text-muted'
                          : 'bg-white border-brand-border text-brand-text'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!canTickChecklist}
                        className="mt-0.5 text-brand-primary shrink-0 focus:outline-none"
                        tabIndex={-1}
                      >
                        {item.done ? (
                          <CheckSquare className="w-4 h-4 text-brand-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <span
                        className={`text-sm leading-snug break-words ${
                          item.done ? 'line-through text-brand-text-muted' : ''
                        }`}
                      >
                        {displayText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Delete & Close */}
        <div className="px-6 py-3 border-t border-brand-border bg-slate-50 flex items-center justify-between gap-3">
          <div>
            {canDeleteCard && (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-semibold">Delete card?</span>
                  <button
                    type="button"
                    onClick={handleDeleteCard}
                    disabled={deletingCard}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {deletingCard ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={deletingCard}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-brand-text text-xs font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Card</span>
                </button>
              )
            )}
          </div>

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

export default CardDetailModal;
