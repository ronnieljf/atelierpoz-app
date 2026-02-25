import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Para tu negocio | Atelier Poz',
  description:
    'Herramienta para gestionar tu negocio: productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes. Para negocios pequeños, medianos y distribuidoras.',
  openGraph: {
    title: 'Para tu negocio | Atelier Poz',
    description:
      'Herramienta para gestionar tu negocio: productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes.',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
