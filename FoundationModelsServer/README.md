# Foundation Models Server

A lightweight HTTP server that exposes Apple Foundation Models for use by Perspective Web.

## Requirements

- Mac with Apple Silicon (M1/M2/M3/M4)
- macOS 26 or later (for Foundation Models support)
- Swift 6.0+

## Quick Start

### Option 1: Background Service (Recommended)

```bash
cd FoundationModelsServer

# Make scripts executable
chmod +x scripts/*.sh

# Start in background
./scripts/start.sh

# Check status
./scripts/status.sh

# Stop when needed
./scripts/stop.sh
```

### Option 2: Run in Terminal

```bash
cd FoundationModelsServer
swift build -c release
PORT=19840 .build/release/FoundationModelsServer
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 19840 | Port to listen on |
| `USE_MOCK` | false | Use mock responses (for testing) |

The default port **19840** is a high port unlikely to conflict with other services.

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
    ]
}
```

Response:
```json
{
    "content": "Hello! I'm doing well...",
    "finishReason": "stop"
}
```

### Server Info
```
GET /info
```

## Auto-Start on Boot (Optional)

To have the server start automatically when Michael logs in:

1. Edit `com.perspective.foundationmodels.plist`:
   - Update paths to match where you installed the server
   - Change `/Users/michael/` to the actual username

2. Install the service:
```bash
cp com.perspective.foundationmodels.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.perspective.foundationmodels.plist
```

3. To uninstall:
```bash
launchctl unload ~/Library/LaunchAgents/com.perspective.foundationmodels.plist
rm ~/Library/LaunchAgents/com.perspective.foundationmodels.plist
```

## Resource Usage

The server is configured to be lightweight:
- **Low I/O priority** - Won't slow down other apps
- **Nice level 10** - Lower CPU priority than normal apps
- **Minimal memory** - Only loads when requests come in

## Connecting from Perspective Web

1. Find Michael's Mac Tailscale IP:
   ```bash
   tailscale ip
   ```

2. In Perspective Web's `.env`:
   ```bash
   FOUNDATION_MODELS_URL=http://100.x.x.x:19840
   ```

## Logs

View server logs:
```bash
tail -f server.log
```

## Testing

Run in mock mode without Foundation Models:
```bash
USE_MOCK=true ./scripts/start.sh
```
