import User from '../models/User.js';
import Board from '../models/Board.js';
import { AppError } from '../middleware/errorHandler.js';

export const getUsers = async (req, res, next) => {
  try {
    const userRole = req.user.role || 'member';

    if (userRole === 'member') {
      throw new AppError('Forbidden: Members cannot view user directory', 403);
    }

    let users;
    if (userRole === 'admin') {
      users = await User.find().select('-passwordHash').sort({ name: 1 }).lean();
    } else if (userRole === 'lead') {
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

      users = await User.find({ _id: { $in: Array.from(userIds) } })
        .select('-passwordHash')
        .sort({ name: 1 })
        .lean();
    } else {
      throw new AppError('Forbidden', 403);
    }

    // Attach the ids of the boards each user belongs to
    const allBoards = await Board.find({}).select('_id members.user owner');
    const userBoardMap = {};
    allBoards.forEach((b) => {
      const bId = b._id;
      const memberUserIds = new Set(
        b.members.map((m) => (m.user?._id ? m.user._id.toString() : m.user?.toString())).filter(Boolean)
      );
      if (b.owner) {
        const ownerId = b.owner._id ? b.owner._id.toString() : b.owner.toString();
        memberUserIds.add(ownerId);
      }
      memberUserIds.forEach((uId) => {
        if (!userBoardMap[uId]) userBoardMap[uId] = [];
        userBoardMap[uId].push(bId);
      });
    });

    const populatedUsers = users.map((u) => ({
      ...u,
      role: u.role || 'member',
      boards: userBoardMap[u._id.toString()] || [],
      boardIds: userBoardMap[u._id.toString()] || []
    }));

    return res.status(200).json({ users: populatedUsers });
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
