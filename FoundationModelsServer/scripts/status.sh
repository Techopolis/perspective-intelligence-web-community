#!/bin/bash
# Check Foundation Models Server status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$SERVER_DIR/server.pid"
LOG_FILE="$SERVER_DIR/server.log"

echo "=== Foundation Models Server Status ==="
echo ""

if [ ! -f "$PID_FILE" ]; then
    echo "Status: NOT RUNNING"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Status: RUNNING"
    echo "PID: $PID"
    
    # Get port from environment or default
    PORT="${PORT:-19840}"
    echo "Port: $PORT"
    
    # Try health check
    if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
        echo "Health: OK"
    else
        echo "Health: NOT RESPONDING"
    fi
    
    # Show resource usage
    echo ""
    echo "Resource Usage:"
    ps -p "$PID" -o %cpu,%mem,rss | tail -1 | awk '{printf "  CPU: %s%%\n  Memory: %s%% (%.1f MB)\n", $1, $2, $3/1024}'
    
    echo ""
    echo "Last 5 log lines:"
    tail -5 "$LOG_FILE" 2>/dev/null | sed 's/^/  /'
else
    echo "Status: STOPPED (stale PID file)"
    rm -f "$PID_FILE"
fi

