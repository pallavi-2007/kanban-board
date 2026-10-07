import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { register, login, getMe } from '../controllers/auth.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address').toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address').toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required')
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', auth, getMe);

export default router;
