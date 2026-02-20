FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create data directory for state persistence
RUN mkdir -p /app/data

# Default config path (mount your config.json here)
ENV CONFIG_PATH=/app/config.json
ENV STATE_PATH=/app/data/state.json

ENTRYPOINT ["node", "dist/cli.js", "monitor"]
CMD ["-c", "/app/config.json", "-s", "/app/data/state.json"]
