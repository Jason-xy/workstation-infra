FROM node:20-alpine

WORKDIR /app
COPY codex-autoclaw-proxy.mjs /app/codex-autoclaw-proxy.mjs

# Install Codex CLI so the container can run `codex` directly.
RUN npm install -g @openai/codex

ENV NODE_ENV=production
EXPOSE 18801

CMD ["node", "codex-autoclaw-proxy.mjs"]
