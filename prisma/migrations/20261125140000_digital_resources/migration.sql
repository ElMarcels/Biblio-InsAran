-- Catálogo público de recursos digitales y aviso de novedades al personal.

CREATE TYPE "DigitalResourceType" AS ENUM ('AUDIOBOOK', 'PDF', 'EBOOK', 'LINK');

CREATE TABLE "DigitalResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "type" "DigitalResourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "DigitalResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DigitalResource_type_idx" ON "DigitalResource"("type");
CREATE INDEX "DigitalResource_createdAt_idx" ON "DigitalResource"("createdAt");

ALTER TABLE "DigitalResource"
ADD CONSTRAINT "DigitalResource_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Changelog" ("id", "title", "body", "createdAt")
VALUES (
    'digital-resources-20261125',
    'Nuevo espacio de recursos digitales / Nou espai de recursos digitals',
    E'**Español:** Ya puedes consultar audiolibros, lecturas en PDF y otros materiales en «Recursos digitales». El personal de biblioteca puede publicar y mantener los enlaces desde el panel.\n\n**Català:** Ja pots consultar audiollibres, lectures en PDF i altres materials a «Recursos digitals». El personal de la biblioteca pot publicar i mantenir els enllaços des del tauler.',
    CURRENT_TIMESTAMP
);