import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  // Salida autocontenida para la imagen de Docker (ver Dockerfile).
  output: "standalone",
  // `bwip-js` (códigos de barras y QR de los carnés) trae builds separados para
  // navegador y Node. Se deja fuera del bundling del servidor para que se
  // resuelva la versión de Node con `require` nativo.
  serverExternalPackages: ["bwip-js"],
  // La aplicación es totalmente dinámica (sesión + base de datos en cada
  // petición), así que no habilitamos Cache Components / PPR: su "shell"
  // estático provoca que `redirect()` y `notFound()` se transmitan con estado
  // HTTP 200 en lugar de 307/404. Con el renderizado dinámico clásico los
  // códigos de estado son correctos.
  //
  // Tailwind CSS v4 se integra mediante PostCSS (ver postcss.config.mjs), que
  // es lo documentado para Next 16. No usamos el loader `@tailwindcss/turbopack`
  // en `turbopack.rules`: con el patrón "*.css" también procesaba el CSS
  // virtual de `next/font/google` y rompía su resolución en `next dev`
  // ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'").
  //
  // Las portadas de los libros se enlazan desde Open Library, así que hay que
  // autorizar ese host para el optimizador de imágenes (ver `src/lib/covers.ts`).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
      },
    ],
  },
};

export default nextConfig;
