#!/bin/bash
# Start Foundation Models Server in the background
# Safe to run on Michael's Mac - minimal resource usage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SERVER_DIR/server.log"
PID_FILE="$SERVER_DIR/server.pid"

# Default port (high port number, unlikely to conflict)
export PORT="${PORT:-19840}"
export USE_MOCK="${USE_MOCK:-false}"

cd "$SERVER_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Server already running with PID $OLD_PID"
        echo "Use ./scripts/stop.sh to stop it first"
        exit 1
    else
        rm "$PID_FILE"
    fi
fi

echo "🚀 Starting Foundation Models Server..."
echo "   Port: $PORT"
echo "   Mock Mode: $USE_MOCK"
echo "   Logs: $LOG_FILE"

# Build if needed
if [ ! -d ".build" ]; then
    echo "📦 Building server (first time)..."
    swift build -c release
fi

# Start in background
nohup .build/release/FoundationModelsServer > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo $SERVER_PID > "$PID_FILE"

sleep 2

# Verify it started
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo "   PID: $SERVER_PID"
    echo "   URL: http://0.0.0.0:$PORT"
    echo ""
    echo "To view logs:  tail -f $LOG_FILE"
    echo "To stop:       ./scripts/stop.sh"
else
    echo "❌ Server failed to start. Check logs:"
    cat "$LOG_FILE"
    exit 1
fi

