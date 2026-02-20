FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source
COPY src/ ./src/

# Build
RUN npx tsc

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV WALLET_ADDRESS=0x59c7D3E9926403FBfdA678503827eFF0c5390D83
ENV POLL_INTERVAL_MS=60000
ENV AUTO_POST=true
ENV MIN_QUALITY=30

CMD ["node", "dist/index.js"]
