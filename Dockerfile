FROM node:18-slim

# Install dependencies for yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create directories for data
RUN mkdir -p /app/sessions /app/temp

# Set environment variables
ENV NODE_ENV=production
ENV SESSION_DIR=/app/sessions
ENV TEMP_DIR=/app/temp

# Start the bot
CMD ["node", "dist/index.js"]
