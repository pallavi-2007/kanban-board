import express from 'express';
import { z } from 'zod';
import { getUsers, updateUserRole } from '../controllers/users.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permissions.js';

const router = express.Router();

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'lead', 'member'], {
    errorMap: () => ({ message: "Role must be 'admin', 'lead', or 'member'" })
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

export default router;
