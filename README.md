# Bug-Sense

Bug-Sense is a collaborative bug tracking platform for small teams that want a calmer workflow for reporting, reviewing, assigning, fixing, and verifying issues.

The goal of the product is simple: keep issue management readable, team-friendly, and focused on the next meaningful action instead of dashboard clutter.

## Current Status

Phase 1 is complete.

The product already includes:
- email/password authentication
- session-based refresh flow with device management
- project creation and joining by invite code
- project roles and member management
- full bug lifecycle management
- comments and activity history
- public teammate profiles
- responsive desktop and mobile UI

Latest local verification completed:
- `client`: `npm run lint`
- `client`: `npm run build`
- `server`: `node --test`

Deployment reference:
- [DEPLOYMENT.md](/Users/sajal/Study/Projects/Bug-Sense/DEPLOYMENT.md)
- [render.yaml](/Users/sajal/Study/Projects/Bug-Sense/render.yaml)

## Core Features

### Authentication
- register and login
- short-lived JWT access tokens
- opaque refresh sessions stored server-side
- logout from current device
- sign out other devices
- password change with session invalidation

### Projects
- create a project
- join a project with invite code
- lead-only project access management
- add members by email
- update member roles
- remove members
- transfer project leadership
- leave project

### Bug Workflow
- report a bug
- approve or reject pending bug reports
- assign or reassign bugs
- submit fixes
- accept or reject fixes
- request severity review
- approve or reject severity review
- request reopen for resolved bugs
- approve or reject reopen requests
- comment on bugs
- view activity history

### Team and Profiles
- team list inside project workspace
- public teammate profile page
- contribution snapshot

## Tech Stack

### Frontend
- React
- React Router
- Vite
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT for access tokens
- session store for refresh tokens

## Repository Structure

```text
Bug-Sense/
├── client/
│   ├── src/
│   └── .env.example
├── server/
│   ├── src/
│   ├── test/
│   └── .env.example
└── README.md
```

## Local Setup

### 1. Install dependencies

```bash
cd /Users/sajal/Study/Projects/Bug-Sense/client
npm install

cd /Users/sajal/Study/Projects/Bug-Sense/server
npm install
```

### 2. Configure environment files

Backend example:
- [server/.env.example](/Users/sajal/Study/Projects/Bug-Sense/server/.env.example)

Client example:
- [client/.env.example](/Users/sajal/Study/Projects/Bug-Sense/client/.env.example)

For local development, the important backend cookie values are:

```env
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
```

### 3. Start the backend

```bash
cd /Users/sajal/Study/Projects/Bug-Sense/server
npm run dev
```

### 4. Start the frontend

```bash
cd /Users/sajal/Study/Projects/Bug-Sense/client
npm run dev
```

## Scripts

### Client

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

### Server

```bash
npm run dev
npm run start
npm run test
```

## Environment Notes

### Local

If you are using:
- frontend on `http://localhost:5174`
- backend on `http://localhost:3000`

then keep:

```env
CORS_ORIGIN=http://localhost:5174
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
```

### Production Same-Origin

If frontend and backend are served from the same public origin, for example:
- `https://bugsense.com`
- API under `https://bugsense.com/api/v1`

use:

```env
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
```

Client `VITE_API_BASE_URL` can stay unset.

### Production Split-Origin

If frontend and backend are deployed on different origins, for example:
- frontend: `https://app.bugsense.com`
- backend: `https://api.bugsense.com`

use:

```env
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
```

and set:

```env
VITE_API_BASE_URL=https://api.bugsense.com/api/v1
```

If you use unrelated provider domains instead of subdomains under the same parent domain, use `COOKIE_SAME_SITE=none`.

## Deployment Notes

Before deployment, make sure you:
- set real production secrets
- configure MongoDB production URI
- run `npm run lint` and `npm run build` in `client`
- run `node --test` in `server`
- verify your frontend/backend deployment shape

Health check endpoint:

```text
GET /health
```

## Security Notes

Current security approach includes:
- strict input type validation in controllers
- JWT verification for access tokens
- opaque refresh sessions stored server-side
- HttpOnly refresh cookies
- role and project membership checks on protected routes
- React-safe rendering with no `dangerouslySetInnerHTML`

Notes:
- classic SQL injection is not the main concern here because the app uses MongoDB
- the more relevant risk is malformed/NoSQL-style object payloads, and the controllers currently reject those through explicit validation
- `express-mongo-sanitize` and `xss-clean` are installed but currently not enabled, because they previously caused issues and need a safer review before being turned back on
