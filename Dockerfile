# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./src

RUN npm run build


# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV DTP_HOST=0.0.0.0
ENV DTP_PORT=4040

COPY --from=builder /app/dist ./dist

EXPOSE 4040

CMD ["node", "dist/server/server.js"]