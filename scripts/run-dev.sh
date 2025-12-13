#!/bin/bash
# Development run script for Perspective Web
# Run this on your Mac

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Perspective Web Development Server${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}📝 Please edit .env with your Auth0 credentials${NC}"
        exit 1
    else
        echo -e "${RED}❌ No env.example found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Load environment variables (handle values with special chars)
set -a
source .env
set +a

# Check required variables (skip if --skip-auth flag is passed)
SKIP_AUTH=false
for arg in "$@"; do
    if [ "$arg" = "--skip-auth" ]; then
        SKIP_AUTH=true
        echo -e "${YELLOW}⚠️  Skipping Auth0 validation (--skip-auth)${NC}"
    fi
done

if [ "$SKIP_AUTH" = false ]; then
    if [ "$AUTH0_DOMAIN" = "your-tenant.us.auth0.com" ] || [ -z "$AUTH0_DOMAIN" ]; then
        echo -e "${RED}❌ Please configure AUTH0_DOMAIN in .env${NC}"
        echo -e "${YELLOW}   Or run with --skip-auth to skip validation${NC}"
        exit 1
    fi

    if [ "$AUTH0_CLIENT_ID" = "your-client-id" ] || [ -z "$AUTH0_CLIENT_ID" ]; then
        echo -e "${RED}❌ Please configure AUTH0_CLIENT_ID in .env${NC}"
        echo -e "${YELLOW}   Or run with --skip-auth to skip validation${NC}"
        exit 1
    fi

    if [ "$AUTH0_CLIENT_SECRET" = "your-client-secret" ] || [ -z "$AUTH0_CLIENT_SECRET" ]; then
        echo -e "${RED}❌ Please configure AUTH0_CLIENT_SECRET in .env${NC}"
        echo -e "${YELLOW}   Or run with --skip-auth to skip validation${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo -e "   Auth0 Domain: ${AUTH0_DOMAIN}"
echo -e "   Foundation Models: ${FOUNDATION_MODELS_URL:-http://localhost:8081}"

# Get local IP for network access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

# Build and run with hot reload
echo -e "${GREEN}📦 Building...${NC}"
swift build

echo -e "${GREEN}🌐 Starting server with hot-reload${NC}"
echo -e "${GREEN}   Local:   http://localhost:8080${NC}"
echo -e "${GREEN}   Network: http://${LOCAL_IP}:8080${NC}"
echo -e "${YELLOW}   Watching for changes in Sources/, Resources/, Public/${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
echo ""

# Use watchexec for hot-reloading
# --restart: Restart the command on changes
# -e swift,leaf,css,js: Watch these file extensions
# -w Sources -w Resources -w Public: Watch these directories
watchexec \
    --restart \
    --stop-signal SIGTERM \
    --debounce 500 \
    -e swift,leaf,css,js,html \
    -w Sources \
    -w Resources \
    -w Public \
    -- swift run PerspectiveWeb serve --hostname 0.0.0.0 --port 8080

