import "server-only";

import bwipjs from "bwip-js/node";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { SITE_INSTITUTION, SITE_SHORT } from "./constants";

// ---------------------------------------------------------------------------
// Carné de lector en PDF
//
// Dibuja, sobre una hoja A4, una tarjeta del tamaño de un carné bancario
// (85,6 × 54 mm) con el nombre del lector, su grupo, el número de carné y los
// códigos QR y de barras (ambos con el número). Se genera en el servidor con
// pdf-lib y se descarga directamente.
// ---------------------------------------------------------------------------

/** Un milímetro, en puntos PDF (unidad por defecto de pdf-lib). */
const MM = 72 / 25.4;

/** Medidas de la tarjeta (tarjeta ISO/IEC 7810 ID-1, como un carné). */
const CARD_WIDTH = 85.6 * MM;
const CARD_HEIGHT = 54 * MM;

/** Hoja A4 vertical. */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const INK = rgb(0x0e / 255, 0x0e / 255, 0x11 / 255);
const INK_SOFT = rgb(0x45 / 255, 0x45 / 255, 0x4e / 255);
const ACCENT = rgb(0xe0 / 255, 0x40 / 255, 0x1d / 255);
const WHITE = rgb(1, 1, 1);

export type ReaderCardPdfData = {
  fullName: string;
  groupName: string | null;
  cardNumber: string | null;
  /** Textos traducidos que aparecen impresos en la tarjeta. */
  labels: {
    title: string;
    group: string;
    number: string;
    noNumber: string;
  };
};

/**
 * Descarta los caracteres que las fuentes estándar de PDF (WinAnsi/Latin-1) no
 * pueden representar, para que `drawText` nunca falle. Los nombres en catalán,
 * castellano, francés u occitano se conservan íntegros.
 */
function sanitize(value: string): string {
  return value
    .normalize("NFC")
    .replace(
      /[^\u0000-\u00FF\u20AC\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ajusta un texto a un ancho máximo: primero reduce el cuerpo y, si aun así no
 * cabe, recorta con puntos suspensivos.
 */
function fitText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  startSize: number,
  minSize = 6,
): { text: string; size: number } {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };

  let trimmed = text;
  while (trimmed.length > 1 && font.widthOfTextAtSize(`${trimmed}…`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return { text: `${trimmed}…`, size };
}

/** Genera el PDF del carné y devuelve sus bytes. */
export async function generateReaderCardPdf(
  data: ReaderCardPdfData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Carné · ${sanitize(data.fullName)}`);
  pdf.setAuthor(SITE_INSTITUTION);
  pdf.setSubject(sanitize(data.labels.title));
  pdf.setCreator(SITE_SHORT);

  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  // Tarjeta centrada en la hoja.
  const x = (A4_WIDTH - CARD_WIDTH) / 2;
  const y = (A4_HEIGHT - CARD_HEIGHT) / 2;
  const top = y + CARD_HEIGHT;

  // Fondo y marco.
  page.drawRectangle({
    x,
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    color: WHITE,
    borderColor: INK,
    borderWidth: 1.5,
  });

  // Franja superior con el nombre del centro.
  const bandHeight = 22;
  page.drawRectangle({
    x: x + 1,
    y: top - bandHeight - 0.5,
    width: CARD_WIDTH - 2,
    height: bandHeight,
    color: ACCENT,
  });
  page.drawText(
    sanitize(`${SITE_SHORT} · ${SITE_INSTITUTION}`).toLocaleUpperCase("es"),
    { x: x + 10, y: top - 14.5, size: 7.5, font: bold, color: WHITE },
  );

  const code = sanitize(data.cardNumber ?? "");
  const hasCode = code.length > 0;

  // Cabecera y datos de la persona.
  page.drawText(sanitize(data.labels.title).toLocaleUpperCase("es"), {
    x: x + 10,
    y: top - 36,
    size: 6,
    font: bold,
    color: ACCENT,
  });

  const maxTextWidth = CARD_WIDTH - 74;
  const name = fitText(sanitize(data.fullName), bold, maxTextWidth, 10.5);
  page.drawText(name.text, {
    x: x + 10,
    y: top - 52,
    size: name.size,
    font: bold,
    color: INK,
  });

  const group = sanitize(data.groupName ?? "");
  if (group) {
    const line = fitText(`${sanitize(data.labels.group)}: ${group}`, font, maxTextWidth, 7.5);
    page.drawText(line.text, {
      x: x + 10,
      y: top - 66,
      size: line.size,
      font,
      color: INK_SOFT,
    });
  }

  if (hasCode) {
    const numberLine = fitText(
      `${sanitize(data.labels.number)} ${code}`,
      mono,
      maxTextWidth,
      9,
    );
    page.drawText(numberLine.text, {
      x: x + 10,
      y: top - 82,
      size: numberLine.size,
      font: mono,
      color: INK,
    });

    // Código QR a la derecha (contiene el número de carné).
    const qrPng = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: code,
      scale: 4,
      // Zona de silencio alrededor del QR (unos 6 módulos).
      paddingwidth: 6,
      paddingheight: 6,
      backgroundcolor: "FFFFFF",
    });
    const qr = await pdf.embedPng(qrPng);
    const qrSize = 44;
    page.drawImage(qr, {
      x: x + CARD_WIDTH - 10 - qrSize,
      y: top - 74,
      width: qrSize,
      height: qrSize,
    });

    // Código de barras (Code 128) al pie. Sin texto incrustado: el número ya
    // aparece impreso arriba, y así los módulos quedan más anchos y se lee
    // mejor con el escáner.
    const barcodePng = await bwipjs.toBuffer({
      bcid: "code128",
      text: code,
      scale: 3,
      height: 10,
      // Zona de silencio a izquierda y derecha (unos 10 módulos).
      paddingwidth: 10,
      paddingheight: 2,
      backgroundcolor: "FFFFFF",
    });
    const barcode = await pdf.embedPng(barcodePng);

    const maxBarcodeWidth = CARD_WIDTH - 20;
    const maxBarcodeHeight = 54;
    let barcodeWidth = maxBarcodeWidth;
    let barcodeHeight = (barcode.height / barcode.width) * barcodeWidth;
    if (barcodeHeight > maxBarcodeHeight) {
      barcodeHeight = maxBarcodeHeight;
      barcodeWidth = (barcode.width / barcode.height) * barcodeHeight;
    }
    page.drawImage(barcode, {
      x: x + (CARD_WIDTH - barcodeWidth) / 2,
      y: y + 8,
      width: barcodeWidth,
      height: barcodeHeight,
    });
  } else {
    page.drawText(sanitize(data.labels.noNumber), {
      x: x + 10,
      y: top - 82,
      size: 8,
      font,
      color: INK_SOFT,
    });
  }

  return pdf.save();
}
