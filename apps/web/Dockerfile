# Mock Bank web (Vite). Build context = mock-bank (pnpm monorepo root).
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
RUN apk add --no-cache python3 make g++
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mock-bank/types build
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_DEMO_PASSWORD=
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
RUN pnpm --filter @mock-bank/web build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
