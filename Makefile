.PHONY: help up down logs reset dev api tauri migrate db-update setup-prod-db

# ─── Default ──────────────────────────────────────────────────────────────────
help:
	@echo "SolaHub development commands:"
	@echo ""
	@echo "  make up            Start Docker services (PostgreSQL + Adminer)"
	@echo "  make down          Stop Docker services"
	@echo "  make logs          Tail Docker logs"
	@echo "  make reset         Wipe Docker volumes and containers"
	@echo ""
	@echo "  make api           Run API in watch mode (auto-migrates on startup)"
	@echo "  make tauri         Run Tauri desktop app (dev mode)"
	@echo "  make dev           Full stack: docker up → api → tauri"
	@echo ""
	@echo "  make migrate name=X  Add EF Core migration"
	@echo "  make db-update       Apply pending migrations to local dev DB"
	@echo ""
	@echo "  make setup-prod-db   One-time prod DB setup (set solahub_app password + verify RLS)"
	@echo "                       Requires: POSTGRES_HOST POSTGRES_DB POSTGRES_SUPERUSER"
	@echo "                                 POSTGRES_SUPERUSER_PASSWORD SOLAHUB_APP_PASSWORD"

# ─── Docker ───────────────────────────────────────────────────────────────────
up:
	docker compose up -d --wait

down:
	docker compose down

logs:
	docker compose logs -f

reset:
	docker compose down -v --remove-orphans

# ─── API ──────────────────────────────────────────────────────────────────────
api:
	dotnet watch run \
		--project api/src/SolaHub.API/SolaHub.API.csproj \
		--launch-profile Development

# ─── Frontend / Tauri ─────────────────────────────────────────────────────────
tauri:
	npm run tauri dev

# ─── Full stack ───────────────────────────────────────────────────────────────
# Starts Docker first (blocks until healthy), then launches API and Tauri in parallel.
dev: up
	$(MAKE) -j2 api tauri

# ─── EF Core ──────────────────────────────────────────────────────────────────
migrate:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate name=MigrationName"; exit 1; fi
	dotnet ef migrations add $(name) \
		--project api/src/SolaHub.Infrastructure/SolaHub.Infrastructure.csproj \
		--startup-project api/src/SolaHub.API/SolaHub.API.csproj \
		--output-dir Persistence/Migrations

db-update:
	dotnet ef database update \
		--project api/src/SolaHub.Infrastructure/SolaHub.Infrastructure.csproj \
		--startup-project api/src/SolaHub.API/SolaHub.API.csproj

# ─── Production DB setup (run once after first deploy) ────────────────────────
setup-prod-db:
	@bash scripts/setup-prod-db.sh
