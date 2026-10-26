FROM node:20-bullseye-slim

# Install system dependencies including FFmpeg for Discord voice streaming
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies using npm install (clean, reliable, no lockfile strictness issues)
COPY package*.json ./
RUN npm install --no-audit

# Copy application source code
COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
