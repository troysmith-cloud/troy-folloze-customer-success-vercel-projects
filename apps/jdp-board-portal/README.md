# Folloze JDP Board Portal

Vercel-hosted customer portal for Folloze Joint Deployment Program boards.

## What It Provides

- Email-based customer login.
- Per-user board list.
- Hosted board planner route at `/boards/[boardId]`.
- Local browser autosave for fast recovery.
- Durable server-side board state using Vercel Blob in production.
- Local JSON file fallback under `.data/` for development.

## Vercel Setup

Create a Vercel project with:

- Root Directory: `apps/jdp-board-portal`
- Framework Preset: Next.js
- Environment variables:
  - `AUTH_SECRET`: long random string used to sign sessions.
  - `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token.

The app can run locally without `BLOB_READ_WRITE_TOKEN`; it will use `.data/` instead.
