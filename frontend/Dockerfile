# Frontend image — Next.js 16 dev server on port 3000.
#
# Hot-reload works via bind mount of the frontend/ directory at runtime.

FROM node:20-slim

# System deps for some npm packages (sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Source code gets bind-mounted at runtime.

EXPOSE 3000

# Bind to 0.0.0.0 so the host can reach it.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
