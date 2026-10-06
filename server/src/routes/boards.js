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
import { boardAccess } from '../middleware/boardAccess.js';
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
router.post('/', validate(createBoardSchema), createBoard);
router.get('/:boardId', boardAccess('member'), getBoardById);
router.patch('/:boardId', boardAccess('owner'), validate(updateBoardSchema), updateBoard);
router.delete('/:boardId', boardAccess('owner'), deleteBoard);
router.post('/:boardId/members', boardAccess('owner'), validate(addMemberSchema), addMember);
router.delete('/:boardId/members/:userId', boardAccess('owner'), removeMember);

// List creation on board
router.post('/:boardId/lists', boardAccess('member'), validate(createListSchema), createList);

export default router;
