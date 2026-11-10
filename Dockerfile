FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c
WORKDIR /demo
COPY --chown=node:node package.json ./
COPY --chown=node:node app ./app
COPY --chown=node:node fixtures ./fixtures
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=3000 INTERNAL_PORT=3001 CRM_FILE=/data/crm.json
EXPOSE 3000
CMD ["node", "app/server.mjs"]
