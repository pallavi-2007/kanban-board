import User from '../models/User.js';
import Board from '../models/Board.js';
import { AppError } from '../middleware/errorHandler.js';

export const getUsers = async (req, res, next) => {
  try {
    const userRole = req.user.role || 'member';

    if (userRole === 'member') {
      throw new AppError('Forbidden: Members cannot view user directory', 403);
    }

    if (userRole === 'admin') {
      const users = await User.find().select('-passwordHash').sort({ name: 1 });
      return res.status(200).json({ users });
    }

    if (userRole === 'lead') {
      // Lead gets only users on their boards
      const boards = await Board.find({
        $or: [
          { owner: req.user._id },
          { 'members.user': req.user._id }
        ]
      }).select('members.user');

      const userIds = new Set();
      boards.forEach((b) => {
        b.members.forEach((m) => {
          if (m.user) userIds.add(m.user.toString());
        });
      });

      // Include the lead themselves
      userIds.add(req.user._id.toString());

      const users = await User.find({ _id: { $in: Array.from(userIds) } })
        .select('-passwordHash')
        .sort({ name: 1 });

      return res.status(200).json({ users });
    }

    throw new AppError('Forbidden', 403);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can update roles', 403);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      throw new AppError('Admins cannot change their own role', 400);
    }

    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last admin', 400);
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({
      message: 'Role updated successfully',
      user: targetUser
    });
  } catch (error) {
    next(error);
  }
};
