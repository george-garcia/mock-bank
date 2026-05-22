FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build packages
RUN pnpm --filter @mock-bank/database build
RUN pnpm --filter @mock-bank/types build
RUN pnpm --filter @mock-bank/api build

EXPOSE 3000

CMD ["pnpm", "--filter", "@mock-bank/api", "start:prod"]
