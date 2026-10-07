import mongoose from 'mongoose';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import { AppError } from './errorHandler.js';

export const boardAccess = (requiredRole = 'member') => async (req, res, next) => {
  try {
    let boardId = req.params.boardId;

    if (!boardId && req.params.listId) {
      if (!mongoose.isValidObjectId(req.params.listId)) {
        throw new AppError('Invalid listId', 400);
      }
      const list = await List.findById(req.params.listId);
      if (!list) {
        throw new AppError('List not found', 404);
      }
      req.list = list;
      boardId = list.board;
    } else if (!boardId && req.params.cardId) {
      if (!mongoose.isValidObjectId(req.params.cardId)) {
        throw new AppError('Invalid cardId', 400);
      }
      const card = await Card.findById(req.params.cardId);
      if (!card) {
        throw new AppError('Card not found', 404);
      }
      req.card = card;
      boardId = card.board;
    }

    if (!boardId) {
      throw new AppError('Board ID is required', 400);
    }

    if (!mongoose.isValidObjectId(boardId)) {
      throw new AppError('Invalid boardId', 400);
    }

    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const currentUserId = req.user._id.toString();
    const memberEntry = board.members.find(
      (m) => m.user.toString() === currentUserId
    );

    if (!memberEntry) {
      throw new AppError('Access denied: You are not a member of this board', 403);
    }

    if (requiredRole === 'owner' && memberEntry.role !== 'owner') {
      throw new AppError('Access denied: Board owner permissions required', 403);
    }

    req.board = board;
    req.boardRole = memberEntry.role;
    next();
  } catch (error) {
    next(error);
  }
};
