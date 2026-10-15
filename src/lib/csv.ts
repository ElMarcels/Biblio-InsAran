// Utilidades para generar ficheros CSV (hojas de cálculo, informes).

/**
 * Convierte una tabla en texto CSV. Escapa comillas, comas y saltos de línea,
 * y añade la marca de orden de bytes (BOM) para que Excel abra bien los
 * acentos. Las filas se separan con CRLF, como recomienda el formato.
 */
export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
): string {
  const escape = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? "" : String(value);
    if (/["\,\n\r;]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const body = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  return `\uFEFF${body}\r\n`;
}

/** Cabeceras para que el navegador descargue el CSV con un nombre concreto. */
export function csvHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
