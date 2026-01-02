#!/bin/bash
# ============================================
# ArkAgentic - Local Development Setup Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║         ArkAgentic - Local Development Setup          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v)"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.10+"
    exit 1
fi
PYTHON_VERSION=$(python3 -c 'import sys; print(sys.version_info.minor)')
if [ "$PYTHON_VERSION" -lt 10 ]; then
    print_error "Python 3.10+ is required"
    exit 1
fi
print_success "Python $(python3 --version)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client (psql) not found. Database setup will be skipped."
    print_warning "Install PostgreSQL or use Docker: docker-compose up -d postgres"
    SKIP_DB=true
else
    print_success "PostgreSQL client found"
    SKIP_DB=false
fi

echo ""

# Install frontend dependencies
print_step "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

# Install backend dependencies
print_step "Setting up Python backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Python virtual environment created"
else
    print_success "Python virtual environment exists"
fi

source venv/bin/activate
pip install -q -r requirements.txt
print_success "Backend dependencies installed"
deactivate

cd "$PROJECT_ROOT"

# Install multiplayer server dependencies
print_step "Installing multiplayer server dependencies..."
cd multiplayer
npm install
print_success "Multiplayer server dependencies installed"

cd "$PROJECT_ROOT"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_step "Creating .env.local from template..."
    cp .env.example .env.local
    print_warning "Please edit .env.local and add your API keys!"
    print_warning "Required: OPENROUTER_API_KEY, DATABASE_URL"
else
    print_success ".env.local already exists"
fi

# Database setup
if [ "$SKIP_DB" = false ]; then
    echo ""
    read -p "Do you want to set up the database now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Setting up database..."
        
        # Load DATABASE_URL from .env.local
        if [ -f ".env.local" ]; then
            export $(grep -v '^#' .env.local | grep DATABASE_URL | xargs)
        fi
        
        if [ -z "$DATABASE_URL" ]; then
            print_warning "DATABASE_URL not set. Using default: postgresql://arkagentic:arkagentic@localhost:5432/arkagentic"
            DATABASE_URL="postgresql://arkagentic:arkagentic@localhost:5432/arkagentic"
        fi
        
        # Parse DATABASE_URL
        DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_PASS=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
        
        echo "  Database: $DB_NAME @ $DB_HOST:$DB_PORT"
        
        # Run setup
        PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/db-init.sql 2>/dev/null && \
            print_success "Database initialized with schema, seed data, and migrations" || \
            print_warning "Database setup failed. You may need to create the database first."
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                   Setup Complete!                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit .env.local with your API keys:"
echo "     - OPENROUTER_API_KEY (required for AI agents)"
echo "     - DATABASE_URL (for PostgreSQL)"
echo ""
echo "  2. Start all services:"
echo "     ${GREEN}npm run dev:all${NC}     # Starts frontend, backend, and multiplayer"
echo ""
echo "  Or start individually:"
echo "     ${BLUE}npm run dev${NC}          # Frontend only (http://localhost:5173)"
echo "     ${BLUE}npm run backend${NC}      # Backend API (http://localhost:3001)"
echo "     ${BLUE}npm run multiplayer${NC}  # Colyseus server (ws://localhost:2567)"
echo ""
echo "  3. Open http://localhost:5173 in your browser"
echo ""
