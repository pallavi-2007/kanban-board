import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Board from '../models/Board.js';
import List from '../models/List.js';
import Card from '../models/Card.js';

dotenv.config();

const DEMO_EMAILS = [
  'aarav@demo.com',
  'priya@demo.com',
  'rohan@demo.com'
];

const BOARD_TITLE = 'Final Year Project: Smart Attendance System';

export const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Seeding demo data...');

    // 1. Identify and remove ONLY existing demo users and their demo boards
    const existingDemoUsers = await User.find({ email: { $in: DEMO_EMAILS } });
    const demoUserIds = existingDemoUsers.map((u) => u._id);

    const existingDemoBoards = await Board.find({
      $or: [
        { owner: { $in: demoUserIds } },
        { title: BOARD_TITLE }
      ]
    });
    const demoBoardIds = existingDemoBoards.map((b) => b._id);

    // Delete associated demo cards and lists
    if (demoBoardIds.length > 0) {
      await Card.deleteMany({ board: { $in: demoBoardIds } });
      await List.deleteMany({ board: { $in: demoBoardIds } });
      await Board.deleteMany({ _id: { $in: demoBoardIds } });
    }

    if (demoUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: demoUserIds } });
    }

    // 2. Create demo users
    const passwordHash = await bcrypt.hash('Password123', 10);

    const aarav = await User.create({
      name: 'Aarav',
      email: 'aarav@demo.com',
      passwordHash
    });

    const priya = await User.create({
      name: 'Priya',
      email: 'priya@demo.com',
      passwordHash
    });

    const rohan = await User.create({
      name: 'Rohan',
      email: 'rohan@demo.com',
      passwordHash
    });

    // 3. Create demo board
    const board = await Board.create({
      title: BOARD_TITLE,
      description: 'College project tracking board for the smart attendance system.',
      owner: aarav._id,
      members: [
        { user: aarav._id, role: 'owner' },
        { user: priya._id, role: 'member' },
        { user: rohan._id, role: 'member' }
      ]
    });

    // 4. Create lists
    const listNames = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
    const listsMap = {};

    for (let i = 0; i < listNames.length; i++) {
      const listDoc = await List.create({
        board: board._id,
        title: listNames[i],
        position: i
      });
      listsMap[listNames[i]] = listDoc;
    }

    // 5. Create cards
    const cardsData = [
      {
        list: listsMap['Backlog']._id,
        title: 'Prepare final presentation',
        description: 'Prepare slides covering architecture, results, and future enhancements.',
        position: 0,
        assignees: []
      },
      {
        list: listsMap['Backlog']._id,
        title: 'Write project report',
        description: 'Complete the comprehensive final year project report including methodology and evaluation.',
        position: 1,
        assignees: []
      },
      {
        list: listsMap['To Do']._id,
        title: 'Design database schema',
        description: 'Finalize models for users, attendance records, and lecture timings.',
        position: 0,
        assignees: [rohan._id]
      },
      {
        list: listsMap['To Do']._id,
        title: 'Set up GitHub repository',
        description: 'Initialize repo with branch protection and CI workflow.',
        position: 1,
        assignees: [aarav._id]
      },
      {
        list: listsMap['In Progress']._id,
        title: 'Build login page',
        description: 'Create responsive UI with form validation and JWT authentication.',
        position: 0,
        assignees: [priya._id]
      },
      {
        list: listsMap['Review']._id,
        title: 'Create wireframes',
        description: 'Figma mockups for student and teacher dashboards.',
        position: 0,
        assignees: [priya._id]
      },
      {
        list: listsMap['Done']._id,
        title: 'Finalize project topic',
        description: 'Submitted topic proposal and received faculty approval.',
        position: 0,
        assignees: [aarav._id]
      }
    ];

    for (const cardItem of cardsData) {
      await Card.create({
        board: board._id,
        list: cardItem.list,
        title: cardItem.title,
        description: cardItem.description,
        position: cardItem.position,
        assignees: cardItem.assignees,
        createdBy: aarav._id,
        checklist: []
      });
    }

    console.log('Seed completed successfully!');
    console.log(`Demo Users: Aarav (aarav@demo.com), Priya (priya@demo.com), Rohan (rohan@demo.com)`);
    console.log(`Board: "${board.title}" with ${listNames.length} lists and ${cardsData.length} cards.`);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
