# Real-time Kanban Team Board

A collaborative Trello-style board with live synchronization, drag-and-drop workflow, and AI-powered task breakdown using Google Gemini.

## Stack
- **Frontend:** React 18, Vite, Tailwind CSS, `@hello-pangea/dnd`, Socket.io-client, React Router, Axios, React Hot Toast
- **Backend:** Node.js (ES modules), Express, MongoDB (Mongoose), Socket.io, JWT, bcryptjs, Zod
- **AI:** Google Gemini (`@google/genai`)

## Project Structure
- `client/` - React frontend (Vite)
- `server/` - Node.js Express backend
- `docs/` - Project documentation and specifications

## Getting Started

### Prerequisites
- Node.js (LTS v18+)
- MongoDB Atlas connection URI or local MongoDB instance

### Setup
1. Backend:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Configure variables in .env
   npm run dev
   ```

2. Frontend:
   ```bash
   cd client
   npm install
   cp .env.example .env
   # Configure variables in .env
   npm run dev
   ```
