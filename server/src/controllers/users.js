import mongoose from 'mongoose';
import User from '../models/User.js';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import { AppError } from '../middleware/errorHandler.js';
import { removeUserFromBoardRoom } from '../lib/broadcaster.js';

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

    // Attach boards each user belongs to: { _id, title, ownerName }
    const boardQuery =
      userRole === 'admin'
        ? {}
        : {
            $or: [
              { owner: req.user._id },
              { 'members.user': req.user._id }
            ]
          };

    const visibleBoards = await Board.find(boardQuery)
      .select('_id title members.user owner')
      .populate('owner', 'name email');

    const userBoardMap = {};
    const userBoardIdsMap = {};

    visibleBoards.forEach((b) => {
      const ownerName = b.owner?.name || b.owner?.email || 'Unknown';
      const boardInfo = {
        _id: b._id,
        title: b.title,
        ownerName
      };

      const memberUserIds = new Set(
        b.members.map((m) => (m.user?._id ? m.user._id.toString() : m.user?.toString())).filter(Boolean)
      );
      if (b.owner) {
        const ownerId = b.owner._id ? b.owner._id.toString() : b.owner.toString();
        memberUserIds.add(ownerId);
      }

      memberUserIds.forEach((uId) => {
        if (!userBoardMap[uId]) userBoardMap[uId] = [];
        if (!userBoardIdsMap[uId]) userBoardIdsMap[uId] = [];
        userBoardMap[uId].push(boardInfo);
        userBoardIdsMap[uId].push(b._id);
      });
    });

    const populatedUsers = users.map((u) => ({
      ...u,
      role: u.role || 'member',
      boards: userBoardMap[u._id.toString()] || [],
      boardIds: userBoardIdsMap[u._id.toString()] || []
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

    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid userId', 400);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can update roles', 403);
    }

    if (role === 'admin') {
      throw new AppError('Admin role cannot be assigned', 400);
    }

    if (role !== 'lead' && role !== 'member') {
      throw new AppError("Role must be 'lead' or 'member'", 400);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    if (targetUser.role === 'admin') {
      throw new AppError('Admin role cannot be changed', 403);
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      throw new AppError('Admins cannot change their own role', 400);
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

export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid userId', 400);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Forbidden: Only administrators can delete users', 403);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    if (targetUser.role === 'admin' || targetUser._id.toString() === req.user._id.toString()) {
      throw new AppError('Forbidden: Cannot delete an administrator or yourself', 403);
    }

    const ownedBoard = await Board.findOne({ owner: targetUser._id });
    if (ownedBoard) {
      throw new AppError('Delete or reassign their boards first', 400);
    }

    // Find all boards user belongs to
    const userBoards = await Board.find({ 'members.user': targetUser._id });

    // Remove user from all boards' members
    await Board.updateMany(
      { 'members.user': targetUser._id },
      { $pull: { members: { user: targetUser._id } } }
    );

    // Remove user from all cards' assignees
    await Card.updateMany(
      { assignees: targetUser._id },
      { $pull: { assignees: targetUser._id } }
    );

    // Disconnect their sockets from board rooms if connected
    for (const b of userBoards) {
      removeUserFromBoardRoom(b._id, targetUser._id);
    }

    // Delete user
    await User.findByIdAndDelete(targetUser._id);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
