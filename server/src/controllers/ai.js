import mongoose from 'mongoose';
import { GoogleGenAI, Type } from '@google/genai';
import Card from '../models/Card.js';
import Board from '../models/Board.js';
import { AppError } from '../middleware/errorHandler.js';
import { broadcast } from '../lib/broadcaster.js';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const AI_TIMEOUT_MS = 90000;

export const breakdownCard = async (req, res, next) => {
  try {
    const { cardId } = req.body;

    if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
      throw new AppError('A valid cardId is required', 400);
    }

    const card = await Card.findById(cardId);
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    const board = await Board.findById(card.board);
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const userIdStr = req.user._id.toString();
    const isMember = board.members.some((m) => m.user.toString() === userIdStr);
    if (!isMember) {
      throw new AppError('Access denied: You are not a member of this board', 403);
    }

    let subtasks = [];
    let timeoutId;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { timeout: AI_TIMEOUT_MS }
      });

      const prompt = `Title: ${card.title}
${card.description ? `Description: ${card.description}` : ''}

Provide 4 to 8 short subtasks (max 8 words each) as a JSON array of strings. No extra text.`;

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI request timed out after 90 seconds'));
        }, AI_TIMEOUT_MS);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            }
          }
        }),
        timeoutPromise
      ]);

      clearTimeout(timeoutId);

      let raw = response.text?.trim() || '';
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      subtasks = parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
        .slice(0, 8);

      if (subtasks.length === 0) {
        throw new Error('No valid subtasks found');
      }
    } catch (geminiError) {
      clearTimeout(timeoutId);
      console.error('Gemini breakdown error:', geminiError.message);

      const status = geminiError.status || geminiError.statusCode || geminiError.response?.status;
      const errMsg = geminiError.message || '';

      if (status === 429 || errMsg.includes('429') || /quota|resource_exhausted|rate limit/i.test(errMsg)) {
        return res.status(429).json({
          message: 'AI rate limit exceeded. Please try again shortly.'
        });
      }

      if (status === 404 || errMsg.includes('404') || /not found/i.test(errMsg)) {
        return res.status(404).json({
          message: 'AI model or resource not found.'
        });
      }

      const isTimeout = errMsg.toLowerCase().includes('timed out');
      return res.status(502).json({
        message: isTimeout
          ? 'AI request timed out after 90 seconds'
          : 'Failed to generate task breakdown from AI service'
      });
    }

    // Save as checklist items [{ text, title, done: false }]
    card.checklist = subtasks.map((taskText) => ({
      text: taskText,
      title: taskText,
      done: false
    }));

    await card.save();

    const populatedCard = await Card.findById(card._id).populate(
      'assignees',
      'name email'
    );

    req.board = board;
    broadcast(req, 'card:updated', {
      cardId: card._id.toString(),
      boardId: board._id.toString()
    });

    res.status(200).json({ card: populatedCard });
  } catch (error) {
    if (error.statusCode === 404 || error.status === 404) {
      return res.status(404).json({ message: error.message || 'Not found' });
    }
    if (error.statusCode === 429 || error.status === 429) {
      return res.status(429).json({ message: error.message || 'Too many requests' });
    }
    next(error);
  }
};