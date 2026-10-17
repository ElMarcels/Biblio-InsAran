import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { generateReaderCardPdf } from "@/lib/reader-card-pdf";
import { slugify } from "@/lib/validation";

type Params = Promise<{ id: string }>;

/**
 * Descarga el carné de un lector/a en PDF (con QR y código de barras).
 * Requiere sesión: cualquier cuenta del panel puede generarlo.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const reader = await prisma.reader.findUnique({ where: { id } });
  if (!reader) {
    return new Response("No encontrado", { status: 404 });
  }

  const t = await getT();
  const pdf = await generateReaderCardPdf({
    fullName: reader.fullName,
    groupName: reader.groupName,
    cardNumber: reader.cardNumber,
    labels: {
      title: t("panel.readers.carneDeBiblioteca"),
      group: t("panel.readers.carneGrupoEtiqueta"),
      number: t("panel.readers.carneNumeroEtiqueta"),
      noNumber: t("panel.readers.carneSinNumero"),
    },
  });

  const name = reader.cardNumber
    ? reader.cardNumber.toLocaleLowerCase("es")
    : slugify(reader.fullName) || "lector";

  // Copiamos en un `ArrayBuffer` propio: es el tipo que acepta `Response`.
  const body = new Uint8Array(pdf);

  return new Response(body.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carnet-${name}.pdf"`,
    },
  });
}
