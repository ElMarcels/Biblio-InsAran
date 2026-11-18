-- Verificación en dos pasos (TOTP) para el personal y para «Mi biblioteca».

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorRecoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorPendingAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Reader"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorRecoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorPendingAt" TIMESTAMP(3),
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);
