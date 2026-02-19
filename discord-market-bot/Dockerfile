FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# Create data directory for persistent config
RUN mkdir -p /app/data

CMD ["node", "dist/index.js"]
