FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm
# Build toolchain for native modules (better-sqlite3 lives in the workspace).
RUN apk add --no-cache python3 make g++

# Copy the whole monorepo so every workspace member is present for the install.
COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @mock-bank/database build
RUN pnpm --filter @mock-bank/types build
RUN pnpm --filter @mock-bank/admin-api build

EXPOSE 4001

CMD ["pnpm", "--filter", "@mock-bank/admin-api", "start:prod"]
