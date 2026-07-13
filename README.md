# Troy Folloze Customer Success Vercel Projects

Clean home for Troy Folloze Customer Success Vercel-deployable apps.

## Structure

- `apps/`: one folder per deployable Vercel project
- `packages/`: shared code used by multiple apps
- `.github/workflows/`: CI checks that should run before deployment

## Deployment Rule

Each Vercel project should point at a specific app folder under `apps/`, not the repository root.

Recommended Vercel settings per app:

- Root Directory: `apps/<app-name>`
- Install Command: project default unless the app needs otherwise
- Build Command: project default unless the app needs otherwise
- Output Directory: project default unless the app needs otherwise

## Safety Notes

Keep private exports, CRM data, `.env` files, generated workbooks, screenshots, and local scratch files out of this repository. If a project needs sample data, create a small sanitized fixture and document its source.
