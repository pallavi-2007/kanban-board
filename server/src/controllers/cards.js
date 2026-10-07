import Card from '../models/Card.js';
import List from '../models/List.js';
import { moveCard, reorderCardsAfterDelete } from '../services/ordering.js';
import { AppError } from '../middleware/errorHandler.js';
import { broadcast } from '../lib/broadcaster.js';

/**
 * Helper to validate that all assignees are members of the board.
 */
const validateAssigneesAreMembers = (assignees, board) => {
  if (!assignees || assignees.length === 0) return;

  const memberUserIds = new Set(board.members.map((m) => m.user.toString()));
  for (const assigneeId of assignees) {
    if (!memberUserIds.has(assigneeId.toString())) {
      throw new AppError('All assignees must be members of the board', 400);
    }
  }
};

export const createCard = async (req, res, next) => {
  try {
    const { title, description, dueDate, labels, assignees } = req.body;
    const listId = req.params.listId;
    const board = req.board;

    if (assignees && assignees.length > 0) {
      validateAssigneesAreMembers(assignees, board);
    }

    const cardCount = await Card.countDocuments({ list: listId });

    const card = await Card.create({
      board: board._id,
      list: listId,
      title,
      description: description || '',
      position: cardCount,
      assignees: assignees || [],
      dueDate: dueDate || null,
      labels: labels || [],
      checklist: [],
      createdBy: req.user._id
    });

    const populatedCard = await Card.findById(card._id).populate(
      'assignees',
      'name email'
    );

    res.status(201).json({ card: populatedCard });

    broadcast(req, 'card:created', { cardId: card._id.toString(), listId });
  } catch (error) {
    next(error);
  }
};

export const updateCard = async (req, res, next) => {
  try {
    const { title, description, dueDate, labels, assignees, checklist } = req.body;
    const card = req.card;
    const board = req.board;

    if (assignees !== undefined) {
      validateAssigneesAreMembers(assignees, board);
      card.assignees = assignees;
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (labels !== undefined) card.labels = labels;
    if (checklist !== undefined) {
      card.checklist = checklist.map((item) => ({
        text: item.text || item.title || '',
        title: item.title || item.text || '',
        done: !!item.done,
        ...(item._id ? { _id: item._id } : {})
      }));
    }

    await card.save();

    const updated = await Card.findById(card._id).populate(
      'assignees',
      'name email'
    );

    res.status(200).json({ card: updated });

    broadcast(req, 'card:updated', { cardId: card._id.toString() });
  } catch (error) {
    next(error);
  }
};

export const moveCardOrder = async (req, res, next) => {
  try {
    const { toListId, newIndex } = req.body;
    const cardId = req.params.cardId;

    const updatedCards = await moveCard(cardId, toListId, newIndex);

    res.status(200).json({ cards: updatedCards });

    broadcast(req, 'card:moved', { cardId, toListId, newIndex });
  } catch (error) {
    next(error);
  }
};

export const deleteCard = async (req, res, next) => {
  try {
    const cardId = req.card._id;
    const listId = req.card.list;

    await Card.findByIdAndDelete(cardId);
    await reorderCardsAfterDelete(listId);

    res.status(200).json({
      message: 'Card deleted successfully',
      cardId,
      listId
    });

    broadcast(req, 'card:deleted', { cardId: cardId.toString(), listId: listId.toString() });
  } catch (error) {
    next(error);
  }
};
