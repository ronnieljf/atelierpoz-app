import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ocultar el indicador de desarrollo de Next.js
  devIndicators: false,
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
      // Si tu R2_PUBLIC_URL cambia en producción, agrega el nuevo hostname aquí
      // Ejemplo para producción:
      // {
      //   protocol: 'https',
      //   hostname: 'tu-nuevo-hostname.r2.dev',
      // },
    ],
  },
};

export default nextConfig;
