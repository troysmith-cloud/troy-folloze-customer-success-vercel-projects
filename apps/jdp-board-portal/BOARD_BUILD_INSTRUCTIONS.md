# Folloze Deployment Planning & Program Planner Build Instructions

This instruction sheet reflects the current Vercel-hosted board portal and the Folloze Program KPI Waterfall board skill state.

Production portal:

```text
https://jdp-board-portal.vercel.app
```

Primary skill source:

```text
/Users/troysmith/Projects/Folloze-Skills/Skills/Troy Folloze Created Skills/Program KPI Waterfall/folloze-program-kpi-waterfall-board/SKILL.md
```

## What This Builds

The portal creates customer-specific Folloze Deployment Planning & Program Planner boards. Each board supports:

- email login and per-user board access
- customer website-based board creation with company name and logo lookup
- owner-only board rename, access management, Folloze edit link, and full delete
- non-owner hide/remove-from-my-view without deleting the shared board
- portal-first access so users must log in and choose an authorized board before opening it
- local browser autosave plus durable Vercel Blob-backed board state
- one daily rollback snapshot per board, created on first authorized board launch within a 24-hour period
- owner-only restore from the latest snapshot while preserving access permissions
- program planning by fiscal/company year, program year, Q1-Q4 or Evergreen, campaign, priority, channel, audience, content, and benchmark mode
- projected and actual KPI tracking with quarterly, YTD, and full-year rollups
- PDF, Google Slides, and Google Sheets output controls

## Repository Layout

App root:

```text
/Users/troysmith/Documents/Troy Folloze Customer Success vercel-projects/apps/jdp-board-portal
```

Important files:

```text
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/boards/route.ts
app/api/boards/[boardId]/route.ts
app/api/boards/[boardId]/state/route.ts
app/api/boards/[boardId]/open/route.ts
app/api/boards/[boardId]/snapshot/route.ts
app/boards/[boardId]/page.tsx
app/boards/[boardId]/skill/route.ts
app/dashboard/page.tsx
app/dashboard/NewBoardForm.tsx
app/dashboard/OpenBoardButton.tsx
app/dashboard/BoardSnapshotRestore.tsx
app/dashboard/BoardAccessReport.tsx
app/lib/auth.ts
app/lib/companyBrand.ts
app/lib/skillBoardHtml.ts
app/lib/storage.ts
app/lib/types.ts
public/program-kpi-waterfall-board-template.html
```

Skill/template copies to keep aligned:

```text
/Users/troysmith/Projects/Folloze-Skills/Skills/Troy Folloze Created Skills/Program KPI Waterfall/folloze-program-kpi-waterfall-board/SKILL.md
/Users/troysmith/Projects/Folloze-Skills/Skills/Troy Folloze Created Skills/Program KPI Waterfall/folloze-program-kpi-waterfall-board/assets/program-kpi-waterfall-board-template.html
/Users/troysmith/.codex/skills/folloze-program-kpi-waterfall-board/SKILL.md
/Users/troysmith/.codex/skills/folloze-program-kpi-waterfall-board/assets/program-kpi-waterfall-board-template.html
```

## Environment

Vercel project settings:

```text
Root Directory: apps/jdp-board-portal
Framework Preset: Next.js
```

Required production environment variables:

```text
AUTH_SECRET=<long random session-signing secret>
BLOB_READ_WRITE_TOKEN=<private Vercel Blob read/write token>
```

Local development can run without `BLOB_READ_WRITE_TOKEN`; the app falls back to local JSON under `.data/`.

## Local Commands

Run from:

```bash
cd "/Users/troysmith/Documents/Troy Folloze Customer Success vercel-projects/apps/jdp-board-portal"
```

Install dependencies if needed:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Validate before shipping:

```bash
npm run typecheck
npm run build
```

## Core User Flow

1. User lands on the portal at `https://jdp-board-portal.vercel.app`.
2. User logs in with an email address.
3. Dashboard only shows boards the logged-in email owns or has explicit access to.
4. User creates a board by entering a customer website.
5. The app resolves the company name and logo from the customer website.
6. The board is named `{Customer} Folloze Deployment Planning & Program Planner Board N`.
7. User opens the board from the dashboard.
8. The dashboard open action verifies access, creates or refreshes the daily snapshot if needed, sets the short-lived portal-selection cookie, records board access, and opens `/boards/[boardId]/skill`.
9. Direct board links redirect back to the dashboard unless opened through the authorized dashboard flow.

## Board Access Rules

Board visibility:

- No boards are visible until the user logs in.
- A user can only see boards they own or boards shared with their exact login email.
- New boards are private to the creator/owner until access is granted.

Owner permissions:

- rename the board
- add/remove authorized emails
- transfer ownership
- set the Folloze edit URL
- open the Folloze edit link
- permanently delete the board
- restore the board from the latest snapshot

Shared-user permissions:

- open boards shared with them
- edit board content unless restricted by program-level controls
- hide/remove a board from their own view
- cannot rename, delete, restore, or manage access

Program-level edit rules:

- The creator of a program can edit that program.
- The board owner can edit any program.
- If the owner toggles `Anyone can edit` for a program, all authorized board users can edit that program.
- All authorized users can reorder programs from the left program list.
- Locked programs prevent detail changes until unlocked by an authorized editor.

## Durable State And Autosave

The board template keeps local browser recovery through `localStorage`.

The Vercel-rendered board injects API-backed shared save/load hooks so board changes persist for everyone with access:

```text
GET /api/boards/[boardId]/state
PUT /api/boards/[boardId]/state
POST /api/boards/[boardId]/state
```

Expected behavior:

- Changes to programs, CSM, reporting, benchmarks, campaigns, channels, priority, actuals, and board metadata autosave.
- Saved state is shared across authorized users.
- Reopening the board should load the latest durable state.
- Production storage uses private Vercel Blob objects.
- Local development storage uses `.data/`.

When changing any board input behavior, verify both local `localStorage` restore and server-backed state restore.

## Snapshot Rollback

The portal maintains one rollback snapshot per board.

Snapshot behavior:

- Created when an authorized user opens a board from the dashboard.
- Created only if there is no snapshot from the previous 24 hours.
- Replaces the prior snapshot when a new daily snapshot is created.
- Stored separately from discoverable board records.
- Owner can restore board content and customer metadata from the latest snapshot.
- Restore preserves owner, access list, and Folloze edit URL.

Snapshot-related code lives in:

```text
app/lib/storage.ts
app/api/boards/[boardId]/open/route.ts
app/dashboard/open/[boardId]/route.ts
app/api/boards/[boardId]/snapshot/route.ts
app/dashboard/BoardSnapshotRestore.tsx
```

QA snapshot restore carefully because it is the customer-facing rollback path.

## Board Template Changes

Runtime template:

```text
public/program-kpi-waterfall-board-template.html
```

When changing visible board behavior, start here unless the feature requires login, storage, API, or dashboard changes.

The template currently owns:

- program creation, duplication, deletion, locking, and drag/drop
- quarter/Evergreen grouping and fiscal-year sequencing
- program priority labels and colors
- channel multi-select
- primary/secondary content and audience fields
- benchmark standard/custom mode
- account scale slider
- campaign rollups
- projected and actual KPI calculations
- waterfall visuals
- PDF export
- Google Slides and Sheets output controls
- Impact Dashboard link to `https://app.folloze.com/app/analytics`

After template changes, sync the same HTML to the skill asset copies:

```bash
cp public/program-kpi-waterfall-board-template.html "/Users/troysmith/Projects/Folloze-Skills/Skills/Troy Folloze Created Skills/Program KPI Waterfall/folloze-program-kpi-waterfall-board/assets/program-kpi-waterfall-board-template.html"
cp public/program-kpi-waterfall-board-template.html "/Users/troysmith/.codex/skills/folloze-program-kpi-waterfall-board/assets/program-kpi-waterfall-board-template.html"
```

Update both skill docs when behavior changes:

```text
/Users/troysmith/Projects/Folloze-Skills/Skills/Troy Folloze Created Skills/Program KPI Waterfall/folloze-program-kpi-waterfall-board/SKILL.md
/Users/troysmith/.codex/skills/folloze-program-kpi-waterfall-board/SKILL.md
```

## Portal/API Changes

Use portal/API changes for:

- authentication
- board creation
- logo/company lookup
- access permissions
- board list behavior
- board rename/delete/hide
- Folloze edit URL
- access reporting
- autosave persistence
- snapshot restore
- direct-link gating

Keep permission checks server-side. Client controls are helpful for UX, but authorization must happen in the API route or storage helper.

## Folloze MCP Board Skill Flow

When using the Folloze MCP skill to create a static Folloze board:

1. Ask for the customer name if missing.
2. Read the Folloze landing page creation guide.
3. Ask whether to use the Folloze company theme before calling the theme tool.
4. Use the skill template asset.
5. Replace theme, sheet, slide, and state placeholders only when the backing URL exists.
6. QA the local HTML.
7. Save with `save_folloze_board_from_file`.

For customer-facing boards that must maintain login, privacy, saved state, and rollback, use the Vercel portal board flow instead of a static-only Folloze board.

## PDF Export Expectations

The PDF export should be a screen-faithful snapshot of the entire visible board, not a redesigned report.

Requirements:

- standard 8.5x11 letter portrait pages
- no clipped cards, tables, or waterfall visuals
- cumulative pipeline waterfall image captured at full size
- waterfall section kept together on a page when it fits
- large numbers must fit inside their boxes
- downloaded `.pdf` file starts after the user selects `Export PDF`

Always test PDF export on an existing customer board after changing layout or capture logic.

## Google Sheets Output Expectations

The `Output to sheets` button should create and open a customer Google Sheet, not download JSON.

Expected behavior:

- post the live board payload to the sheet-builder endpoint
- copy the JDP template workbook
- name the new workbook for the customer
- populate the relevant customer/program/KPI tabs using current board values
- open the generated Google Sheet URL
- show a setup-needed state if the endpoint is missing

Do not point the button at the generic template sheet as the final output.

## Google Slides Output Expectations

The `Output to slides` button should use live board state and Folloze branding.

Expected behavior:

- export current planner data
- open the generated Slides deck URL when available
- avoid broken placeholder links

## QA Checklist

Run this checklist before deployment:

- `npm run typecheck`
- `npm run build`
- log in with a test email
- create a board from a customer website
- confirm customer name and one customer logo render in the placeholder
- confirm duplicate customer boards increment as `Board 2`, `Board 3`, etc.
- open the board from the dashboard
- confirm direct `/boards/[boardId]` and `/boards/[boardId]/skill` access redirects to the portal unless opened from dashboard
- change CSM and refresh; confirm it persists
- add, delete, duplicate, lock, unlock, reorder, and prioritize programs
- confirm owner-only rename and full delete
- confirm non-owner hide-from-view behavior
- confirm shared users can edit allowed programs and cannot edit restricted programs
- confirm any input change autosaves and is visible after reopen
- confirm quarter-only, Evergreen, YTD, and full-year sections calculate correctly
- confirm Q2 company-year start wraps Q1 to the end
- confirm custom benchmark changes switch mode to Custom
- confirm toggling back to Standard resets metrics to standard benchmarks
- confirm PDF export downloads and the cumulative waterfall is not cropped
- confirm Sheets output creates a customer workbook from live board data
- confirm Slides output opens a generated deck when configured
- confirm access report records user access time
- confirm owner can restore from the latest snapshot

## Deployment

Commit and push the intended changes first.

Production deploy from the app directory:

```bash
cd "/Users/troysmith/Documents/Troy Folloze Customer Success vercel-projects/apps/jdp-board-portal"
npx vercel --prod --yes
```

After deploy:

- open `https://jdp-board-portal.vercel.app`
- run the dashboard and board smoke tests
- test at least one existing board and one newly created board

## Rollback Plan

Application rollback:

- Use Vercel deployment history to promote the prior known-good deployment if the app itself breaks.
- Keep Git commits small enough that the faulty change can be identified quickly.

Board data rollback:

- Use the owner-only snapshot restore on the dashboard.
- A snapshot is replaced only once per board per 24-hour launch window.
- Restoring a snapshot rolls board content and customer metadata back to the last snapshot while preserving owner/access permissions.

Emergency data caution:

- Do not manually delete Vercel Blob board objects unless the owner explicitly requests permanent deletion.
- Do not change storage key prefixes without a migration plan.

## Definition Of Done

A change is done when:

- app code, board template, and skill docs are aligned
- access and owner/shared-user rules still hold
- autosave persists across refresh and login sessions
- customer boards are reachable only through the portal flow
- PDF, Sheets, and Slides outputs still behave as expected
- typecheck and production build pass
- production deployment is smoke-tested when runtime behavior changed
