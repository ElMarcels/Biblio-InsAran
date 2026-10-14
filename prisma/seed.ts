import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Cuentas iniciales de la plataforma.
 * Las contraseñas se guardan siempre hasheadas (nunca en texto plano).
 */
const OWNER = {
  username: "biblio-owner",
  password: "InstiBiblio2026",
  displayName: "Dirección de la biblioteca",
};

const SAMPLE_EDITOR = {
  username: "ana.biblioteca",
  password: "BiblioEditor2026",
  displayName: "Ana Ruiz (bibliotecaria)",
};

type SeedBook = {
  title: string;
  author: string;
  category: string;
  year?: number;
  publisher?: string;
  isbn?: string;
  pages?: number;
  language?: string;
  copies?: number;
  location?: string;
  description?: string;
};

/** Materias libres de cada libro de ejemplo (clave: título). */
const BOOK_TAGS: Record<string, string[]> = {
  "Cien años de soledad": ["Realismo mágico", "Clásicos", "Novela"],
  "El Quijote de la Mancha": ["Clásicos", "Aventuras", "Novela"],
  "La casa de Bernarda Alba": ["Teatro", "Clásicos", "Lectura obligatoria"],
  "Veinte poemas de amor y una canción desesperada": ["Poesía", "Amor"],
  "Breve historia del tiempo": ["Divulgación científica", "Física"],
  "El mundo de Sofía": ["Filosofía", "Novela", "Lectura obligatoria"],
  "Sapiens: de animales a dioses": ["Historia", "Divulgación científica"],
  "Martín Fierro": ["Poesía", "Clásicos"],
  "Álgebra de Baldor": ["Matemáticas", "Manuales"],
  "El principito": ["Infantil", "Clásicos"],
  "Ciencia de datos desde cero": ["Tecnología", "Programación"],
  "Diccionario de la lengua española": ["Referencia", "Diccionarios"],
};

/** Lectores de ejemplo para poder probar los préstamos. */
const READERS = [
  { cardNumber: "ALU-001", fullName: "Marta Solé", groupName: "2n ESO A" },
  { cardNumber: "ALU-002", fullName: "Joan Peret", groupName: "3r ESO B" },
  { cardNumber: "PROF-01", fullName: "Miquel Aunós", groupName: "Departament de Ciències" },
];

const BOOKS: SeedBook[] = [
  {
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
    category: "Narrativa",
    year: 1967,
    publisher: "Sudamericana",
    isbn: "978-84-376-0494-7",
    pages: 471,
    copies: 4,
    location: "N-01",
    description:
      "La saga de la familia Buendía en el mítico pueblo de Macondo, obra cumbre del realismo mágico hispanoamericano.",
  },
  {
    title: "El Quijote de la Mancha",
    author: "Miguel de Cervantes",
    category: "Narrativa",
    year: 1605,
    publisher: "Espasa",
    isbn: "978-84-670-3700-6",
    pages: 864,
    copies: 5,
    location: "N-02",
    description:
      "Las aventuras de Alonso Quijano y su escudero Sancho Panza: la novela fundacional de la literatura moderna.",
  },
  {
    title: "La casa de Bernarda Alba",
    author: "Federico García Lorca",
    category: "Teatro",
    year: 1936,
    publisher: "Cátedra",
    isbn: "978-84-376-0452-7",
    pages: 152,
    copies: 3,
    location: "T-01",
    description:
      "Drama rural sobre el luto, la autoridad y el deseo contenido en la España profunda.",
  },
  {
    title: "Veinte poemas de amor y una canción desesperada",
    author: "Pablo Neruda",
    category: "Poesía",
    year: 1924,
    publisher: "Losada",
    isbn: "978-84-376-1694-9",
    pages: 96,
    copies: 2,
    location: "P-01",
    description:
      "Una de las obras poéticas más leídas del siglo XX, donde el amor y la pérdida se vuelven paisaje.",
  },
  {
    title: "Breve historia del tiempo",
    author: "Stephen Hawking",
    category: "Ciencias",
    year: 1988,
    publisher: "Crítica",
    isbn: "978-84-8432-917-8",
    pages: 256,
    copies: 3,
    location: "C-04",
    description:
      "Una introducción accesible al origen del universo, los agujeros negros y la naturaleza del tiempo.",
  },
  {
    title: "El mundo de Sofía",
    author: "Jostein Gaarder",
    category: "Filosofía",
    year: 1991,
    publisher: "Siruela",
    isbn: "978-84-7844-815-0",
    pages: 640,
    copies: 4,
    location: "F-02",
    description:
      "Novela de iniciación que recorre la historia de la filosofía occidental desde los presocráticos hasta el presente.",
  },
  {
    title: "Sapiens: de animales a dioses",
    author: "Yuval Noah Harari",
    category: "Historia",
    year: 2014,
    publisher: "Debate",
    isbn: "978-84-9992-622-3",
    pages: 496,
    copies: 3,
    location: "H-07",
    description:
      "Una breve historia de la humanidad, desde las primeras especies humanas hasta las revoluciones científicas.",
  },
  {
    title: "Martín Fierro",
    author: "José Hernández",
    category: "Poesía",
    year: 1872,
    publisher: "Losada",
    isbn: "978-950-03-9489-5",
    pages: 240,
    copies: 2,
    location: "P-03",
    description:
      "Poema narrativo gauchesco que se convirtió en texto fundacional de la literatura argentina.",
  },
  {
    title: "Álgebra de Baldor",
    author: "Aurelio Baldor",
    category: "Matemáticas",
    year: 1941,
    publisher: "Patria",
    isbn: "978-607-744-040-5",
    pages: 576,
    copies: 6,
    location: "M-01",
    description:
      "Manual clásico de álgebra elemental, con más de seis mil ejercicios y problemas resueltos.",
  },
  {
    title: "El principito",
    author: "Antoine de Saint-Exupéry",
    category: "Infantil y juvenil",
    year: 1943,
    publisher: "Salamandra",
    isbn: "978-84-9838-261-4",
    pages: 96,
    copies: 8,
    location: "J-01",
    description:
      "Un aviador perdido en el desierto conoce a un pequeño príncipe que le enseña a mirar con el corazón.",
  },
  {
    title: "Ciencia de datos desde cero",
    author: "Joel Grus",
    category: "Tecnología",
    year: 2016,
    publisher: "O'Reilly",
    isbn: "978-1-491-90194-6",
    pages: 384,
    copies: 2,
    location: "CMP-03",
    description:
      "Fundamentos de Python aplicados a la limpieza, el análisis y la visualización de datos.",
  },
  {
    title: "Diccionario de la lengua española",
    author: "Real Academia Española",
    category: "Referencia",
    year: 2014,
    publisher: "Espasa",
    isbn: "978-84-670-4189-7",
    pages: 2432,
    copies: 4,
    location: "REF-01",
    description:
      "Edición del diccionario académico de consulta obligada en la biblioteca escolar.",
  },
];

async function main() {
  console.log("Sembrando la base de datos…");

  const ownerHash = await bcrypt.hash(OWNER.password, 12);
  const owner = await prisma.user.upsert({
    where: { username: OWNER.username },
    update: {
      displayName: OWNER.displayName,
      role: Role.OWNER,
      active: true,
      // No se reescribe la contraseña: si ya se cambió, volver a sembrar no
      // debe restablecerla a la de por defecto.
    },
    create: {
      username: OWNER.username,
      displayName: OWNER.displayName,
      passwordHash: ownerHash,
      role: Role.OWNER,
      active: true,
    },
  });
  console.log(`  ✓ Cuenta de dueño lista: ${OWNER.username}`);

  const editorHash = await bcrypt.hash(SAMPLE_EDITOR.password, 12);
  await prisma.user.upsert({
    where: { username: SAMPLE_EDITOR.username },
    update: { displayName: SAMPLE_EDITOR.displayName, role: Role.EDITOR, active: true },
    create: {
      username: SAMPLE_EDITOR.username,
      displayName: SAMPLE_EDITOR.displayName,
      passwordHash: editorHash,
      role: Role.EDITOR,
      active: true,
      createdById: owner.id,
    },
  });
  console.log(`  ✓ Cuenta de ejemplo lista: ${SAMPLE_EDITOR.username}`);

  const existingBooks = await prisma.book.count();
  if (existingBooks === 0) {
    const books = BOOKS.map((book) => ({
      title: book.title,
      author: book.author,
      category: book.category,
      year: book.year ?? null,
      publisher: book.publisher ?? null,
      isbn: book.isbn ?? null,
      pages: book.pages ?? null,
      language: book.language ?? "Español",
      copies: book.copies ?? 1,
      location: book.location ?? null,
      description: book.description ?? null,
      tags: BOOK_TAGS[book.title] ?? [],
      createdById: owner.id,
      updatedById: owner.id,
    }));
    await prisma.book.createMany({ data: books });
    await prisma.auditLog.createMany({
      data: books.map((book) => ({
        action: "BOOK_CREATE",
        entityType: "Book",
        entityId: null,
        summary: `Libro «${book.title}» importado durante la instalación inicial`,
        userId: owner.id,
      })),
    });
    console.log(`  ✓ ${books.length} libros de ejemplo añadidos`);
  } else {
    console.log(`  · Ya había ${existingBooks} libros; no se añade ninguno`);
  }

  const existingReaders = await prisma.reader.count();
  if (existingReaders === 0) {
    for (const reader of READERS) {
      await prisma.reader.create({ data: reader });
    }

    const people = await prisma.reader.findMany({ orderBy: { fullName: "asc" } });
    const titles = [
      "Cien años de soledad",
      "El mundo de Sofía",
      "Breve historia del tiempo",
    ];
    const loaned = await prisma.book.findMany({
      where: { title: { in: titles } },
      orderBy: { title: "asc" },
    });

    const day = 1000 * 60 * 60 * 24;
    const plans: Array<{ readerIndex: number; bookIndex: number; offset: number }> = [
      { readerIndex: 0, bookIndex: 0, offset: 10 },
      { readerIndex: 1, bookIndex: 1, offset: -4 },
    ];

    let created = 0;
    for (const plan of plans) {
      const person = people[plan.readerIndex];
      const book = loaned[plan.bookIndex];
      if (!person || !book) continue;
      const loan = await prisma.loan.create({
        data: {
          bookId: book.id,
          readerId: person.id,
          dueAt: new Date(Date.now() + plan.offset * day),
          createdById: owner.id,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "LOAN_CREATE",
          entityType: "Loan",
          entityId: loan.id,
          summary: `Prestado «${book.title}» a ${person.fullName}`,
          userId: owner.id,
        },
      });
      created += 1;
    }

    const reservationBook = loaned[2];
    const reservationPerson = people[2];
    if (reservationBook && reservationPerson) {
      await prisma.reservation.create({
        data: {
          bookId: reservationBook.id,
          readerId: reservationPerson.id,
          createdById: owner.id,
        },
      });
    }

    console.log(
      `  ✓ ${READERS.length} lectores y ${created} préstamos de ejemplo añadidos`,
    );
  } else {
    console.log(`  · Ya había ${existingReaders} lectores; no se añade ninguno`);
  }

  console.log("Listo.");
}

main()
  .catch((error) => {
    console.error("Error al sembrar la base de datos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
