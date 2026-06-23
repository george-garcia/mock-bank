# Mock Bank admin (Vite). Build context = mock-bank (pnpm monorepo root).
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mock-bank/types build
ARG VITE_ADMIN_API_URL=http://localhost:4001/api
ENV VITE_ADMIN_API_URL=$VITE_ADMIN_API_URL
RUN pnpm --filter @mock-bank/admin build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
