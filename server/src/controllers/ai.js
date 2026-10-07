import mongoose from 'mongoose';
import { GoogleGenAI, Type } from '@google/genai';
import Card from '../models/Card.js';
import Board from '../models/Board.js';
import { AppError } from '../middleware/errorHandler.js';
import { broadcast } from '../lib/broadcaster.js';

export const GEMINI_MODEL = 'gemini-2.5-flash';

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
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Break down the following kanban card task into 4 to 8 concise, actionable subtasks.
Card Title: ${card.title}
${card.description ? `Card Description: ${card.description}` : ''}

Output strictly a JSON array of strings containing the subtask names (between 4 and 8 items).`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });

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
      console.error('Gemini breakdown error:', geminiError.message);
      return res.status(502).json({
        message: 'Failed to generate task breakdown from AI service'
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
    next(error);
  }
};
