FROM node:18-alpine

# Install dependencies for yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

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

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start the bot
CMD ["node", "dist/index.js"]
