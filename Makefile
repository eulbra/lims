.PHONY: help setup dev seed build up down logs shell test

# ── Docker Compose ──
COMPOSE=cd lims/docker && docker compose

help:
	@echo "╔══════════════════════════════════════════════╗"
	@echo "║          NGS LIMS - Makefile Reference       ║"
	@echo "╚══════════════════════════════════════════════╝"
	@echo ""
	@echo "  Development:"
	@echo "    make setup      Install deps, init DB, seed data"
	@echo "    make dev        Run Django + Vite dev servers"
	@echo "    make seed       Seed demo data into SQLite"
	@echo ""
	@echo "  Docker (Production):"
	@echo "    make up         Start all services"
	@echo "    make build      Build Docker images"
	@echo "    make down       Stop and remove containers"
	@echo "    make logs       Follow logs (web + worker)"
	@echo "    make migrate    Run database migrations"
	@echo "    make seed-docker  Seed data inside docker"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make shell      Django shell"
	@echo "    make shell-db   psql shell"
	@echo "    make test       Run pytest"
	@echo "    make static     Collect static files"

# ── Development ──
setup:
	cp -n .env.example .env 2>/dev/null || true
	/usr/bin/python3.12 -m pip install -r lims/requirements.txt
	/usr/bin/python3.12 manage.py migrate --settings=lims.config.settings.dev
	/usr/bin/python3.12 manage.py check --settings=lims.config.settings.dev

dev:
	@echo "Starting Django on :8000 and Vite on :5173..."
	@cd frontend && nohup npx vite > /dev/null 2>&1 &
	@/usr/bin/python3.12 manage.py runserver --settings=lims.config.settings.dev 0.0.0.0:8000

seed:
	/usr/bin/python3.12 manage.py seed_data --settings=lims.config.settings.dev

# ── Docker Production ──
build:
	$(COMPOSE) -f docker-compose.prod.yml build --parallel

up:
	$(COMPOSE) -f docker-compose.prod.yml up -d
	@echo "Waiting for database..."
	@sleep 5
	@echo "Running migrations..."
	$(COMPOSE) -f docker-compose.prod.yml exec -T web python manage.py migrate --settings=lims.config.settings.prod
	@echo "Collecting static files..."
	$(COMPOSE) -f docker-compose.prod.yml exec -T web python manage.py collectstatic --noinput --settings=lims.config.settings.prod || true

down:
	$(COMPOSE) -f docker-compose.prod.yml down

migrate:
	$(COMPOSE) -f docker-compose.prod.yml exec web python manage.py migrate --settings=lims.config.settings.prod

seed-docker:
	$(COMPOSE) -f docker-compose.prod.yml exec web python manage.py seed_data --settings=lims.config.settings.prod

logs:
	$(COMPOSE) -f docker-compose.prod.yml logs -f web worker nginx

shell:
	$(COMPOSE) -f docker-compose.prod.yml exec web python manage.py shell --settings=lims.config.settings.prod

shell-db:
	$(COMPOSE) -f docker-compose.prod.yml exec db psql -U postgres -d lims

static:
	$(COMPOSE) -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput --settings=lims.config.settings.prod

# ── Testing ──
test:
	/usr/bin/python3.12 -m pytest lims/ --settings=lims.config.settings.dev -v

check:
	/usr/bin/python3.12 manage.py check --settings=lims.config.settings.dev
