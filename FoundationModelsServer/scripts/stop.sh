#!/bin/bash
# Stop Foundation Models Server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$SERVER_DIR/server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Server not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping server (PID: $PID)..."
    kill "$PID"
    sleep 2
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
    fi
    
    echo "✅ Server stopped"
else
    echo "Server was not running"
fi

rm -f "$PID_FILE"

