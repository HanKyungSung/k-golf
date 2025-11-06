## Backend Dockerfile (multi-stage) for production - includes frontend static files
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
ENV CI=true
RUN apk add --no-cache openssl libc6-compat
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm install

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
ENV NODE_ENV=production
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/ ./
# Build backend - triggers prisma generate
RUN npm run build

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
ENV CI=true
# Set webpack output to ./dist (default Docker behavior)
ENV WEBPACK_OUTPUT_PATH=./dist
# Use relative URLs for API calls (empty string means same origin)
ENV REACT_APP_API_BASE=
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Build frontend static files
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
# Copy backend runtime files
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/package*.json ./
# Copy frontend static files to dist/public (matches local structure)
COPY --from=frontend-build /app/frontend/dist ./dist/public

# Expose app port (matches PORT env or fallback in code)
EXPOSE 8080

# Healthcheck (optional, compose has its own)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/src/server.js"]
