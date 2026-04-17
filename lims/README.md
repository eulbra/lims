# NGS Laboratory LIMS

Laboratory Information Management System for multi-site NGS operations (NIPT, NIPT+, HPV).

## Quick Start

### Prerequisites
- Python 3.12+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional, for containerized setup)

### Local Development (without Docker)

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env

# 4. Ensure PostgreSQL is running and create database
createdb lims
# Or use: psql -c "CREATE DATABASE lims;"

# 5. Run migrations
make migrate-dev

# 6. Seed development data (creates sample sites, users, panels)
make seed

# 7. Run development server
make run
# → http://localhost:8000/admin/ — admin (admin / admin123)
# → http://localhost:8000/api/schema/swagger/ — API docs
```

### With Docker Compose

```bash
make docker-up      # Start all services
make docker-down    # Stop all services
make docker-logs    # View logs
```

This starts:
- **Web** (Django/Gunicorn on port 8000)
- **Worker** (Celery for async tasks)
- **Beat** (Celery scheduler for periodic tasks)
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **MinIO** (port 9000, console on 9001)
- **Flower** (Celery monitoring, port 5555)
- **Frontend** (Vite/React, port 5173)
- **nginx** (proxy on port 80)

### Frontend Development

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Database Users (after `make seed`)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Super Admin |
| usla_director | director123 | US Lab Director |
| cnsh_director | director123 | Shanghai Lab Director |
| brsp_director | director123 | São Paulo Lab Director |
| thbk_director | director123 | Bangkok Lab Director |
| hk_director | director123 | Hong Kong Lab Director |

## Project Structure

```
├── lims/                    # Django project root
│   ├── config/              # Django settings (base, dev, prod)
│   ├── core/                # Shared base models, utils, management commands
│   ├── apps/
│   │   ├── users/           # Auth, MFA, user management
│   │   ├── organizations/   # Sites, departments
│   │   ├── samples/         # Sample receipt, tracking, movements
│   │   ├── orders/          # Test orders
│   │   ├── workflows/       # Runs, steps, protocols
│   │   ├── reagents/        # Reagent inventory, lots
│   │   ├── instruments/     # Instrument registry, maintenance
│   │   ├── qc/              # QC runs, charts, CAPA events
│   │   ├── bioinformatics/  # Pipeline jobs, results
│   │   ├── reports/         # Report templates, generation, e-signatures
│   │   ├── documents/       # SOP versioning, document management
│   │   ├── training/        # Training records, competency assessments
│   │   ├── quality/         # PT/EQA, internal audits
│   │   ├── audit/           # Tamper-evident audit log
│   │   └── notifications/   # In-app notifications
│   ├── docker/              # Docker Compose, Dockerfiles, nginx
│   ├── templates/           # HTML templates (PDFs, emails)
│   ├── locale/              # i18n translations (en, zh, pt, th)
│   └── tests/               # Test suite
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── api/             # API client (Axios)
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components + router
│   │   ├── store/           # Zustand state management
│   │   └── hooks/           # Custom React hooks
│   └── ...
├── requirements.txt         # Python dependencies
├── pyproject.toml           # Tool configs (pytest, ruff, mypy)
├── Makefile                 # Common commands
└── README.md
```

## API

- Swagger UI: http://localhost:8000/api/schema/swagger/
- ReDoc: http://localhost:8000/api/schema/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## Common Commands

```bash
make help           # Show all commands
make test           # Run tests
make lint           # Run linting
make lint-fix       # Auto-fix lint issues
make format         # Format code
make makemigrations # Create new migrations
make i18n           # Update translation files
make openapi        # Generate OpenAPI schema
```

## Multi-Site Deployment

Each site (US, Brazil, Thailand, China, Hong Kong) runs its own instance with:
- Separate database
- Separate S3/MinIO bucket
- Shared codebase with site-specific `.env` configuration

See LIMS docs in `/home/hankchen/lims-prd-*.md` and `/home/hankchen/lims-tech-arch-*.md` for full PRD and architecture.
