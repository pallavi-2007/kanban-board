import mongoose from 'mongoose';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import { AppError } from './errorHandler.js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Core Permission Check Helpers
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const isUserAdmin = (user) => {
  return (user?.role || 'member') === 'admin';
};

export const isBoardOwner = (user, board) => {
  if (!user || !board) return false;
  const ownerId = board.owner?._id ? board.owner._id.toString() : board.owner?.toString();
  return ownerId === user._id.toString();
};

export const isBoardMember = (user, board) => {
  if (!user || !board || !board.members) return false;
  const userIdStr = user._id.toString();
  return board.members.some((m) => {
    const mId = m.user?._id ? m.user._id.toString() : m.user?.toString();
    return mId === userIdStr;
  });
};

export const isCardAssignee = (user, card) => {
  if (!user || !card || !card.assignees) return false;
  const userIdStr = user._id.toString();
  return card.assignees.some((a) => {
    const aId = a?._id ? a._id.toString() : a?.toString();
    return aId === userIdStr;
  });
};

export const canViewBoard = (user, board) => {
  if (isUserAdmin(user)) return true;
  return isBoardMember(user, board);
};

export const canCreateBoard = (user) => {
  const role = user?.role || 'member';
  return role === 'admin' || role === 'lead';
};

export const canManageBoard = (user, board) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';
  return role === 'lead' && isBoardOwner(user, board);
};

export const canManageList = (user, board) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';
  return role === 'lead' && isBoardOwner(user, board);
};

export const canCreateCard = (user, board) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';
  return role === 'lead' && isBoardOwner(user, board);
};

export const canDeleteCard = (user, board) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';
  return role === 'lead' && isBoardOwner(user, board);
};

export const canMoveCard = (user, board) => {
  if (isUserAdmin(user)) return true;
  return isBoardMember(user, board);
};

export const canEditCard = (user, board, card, updates = {}) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';

  if (role === 'lead') {
    // Lead owner can manage all card fields including assignees
    if (isBoardOwner(user, board)) return true;
    // Lead member on joined board can work on cards, but cannot manage assignees
    if (isBoardMember(user, board)) {
      if (updates.assignees !== undefined) {
        return false;
      }
      return true;
    }
    return false;
  }

  if (role === 'member') {
    if (!isBoardMember(user, board)) return false;

    // Member cannot edit card details (title, description, due date, labels, assignees)
    const hasDisallowedFields =
      updates.title !== undefined ||
      updates.description !== undefined ||
      updates.dueDate !== undefined ||
      updates.labels !== undefined ||
      updates.assignees !== undefined;

    if (hasDisallowedFields) {
      return false;
    }

    // Member can only tick subtasks on cards assigned to them
    if (updates.checklist !== undefined) {
      return isCardAssignee(user, card);
    }

    return false;
  }

  return false;
};

export const canRunAi = (user, board, card) => {
  if (isUserAdmin(user)) return true;
  const role = user?.role || 'member';

  if (role === 'lead') {
    return isBoardOwner(user, board) || isBoardMember(user, board);
  }

  if (role === 'member') {
    return isBoardMember(user, board) && isCardAssignee(user, card);
  }

  return false;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Express Middleware: requirePermission
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const requirePermission = (action) => async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication token required', 401);
    }

    // 1. Resolve board, list, card based on request params or body
    let boardId = req.params.boardId;
    let listId = req.params.listId;
    let cardId = req.params.cardId || (action === 'ai:breakdown' ? req.body.cardId : null);

    if (cardId) {
      if (!mongoose.isValidObjectId(cardId)) {
        throw new AppError('Invalid cardId', 400);
      }
      const card = await Card.findById(cardId);
      if (!card) {
        throw new AppError('Card not found', 404);
      }
      req.card = card;
      if (!boardId) boardId = card.board;
    }

    if (listId) {
      if (!mongoose.isValidObjectId(listId)) {
        throw new AppError('Invalid listId', 400);
      }
      const list = await List.findById(listId);
      if (!list) {
        throw new AppError('List not found', 404);
      }
      req.list = list;
      if (!boardId) boardId = list.board;
    }

    if (boardId) {
      if (!mongoose.isValidObjectId(boardId)) {
        throw new AppError('Invalid boardId', 400);
      }
      const board = await Board.findById(boardId);
      if (!board) {
        throw new AppError('Board not found', 404);
      }
      req.board = board;
    }

    // 2. Perform action-specific authorization
    switch (action) {
      case 'board:create': {
        if (!canCreateBoard(user)) {
          throw new AppError('Forbidden: Members cannot create boards', 403);
        }
        break;
      }

      case 'board:view': {
        if (!canViewBoard(user, req.board)) {
          throw new AppError('Access denied: You are not a member of this board', 403);
        }
        break;
      }

      case 'board:manage': {
        if (!canManageBoard(user, req.board)) {
          throw new AppError('Forbidden: Only board owners and admins can manage this board', 403);
        }
        break;
      }

      case 'list:manage': {
        if (!canManageList(user, req.board)) {
          throw new AppError('Forbidden: Only board owners and admins can manage lists', 403);
        }
        break;
      }

      case 'card:create': {
        if (!canCreateCard(user, req.board)) {
          throw new AppError('Forbidden: Only board owners and admins can create cards', 403);
        }
        break;
      }

      case 'card:move': {
        if (!canMoveCard(user, req.board)) {
          throw new AppError('Access denied: You must be a member of this board to move cards', 403);
        }
        break;
      }

      case 'card:edit': {
        if (!canEditCard(user, req.board, req.card, req.body)) {
          if (user.role === 'member') {
            if (!isBoardMember(user, req.board)) {
              throw new AppError('Access denied: You are not a member of this board', 403);
            }
            if (req.body.checklist !== undefined && !isCardAssignee(user, req.card)) {
              throw new AppError('Forbidden: Members can only tick subtasks on cards assigned to them', 403);
            }
            throw new AppError('Forbidden: Members cannot edit card details or assignees', 403);
          }
          if (user.role === 'lead' && req.body.assignees !== undefined && !isBoardOwner(user, req.board)) {
            throw new AppError('Forbidden: Only board owners and admins can manage assignees', 403);
          }
          throw new AppError('Forbidden: You do not have permission to edit this card', 403);
        }
        break;
      }

      case 'card:delete': {
        if (!canDeleteCard(user, req.board)) {
          throw new AppError('Forbidden: Only board owners and admins can delete cards', 403);
        }
        break;
      }

      case 'ai:breakdown': {
        if (!canRunAi(user, req.board, req.card)) {
          if (!isBoardMember(user, req.board) && !isBoardOwner(user, req.board) && !isUserAdmin(user)) {
            throw new AppError('Access denied: You are not a member of this board', 403);
          }
          if (user.role === 'member' && !isCardAssignee(user, req.card)) {
            throw new AppError('Forbidden: Members can only use AI breakdown on cards assigned to them', 403);
          }
          throw new AppError('Forbidden: Access denied to AI breakdown for this card', 403);
        }
        break;
      }

      case 'users:view': {
        if (user.role === 'member') {
          throw new AppError('Forbidden: Members cannot view user directory', 403);
        }
        break;
      }

      case 'users:manageRole':
      case 'users:delete': {
        if (!isUserAdmin(user)) {
          throw new AppError('Forbidden: Only administrators can perform this user action', 403);
        }
        break;
      }

      default:
        break;
    }

    next();
  } catch (error) {
    next(error);
  }
};
