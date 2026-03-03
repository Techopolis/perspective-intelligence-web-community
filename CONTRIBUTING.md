# Contributing to Perspective Intelligence Web

Thanks for your interest in contributing. This project is open source and we welcome contributions of all kinds.

## Getting Started

1. Fork the repo
2. Clone your fork
3. Follow the [Quick Start](README.md#quick-start) to get the app running locally
4. Create a branch for your changes

## What You Need

- Node.js 20+
- PostgreSQL database (Neon free tier works)
- A Mac with Apple Silicon running [Perspective Server](https://github.com/Techopolis/Perspective-Server) (for AI features)

If you do not have a Mac, you can still contribute to the UI, auth, and non-AI parts of the app. The app runs without the AI server — chat just will not generate responses.

## How to Contribute

- **Bug fixes** — Find an issue labeled `bug` or report a new one
- **Features** — Check issues labeled `enhancement` or open a discussion first
- **Docs** — Improvements to documentation are always welcome
- **New to open source?** — Look for issues labeled `good first issue`

## Submitting Changes

1. Make your changes on a feature branch
2. Test that the app builds: `cd next-app && npm run build`
3. Test that lint passes: `npm run lint`
4. Open a pull request against `main`
5. Describe what you changed and why

## Code Style

- TypeScript with strict mode
- Tailwind CSS v4 for styling
- App Router patterns (Next.js 16)
- Keep it simple. Do not over-engineer.

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser and OS

## Questions?

Open a GitHub Discussion. We are happy to help.
