FROM oven/bun:canary-slim AS base

# Install Chromium for PDF generation (md-to-pdf → Puppeteer)
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium && \
    rm -rf /var/lib/apt/lists/*

ENV HOST=0.0.0.0
ENV PORT=3001
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY . /app
WORKDIR /app

ENV VITE_BACKEND_URL=""

RUN bun install && \
    cd /app/packages/ui && \
    bun run build

EXPOSE 3001/tcp
WORKDIR /app/packages/api
CMD ["bun", "run", "start"]
