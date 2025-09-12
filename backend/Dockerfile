## Backend Dockerfile (multi-stage) for production
FROM node:20-alpine AS deps
WORKDIR /app
ENV CI=true
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build triggers prisma generate via prebuild script
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Only copy necessary runtime files
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

# Expose app port (matches PORT env or fallback in code)
EXPOSE 8080

# Healthcheck (optional, compose has its own)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
