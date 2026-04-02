# ─── Stage 1: Build Frontend ─────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Final Image (Python + Backend) ─────────
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend build output from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set environment variables
ENV DATABASE_PATH=/app/backend/parrotpod.db
ENV PORT=10000

# Make start script executable
RUN chmod +x backend/render_start.sh

# Expose port
EXPOSE 10000

# Start command (runs both voice agent and fastapi)
CMD ["sh", "-c", "cd backend && ./render_start.sh"]
