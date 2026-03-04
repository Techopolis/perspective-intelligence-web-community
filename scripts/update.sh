#!/usr/bin/env bash
set -euo pipefail

# Perspective Intelligence Web — Auto Update
# Run from the project root or set up as a cron job.
#
# Cron example (check for updates every hour):
#   0 * * * * cd /path/to/perspective-intelligence-web && bash scripts/update.sh --auto
#
# With auto-restart (PM2):
#   0 * * * * cd /path/to/perspective-intelligence-web && bash scripts/update.sh --auto --restart

AUTO=false
RESTART=false

for arg in "$@"; do
  case "$arg" in
    --auto) AUTO=true ;;
    --restart) RESTART=true ;;
  esac
done

# Ensure we are in the project root (has next-app/)
if [ ! -d "next-app" ]; then
  echo "Error: Run this script from the perspective-intelligence-web project root."
  exit 1
fi

echo "Checking for updates..."

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already up to date."
  exit 0
fi

echo "Update available. Pulling changes..."
git pull --ff-only origin main

echo "Installing dependencies..."
cd next-app
npm install

echo "Running database migrations..."
npx drizzle-kit push --force 2>/dev/null || echo "Migration push completed (or no changes)."

# Rebuild
echo "Building..."
npm run build

if [ "$RESTART" = true ]; then
  echo "Restarting application..."
  if command -v pm2 &>/dev/null; then
    pm2 restart perspective-web 2>/dev/null || pm2 start npm --name perspective-web -- start
  else
    echo "PM2 not found. Restart the app manually: npm start"
  fi
fi

NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
echo ""
echo "Updated to v${NEW_VERSION}"
echo "Restart your app if it is not managed by PM2."
