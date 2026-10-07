import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Derive the socket origin from VITE_API_URL (strip the /api path if present)
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Single shared socket instance for the whole app.
 *
 * - autoConnect: false so we can attach the JWT token (from localStorage) at
 *   connection time rather than before the user logs in.
 * - The socket is connected lazily the first time connectSocket() is called.
 * - window.__socketId is set so the Axios interceptor in client.js can attach
 *   x-socket-id to REST requests, enabling server-side sender exclusion.
 */
const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

socket.on('connect', () => {
  window.__socketId = socket.id;
  console.log('[socket] connected:', socket.id);
});

socket.on('disconnect', () => {
  window.__socketId = null;
  console.log('[socket] disconnected');
});

/**
 * Connect (or reconnect) the socket with the current JWT from localStorage.
 * Safe to call multiple times – does nothing if already connected.
 */
export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Update auth token in case it changed (e.g. re-login)
  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Disconnect the socket cleanly (call on logout).
 */
export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
