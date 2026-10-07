import React, { useState } from 'react';
import { X, Sparkles, CheckSquare, Square, AlignLeft, Users, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCardApi, aiBreakdownCardApi } from '../api/boards.js';

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

const CardDetailModal = ({ card, onClose, onCardUpdated }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);

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

  const handleToggleChecklistItem = async (index) => {
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

    // Optimistically notify parent
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
            <h2 className="text-lg font-bold text-brand-text leading-snug break-words">
              {card.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-text-secondary hover:text-brand-text hover:bg-slate-200/60 transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Row: Due Date & Assignees */}
          <div className="flex flex-wrap gap-6 items-start text-sm">
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

            <div>
              <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-text-muted" /> Assignees
              </span>
              {card.assignees?.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {card.assignees.map((user) => (
                    <div
                      key={user._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-brand-border text-xs text-brand-text font-medium"
                    >
                      <MemberAvatar user={user} size="sm" />
                      <span>{user.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-brand-text-muted italic">No assignees</span>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-brand-text-muted" /> Description
            </h3>
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-brand-border text-sm text-brand-text leading-relaxed whitespace-pre-wrap">
              {card.description?.trim() ? (
                card.description
              ) : (
                <span className="text-brand-text-muted italic">No description provided.</span>
              )}
            </div>
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

              {/* Break down with AI button */}
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
                  No subtasks yet. Click &quot;Break down with AI&quot; to generate actionable subtasks.
                </div>
              ) : (
                checklist.map((item, idx) => {
                  const displayText = item.title || item.text || 'Untitled subtask';
                  return (
                    <div
                      key={item._id || idx}
                      onClick={() => handleToggleChecklistItem(idx)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        item.done
                          ? 'bg-slate-50/70 border-slate-200 text-brand-text-muted'
                          : 'bg-white border-brand-border text-brand-text hover:border-brand-primary/40 hover:bg-slate-50/50'
                      }`}
                    >
                      <button
                        type="button"
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

        {/* Modal Footer */}
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

export default CardDetailModal;
