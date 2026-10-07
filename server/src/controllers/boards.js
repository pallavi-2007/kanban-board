import mongoose from 'mongoose';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

export const getBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({ boards });
  } catch (error) {
    next(error);
  }
};

export const createBoard = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    const board = await Board.create({
      title,
      description: description || '',
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'owner'
        }
      ]
    });

    const populatedBoard = await Board.findById(board._id).populate(
      'members.user',
      'name email'
    );

    res.status(201).json({ board: populatedBoard });
  } catch (error) {
    next(error);
  }
};

export const getBoardById = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId).populate(
      'members.user',
      'name email'
    );
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const lists = await List.find({ board: board._id }).sort({ position: 1 });
    const cards = await Card.find({ board: board._id })
      .populate('assignees', 'name email')
      .sort({ position: 1 });

    res.status(200).json({
      board,
      lists,
      cards
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const board = req.board;

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;

    await board.save();

    const updated = await Board.findById(board._id).populate(
      'members.user',
      'name email'
    );

    res.status(200).json({ board: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const boardId = req.board._id;

    // Cascade delete cards and lists
    await Card.deleteMany({ board: boardId });
    await List.deleteMany({ board: boardId });
    await Board.findByIdAndDelete(boardId);

    res.status(200).json({ message: 'Board deleted successfully', boardId });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const board = req.board;

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      throw new AppError('User with this email not found', 404);
    }

    const isAlreadyMember = board.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (isAlreadyMember) {
      throw new AppError('User is already a member of this board', 409);
    }

    board.members.push({
      user: userToAdd._id,
      role: 'member'
    });

    await board.save();

    const updatedBoard = await Board.findById(board._id).populate(
      'members.user',
      'name email'
    );

    res.status(200).json({
      message: 'Member added successfully',
      board: updatedBoard,
      addedMember: {
        user: {
          _id: userToAdd._id,
          name: userToAdd.name,
          email: userToAdd.email
        },
        role: 'member'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const board = req.board;

    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid userId', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (board.owner.toString() === userId.toString()) {
      throw new AppError('Cannot remove the board owner', 400);
    }

    const memberIndex = board.members.findIndex(
      (m) => m.user.toString() === userId.toString()
    );
    if (memberIndex === -1) {
      throw new AppError('User is not a member of this board', 404);
    }

    board.members.splice(memberIndex, 1);
    await board.save();

    // Remove user from assignees of all cards in this board
    await Card.updateMany(
      { board: board._id },
      { $pull: { assignees: userId } }
    );

    const updatedBoard = await Board.findById(board._id).populate(
      'members.user',
      'name email'
    );

    res.status(200).json({
      message: 'Member removed successfully',
      board: updatedBoard,
      removedUserId: userId
    });
  } catch (error) {
    next(error);
  }
};
