# Perspective Web

A private, accessible web interface for Apple Foundation Models. Built with Swift and Vapor, designed for on-premises deployment where data privacy is paramount.

## Features

- **Private AI Chat**: Conversations powered by Apple Foundation Models running on your own Mac
- **iMessage-Style Interface**: Familiar, Apple-centric chat design
- **Document OCR**: Extract and format text from documents (coming soon)
- **Image Recognition**: Analyze images with MLX (coming soon)
- **Auth0 Authentication**: Secure login with Sign in with Apple, Google, or email
- **Fully Accessible**: WCAG compliant with full screen reader support

## Requirements

- macOS 14.0+ (for running the server)
- Swift 6.0+
- A Mac with Apple Silicon for running Foundation Models
- Auth0 account (free tier available)

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/perspective-web.git
cd perspective-web

# Copy environment template
cp .env.example .env
```

### 2. Configure Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new Application (Regular Web Application)
3. Configure the following settings:
   - **Allowed Callback URLs**: `http://localhost:8080/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:8080`
   - **Allowed Web Origins**: `http://localhost:8080`
4. Copy your Domain, Client ID, and Client Secret to `.env`

### 3. Configure Foundation Models Server

You need a Mac running the Foundation Models API server. Set the `FOUNDATION_MODELS_URL` in your `.env` file:

```bash
# Local development
FOUNDATION_MODELS_URL=http://localhost:8081

# Via Tailscale
FOUNDATION_MODELS_URL=http://your-mac.tailnet-name.ts.net:8081
```

### 4. Run the Server

```bash
# Build and run
swift run

# Or with environment file
source .env && swift run
```

The server will start at `http://localhost:8080`

## Development

### Project Structure

```
perspective-web/
├── Sources/PerspectiveWeb/
│   ├── Controllers/       # Route handlers
│   │   ├── AuthController.swift
│   │   ├── ChatController.swift
│   │   ├── MessageController.swift
│   │   └── OnboardingController.swift
│   ├── Middleware/        # Auth middleware
│   ├── Models/            # Database models
│   │   ├── User.swift
│   │   ├── Chat.swift
│   │   └── Message.swift
│   ├── Migrations/        # Database migrations
│   ├── Services/          # External services
│   │   ├── Auth0Config.swift
│   │   └── FoundationModelsClient.swift
│   ├── DTOs/              # Data transfer objects
│   ├── configure.swift    # App configuration
│   ├── routes.swift       # Route definitions
│   └── entrypoint.swift   # App entry point
├── Resources/Views/       # Leaf templates
├── Public/                # Static assets
│   ├── css/
│   └── js/
└── Tests/
```

### Running Tests

```bash
swift test
```

### Database

By default, Perspective Web uses SQLite stored in `db.sqlite`. The database is automatically migrated on startup.

To reset the database:
```bash
rm db.sqlite
swift run
```

## Deployment

### Docker

```bash
docker build -t perspective-web .
docker run -p 8080:8080 --env-file .env perspective-web
```

### Docker Compose

```bash
docker-compose up -d
```

## Accessibility

Perspective Web is designed with accessibility as a core requirement:

- Full keyboard navigation (Tab, Enter, Space, Escape)
- Screen reader compatible with proper ARIA labels
- Dynamic Type support
- Reduced motion support
- High contrast colors
- Minimum 44x44pt touch targets

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain | Required |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | Required |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | Required |
| `AUTH0_CALLBACK_URL` | OAuth callback URL | `http://localhost:8080/auth/callback` |
| `AUTH0_LOGOUT_URL` | Post-logout redirect URL | `http://localhost:8080` |
| `FOUNDATION_MODELS_URL` | URL of the Foundation Models API | `http://localhost:8081` |

## License

MIT License - See LICENSE file for details.
