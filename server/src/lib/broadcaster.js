/**
 * Thin wrapper around the Socket.io `io` instance so controllers can emit
 * board-room events without importing the full server setup.
 *
 * Usage in a controller:
 *   import { broadcast } from '../lib/broadcaster.js';
 *   broadcast(req, 'card:created', { boardId, cardId });
 *
 * The sender's socket is excluded via the x-socket-id header when available,
 * so the initiating tab gets its own optimistic update without a redundant refetch.
 */

let _io = null;

/** Called once from index.js after the io instance is created. */
export const setIo = (io) => {
  _io = io;
};

/**
 * Broadcast an event to all sockets in `board:<boardId>`, excluding the sender.
 *
 * @param {import('express').Request} req  – The Express request (to read boardId + x-socket-id).
 * @param {string} event                   – Socket event name (e.g. 'card:created').
 * @param {object} payload                 – Data to send. boardId is always merged in.
 */
export const broadcast = (req, event, payload) => {
  if (!_io) return;

  // boardId comes from the board document attached by boardAccess middleware
  const boardId = req.board?._id?.toString() ?? payload.boardId;
  if (!boardId) return;

  const room = `board:${boardId}`;
  const senderSocketId = req.headers['x-socket-id'];

  const data = { ...payload, boardId };

  if (senderSocketId) {
    // Exclude the sender's socket — they already have an optimistic update.
    _io.to(room).except(senderSocketId).emit(event, data);
  } else {
    _io.to(room).emit(event, data);
  }
};

/**
 * Remove any connected sockets for the given user from a board room.
 */
export const removeUserFromBoardRoom = (boardId, userId) => {
  if (!_io || !boardId || !userId) return;
  const room = `board:${boardId}`;
  const userIdStr = userId.toString();

  try {
    if (_io.sockets?.sockets) {
      for (const [_, socket] of _io.sockets.sockets) {
        const socketUserId = socket.user?._id?.toString() || socket.user?.id?.toString();
        if (socketUserId === userIdStr) {
          socket.leave(room);
          console.log(`Socket ${socket.id} (user ${userIdStr}) removed from ${room}`);
        }
      }
    }
  } catch (err) {
    console.error('removeUserFromBoardRoom error:', err.message);
  }
};
