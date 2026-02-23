FROM node:20-alpine
WORKDIR /app
COPY intel-marketplace/package*.json ./
RUN npm install --include=dev
COPY intel-marketplace/ .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/cli.js", "serve"]
