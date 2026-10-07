import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { socketAuth } from './lib/socketAuth.js';
import { setIo } from './lib/broadcaster.js';
import Board from './models/Board.js';
import User from './models/User.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Share io with controllers via the broadcaster module
setIo(io);

// Authenticate every socket connection with JWT
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (user: ${socket.user._id})`);

  /* ── board:join ─────────────────────────────────────────────────────── */
  socket.on('board:join', async (boardId) => {
    try {
      if (!boardId) return;

      // Verify the authenticated user is actually an admin or a member of this board
      const board = await Board.findById(boardId).lean();
      if (!board) return;

      const user = await User.findById(socket.user._id).lean();
      const isAdmin = (user?.role || socket.user.role) === 'admin';

      const isMember = board.members.some(
        (m) => m.user.toString() === socket.user._id.toString()
      );
      if (!isAdmin && !isMember) {
        socket.emit('error', { message: 'Access denied: not a board member' });
        return;
      }

      const room = `board:${boardId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    } catch (err) {
      console.error('board:join error:', err.message);
    }
  });

  /* ── board:leave ────────────────────────────────────────────────────── */
  socket.on('board:leave', (boardId) => {
    if (!boardId) return;
    const room = `board:${boardId}`;
    socket.leave(room);
    console.log(`Socket ${socket.id} left ${room}`);
  });

  /* ── disconnect ─────────────────────────────────────────────────────── */
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export { server, io };
