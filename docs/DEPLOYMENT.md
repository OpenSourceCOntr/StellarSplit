# StellarSplit Deployment Guide

A comprehensive guide for deploying StellarSplit in production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Frontend Production Build](#frontend-production-build)
5. [Backend Production Deployment](#backend-production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Hosting Options](#hosting-options)
8. [Stellar Network Configuration](#stellar-network-configuration)
9. [Production Checklist](#production-checklist)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 14.x | 15.x |
| Redis | 6.x | 7.x |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB | 50 GB SSD |

### Required Tools

- **Git**: For cloning the repository
- **Node.js & npm**: For running the application
- **PostgreSQL**: Database server
- **Redis**: Caching and queue management
- **Docker** (optional): For containerized deployment

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# =============================================================================
# Core Application Settings
# =============================================================================

# Node environment: development | production | test
NODE_ENV=production

# Port the backend server will listen on
PORT=3000

# =============================================================================
# PostgreSQL Database Configuration
# =============================================================================

# Database host (use 'db' for Docker, 'localhost' for local, or RDS endpoint)
DB_HOST=localhost

# Database port (default: 5432)
DB_PORT=5432

# Database username
DB_USERNAME=stellarsplit

# Database password (use strong password in production)
DB_PASSWORD=your_secure_password_here

# Database name
DB_NAME=stellarsplit_prod

# Auto-sync schema (NEVER true in production - use migrations)
DB_SYNCHRONIZE=false

# Enable SQL query logging (false in production)
DB_LOGGING=false

# =============================================================================
# Redis Configuration
# =============================================================================

# Redis host (use 'redis' for Docker, 'localhost' for local)
REDIS_HOST=localhost

# Redis port (default: 6379)
REDIS_PORT=6379

# Redis URL (alternative to host/port, includes auth if needed)
# REDIS_URL=redis://username:password@host:port

# =============================================================================
# Stellar Blockchain Configuration
# =============================================================================

# Stellar network: 'mainnet' or 'testnet'
STELLAR_NETWORK=mainnet

# Platform wallet address for receiving fees (mainnet address)
PLATFORM_WALLET=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# =============================================================================
# API Documentation (Disable in production or protect)
# =============================================================================

# Swagger UI path
SWAGGER_PATH=/api/docs

# API title
SWAGGER_TITLE=StellarSplit API

# API description
SWAGGER_DESCRIPTION=API for StellarSplit - Split bills instantly with crypto

# API version
SWAGGER_VERSION=1.0.0

# =============================================================================
# AWS S3 Storage (Optional - for file exports)
# =============================================================================

# Enable S3 storage (true/false)
USE_S3_STORAGE=true

# S3 bucket name
AWS_S3_BUCKET=stellarsplit-exports

# AWS region
AWS_REGION=us-east-1

# AWS access key
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx

# AWS secret key
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Local storage fallback path (if S3 not used)
LOCAL_STORAGE_PATH=./storage/exports

# =============================================================================
# Email Configuration (Optional - for notifications)
# =============================================================================

# SMTP server host
SMTP_HOST=smtp.gmail.com

# SMTP port (587 for TLS, 465 for SSL)
SMTP_PORT=587

# Use secure connection (true for port 465)
SMTP_SECURE=false

# SMTP username
SMTP_USER=noreply@stellarsplit.com

# SMTP password or app-specific password
SMTP_PASSWORD=your_smtp_password

# Default sender email
EMAIL_FROM=noreply@stellarsplit.com

# =============================================================================
# Application URLs
# =============================================================================

# Backend API URL (used in emails and links)
APP_URL=https://api.stellarsplit.com

# Frontend URL (for CORS and redirects)
FRONTEND_URL=https://stellarsplit.com

# =============================================================================
# Analytics & Monitoring (Optional)
# =============================================================================

# ClickHouse database host (for analytics)
CLICKHOUSE_HOST=localhost

# ClickHouse port
CLICKHOUSE_PORT=8123

# ClickHouse username
CLICKHOUSE_USER=default

# ClickHouse password
CLICKHOUSE_PASSWORD=

# ClickHouse database
CLICKHOUSE_DB=analytics

# Analytics export directory
ANALYTICS_EXPORT_DIR=./analytics-exports

# WebSocket port for real-time analytics
WS_PORT=5000

# Kafka broker (for event streaming)
KAFKA_BROKER=localhost:9092

# =============================================================================
# ML Service Configuration
# =============================================================================

# ML service URL (for fraud detection)
ML_SERVICE_URL=http://localhost:8000

# Enable fraud detection
FRAUD_DETECTION_ENABLED=true

# =============================================================================
# Export Settings
# =============================================================================

# Export file expiry in days
EXPORT_EXPIRY_DAYS=7
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
# =============================================================================
# Frontend Environment Configuration
# =============================================================================

# Node environment
NODE_ENV=production

# Development server port (not used in production build)
PORT=3000

# Backend API URL (REQUIRED - must point to your backend)
BASE_API_URL=https://api.stellarsplit.com/api

# For Vite-based builds, use VITE_ prefix
VITE_API_URL=https://api.stellarsplit.com/api
```

### Environment Variable Explanations

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Must be `production` for production deployments |
| `PORT` | Yes | Port for the backend server |
| `DB_HOST` | Yes | PostgreSQL server hostname |
| `DB_PORT` | Yes | PostgreSQL port (default: 5432) |
| `DB_USERNAME` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_NAME` | Yes | Database name |
| `DB_SYNCHRONIZE` | Yes | Must be `false` in production |
| `REDIS_HOST` | Yes | Redis server hostname |
| `REDIS_PORT` | Yes | Redis port (default: 6379) |
| `STELLAR_NETWORK` | Yes | `mainnet` or `testnet` |
| `PLATFORM_WALLET` | Yes | Stellar address for platform fees |
| `AWS_*` | No | Required only if using S3 for exports |
| `SMTP_*` | No | Required only for email notifications |

---

## Database Setup

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql@15

# Start service
brew services start postgresql@15
```

**Windows:**
Download and install from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)

### Step 2: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE stellarsplit_prod;

# Create user
CREATE USER stellarsplit WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE stellarsplit_prod TO stellarsplit;

# Exit
\q
```

### Step 3: Run Database Migrations

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run migrations
npm run migration:run
```

**Migration Commands:**

| Command | Description |
|---------|-------------|
| `npm run migration:run` | Run pending migrations |
| `npm run migration:generate -- -n MigrationName` | Generate new migration |
| `npm run typeorm migration:revert` | Revert last migration |

### Step 4: Verify Database Connection

```bash
# Test connection
psql -U stellarsplit -d stellarsplit_prod -h localhost -c "SELECT 1;"
```

---

## Frontend Production Build

### Step 1: Install Dependencies

```bash
cd frontend

# Install dependencies
npm install
```

### Step 2: Configure Environment

Create `.env.production` in the `frontend/` directory:

```bash
VITE_API_URL=https://api.stellarsplit.com/api
```

### Step 3: Build for Production

```bash
# Create optimized production build
npm run build

# Output will be in the 'dist/' directory
```

### Step 4: Preview Build (Optional)

```bash
# Preview the production build locally
npm run preview
```

### Step 5: Serve Static Files

**Using Nginx:**
```nginx
server {
    listen 80;
    server_name stellarsplit.com;
    
    root /var/www/stellarsplit/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

**Using a static file server:**
```bash
# Using serve (npm package)
npm install -g serve
serve -s dist -l 3000
```

---

## Backend Production Deployment

### Step 1: Install Dependencies

```bash
cd backend

# Install production dependencies only
npm install --production
```

### Step 2: Build the Application

```bash
# Compile TypeScript
npm run build

# Output will be in 'dist/' directory
```

### Step 3: Start Production Server

**Using npm:**
```bash
# Start production server
NODE_ENV=production npm run start
```

**Using PM2 (Recommended):**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/main.js --name stellarsplit-api

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

**PM2 Configuration File (`ecosystem.config.js`):**
```javascript
module.exports = {
  apps: [{
    name: 'stellarsplit-api',
    script: './dist/main.js',
    instances: 'max',        // Use all CPU cores
    exec_mode: 'cluster',    // Enable clustering
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
```

### Step 4: Configure Reverse Proxy (Nginx)

```nginx
upstream stellarsplit_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.stellarsplit.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.stellarsplit.com;
    
    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Proxy to backend
    location / {
        proxy_pass http://stellarsplit_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

The project includes a `docker-compose.yml` file for easy deployment.

### Step 1: Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - DB_SYNCHRONIZE=false
      - DB_LOGGING=false
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - STELLAR_NETWORK=${STELLAR_NETWORK}
      - PLATFORM_WALLET=${PLATFORM_WALLET}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - FRONTEND_URL=${FRONTEND_URL}
      - APP_URL=${APP_URL}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    restart: unless-stopped

  # ML Service (Optional)
  ml-service:
    build:
      context: ./ml-service
      dockerfile: Dockerfile
    environment:
      - PORT=8000
      - DB_CONNECTION_STRING=postgresql://${DB_USERNAME}:${DB_PASSWORD}@db:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Step 2: Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
```

### Step 3: Create Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage (nginx)
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Step 4: Deploy with Docker Compose

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Hosting Options

### Option 1: Railway (Recommended for Beginners)

**Pros:**
- Easy GitHub integration
- Automatic deployments
- Managed PostgreSQL and Redis
- Built-in HTTPS

**Steps:**
1. Push code to GitHub
2. Connect Railway to your repository
3. Add PostgreSQL and Redis plugins
4. Set environment variables in Railway dashboard
5. Deploy

**Configuration:**
```bash
# Railway will automatically set these:
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Option 2: Render

**Pros:**
- Free tier available
- Automatic HTTPS
- Managed PostgreSQL

**Steps:**
1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: stellarsplit-api
    runtime: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: stellarsplit-db
          property: connectionString

databases:
  - name: stellarsplit-db
    databaseName: stellarsplit
    user: stellarsplit
```

2. Push to GitHub and connect to Render

### Option 3: Fly.io

**Pros:**
- Global edge deployment
- Docker-based
- Generous free tier

**Steps:**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Create database
fly postgres create

# Set secrets
fly secrets set DB_PASSWORD=xxx AWS_SECRET_ACCESS_KEY=xxx

# Deploy
fly deploy
```

### Option 4: VPS (DigitalOcean, AWS EC2, Linode)

**Pros:**
- Full control
- Cost-effective at scale
- No platform lock-in

**Steps:**
1. Provision Ubuntu 22.04 server
2. Install Node.js, PostgreSQL, Redis
3. Clone repository
4. Set up environment variables
5. Build and start with PM2
6. Configure Nginx as reverse proxy
7. Set up SSL with Let's Encrypt

**Automated Setup Script:**
```bash
#!/bin/bash
# setup.sh - Run on fresh Ubuntu 22.04

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Setup database
sudo -u postgres psql -c "CREATE DATABASE stellarsplit_prod;"
sudo -u postgres psql -c "CREATE USER stellarsplit WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stellarsplit_prod TO stellarsplit;"

# Clone and setup app
git clone https://github.com/yourusername/stellarsplit.git
cd stellarsplit/backend
npm install
npm run build

# Start with PM2
pm2 start dist/main.js --name stellarsplit-api
pm2 startup
pm2 save

# Configure Nginx (manual step - see nginx config above)
```

### Hosting Comparison

| Platform | Best For | Price | Complexity |
|----------|----------|-------|------------|
| Railway | Quick deployment, prototyping | $5+/mo | Low |
| Render | Free tier, simple apps | Free-$25/mo | Low |
| Fly.io | Global scale, Docker | Free-$2+/mo | Medium |
| VPS | Full control, scale | $5-20/mo | High |

---

## Stellar Network Configuration

### Switching Between Testnet and Mainnet

#### 1. Set Environment Variable

```bash
# For testnet (development)
STELLAR_NETWORK=testnet

# For mainnet (production)
STELLAR_NETWORK=mainnet
```

#### 2. Update Horizon URL

The application automatically configures Horizon based on `STELLAR_NETWORK`:

| Network | Horizon URL |
|---------|-------------|
| Testnet | https://horizon-testnet.stellar.org |
| Mainnet | https://horizon.stellar.org |

#### 3. Network Passphrases

| Network | Passphrase |
|---------|------------|
| Testnet | `Test SDF Network ; September 2015` |
| Mainnet | `Public Global Stellar Network ; September 2015` |

#### 4. Platform Wallet

Ensure your `PLATFORM_WALLET` environment variable is set to the correct network address:

```bash
# Testnet wallet (starts with G)
PLATFORM_WALLET=GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM

# Mainnet wallet (starts with G)
PLATFORM_WALLET=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Important: Mainnet Considerations

Before switching to mainnet:

1. **Fund your platform wallet** with real XLM
2. **Create trustlines** for USDC and other assets
3. **Test thoroughly** on testnet first
4. **Set up monitoring** for transactions
5. **Have a backup plan** for failed transactions
6. **Consider transaction fees** in your pricing

### Verification Script

```bash
#!/bin/bash
# verify-stellar-config.sh

echo "Stellar Network Configuration"
echo "=============================="
echo ""
echo "STELLAR_NETWORK: $STELLAR_NETWORK"
echo "PLATFORM_WALLET: $PLATFORM_WALLET"
echo ""

if [ "$STELLAR_NETWORK" = "mainnet" ]; then
    echo "⚠️  WARNING: Connected to MAINNET (real money)!"
    echo "Horizon: https://horizon.stellar.org"
else
    echo "✓ Connected to TESTNET (safe for testing)"
    echo "Horizon: https://horizon-testnet.stellar.org"
fi
```

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Stellar mainnet wallet funded
- [ ] USDC trustline established (if accepting USDC)

### Security

- [ ] `DB_SYNCHRONIZE=false` in production
- [ ] Strong database password
- [ ] Environment variables not in code
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Swagger disabled or protected

### Monitoring

- [ ] Application logs configured
- [ ] Error tracking (Sentry recommended)
- [ ] Database backups scheduled
- [ ] Health check endpoint monitored
- [ ] SSL certificate expiry monitored

### Performance

- [ ] PM2 or similar process manager
- [ ] Nginx reverse proxy
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] Database indexes optimized

### Post-Deployment

- [ ] Health check passes
- [ ] Database connection working
- [ ] Stellar transactions processing
- [ ] Email notifications sending
- [ ] SSL certificate valid

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check `DB_HOST`, `DB_PASSWORD`, firewall rules |
| Redis connection failed | Verify Redis is running, check `REDIS_HOST` |
| CORS errors | Update `FRONTEND_URL` and `APP_URL` |
| Stellar transactions failing | Verify `STELLAR_NETWORK` and `PLATFORM_WALLET` |
| Build fails | Check Node.js version (requires 18+) |
| Out of memory | Increase PM2 `max_memory_restart` limit |

### Getting Help

- Check application logs: `pm2 logs` or `docker-compose logs`
- Review Stellar network status: [status.stellar.org](https://status.stellar.org)
- Consult Stellar documentation: [developers.stellar.org](https://developers.stellar.org)

---

## Quick Start Commands

```bash
# Local development
cd backend && npm run start:dev
cd frontend && npm run dev

# Production build
cd backend && npm run build && npm run start
cd frontend && npm run build

# Docker deployment
docker-compose up -d

# Database migrations
cd backend && npm run migration:run

# View logs
pm2 logs
docker-compose logs -f
```

---

Happy deploying! 🚀
