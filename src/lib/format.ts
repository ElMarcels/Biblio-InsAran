import type { SuspensionUnit } from "./validation";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_TIME_FORMATTER.format(date);
}

/** "1 ejemplar" / "3 ejemplares" */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Días de retraso de una devolución, contados por días de calendario (cualquier
 * hora de más suma un día). 0 si se devolvió en plazo o sigue prestado.
 */
export function daysLate(
  dueAt: Date,
  returnedAt: Date | null | undefined,
): number {
  if (!returnedAt || returnedAt.getTime() <= dueAt.getTime()) return 0;
  const dayNumber = (value: Date) =>
    Math.floor(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) /
        DAY_MS,
    );
  return Math.max(1, dayNumber(returnedAt) - dayNumber(dueAt));
}

/**
 * Fecha centinela de una suspensión permanente: el personal puede sancionar a
 * un lector sin fecha de caducidad. Se guarda como fecha lejana (y no nula,
 * que significa "sin suspensión") para que todas las comprobaciones de
 * "suspensión vigente" sigan valiendo tal cual.
 */
export const PERMANENT_SUSPENSION_DATE = new Date("9999-12-31T23:59:59.999Z");

/** Duración de cada unidad de suspensión, en milisegundos. */
const SUSPENSION_UNIT_MS: Record<SuspensionUnit, number> = {
  minutos: 60 * 1000,
  horas: 60 * 60 * 1000,
  dias: 24 * 60 * 60 * 1000,
  semanas: 7 * 24 * 60 * 60 * 1000,
  meses: 0, // los meses se suman por calendario, no por milisegundos
};

/**
 * Fecha en la que termina una suspensión: suma una cantidad de tiempo (con su
 * unidad) a la fecha de partida. Los meses se suman por calendario para
 * respetar meses de distinta duración.
 */
export function addSuspensionDuration(
  from: Date,
  amount: number,
  unit: SuspensionUnit,
): Date {
  if (unit === "meses") {
    const months = new Date(from);
    months.setUTCMonth(months.getUTCMonth() + amount);
    return months;
  }
  return new Date(from.getTime() + amount * SUSPENSION_UNIT_MS[unit]);
}

/** ¿La fecha de suspensión representa una sanción permanente? */
export function isPermanentSuspension(value: Date | null | undefined): boolean {
  return value != null && value.getUTCFullYear() >= 9999;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
