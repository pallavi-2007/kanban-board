import express from 'express';
import { z } from 'zod';
import { updateList, moveListOrder, deleteList } from '../controllers/lists.js';
import { createCard } from '../controllers/cards.js';
import { auth } from '../middleware/auth.js';
import { boardAccess } from '../middleware/boardAccess.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const updateListSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title cannot be empty')
});

const moveListSchema = z.object({
  newIndex: z.number({ required_error: 'newIndex is required' }).int().min(0)
});

const createCardSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional()
});

router.use(auth);

router.patch('/:listId', boardAccess('member'), validate(updateListSchema), updateList);
router.patch('/:listId/move', boardAccess('member'), validate(moveListSchema), moveListOrder);
router.delete('/:listId', boardAccess('member'), deleteList);

// Card creation on list
router.post('/:listId/cards', boardAccess('member'), validate(createCardSchema), createCard);

export default router;
