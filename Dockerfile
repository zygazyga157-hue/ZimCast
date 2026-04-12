FROM node:20-alpine AS base
# Ensure a modern npm is available to properly honor omit/optional flags
RUN npm install -g npm@latest

# Install dependencies only when needed
FROM base AS deps
# Ensure npm skips optional/platform-specific packages (e.g. win32 swc) during container installs
ENV NPM_CONFIG_OPTIONAL=false
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Copy only package.json so we can generate a Linux-native lockfile inside the container
COPY package.json ./
# Generate a package-lock.json inside the Linux build container (avoids host-win32 artifacts)
RUN npm install --package-lock-only
# Install production deps using the generated lockfile and skip optional/platform-specific packages
RUN npm ci --omit=dev --omit=optional && cp -R node_modules /prod_node_modules
# Install full dependency tree for the builder (still skipping optional packages)
RUN npm ci --omit=optional

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /prod_node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src/lib ./src/lib

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "tsx", "server.ts"]
