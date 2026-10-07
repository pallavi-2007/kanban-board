import express from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import { breakdownCard } from '../controllers/ai.js';

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many AI requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(auth);
router.post('/breakdown', aiRateLimiter, breakdownCard);

export default router;
