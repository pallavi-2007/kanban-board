import { requirePermission } from './permissions.js';

export const boardAccess = (requiredRole = 'member') => {
  const action = requiredRole === 'owner' ? 'board:manage' : 'board:view';
  return requirePermission(action);
};
