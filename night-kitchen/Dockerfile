# night-kitchen — bilingual market report agent
# multi-stage build: compile TypeScript, then run lean Alpine image

# ── stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# install dependencies first (layer cache)
COPY package.json ./
RUN npm install

# copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# copy built output and production deps
COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# environment variables (pass at runtime)
ENV NODE_ENV=production
ENV WALLET_ADDRESS=""
ENV SOLANA_PRIVATE_KEY=""
ENV SOLANA_RPC_URL=""

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["report"]
