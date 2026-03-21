# Build stage
FROM oven/bun:canary-slim AS builder

COPY . /app
WORKDIR /app

ENV VITE_BACKEND_URL=""

RUN bun install && \
    cd /app/packages/ui && \
    bun run build

# Runtime stage
FROM oven/bun:canary-slim

# Install Chromium for PDF generation (md-to-pdf → Puppeteer)
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium && \
    rm -rf /var/lib/apt/lists/*

ENV HOST=0.0.0.0
ENV PORT=3001
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy only what's needed for runtime
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/bun.lock /app/bun.lock
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/api /app/packages/api
COPY --from=builder /app/packages/services /app/packages/services
COPY --from=builder /app/packages/db /app/packages/db
COPY --from=builder /app/packages/config /app/packages/config
COPY --from=builder /app/packages/reporting /app/packages/reporting
COPY --from=builder /app/packages/ui/dist /app/packages/ui/dist
COPY --from=builder /app/packages/ui/package.json /app/packages/ui/package.json

EXPOSE 3001/tcp
WORKDIR /app/packages/api
CMD ["bun", "run", "start"]
