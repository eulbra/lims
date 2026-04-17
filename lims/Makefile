# LIMS Makefile
.PHONY: help setup migrate migrate-dev test test-cov lint lint-fix format run shell docker-up docker-down docker-build docker-logs createsuperuser seed

help: ## Show this help
	@grep -E "^[a-zA-Z_-]+:.*?## .*$$" $(MAKEFILE_LIST) | sort | awk "BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}"

setup: ## Install dependencies and setup project
	pip install -r requirements.txt
	python manage.py migrate --settings=config.settings.dev

migrate: ## Run migrations
	python manage.py migrate

migrate-dev: ## Run migrations (dev settings)
	python manage.py migrate --settings=config.settings.dev

makemigrations: ## Create new migrations
	python manage.py makemigrations

test: ## Run tests
	pytest lims/tests/ --settings=config.settings.dev

test-cov: ## Run tests with coverage
	pytest lims/tests/ --cov=lims --cov-report=term-missing --settings=config.settings.dev

lint: ## Run linters
	ruff check lims/
	mypy lims/ --ignore-missing-imports

lint-fix: ## Auto-fix lint issues
	ruff check --fix lims/
	ruff format lims/

format: ## Format code
	black lims/
	ruff format lims/

run: ## Run development server
	python manage.py runserver --settings=config.settings.dev

shell: ## Open Django shell
	python manage.py shell --settings=config.settings.dev

createsuperuser: ## Create admin user
	python manage.py createsuperuser --settings=config.settings.dev

seed: ## Seed dev data
	python manage.py seed_data --settings=config.settings.dev

docker-up: ## Start all Docker services (dev)
	docker compose -f docker/docker-compose.yml up -d

docker-down: ## Stop all Docker services
	docker compose -f docker/docker-compose.yml down

docker-build: ## Rebuild Docker images
	docker compose -f docker/docker-compose.yml up -d --build

docker-logs: ## Show Docker logs
	docker compose -f docker/docker-compose.yml logs -f

db-shell: ## Open database shell
	python manage.py dbshell --settings=config.settings.dev

openapi: ## Generate OpenAPI schema
	python manage.py spectacular --file openapi-schema.yml

check: ## Run Django system checks
	python manage.py check --settings=config.settings.dev

collectstatic: ## Collect static files
	python manage.py collectstatic --noinput --settings=config.settings.prod

i18n: ## Update translation files
	python manage.py makemessages -l en -l zh -l pt -l th
	python manage.py compilemessages
