# NGS LIMS — Production Deployment Guide

## Server Requirements

| Config | Minimum (test) | Production |
|--------|---------------|------------|
| CPU | 2 cores | 4 cores |
| Memory | 4 GB | 8 GB |
| Storage | 50 GB | 100 GB+ |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |

- **China**: Alibaba Cloud ECS / Tencent Cloud CVM — 2C4G ≈ ¥200-400/month
- **Overseas**: AWS EC2 t3.medium ≈ $25-35/month, DigitalOcean $24/month

## Quick Deploy (One Command)

```bash
# On your cloud server:
git clone <your-repo-url> /opt/lims && cd /opt/lims
cp .env.example .env
nano .env              # edit secrets + domain
sudo bash lims/docker/deploy.sh
```

## Manual Steps

### 1. Prepare `.env`

Copy `.env.example` to `.env` and set:

```bash
cp .env.example .env
nano .env
```

Required values:

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret — `python -c "from secrets import token_urlsafe; print(token_urlsafe(64))"` |
| `POSTGRES_PASSWORD` | PostgreSQL password — same command, 32+ chars |
| `JWT_SECRET` | JWT signing key — 64+ chars |
| `DJANGO_ALLOWED_HOSTS` | Your domain(s), space-separated, e.g. `lims.example.com api.example.com` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins, e.g. `https://lims.example.com` |
| `SMTP_*` | Email server for notifications |

**Never commit `.env` to git.** It's in `.gitignore`.

### 2. Build & Start

```bash
cd lims/docker
docker compose -f docker-compose.prod.yml build --parallel
docker compose -f docker-compose.prod.yml up -d
```

### 3. Database Setup

```bash
docker compose -f docker-compose.prod.yml exec -T \
  web python manage.py migrate --settings=lims.config.settings.prod
docker compose -f docker-compose.prod.yml exec -T \
  web python manage.py collectstatic --noinput --settings=lims.config.settings.prod
docker compose -f docker-compose.prod.yml exec -T \
  web python manage.py seed_data --settings=lims.config.settings.prod
```

### 4. Verify

```bash
docker compose -f docker-compose.prod.yml ps          # all services Up
curl http://localhost/api/v1/login/                    # should return Method not allowed (405)
curl http://localhost/health/                          # should return OK (200)
```

## HTTPS (Let's Encrypt)

```bash
# 1. Install certbot
sudo apt-get install -y certbot

# 2. Get certificate
sudo certbot certonly --standalone -d lims.example.com

# 3. Link certs
mkdir -p lims/docker/certs
sudo ln -sf /etc/letsencrypt/live/lims.example.com/fullchain.pem lims/docker/certs/
sudo ln -sf /etc/letsencrypt/live/lims.example.com/privkey.pem lims/docker/certs/

# 4. Enable SSL in nginx.prod.conf
# Uncomment the SSL section (lines 64-69)

# 5. Restart nginx
cd lims/docker
docker compose -f docker-compose.prod.yml up -d nginx
```

**Auto-renew**: cron `0 3 * * 1 certbot renew --quiet && docker compose -f lims/docker/docker-compose.prod.yml restart nginx`

## Service Architecture

```
Internet
   ↓
Nginx (:80/:443) — SPA fallback + static files + API proxy
   ↓
Gunicorn (:8000) — Django 4 workers + 2 threads
   ↓
PostgreSQL 16 — Persistent data
Redis 7 — Cache + Celery broker
   ↓
Celery Worker — Async tasks (reports, notifications)
Celery Beat — Scheduled tasks
```

## Operations

### View logs
```bash
docker compose -f lims/docker/docker-compose.prod.yml logs -f web     # Django
docker compose -f lims/docker/docker-compose.prod.yml logs -f worker  # Celery
docker compose -f lims/docker/docker-compose.prod.yml logs -f nginx   # Nginx
```

### Restart a service
```bash
docker compose -f lims/docker/docker-compose.prod.yml restart web
```

### After code changes
```bash
cd lims/docker
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate --settings=lims.config.settings.prod
docker compose -f docker-compose.prod.yml restart nginx  # flush nginx DNS cache
```

### Backup database
```bash
docker compose -f lims/docker/docker-compose.prod.yml exec -T db \
  pg_dump -U lims lims > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
cat backup_20260417.sql | docker compose -f lims/docker/docker-compose.prod.yml exec -T db \
  psql -U lims lims
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `502 Bad Gateway` | `docker compose restart nginx` — DNS cache in nginx container |
| `ModuleNotFoundError` | Rebuild: `docker compose build web` |
| `SECURE_SSL_REDIRECT` loop | Ensure `DJANGO_DEBUG=True` for HTTP-only testing |
| Database connection refused | Check `POSTGRES_*` vars match, verify `db` container is healthy |
| Frontend returns 404 on refresh | Verify `try_files $uri $uri/ /index.html` in nginx config |
| Docker Hub timeout (China servers) | Use mirror: `registry.docker-cn.com` or Alibaba registry |

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `admin123` |
| Site Director | `brsp_site` | `site_director123` |
| QC Manager | `brsp_qc_m` | `qc_manager123` |
| Technologist | `brsp_tech` | `technologist123` |

**Change the admin password immediately after first login.**
