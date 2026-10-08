# Real-time Kanban Team Board

A Trello-style team board with live sync for every member, role-based access, and an AI assistant that breaks a big card into subtasks.

**Scenario:** Final Year Project: Smart Attendance System (college project team board)

## Live Demo

- **App:** https://kanban-board-six-ruby.vercel.app
- **API health check:** https://kanban-board-vux1.onrender.com/api/health

> The backend runs on Render's free tier and sleeps when idle. The first request after a quiet period can take 30 to 60 seconds. Please wait for the login page to respond.

### Demo accounts

All accounts use the password `Password123`.

| Role | Email | What you can do |
|---|---|---|
| Admin | `admin@demo.com` | See and manage every board, change roles, delete users |
| Lead | `lead@demo.com` (Priya Sharma) | Create boards and fully control the boards you own |
| Member | `aarav@demo.com` | Drag cards, tick subtasks and use AI on cards assigned to you |
| Member | `rohan@demo.com` | Same as above |

> Registering a new account creates a Member with no boards, so please use the demo accounts to explore.

## Features

- **Boards, lists and cards** with full create, edit and delete
- **Drag and drop** for cards and lists, saved to the database
- **Real-time sync** with Socket.io: every member of a board sees changes instantly (each board is a room)
- **Members and assignees** on boards and cards
- **AI task breakdown:** click "Break down with AI" on a card and Gemini returns subtasks as strict JSON
- **Three roles** (Admin, Lead, Member) with permissions enforced on the server
- **Members page** with role badges, change role, add to board, remove from board and delete user
- **Role-aware UI:** controls are hidden for actions a user cannot perform
- **Secure by default:** JWT authentication, hashed passwords, Helmet, rate limiting, CORS locked to the frontend URL, input validation with Zod, sanitized error messages
- **Responsive layout** with a drawer sidebar, loading spinners and empty states

## Roles and Permissions

| Action | Admin | Lead | Member |
|---|---|---|---|
| See all boards | Yes | Only boards they belong to | Only boards they were added to |
| Create boards | Yes | Yes (becomes owner) | No |
| Full controls on a board | Every board | Only boards they own | No |
| Create, edit, delete lists and cards | Yes | On owned boards | No |
| Assign members and invite | Yes | On owned boards | No |
| Drag and reorder cards | Yes | Yes | Yes |
| Tick subtasks and use AI breakdown | Yes | Yes | Only on cards assigned to them |
| Change roles and delete users | Yes | No | No |

Roles are read from the database on every request, and registration always creates a Member.

## Tech Stack

**Client:** React 18, Vite, Tailwind CSS, React Router, Axios, @hello-pangea/dnd, socket.io-client, react-hot-toast

**Server:** Node.js, Express, Mongoose, Socket.io, JWT, bcryptjs, Zod, Helmet, express-rate-limit

**Database:** MongoDB Atlas

**AI:** Google Gemini via `@google/genai` (called from the server only, so the API key is never exposed to the browser)

**Hosting:** Vercel (frontend), Render (backend), MongoDB Atlas (database)

## Project Structure

```
kanban-board/
├── client/   # React + Vite frontend
├── server/   # Express + Socket.io API
└── docs/     # Project spec and design references
```

## Local Setup

**Prerequisites:** Node.js 18 or newer, a MongoDB Atlas cluster (or local MongoDB), and a Gemini API key.

1. **Clone and install**

   ```bash
   git clone https://github.com/pallavi-2007/kanban-board.git
   cd kanban-board
   cd server && npm install
   cd ../client && npm install
   ```

2. **Create `server/.env`**

   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=a_long_random_string
   GEMINI_API_KEY=your_gemini_api_key
   CLIENT_URL=http://localhost:5173
   PORT=5000
   ```

3. **Create `client/.env`** (optional for local use, since it falls back to `http://localhost:5000/api`)

   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Seed demo data** (this clears existing demo data, so use a development database)

   ```bash
   cd server
   npm run seed
   ```

5. **Run the app** (from the project root, or run `npm run dev` in `server` and `client` separately)

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_SECRET` | server | Secret for signing login tokens |
| `GEMINI_API_KEY` | server | Gemini API key for AI breakdown |
| `CLIENT_URL` | server | Exact frontend URL allowed by CORS (no trailing slash) |
| `PORT` | server | Server port (set automatically on Render) |
| `VITE_API_URL` | client | Backend API URL including `/api` |

Never commit `.env` files. They are listed in `.gitignore`.

## Deployment

- **Frontend (Vercel):** root directory `client`, environment variable `VITE_API_URL` set to `https://<render-url>/api`. A `vercel.json` rewrite sends all routes to `index.html` so React Router paths work on refresh.
- **Backend (Render):** root directory `server`, build command `npm install`, start command `npm start`, with the server environment variables above. `trust proxy` is enabled so rate limiting works behind Render's proxy.
- **Database (MongoDB Atlas):** separate databases for development and production, with network access opened for Render.

## Author

Built by Pallavi as a final year project submission.
