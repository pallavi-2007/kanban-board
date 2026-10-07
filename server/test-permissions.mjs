/**
 * test-permissions.mjs
 *
 * In-process permission tests – no server start required.
 * Tests the permission helpers and requirePermission middleware directly with
 * mock req/res/next objects. Also tests ObjectId validation paths.
 *
 * Run: node test-permissions.mjs
 */

import mongoose from 'mongoose';

// ── Import helpers under test ─────────────────────────────────────────────────
import {
  isUserAdmin,
  isBoardOwner,
  isBoardMember,
  isCardAssignee,
  canCreateBoard,
  canManageBoard,
  canManageList,
  canCreateCard,
  canDeleteCard,
  canMoveCard,
  canEditCard,
  canRunAi,
  requirePermission,
} from './src/middleware/permissions.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mkId = () => new mongoose.Types.ObjectId();

const adminId  = mkId();
const leadId   = mkId();
const memberId = mkId();
const outsiderId = mkId();
const boardId  = mkId();
const cardId   = mkId();

const adminUser  = { _id: adminId,   role: 'admin'  };
const leadUser   = { _id: leadId,    role: 'lead'   };
const memberUser = { _id: memberId,  role: 'member' };
const outsider   = { _id: outsiderId, role: 'member' };

const board = {
  _id: boardId,
  owner: leadId,
  members: [
    { user: leadId   },
    { user: memberId },
  ],
};

const card = {
  _id: cardId,
  board: boardId,
  assignees: [memberId],
};

const cardNotAssigned = {
  _id: mkId(),
  board: boardId,
  assignees: [],
};

// ── Test runner ───────────────────────────────────────────────────────────────
const results = [];

function test(description, fn) {
  try {
    const pass = fn();
    results.push({ description, status: pass ? 'PASS' : 'FAIL' });
  } catch (e) {
    results.push({ description, status: `FAIL (threw: ${e.message})` });
  }
}

// ── Helper unit tests ─────────────────────────────────────────────────────────

// isUserAdmin
test('isUserAdmin: admin returns true',  () => isUserAdmin(adminUser) === true);
test('isUserAdmin: lead returns false',  () => isUserAdmin(leadUser)  === false);
test('isUserAdmin: member returns false',() => isUserAdmin(memberUser)=== false);

// isBoardOwner
test('isBoardOwner: lead owns board',    () => isBoardOwner(leadUser, board)   === true);
test('isBoardOwner: member does not own',() => isBoardOwner(memberUser, board) === false);
test('isBoardOwner: admin does not own', () => isBoardOwner(adminUser, board)  === false);

// isBoardMember
test('isBoardMember: lead is member',    () => isBoardMember(leadUser, board)   === true);
test('isBoardMember: member is member',  () => isBoardMember(memberUser, board) === true);
test('isBoardMember: outsider is not',   () => isBoardMember(outsider, board)   === false);
test('isBoardMember: admin is not (raw)',() => isBoardMember(adminUser, board)  === false);

// isCardAssignee
test('isCardAssignee: member is assignee',    () => isCardAssignee(memberUser, card) === true);
test('isCardAssignee: lead is not assignee',  () => isCardAssignee(leadUser, card)   === false);
test('isCardAssignee: unassigned card false', () => isCardAssignee(memberUser, cardNotAssigned) === false);

// canCreateBoard
test('canCreateBoard: admin can',  () => canCreateBoard(adminUser)  === true);
test('canCreateBoard: lead can',   () => canCreateBoard(leadUser)   === true);
test('canCreateBoard: member cannot', () => canCreateBoard(memberUser) === false);

// canManageBoard
test('canManageBoard: admin can',         () => canManageBoard(adminUser, board)  === true);
test('canManageBoard: lead-owner can',    () => canManageBoard(leadUser, board)   === true);
test('canManageBoard: member cannot',     () => canManageBoard(memberUser, board) === false);

// canManageList
test('canManageList: admin can',      () => canManageList(adminUser, board)  === true);
test('canManageList: lead-owner can', () => canManageList(leadUser, board)   === true);
test('canManageList: member cannot',  () => canManageList(memberUser, board) === false);

// canCreateCard / canDeleteCard
test('canCreateCard: admin can',      () => canCreateCard(adminUser, board)  === true);
test('canCreateCard: lead-owner can', () => canCreateCard(leadUser, board)   === true);
test('canCreateCard: member cannot',  () => canCreateCard(memberUser, board) === false);
test('canDeleteCard: admin can',      () => canDeleteCard(adminUser, board)  === true);
test('canDeleteCard: lead-owner can', () => canDeleteCard(leadUser, board)   === true);
test('canDeleteCard: member cannot',  () => canDeleteCard(memberUser, board) === false);

// canMoveCard
test('canMoveCard: admin can',    () => canMoveCard(adminUser, board)  === true);
test('canMoveCard: lead can',     () => canMoveCard(leadUser, board)   === true);
test('canMoveCard: member can',   () => canMoveCard(memberUser, board) === true);
test('canMoveCard: outsider cannot', () => canMoveCard(outsider, board) === false);

// canEditCard – admin / lead owner / lead member / member
test('canEditCard: admin full edit',              () => canEditCard(adminUser, board, card, { title: 'x' })          === true);
test('canEditCard: lead-owner full edit',         () => canEditCard(leadUser, board, card, { title: 'x' })           === true);
test('canEditCard: lead-owner manage assignees',  () => canEditCard(leadUser, board, card, { assignees: [] })        === true);

// Lead non-owner (simulate lead on board they don't own)
const boardNotOwnedByLead = { ...board, owner: memberId };
test('canEditCard: lead non-owner cannot set assignees',
  () => canEditCard(leadUser, boardNotOwnedByLead, card, { assignees: [] }) === false);
test('canEditCard: lead non-owner can edit title',
  () => canEditCard(leadUser, boardNotOwnedByLead, card, { title: 'x' }) === true);

// Member
test('canEditCard: member cannot edit title',     () => canEditCard(memberUser, board, card, { title: 'x' })         === false);
test('canEditCard: member cannot set assignees',  () => canEditCard(memberUser, board, card, { assignees: [] })      === false);
test('canEditCard: member can tick assigned card checklist',
  () => canEditCard(memberUser, board, card, { checklist: [] })     === true);
test('canEditCard: member cannot tick unassigned card checklist',
  () => canEditCard(memberUser, board, cardNotAssigned, { checklist: [] }) === false);
test('canEditCard: outsider cannot edit',
  () => canEditCard(outsider, board, card, { checklist: [] }) === false);

// canRunAi
test('canRunAi: admin can',                   () => canRunAi(adminUser, board, card)            === true);
test('canRunAi: lead-owner can',              () => canRunAi(leadUser, board, card)             === true);
test('canRunAi: member assigned can',         () => canRunAi(memberUser, board, card)           === true);
test('canRunAi: member unassigned cannot',    () => canRunAi(memberUser, board, cardNotAssigned)=== false);
test('canRunAi: outsider cannot',             () => canRunAi(outsider, board, card)             === false);

// ── requirePermission middleware tests ────────────────────────────────────────
// We call the middleware directly with mock req/res/next and inspect next(err).

async function runMiddleware(action, { user, params = {}, body = {}, board: mockBoard, card: mockCard, list: mockList }) {
  return new Promise((resolve) => {
    const req = { user, params, body, board: mockBoard, card: mockCard, list: mockList };
    const res = {};
    // Monkey-patch: override Board/List/Card findById so no DB needed
    // We inject the resolved objects via req directly for actions that need them.
    // requirePermission will look up by params.boardId, so we set params.boardId
    // to a sentinel that we intercept via mongoose.isValidObjectId only.

    const next = (err) => resolve(err);
    // For middleware that calls Board.findById etc., we instead pre-populate req
    // before calling, and pass boardId=undefined so the middleware skips DB lookup.
    requirePermission(action)(req, res, next);
  });
}

async function testMiddleware(description, action, reqOpts, expectError) {
  // For middleware-level tests we need to bypass DB calls.
  // We set params.boardId/cardId/listId to undefined and pre-populate req.board/card/list.
  const err = await runMiddleware(action, reqOpts);
  const statusMatch = expectError
    ? (err && err.statusCode === expectError)
    : !err;
  results.push({ description, status: statusMatch ? 'PASS' : `FAIL (got ${err ? err.statusCode + ' ' + err.message : 'no error'}, expected ${expectError || 'none'})` });
}

// Pre-populate req objects, no DB calls (params.boardId=undefined so middleware skips lookup)
await testMiddleware(
  'middleware board:create – admin passes',
  'board:create', { user: adminUser, params: {}, board }, null
);
await testMiddleware(
  'middleware board:create – lead passes',
  'board:create', { user: leadUser, params: {}, board }, null
);
await testMiddleware(
  'middleware board:create – member gets 403',
  'board:create', { user: memberUser, params: {}, board }, 403
);
await testMiddleware(
  'middleware board:view – member on board passes',
  'board:view', { user: memberUser, params: {}, board }, null
);
await testMiddleware(
  'middleware board:view – outsider gets 403',
  'board:view', { user: outsider, params: {}, board }, 403
);
await testMiddleware(
  'middleware board:view – admin gets access (not a board member but admin)',
  'board:view', { user: adminUser, params: {}, board }, null
);
await testMiddleware(
  'middleware board:manage – lead-owner passes',
  'board:manage', { user: leadUser, params: {}, board }, null
);
await testMiddleware(
  'middleware board:manage – member gets 403',
  'board:manage', { user: memberUser, params: {}, board }, 403
);
await testMiddleware(
  'middleware list:manage – lead-owner passes',
  'list:manage', { user: leadUser, params: {}, board }, null
);
await testMiddleware(
  'middleware list:manage – member gets 403',
  'list:manage', { user: memberUser, params: {}, board }, 403
);
await testMiddleware(
  'middleware card:move – member on board passes',
  'card:move', { user: memberUser, params: {}, board }, null
);
await testMiddleware(
  'middleware card:move – outsider gets 403',
  'card:move', { user: outsider, params: {}, board }, 403
);
await testMiddleware(
  'middleware card:edit – member ticking assigned card passes',
  'card:edit', { user: memberUser, params: {}, body: { checklist: [] }, board, card }, null
);
await testMiddleware(
  'middleware card:edit – member editing title gets 403',
  'card:edit', { user: memberUser, params: {}, body: { title: 'x' }, board, card }, 403
);
await testMiddleware(
  'middleware card:edit – member ticking unassigned card gets 403',
  'card:edit', { user: memberUser, params: {}, body: { checklist: [] }, board, card: cardNotAssigned }, 403
);
await testMiddleware(
  'middleware ai:breakdown – admin passes',
  'ai:breakdown', { user: adminUser, params: {}, body: {}, board, card }, null
);
await testMiddleware(
  'middleware ai:breakdown – member assigned passes',
  'ai:breakdown', { user: memberUser, params: {}, body: {}, board, card }, null
);
await testMiddleware(
  'middleware ai:breakdown – member unassigned gets 403',
  'ai:breakdown', { user: memberUser, params: {}, body: {}, board, card: cardNotAssigned }, 403
);
await testMiddleware(
  'middleware users:view – lead passes',
  'users:view', { user: leadUser, params: {} }, null
);
await testMiddleware(
  'middleware users:view – member gets 403',
  'users:view', { user: memberUser, params: {} }, 403
);
await testMiddleware(
  'middleware users:manageRole – admin passes',
  'users:manageRole', { user: adminUser, params: {} }, null
);
await testMiddleware(
  'middleware users:manageRole – lead gets 403',
  'users:manageRole', { user: leadUser, params: {} }, 403
);

// ── Invalid ObjectId → 400 ────────────────────────────────────────────────────
async function testInvalidId(description, action, params) {
  const err = await runMiddleware(action, { user: adminUser, params });
  const ok = err && err.statusCode === 400;
  results.push({ description, status: ok ? 'PASS' : `FAIL (got ${err?.statusCode}: ${err?.message})` });
}

await testInvalidId('Invalid boardId → 400', 'board:view',  { boardId: 'not-an-id' });
await testInvalidId('Invalid listId  → 400', 'list:manage', { listId:  'not-an-id' });
await testInvalidId('Invalid cardId  → 400', 'card:edit',   { cardId:  'not-an-id' });

// ── Print table ───────────────────────────────────────────────────────────────
const passCount = results.filter((r) => r.status === 'PASS').length;
const failCount = results.filter((r) => r.status !== 'PASS').length;

console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                        ROLES & PERMISSIONS TEST RESULTS                              ║');
console.log('╠══════╦════════════════════════════════════════════════════════════════════════════════╣');
console.log('║ STAT ║ TEST DESCRIPTION                                                              ║');
console.log('╠══════╬════════════════════════════════════════════════════════════════════════════════╣');

for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗';
  const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
  const desc = r.description.padEnd(80).slice(0, 80);
  const detail = r.status !== 'PASS' ? `\n║      ║   ↳ ${r.status.slice(0, 76).padEnd(76)} ║` : '';
  console.log(`║ ${label} ║ ${icon} ${desc} ║${detail}`);
}

console.log('╠══════╩════════════════════════════════════════════════════════════════════════════════╣');
console.log(`║  ${passCount} passed, ${failCount} failed (${results.length} total)`.padEnd(88) + '║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');

if (failCount > 0) process.exit(1);
