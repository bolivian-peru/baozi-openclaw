FROM node:20-alpine
WORKDIR /app
COPY agent-recruiter/package*.json ./
RUN npm install --include=dev
COPY agent-recruiter/ .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/cli.js", "serve"]
