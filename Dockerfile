# syntax=docker/dockerfile:1

# Imagen de la Biblioteca Institut d'Aran.
# Compilación en varias etapas: base -> dependencias -> compilación -> ejecución.
# La etapa `builder` también sirve para ejecutar migraciones (Prisma), ya que
# conserva el cliente, el esquema y la CLI.

ARG NODE_VERSION=22-alpine

# --------------------------------------------------------------------------
# Base común
# --------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# libc6-compat: la necesitan algunas dependencias de Next sobre Alpine.
# openssl: la requiere el motor de consultas de Prisma sobre Alpine.
RUN apk add --no-cache libc6-compat openssl

# --------------------------------------------------------------------------
# Dependencias
# --------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------------------
# Compilación
# --------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Genera el cliente y descarga el motor para la plataforma de la imagen (linux).
RUN npx prisma generate
RUN npm run build

# --------------------------------------------------------------------------
# Ejecución
# --------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Servidor autocontenido generado por Next (`output: "standalone"`).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: nos aseguramos de incluir el motor y el cliente completos.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

# Comprobación de salud: la portada responde correctamente.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
