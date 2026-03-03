# Perspective Intelligence Web (Community Edition)

A private, accessible AI chat interface powered by Apple Foundation Models. Self-host on your own Mac with nothing more than a PostgreSQL database and a secret key.

## What This Is

Perspective Intelligence Web is a web client for on-device AI. Conversations are processed by Apple Foundation Models running locally on your Mac. No data leaves your network. No cloud AI subscriptions required.

## Features

- On-device AI chat via Apple Foundation Models
- Email/password authentication (Auth.js v5)
- Optional Apple Sign-In (OAuth)
- 8 specialized AI agents (general, code, writer, summarizer, translator, creative, tutor, accessibility)
- Auto-classifies conversations to the right agent
- SSE streaming responses
- Password reset via email (AWS SES, optional)
- Dark theme, iMessage-style chat interface
- Fully accessible, built for everyone

## You Need the Server

This web app is a frontend. To power the AI, you need [Perspective Server](https://github.com/Techopolis/Perspective-Server) running on a Mac with Apple Silicon. It is a menubar app that runs Apple Foundation Models locally on your machine. No cloud. No API keys. Just your Mac.

Get it here: **https://github.com/Techopolis/Perspective-Server**

## Requirements

- A Mac with Apple Silicon running macOS 26+ (for Perspective Server)
- PostgreSQL database (Neon free tier works)
- Node.js 20+

## Quick Start

```bash
cd next-app
cp .env.local.example .env.local
```

Edit `.env.local` with your database URL and generate a secret:

```bash
openssl rand -base64 32
```

Install dependencies and start:

```bash
npm install
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000, create an account, and start chatting.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `AUTH_TRUST_HOST` | Yes | Set to `true` for multi-host access |
| `AI_SERVER_URL` | Yes | Perspective Server URL (default: `http://localhost:11434`) |
| `AUTH_APPLE_ID` | No | Apple OAuth client ID |
| `AUTH_APPLE_SECRET` | No | Apple OAuth client secret |
| `AWS_ACCESS_KEY_ID` | No | For password reset emails via SES |

## Architecture

```
Browser <-> Next.js App (Auth, UI, API) <-> Perspective Server (Foundation Models on your Mac)
                |
           PostgreSQL
```

- **Next.js 16** App Router with TypeScript
- **Auth.js v5** (JWT sessions, Credentials + optional Apple OAuth)
- **Drizzle ORM** with Neon PostgreSQL
- **SSE streaming** for real-time AI responses
- **Tailwind CSS v4** dark theme

## Built for Everyone

- Full keyboard navigation with visible focus indicators
- Screen reader support throughout
- Reduced motion support
- Large touch targets
- Works however you use the web

## License

MIT License
