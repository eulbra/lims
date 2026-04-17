#!/bin/bash
# ═══════════════════════════════════════════════════════
# NGS LIMS — Production Deployment Script
# Usage: sudo bash deploy.sh
# Compatible: Ubuntu 22.04 / 24.04
# Cloud: Alibaba Cloud, Tencent Cloud, AWS EC2
# ═══════════════════════════════════════════════════════
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN} NGS LIMS — Production Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

# ── 1. System deps ──
echo -e "\n${YELLOW}[1/7] Installing system dependencies...${NC}"
apt-get update -qq
apt-get install -y docker.io docker-compose-plugin curl git
log "Docker $docker --version | Compose v2 installed"

# ── 2. Docker check ──
echo -e "\n${YELLOW}[2/7] Verifying Docker...${NC}"
docker info >/dev/null 2>&1 || { err "Docker not running. Try: sudo systemctl start docker"; exit 1; }
log "$(docker --version)"

# ── 3. Clone or update code ──
LIMS_DIR="/opt/lims"
echo -e "\n${YELLOW}[3/7] Setting up code at $LIMS_DIR ...${NC}"
if [ -d "$LIMS_DIR" ]; then
    cd "$LIMS_DIR"
    if [ -d ".git" ]; then
        warn "Directory exists — pulling latest changes"
        git pull --rebase || warn "git pull failed (local changes?), continuing with existing code"
    fi
else
    warn "Directory $LIMS_DIR not found"
    warn "Clone your repo first:"
    warn "  git clone <your-repo-url> $LIMS_DIR"
    exit 1
fi

# ── 4. Environment file ──
echo -e "\n${YELLOW}[4/7] Checking .env...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        err ".env created from template — please edit it:"
        err "  nano $LIMS_DIR/.env"
        err "Required values: DJANGO_SECRET_KEY, POSTGRES_PASSWORD, JWT_SECRET, DJANGO_ALLOWED_HOSTS"
        exit 1
    else
        err "No .env or .env.example found"
        exit 1
    fi
fi

# ── 5. Build & start ──
echo -e "\n${YELLOW}[5/7] Building Docker images...${NC}"
cd lims/docker
docker compose -f docker-compose.prod.yml build --parallel
log "Build complete"

echo -e "\n${YELLOW}[6/7] Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d
log "Services started"

# Health check — wait for DB
echo -e "${YELLOW}    Waiting for PostgreSQL...${NC}"
for i in $(seq 1 30); do
    if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U lims >/dev/null 2>&1; then
        log "PostgreSQL ready after ${i}s"
        break
    fi
    [ $i -eq 30 ] && { err "PostgreSQL not ready after 30s"; }
    sleep 1
done

# ── 7. Migrations + seed ──
echo -e "\n${YELLOW}[7/7] Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --settings=lims.config.settings.prod
log "Migrations applied"

docker compose -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput --settings=lims.config.settings.prod 2>/dev/null && log "Static files collected" || warn "collectstatic skipped"

# Seed data (only if DB is empty)
USER_COUNT=$(docker compose -f docker-compose.prod.yml exec -T web python manage.py shell --settings=lims.config.settings.prod -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.count())" 2>/dev/null || echo "0")
if [ "$USER_COUNT" -le 1 ]; then
    echo -e "${YELLOW}    Seeding demo data...${NC}"
    docker compose -f docker-compose.prod.yml exec -T web python manage.py seed_data --settings=lims.config.settings.prod
    log "Seed data loaded"
else
    log "Database already has data ($USER_COUNT users) — skipping seed"
fi

# ── Summary ──
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN} Deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

# Get server IP
SERVER_IP=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo "your-server-ip")

echo "  状态检查:  docker compose -f lims/docker/docker-compose.prod.yml ps"
echo "  查看日志:  docker compose -f lims/docker/docker-compose.prod.yml logs -f web"
echo ""
echo "  访问地址:  http://$SERVER_IP/"
echo "  Admin:     http://$SERVER_IP/admin/"
echo "  API docs:  http://$SERVER_IP/api/schema/swagger/"
echo ""
echo "  默认登录:"
echo "    用户名:  admin"
echo "    密码:    admin123    ← 请尽快修改!"
echo ""
warn "安全提醒: 请修改默认密码、配置 HTTPS、限制 ALLOWED_HOSTS"
echo ""
