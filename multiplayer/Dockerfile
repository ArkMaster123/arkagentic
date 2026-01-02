# ============================================
# ArkAgentic Multiplayer Server - Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose Colyseus port
EXPOSE 2567

# Run the server
CMD ["npm", "run", "start:prod"]
