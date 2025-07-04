.PHONY: redis-start redis-stop redis-logs redis-status dev clean help

# Start Redis container in background
redis-start:
	docker compose up -d redis

# Stop Redis container
redis-stop:
	docker compose down

# View Redis logs
redis-logs:
	docker compose logs -f redis

# Check Redis container status
redis-status:
	docker compose ps redis

# Start development environment (Redis + app)
dev: redis-start
	npm run dev

# Stop all containers and clean up
clean:
	docker compose down
	docker compose rm -f

# Show available commands
help:
	@echo "Available commands:"
	@echo "  redis-start  - Start Redis container in background"
	@echo "  redis-stop   - Stop Redis container"
	@echo "  redis-logs   - View Redis logs"
	@echo "  redis-status - Check Redis container status"
	@echo "  dev          - Start Redis + development environment"
	@echo "  clean        - Stop all containers and clean up"