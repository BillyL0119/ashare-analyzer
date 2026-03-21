FROM node:20-slim

# Install Python 3 + pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip3 install --break-system-packages -r backend/requirements.txt

# Copy backend
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 8001

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
