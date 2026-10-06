# Real-time Kanban Team Board: Project Specification

> **Single source of truth.** Read this whole file before writing any code.
> Build one milestone at a time (Section 15), stop after each one, and wait for approval.

---

## 1. Overview

A Trello-style collaborative board. Teams create boards with lists (columns) and cards, drag cards between lists, and see every change **live** across all members' browsers. Cards can be assigned to board members. An AI button uses **Gemini** to break a big card into subtasks.

**Assignment ID:** PRD-07, Productivity
**Stack:** MERN + Socket.io + Gemini

### Required features
1. Boards, lists, cards (full CRUD)
2. Drag and drop (cards between lists and reordering; lists reordering)
3. Real-time sync for all members of a board
4. Members and assignees
5. AI task breakdown (big task into subtasks)

### About the scenario
The app is **generic**. The "college project team board" is only the **demo/seed data** used to show the flow (Section 14). Nothing in the code should be hard-coded to that scenario. Other scenarios (event organizing, bug tracker) must work with no code changes, only different data.

### Non-goals (do not build)
File attachments, email sending, notifications outside the app, payments, mobile app, OAuth/social login, multiple workspaces, card comments (optional stretch only).

---

## 2. Users and user stories

| Role | Can do |
|---|---|
| **Owner** (creator of a board) | Everything a member can, plus rename/delete the board, add/remove members |
| **Member** | View the board, create/edit/move/delete lists and cards, assign members, use AI breakdown |

User stories:
- As a user, I register and log in to access my boards.
- As a user, I create a board and see all boards I belong to.
- As an owner, I add a teammate by their registered email.
- As a member, I add lists and cards, drag them around, and assign people.
- As a member, I click "Break down with AI" on a card and get 4-8 subtasks as a checklist.
- As a member, I see teammates' changes appear instantly without refreshing.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, React Router, Axios, Tailwind CSS, `@hello-pangea/dnd`, `socket.io-client`, `react-hot-toast` |
| Backend | Node.js (LTS) + Express, Mongoose, `socket.io`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`, `helmet`, `express-rate-limit`, `zod` (validation) |
| Database | MongoDB Atlas |
| AI | Google Gemini via the official `@google/genai` SDK, **server-side only** |
| Dev tools | `nodemon` (server), `concurrently` (optional root script) |

Use plain JavaScript (ES modules) unless told otherwise.

---

## 4. Folder structure

```
kanban-board/
├── docs/
│   └── PROJECT_SPEC.md          (this file)
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example             (VITE_API_URL, VITE_SOCKET_URL)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              (routes)
│       ├── api/                 (axios instance + per-resource functions)
│       ├── context/             (AuthContext)
│       ├── socket/              (socket client singleton + hooks)
│       ├── pages/               (Login, Register, Boards, BoardView)
│       ├── components/          (Navbar, BoardCard, List, Card, CardModal,
│       │                         MemberPanel, AddForm, ProtectedRoute, Loader)
│       └── utils/
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js             (http server + socket init)
│       ├── app.js               (express app, middleware, routes)
│       ├── config/              (db.js, env.js)
│       ├── models/              (User, Board, List, Card)
│       ├── routes/              (auth, boards, lists, cards, ai)
│       ├── controllers/
│       ├── middleware/          (auth, boardAccess, errorHandler, validate)
│       ├── sockets/             (index.js, handlers)
│       ├── services/            (gemini.js, ordering.js)
│       ├── seed/seed.js
│       └── utils/
├── .gitignore
└── README.md
```

---

## 5. Environment variables

**server/.env** (never commit; commit only `.env.example`)
```
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=http://localhost:5173
```

**client/.env**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Rules:
- The Gemini key must **never** appear in client code or any `VITE_` variable.
- `GEMINI_MODEL` is an env var because model names change. Before using it, check the current model name in Google AI Studio docs and update `.env.example` if needed.
- `.gitignore` must include `.env`, `node_modules`, `dist`.

---

## 6. Data models (Mongoose)

All schemas use `timestamps: true`.

### User
| Field | Type | Notes |
|---|---|---|
| name | String | required, trimmed |
| email | String | required, unique, lowercase |
| passwordHash | String | required, `select: false` |

### Board
| Field | Type | Notes |
|---|---|---|
| title | String | required |
| description | String | optional |
| owner | ObjectId (User) | required |
| members | `[{ user: ObjectId(User), role: 'owner' \| 'member' }]` | owner included as a member with role `owner` |

### List
| Field | Type | Notes |
|---|---|---|
| board | ObjectId (Board) | required, indexed |
| title | String | required |
| position | Number | order within the board |

### Card
| Field | Type | Notes |
|---|---|---|
| board | ObjectId (Board) | required, indexed |
| list | ObjectId (List) | required, indexed |
| title | String | required |
| description | String | optional |
| position | Number | order within the list |
| assignees | `[ObjectId (User)]` | must be board members |
| dueDate | Date | optional |
| labels | `[String]` | optional |
| checklist | `[{ text: String, done: Boolean }]` | holds AI-generated and manual subtasks |
| createdBy | ObjectId (User) | |

Deleting a list deletes its cards. Deleting a board deletes its lists and cards.

---

## 7. Ordering strategy (drag and drop)

- Lists and cards have an integer `position` (0, 1, 2, ...).
- To move a card, the client sends `toListId` and `newIndex`.
- The server (in `services/ordering.js`) removes the card from its source list, inserts it into the destination list at `newIndex`, then **renumbers positions** of the affected lists so they are contiguous (0..n-1).
- The server returns the updated cards and broadcasts one `card:moved` event.
- The client updates the UI **optimistically** during the drag and rolls back with a toast if the request fails.

---

## 8. Authentication and authorization

- Passwords hashed with `bcryptjs` (10+ salt rounds).
- JWT signed with `JWT_SECRET`, expires in `JWT_EXPIRES_IN`, payload `{ userId }`.
- Client stores the token in `localStorage` and sends `Authorization: Bearer <token>`.
- `auth` middleware verifies the token and sets `req.user`.
- `boardAccess` middleware loads the board, checks that `req.user` is in `members`, and returns **403** otherwise. Owner-only routes also check `role === 'owner'`.
- Every list/card route resolves its board and applies `boardAccess`.

---

## 9. REST API

Base path: `/api`. All routes except register/login need `auth`. Responses are JSON. Errors: `{ "message": "..." }` with a proper status code (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate limited).

### Auth
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/auth/register` | name, email, password (min 6) | `{ token, user }` |
| POST | `/auth/login` | email, password | `{ token, user }` |
| GET | `/auth/me` | | `{ user }` |

### Boards
| Method | Path | Notes |
|---|---|---|
| GET | `/boards` | boards the user belongs to |
| POST | `/boards` | title, description; creator becomes owner |
| GET | `/boards/:boardId` | board + populated members + lists + cards |
| PATCH | `/boards/:boardId` | owner only |
| DELETE | `/boards/:boardId` | owner only |
| POST | `/boards/:boardId/members` | body `{ email }`; owner only; user must already be registered; 404 if no such user; 409 if already a member |
| DELETE | `/boards/:boardId/members/:userId` | owner only; cannot remove the owner; also removes the user from card assignees |

### Lists
| Method | Path | Notes |
|---|---|---|
| POST | `/boards/:boardId/lists` | title; appended at the end |
| PATCH | `/lists/:listId` | title |
| PATCH | `/lists/:listId/move` | body `{ newIndex }` |
| DELETE | `/lists/:listId` | also deletes its cards |

### Cards
| Method | Path | Notes |
|---|---|---|
| POST | `/lists/:listId/cards` | title (+ optional fields); appended at the end |
| PATCH | `/cards/:cardId` | title, description, dueDate, labels, assignees, checklist |
| PATCH | `/cards/:cardId/move` | body `{ toListId, newIndex }` |
| DELETE | `/cards/:cardId` | |

### AI
| Method | Path | Notes |
|---|---|---|
| POST | `/cards/:cardId/ai-breakdown` | see Section 11 |

Validate all request bodies with `zod`. Apply `helmet`, CORS restricted to `CLIENT_URL`, and rate limiting (stricter on `/auth/*` and `/ai-breakdown`).

---

## 10. Real-time (Socket.io)

**Connection:** the client connects with `auth: { token }`. The server verifies the JWT in `io.use(...)`; invalid token means connection rejected.

**Rooms:** one room per board, named `board:<boardId>`.

### Client to server
| Event | Payload | Behavior |
|---|---|---|
| `board:join` | `{ boardId }` | verify membership, then `socket.join` |
| `board:leave` | `{ boardId }` | `socket.leave` |

### Server to client (broadcast to the room)
| Event | Payload |
|---|---|
| `list:created` | `{ list }` |
| `list:updated` | `{ list }` |
| `list:moved` | `{ lists }` (full ordered array for the board) |
| `list:deleted` | `{ listId }` |
| `card:created` | `{ card }` |
| `card:updated` | `{ card }` |
| `card:moved` | `{ cards }` (affected cards with new list/position) |
| `card:deleted` | `{ cardId, listId }` |
| `member:added` | `{ member }` |
| `member:removed` | `{ userId }` |
| `board:updated` | `{ board }` |
| `board:deleted` | `{ boardId }` |

**Pattern:** every REST mutation saves to MongoDB first, then emits the event to `board:<boardId>`. Use `socket.to(room)` when the sender already updated its own UI, or `io.to(room)` otherwise. Do **not** let clients mutate data through sockets; mutations always go through REST.

**Client rules:**
- Join the board room when `BoardView` mounts, leave on unmount.
- On reconnect, re-join and refetch the board to avoid missed events.
- Event handlers must be idempotent (ignore duplicates of data already in state).

---

## 11. AI task breakdown (Gemini)

**Endpoint:** `POST /api/cards/:cardId/ai-breakdown`

**Flow**
1. Check auth and board membership.
2. Build a prompt from the card title and description (limit input to ~2,000 characters).
3. Call Gemini from `services/gemini.js` using `GEMINI_API_KEY` and `GEMINI_MODEL`.
4. Request **structured JSON output** (response MIME type `application/json` with a schema: array of strings).
5. Parse and validate with `zod`: 4-8 items, each non-empty and at most 120 characters. If invalid, retry once, then return **502** with a friendly message.
6. Append the subtasks to the card's `checklist` as `{ text, done: false }`.
7. Save, emit `card:updated`, and return the updated card.

**Prompt template**
```
You are a project planning assistant for a team task board.
Break the following task into 4 to 8 concrete, actionable subtasks.
Each subtask must be a short imperative sentence (max 12 words),
ordered logically from first to last. Do not repeat the task title.

Task title: {{title}}
Task description: {{description or "none"}}

Return only a JSON array of strings.
```

**Failure handling:** timeouts (15 s), missing key, quota errors, and invalid output all return a clear message; the UI shows a toast and the card stays unchanged. Never log the API key.

---

## 12. Frontend

### Routes
| Path | Page | Access |
|---|---|---|
| `/login`, `/register` | Auth forms | public |
| `/boards` | Boards dashboard: list of boards + "New board" | protected |
| `/boards/:boardId` | Board view | protected |

### Board view
- Header: board title, member avatars (initials), "Members" button (owner can add/remove), connection indicator (connected/reconnecting).
- Horizontal scrolling lists; each list has a title (editable), card count, and "Add card".
- "Add list" form at the end.
- Cards show: title, assignee avatars, due date, checklist progress (e.g. 2/5), labels.
- Clicking a card opens **CardModal**: edit title/description/due date/labels, assign members, manage checklist (add, tick, delete), **"Break down with AI"** button with loading state, delete card.
- Drag and drop with `@hello-pangea/dnd` (`DragDropContext`, `Droppable` per list, `Draggable` per card; lists are also draggable horizontally).

### State
- `AuthContext` holds user and token; axios interceptor attaches the token and logs out on 401.
- Board state lives in `BoardView` (use `useReducer`); both REST responses and socket events dispatch the same reducer actions.

### UX requirements
Loading skeletons/spinners, empty states ("No boards yet"), error toasts, responsive layout, keyboard-accessible modals, disabled buttons while requests run.

---

## 13. Security and quality checklist

- [ ] Passwords never returned by any endpoint
- [ ] Gemini key and DB URI only in server `.env`
- [ ] CORS limited to `CLIENT_URL`
- [ ] All inputs validated server-side
- [ ] Authorization checked on every board/list/card route and on `board:join`
- [ ] Assignees verified to be board members
- [ ] Rate limits on auth and AI routes
- [ ] No `console.log` of secrets or tokens
- [ ] Consistent error format and centralized error handler

---

## 14. Seed data (demo scenario: college project team board)

`npm run seed` (in `/server`) clears demo data and creates:

**Users** (password `Password123` for all): Aarav (aarav@demo.com), Priya (priya@demo.com), Rohan (rohan@demo.com)

**Board:** "Final Year Project: Smart Attendance System" (owner Aarav; members Priya, Rohan)

**Lists:** Backlog, To Do, In Progress, Review, Done

**Cards**
| List | Card | Assignee |
|---|---|---|
| Backlog | Prepare final presentation | |
| Backlog | Write project report | |
| To Do | Design database schema | Rohan |
| To Do | Set up GitHub repository | Aarav |
| In Progress | Build login page | Priya |
| Review | Create wireframes | Priya |
| Done | Finalize project topic | Aarav |

Keep "Write project report" free of subtasks so the AI breakdown can be demoed live. Seed data must be easy to replace with other scenarios.

---

## 15. Milestones

Complete one at a time. After each: run it, test it, summarize what was done, and **wait for approval**.

### M0: Project setup
- [ ] Create `client` (Vite React) and `server` folders, install dependencies
- [ ] `.gitignore`, `.env.example` files, root README stub
- [ ] Both apps start without errors

### M1: Backend skeleton and auth
- [ ] Express app, Mongo connection, error handler, `/api/health`
- [ ] User model, register/login/me, `auth` middleware
- [ ] Test with Postman/curl or scripted requests

### M2: Boards, lists, cards API
- [ ] Models and routes from Section 9 (without AI and sockets)
- [ ] `boardAccess` middleware, ordering service
- [ ] Member add/remove
- [ ] Seed script (Section 14)

### M3: Frontend foundation
- [ ] Tailwind, router, AuthContext, axios instance, ProtectedRoute
- [ ] Login, Register, Boards dashboard
- [ ] Create and open boards

### M4: Board view
- [ ] Render lists and cards from the API
- [ ] Create/edit/delete lists and cards, CardModal

### M5: Drag and drop
- [ ] Card moves (within and between lists) and list reordering
- [ ] Optimistic UI with rollback; persists after refresh

### M6: Real-time sync
- [ ] Socket auth, rooms, all events in Section 10
- [ ] Verify with **two browser windows** logged in as different users

### M7: Members and assignees
- [ ] Add/remove members by email, assign/unassign on cards
- [ ] Assignee avatars on cards; live updates

### M8: AI task breakdown
- [ ] `services/gemini.js`, endpoint, validation, error handling
- [ ] "Break down with AI" button with loading state; checklist appears live for all members

### M9: Polish and docs
- [ ] Loading/empty/error states, responsive layout
- [ ] Security checklist (Section 13) verified
- [ ] Full `README.md` (Section 17)

### M10: Deployment
- [ ] Backend on Render, frontend on Vercel, DB on Atlas
- [ ] Set env vars on each platform; update `CLIENT_URL`, `VITE_API_URL`, `VITE_SOCKET_URL`
- [ ] Smoke test the live app, including real-time sync and AI

---

## 16. Deployment notes

- **MongoDB Atlas:** Network Access must allow the host's IPs (`0.0.0.0/0` is acceptable for this project).
- **Render (backend):** Web Service, root directory `server`, build `npm install`, start `npm start`. Add all `server/.env` variables. Free instances sleep after inactivity, so the first request can be slow.
- **Vercel (frontend):** root directory `client`, build `npm run build`, output `dist`. Add a rewrite so all routes serve `index.html` (React Router).
- CORS and Socket.io CORS must both allow the deployed frontend URL.

---

## 17. README requirements

The final `README.md` must contain: project description, feature list, screenshots, tech stack, architecture overview, setup instructions (prerequisites, install, env variables, run, seed), demo accounts, API summary, Socket.io events summary, deployment links, and known limitations.

---

## 18. Working rules for the AI agent

1. Read this entire file before starting. Follow it exactly; if something is unclear or conflicts, **ask** instead of guessing.
2. Work on **one milestone at a time**. Stop after each milestone and report: what was built, how it was tested, and any deviations.
3. Do not add features outside this spec.
4. Never put secrets in code or commit `.env`. Ask the user to fill in `.env` values; do not invent keys.
5. Keep code clean and consistent: small files, clear names, comments only where useful.
6. After each milestone, run the app and test it (the browser tool is available for UI checks). Fix errors before reporting.
7. Make small git commits per milestone with clear messages.
