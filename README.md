# VibeTravels

![version](https://img.shields.io/badge/version-0.0.1-blue.svg) ![license](https://img.shields.io/badge/license-none-lightgrey.svg)

## Project description

VibeTravels is an MVP web application that converts a user's simple travel note and basic parameters into a detailed, day-by-day itinerary using AI. The project is intended as a small, focused MVP (Polish-language UI) prioritizing quick generation of travel plans from a single input note and user preferences.

Core goals:

- Turn one user note + destination + dates + preferences into a detailed daily schedule
- Provide account management (register/login, preferences, change password, delete account)
- Allow saving, viewing, editing and deleting up to 10 plans per user
- Include a basic admin view and minimal analytics/event logging

For full product requirements and scope see `.ai/prd.md`.

## Table of Contents

- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

- Frontend: Astro 5 with React 19 for client interactivity
- Language: TypeScript 5
- Styling: Tailwind CSS 4
- UI primitives: shadcn/ui, Radix where needed
- Backend: Supabase (Postgres + Auth + SDK)
- AI: Integration via OpenRouter.ai (model gateway)
- CI / Hosting: GitHub Actions (planned), DigitalOcean (Docker image target)

Key dependencies (see `package.json`):

- `astro` ^5.13.x
- `react` ^19.x
- `@astrojs/react`, `@astrojs/node`, `@astrojs/sitemap`
- `tailwindcss` ^4.x
- `lucide-react`, `clsx`, `class-variance-authority`, `tw-animate-css`

Dev tooling:

- ESLint + TypeScript ESLint, Prettier (with `prettier-plugin-astro`), Husky, lint-staged

## Getting started locally

Prerequisites

- Node: the project uses Node `22.14.0` (see `.nvmrc`). Use `nvm` to switch: `nvm use`.
- npm or another package manager (instructions below use `npm`).

Environment variables

You will need to provide credentials for Supabase and OpenRouter. Create a `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key

# OpenRouter.ai Configuration
OPENROUTER_API_KEY=your-openrouter-api-key

# Development Mode (optional)
USE_MOCK_AI=true  # Set to 'false' to use real AI API
```

**Getting OpenRouter API Key:**

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Navigate to [API Keys](https://openrouter.ai/keys)
3. Create a new API key
4. Set spending limits to control costs
5. Copy the key to your `.env` file

The service uses `gpt-4o-mini` model by default for cost efficiency. You can test the connection without using credits by keeping `USE_MOCK_AI=true` during development.

Install and run locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

Notes

- The repository includes lint and format scripts. Run `npm run lint` and `npm run format` to keep code consistent.
- See `.ai/prd.md` and `.ai/tech-stack.md` for product and architecture context.

## Available scripts

All scripts are defined in `package.json`.

- `npm run dev` — Start Astro development server (hot reload).
- `npm run build` — Build the production site.
- `npm run preview` — Preview the production build locally.
- `npm run astro` — Run the `astro` CLI.
- `npm run lint` — Run ESLint across the project.
- `npm run lint:fix` — Run ESLint with `--fix` to auto-fix problems.
- `npm run format` — Run Prettier to format files (uses `prettier-plugin-astro`).

Lint-staged hooks are configured to run ESLint and Prettier on staged files.

## Project scope

In-scope for the MVP (from PRD):

- User accounts: register, login, change password, delete account
- User onboarding for travel preferences and a profile screen
- Create travel plans from a single free-text note + destination + dates + per-plan preferences
- AI-generated daily schedules (up to 30 days), with named attractions and approximate durations
- Save, list, edit, and delete plans (limit 10 plans per user)
- Basic admin panel with simple metrics (all-time totals)
- Basic event logging/analytics for key actions (e.g., `account_created`, `plan_created`, `plan_deleted`)

Out-of-scope for the MVP:

- Plan sharing between accounts and advanced collaboration
- Deep logistics (maps, route optimization, real-time routing)
- Rich media management (photos, video) and complex content analysis
- Multi-language UI (MVP is Polish-only)
- Advanced roles and permissions beyond a simple admin role
- Full BI dashboards and advanced analytics

## Project status

- Current version: `0.0.1` (see `package.json`).
- Branch: `master` (active development).
- Target: MVP buildable by one developer within ~4 weeks (PRD constraint).
- CI / Deploy: GitHub Actions and Docker deployment to DigitalOcean are planned (no workflow files included yet).

If you want to help:

- Open issues for missing infra (Supabase setup, CI, deployment), or
- Add environment variable documentation (specific names and example `.env`), or
- Add a license (see next section).

## License

MIT
