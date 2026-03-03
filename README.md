# Perspective Intelligence Web (Community Edition)

Apple Intelligence is powerful. Most people just do not have the right interface for it.

This is that interface. An open-source AI chat app that runs in any browser on any device. Windows. Android. Linux. Chromebooks. Anything. All powered by Apple Foundation Models running locally on your Mac.

![Perspective Intelligence Web chat interface running on Windows 11 through a browser. The dark-themed UI shows a sidebar with conversation history on the left, and the main chat area on the right with an iMessage-style layout. A user message reads give me an interesting fact and the Creative agent responds with a fact about honey never spoiling. The bottom of the screen has a message input field with at sign for agents placeholder text.](screenshot.png)


## Why This Exists

We built [Perspective Intelligence](https://apps.apple.com/kz/app/perspective-intelligence/id6448894750) as a native Mac and iOS app. People loved it. But not everyone has a Mac in front of them all day.

Your Mac is already running Apple Intelligence. It is sitting there with a powerful on-device model doing nothing most of the time. Perspective Intelligence Web puts that power in a browser so every device in your home or office can use it. No cloud. No API keys. No data leaving your network. Just your Mac doing the work.

## Features

- Chat with Apple Foundation Models from any browser on any device
- 8 specialized AI agents (general, code, writer, summarizer, translator, creative, tutor, accessibility)
- Auto-classifies conversations to the right agent
- Streaming responses in real time
- Dark theme with iMessage-style chat interface
- Email/password authentication with optional Apple Sign-In
- Password reset via email

## How It Works

```
Any Device (Browser) --> Next.js App (Auth + UI) --> Perspective Server (your Mac)
                              |
                         PostgreSQL
```

The web app handles authentication and the chat UI. The AI runs on your Mac through [Perspective Server](https://github.com/Techopolis/Perspective-Server), a menu bar app that exposes Apple Foundation Models as a local API.

## Quick Start

### 1. Start the Server

Download and run [Perspective Server](https://github.com/Techopolis/Perspective-Server/releases) on your Mac. It appears in your menu bar and starts automatically.

### 2. Set Up the Web App

```bash
cd next-app
cp .env.local.example .env.local
```

Edit `.env.local` with your database URL and generate a session secret:

```bash
openssl rand -base64 32
```

### 3. Install and Run

```bash
npm install
npx drizzle-kit push
npm run dev
```

Open http://localhost:3000, create an account, and start chatting.

## Requirements

- A Mac with Apple Silicon running macOS 26+ (for Perspective Server)
- PostgreSQL database (Neon free tier works)
- Node.js 20+

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

## Tech Stack

- **Next.js 16** with App Router and TypeScript
- **Auth.js v5** (JWT sessions, Credentials + optional Apple OAuth)
- **Drizzle ORM** with Neon PostgreSQL
- **SSE streaming** for real-time AI responses
- **Tailwind CSS v4** dark theme

## Contributing

We want contributors. If you have an idea, raise a PR. Check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

If this project is useful to you, give it a star. It helps others find it.

## License

MIT License
