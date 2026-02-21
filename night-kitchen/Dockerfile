FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy built files
COPY --from=builder /app/dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV WALLET_ADDRESS=""
ENV HELIUS_RPC_URL=""
ENV SOLANA_RPC_URL=""

# Run the agent
CMD ["node", "dist/index.js"]
