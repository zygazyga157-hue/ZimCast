FROM node:18

WORKDIR /app

# Use a lockfile-generated dependency tree (regenerate in WSL on Windows hosts)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional

# Copy app source and build
COPY . .
RUN npx prisma generate || true
RUN npm run build || true

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
