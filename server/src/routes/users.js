import express from 'express';
import { z } from 'zod';
import { getUsers, updateUserRole, deleteUser } from '../controllers/users.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permissions.js';

const router = express.Router();

const updateRoleSchema = z.object({
  role: z.string().superRefine((val, ctx) => {
    if (val === 'admin') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Admin role cannot be assigned'
      });
    } else if (val !== 'lead' && val !== 'member') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Role must be 'lead' or 'member'"
      });
    }
  })
});

router.use(auth);

router.get('/', requirePermission('users:view'), getUsers);
router.patch(
  '/:userId/role',
  requirePermission('users:manageRole'),
  validate(updateRoleSchema),
  updateUserRole
);
router.delete('/:userId', requirePermission('users:delete'), deleteUser);

export default router;
