import List from '../models/List.js';
import Card from '../models/Card.js';
import { moveList, reorderListsAfterDelete } from '../services/ordering.js';

export const createList = async (req, res, next) => {
  try {
    const { title } = req.body;
    const boardId = req.board._id;

    const listCount = await List.countDocuments({ board: boardId });

    const list = await List.create({
      board: boardId,
      title,
      position: listCount
    });

    res.status(201).json({ list });
  } catch (error) {
    next(error);
  }
};

export const updateList = async (req, res, next) => {
  try {
    const { title } = req.body;
    const list = req.list;

    if (title !== undefined) list.title = title;
    await list.save();

    res.status(200).json({ list });
  } catch (error) {
    next(error);
  }
};

export const moveListOrder = async (req, res, next) => {
  try {
    const { newIndex } = req.body;
    const listId = req.params.listId;

    const reorderedLists = await moveList(listId, newIndex);

    res.status(200).json({ lists: reorderedLists });
  } catch (error) {
    next(error);
  }
};

export const deleteList = async (req, res, next) => {
  try {
    const listId = req.list._id;
    const boardId = req.list.board;

    // Delete cards belonging to this list
    await Card.deleteMany({ list: listId });
    await List.findByIdAndDelete(listId);

    // Renumber remaining lists on the board
    await reorderListsAfterDelete(boardId);

    const remainingLists = await List.find({ board: boardId }).sort({ position: 1 });

    res.status(200).json({
      message: 'List and associated cards deleted successfully',
      listId,
      lists: remainingLists
    });
  } catch (error) {
    next(error);
  }
};
