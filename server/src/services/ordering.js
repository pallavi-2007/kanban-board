import mongoose from 'mongoose';
import List from '../models/List.js';
import Card from '../models/Card.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Move a list to a new index within its board and renumber positions 0..n-1.
 */
export const moveList = async (listId, newIndex) => {
  if (!mongoose.isValidObjectId(listId)) {
    throw new AppError('Invalid listId', 400);
  }

  const list = await List.findById(listId);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  const lists = await List.find({ board: list.board }).sort({ position: 1 });
  const currentIndex = lists.findIndex((l) => l._id.toString() === listId.toString());

  if (currentIndex === -1) {
    throw new AppError('List not found in board', 404);
  }

  const [removed] = lists.splice(currentIndex, 1);
  const targetIndex = Math.max(0, Math.min(newIndex, lists.length));
  lists.splice(targetIndex, 0, removed);

  const bulkOps = lists.map((l, index) => ({
    updateOne: {
      filter: { _id: l._id },
      update: { $set: { position: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await List.bulkWrite(bulkOps);
  }

  return await List.find({ board: list.board }).sort({ position: 1 });
};

/**
 * Move a card within its list or to another list and renumber positions 0..n-1.
 */
export const moveCard = async (cardId, toListId, newIndex) => {
  if (!mongoose.isValidObjectId(cardId)) {
    throw new AppError('Invalid cardId', 400);
  }
  if (!mongoose.isValidObjectId(toListId)) {
    throw new AppError('Invalid toListId', 400);
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw new AppError('Card not found', 404);
  }

  const sourceListId = card.list.toString();
  const destListId = toListId.toString();

  const destList = await List.findById(destListId);
  if (!destList) {
    throw new AppError('Destination list not found', 404);
  }

  if (destList.board.toString() !== card.board.toString()) {
    throw new AppError('Cannot move card to a list on a different board', 400);
  }

  const affectedCardIds = [];

  if (sourceListId === destListId) {
    // Moving within the same list
    const cards = await Card.find({ list: sourceListId }).sort({ position: 1 });
    const currentIndex = cards.findIndex((c) => c._id.toString() === cardId.toString());

    if (currentIndex === -1) {
      throw new AppError('Card not found in source list', 404);
    }

    const [removed] = cards.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(newIndex, cards.length));
    cards.splice(targetIndex, 0, removed);

    const bulkOps = cards.map((c, index) => {
      affectedCardIds.push(c._id);
      return {
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { position: index } }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Card.bulkWrite(bulkOps);
    }
  } else {
    // Moving to a different list
    const sourceCards = await Card.find({ list: sourceListId }).sort({ position: 1 });
    const destCards = await Card.find({ list: destListId }).sort({ position: 1 });

    const filteredSource = sourceCards.filter((c) => c._id.toString() !== cardId.toString());
    const targetIndex = Math.max(0, Math.min(newIndex, destCards.length));

    // Update moving card's list and insert into destination array
    card.list = destListId;
    destCards.splice(targetIndex, 0, card);

    const bulkOps = [];

    // Renumber source cards
    filteredSource.forEach((c, index) => {
      affectedCardIds.push(c._id);
      bulkOps.push({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { position: index } }
        }
      });
    });

    // Renumber destination cards
    destCards.forEach((c, index) => {
      affectedCardIds.push(c._id);
      bulkOps.push({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { position: index, list: destListId } }
        }
      });
    });

    if (bulkOps.length > 0) {
      await Card.bulkWrite(bulkOps);
    }
  }

  return await Card.find({ _id: { $in: affectedCardIds } })
    .populate('assignees', 'name email')
    .sort({ position: 1 });
};

/**
 * Renumber remaining lists on a board after a list is deleted.
 */
export const reorderListsAfterDelete = async (boardId) => {
  const lists = await List.find({ board: boardId }).sort({ position: 1 });
  const bulkOps = lists.map((l, index) => ({
    updateOne: {
      filter: { _id: l._id },
      update: { $set: { position: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await List.bulkWrite(bulkOps);
  }
};

/**
 * Renumber remaining cards in a list after a card is deleted.
 */
export const reorderCardsAfterDelete = async (listId) => {
  const cards = await Card.find({ list: listId }).sort({ position: 1 });
  const bulkOps = cards.map((c, index) => ({
    updateOne: {
      filter: { _id: c._id },
      update: { $set: { position: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await Card.bulkWrite(bulkOps);
  }
};
