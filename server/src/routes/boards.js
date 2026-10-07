import express from 'express';
import { z } from 'zod';
import {
  getBoards,
  createBoard,
  getBoardById,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember
} from '../controllers/boards.js';
import { createList } from '../controllers/lists.js';
import { auth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const createBoardSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title is required'),
  description: z.string().optional()
});

const updateBoardSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional()
});

const addMemberSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Valid email is required')
});

const createListSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title is required')
});

router.use(auth);

router.get('/', getBoards);
router.post('/', requirePermission('board:create'), validate(createBoardSchema), createBoard);
router.get('/:boardId', requirePermission('board:view'), getBoardById);
router.patch('/:boardId', requirePermission('board:manage'), validate(updateBoardSchema), updateBoard);
router.delete('/:boardId', requirePermission('board:manage'), deleteBoard);
router.post('/:boardId/members', requirePermission('board:manage'), validate(addMemberSchema), addMember);
router.delete('/:boardId/members/:userId', requirePermission('board:manage'), removeMember);

// List creation on board
router.post('/:boardId/lists', requirePermission('list:manage'), validate(createListSchema), createList);

export default router;
