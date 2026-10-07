import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import boardsRoutes from './routes/boards.js';
import listsRoutes from './routes/lists.js';
import cardsRoutes from './routes/cards.js';
import aiRoutes from './routes/ai.js';
import usersRoutes from './routes/users.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(helmet());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

app.use(generalLimiter);

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// Param validation for ObjectId parameters (boardId, listId, cardId, userId)
['boardId', 'listId', 'cardId', 'userId'].forEach((paramName) => {
  app.param(paramName, (req, res, next, val) => {
    if (!mongoose.isValidObjectId(val)) {
      return next(new AppError(`Invalid ${paramName}`, 400));
    }
    next();
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);

// 404 Handler
app.use('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
