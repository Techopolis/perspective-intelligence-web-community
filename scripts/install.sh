#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/Techopolis/perspective-intelligence-web-community.git"
DIR="perspective-intelligence-web"

echo ""
echo "  Perspective Intelligence Web — Community Edition"
echo "  ================================================"
echo ""

# Check for required tools
for cmd in git node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d v)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found $(node -v))"
  exit 1
fi

# Clone
if [ -d "$DIR" ]; then
  echo "Directory '$DIR' already exists. Pulling latest..."
  cd "$DIR"
  git pull --ff-only
else
  echo "Cloning repository..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

# Install dependencies
echo "Installing dependencies..."
cd next-app
npm install

# Set up env if missing
if [ ! -f .env.local ]; then
  if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
    echo ""
    echo "Created .env.local from example. Edit it with your settings:"
    echo "  DATABASE_URL, NEXTAUTH_SECRET, AI_SERVER_URL"
    echo ""
    echo "Generate a secret with: openssl rand -base64 32"
  else
    echo "Warning: No .env.local.example found. Create .env.local manually."
  fi
fi

echo ""
echo "Done! Next steps:"
echo "  cd $DIR/next-app"
echo "  # Edit .env.local with your database URL and secrets"
echo "  npx drizzle-kit push"
echo "  npm run dev"
echo ""
echo "You also need Perspective Server running on a Mac with Apple Silicon:"
echo "  https://github.com/Techopolis/Perspective-Server/releases"
echo ""
