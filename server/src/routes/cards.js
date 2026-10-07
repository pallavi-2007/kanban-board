import express from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { updateCard, moveCardOrder, deleteCard } from '../controllers/cards.js';
import { auth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const updateCardSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  checklist: z.array(
    z.object({
      _id: z.string().optional(),
      text: z.string().min(1, 'Checklist text cannot be empty').optional(),
      title: z.string().min(1, 'Title cannot be empty').optional(),
      done: z.boolean().default(false)
    })
  ).optional()
});

const moveCardSchema = z.object({
  toListId: z.string({ required_error: 'toListId is required' }).refine(
    (val) => mongoose.isValidObjectId(val),
    { message: 'Invalid toListId format' }
  ),
  newIndex: z.number({ required_error: 'newIndex is required' }).int().min(0)
});

router.use(auth);

router.patch('/:cardId', requirePermission('card:edit'), validate(updateCardSchema), updateCard);
router.patch('/:cardId/move', requirePermission('card:move'), validate(moveCardSchema), moveCardOrder);
router.delete('/:cardId', requirePermission('card:delete'), deleteCard);

export default router;
