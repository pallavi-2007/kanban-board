import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Socket.io middleware – verifies the JWT sent in socket.handshake.auth.token.
 * Attaches the Mongoose user document to socket.user on success.
 * Calls next(new Error(...)) to reject the connection on failure.
 */
export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, secret);
    if (!decoded?.userId) {
      return next(new Error('Invalid authentication token'));
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};
