import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ocultar el indicador de desarrollo de Next.js
  devIndicators: false,
  // Nota: optimizePackageImports en experimental ralentiza mucho el dev server; usar solo en producción si hace falta
  // Proxy de todo /api/* al backend (descomentar y usar backendOrigin si se usa rewrites)
  // const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
  // async rewrites() {
  //   return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }];
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'pub-f8968a35b43a43799c31c2ba7be6cfb1.r2.dev',
      },
      /* URLs firmadas de R2 (cuando R2_PUBLIC_URL no está configurado) */
      {
        protocol: 'https',
        hostname: '054bdc8d8d0adab1c53fc077061dac39.r2.cloudflarestorage.com',
      },
      // Si tu R2 usa otro host (otro endpoint), agrégalo aquí
      // Ejemplo para producción:
      // {
      //   protocol: 'https',
      //   hostname: 'tu-nuevo-hostname.r2.dev',
      // },
    ],
  },
};

export default nextConfig;
