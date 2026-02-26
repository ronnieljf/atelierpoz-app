import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Para tu negocio | Atelier Poz',
  description:
    'Herramienta para gestionar tu negocio: productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes. Para emprendedores, negocios pequeños, medianos y distribuidoras.',
  openGraph: {
    title: 'Para tu negocio | Atelier Poz',
    description:
      'Gestiona tu negocio sin complicarte: productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes. Todo en un solo lugar.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
