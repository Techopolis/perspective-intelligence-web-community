#!/bin/bash
set -e

echo ""
echo "  Perspective Intelligence Web"
echo "  https://github.com/Techopolis/perspective-intelligence-web-community"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

# Clone
git clone https://github.com/Techopolis/perspective-intelligence-web-community.git
cd perspective-intelligence-web-community/next-app

# Set up env
cp .env.local.example .env.local
SECRET=$(openssl rand -base64 32)
sed -i.bak "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env.local && rm -f .env.local.bak

echo ""
echo "  Edit next-app/.env.local with your DATABASE_URL before running."
echo "  A NEXTAUTH_SECRET has been generated for you."
echo ""
echo "  Then run:"
echo ""
echo "    cd perspective-intelligence-web-community/next-app"
echo "    npm install && npx drizzle-kit push && npm run dev"
echo ""
