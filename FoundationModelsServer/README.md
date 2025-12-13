# Foundation Models Server

A lightweight HTTP server that exposes Apple Foundation Models for use by Perspective Web.

## Requirements

- Mac with Apple Silicon (M1/M2/M3/M4)
- macOS 26 or later (for Foundation Models support)
- Swift 6.0+

## Quick Start

```bash
cd FoundationModelsServer
swift build
swift run
```

The server starts on port **8081** and listens on all interfaces (0.0.0.0).

## API Endpoints

### Health Check
```
GET /health
```
Returns `200 OK` if server is running.

### Completions
```
POST /v1/completions
Content-Type: application/json

{
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": false
}
```

Response:
```json
{
    "content": "Hello! I'm doing well, thank you for asking...",
    "finishReason": "stop"
}
```

### Server Info
```
GET /info
```
Returns server version and status.

## Connecting from Perspective Web

1. Find your Mac's Tailscale IP:
   ```bash
   tailscale ip
   ```

2. Set the environment variable in Perspective Web:
   ```bash
   FOUNDATION_MODELS_URL=http://100.x.x.x:8081
   ```

## Running as a Background Service

To keep the server running:

```bash
# Using nohup
nohup swift run &

# Or create a launchd service for automatic startup
```

## Firewall

Make sure port 8081 is accessible. If using Tailscale, connections from other Tailscale devices should work automatically.

