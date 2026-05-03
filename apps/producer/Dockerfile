FROM node:20-alpine AS base

WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/producer/package.json ./apps/producer/
COPY apps/consumer/package.json ./apps/consumer/
COPY libs/shared/package.json ./libs/shared/
RUN npm install

FROM base AS build
COPY . .
RUN npx nx build producer

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/dist/apps/producer ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

CMD ["node", "dist/apps/producer/main.js"]