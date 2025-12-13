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

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check required variables
if [ "$AUTH0_DOMAIN" = "your-tenant.us.auth0.com" ] || [ -z "$AUTH0_DOMAIN" ]; then
    echo -e "${RED}❌ Please configure AUTH0_DOMAIN in .env${NC}"
    exit 1
fi

if [ "$AUTH0_CLIENT_ID" = "your-client-id" ] || [ -z "$AUTH0_CLIENT_ID" ]; then
    echo -e "${RED}❌ Please configure AUTH0_CLIENT_ID in .env${NC}"
    exit 1
fi

if [ "$AUTH0_CLIENT_SECRET" = "your-client-secret" ] || [ -z "$AUTH0_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ Please configure AUTH0_CLIENT_SECRET in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo -e "   Auth0 Domain: ${AUTH0_DOMAIN}"
echo -e "   Foundation Models: ${FOUNDATION_MODELS_URL:-http://localhost:8081}"

# Build and run
echo -e "${GREEN}📦 Building...${NC}"
swift build

echo -e "${GREEN}🌐 Starting server on http://localhost:8080${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

swift run PerspectiveWeb

