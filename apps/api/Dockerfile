FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Build toolchain for native modules (better-sqlite3 lives in the workspace).
RUN apk add --no-cache python3 make g++

# Copy the whole monorepo so every workspace member is present for the install.
COPY . .

# Install all deps (incl. dev) across the workspace.
RUN pnpm install --frozen-lockfile

# Build internal packages, then the API.
RUN pnpm --filter @mock-bank/database build
RUN pnpm --filter @mock-bank/types build
RUN pnpm --filter @mock-bank/api build

EXPOSE 3000

CMD ["pnpm", "--filter", "@mock-bank/api", "start:prod"]
