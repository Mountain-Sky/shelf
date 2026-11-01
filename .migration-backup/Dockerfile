FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --no-fund --no-audit --fetch-timeout=20000 --fetch-retries=1
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS demo
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SHELF_ACCESS=private SHELF_HOST=0.0.0.0 SHELF_PORT=3000 SHELF_CATALOG_PORT=4310 SHELF_CATALOG_STATE=/data/catalog.json SHELF_INSPECTOR=0
COPY --from=build --chown=node:node /app /app
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["npm", "run", "demo:start"]
