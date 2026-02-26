'use client';

import Link from 'next/link';
import {
  Package,
  Receipt,
  Bell,
  BarChart3,
  Store,
  Users,
  Mail,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    { icon: Package, title: 'Catálogo de productos', desc: 'Fotos, precios, stock y variantes. Todo organizado en un solo lugar.' },
    { icon: Receipt, title: 'Cuentas por cobrar', desc: 'Registra lo que te deben, los abonos y el estado de cada cuenta. Recordatorios automáticos por WhatsApp.' },
    { icon: Bell, title: 'Recordatorios por WhatsApp', desc: 'Avisos automáticos cuando una cuenta requiere seguimiento. Configúralos a tu medida.' },
    { icon: BarChart3, title: 'Reportes y ventas', desc: 'Ventas, productos más vendidos, lo que no se movió. Decisiones basadas en datos.' },
    { icon: Store, title: 'Una o varias tiendas', desc: 'Gestiona múltiples marcas o locales desde un solo acceso.' },
    { icon: Users, title: 'Clientes y proveedores', desc: 'Tu libreta de contactos integrada al negocio.' },
  ];

  const audiences = [
    { title: 'Emprendedor / Negocio pequeño', desc: 'Un solo local. Catálogo, ventas y recordatorios de cobro por WhatsApp. Empieza sin complicarte.' },
    { title: 'Negocio mediano', desc: 'Varias tiendas o marcas. Más usuarios, reportes completos y mejor control de inventario y cobranzas.' },
    { title: 'Distribuidor', desc: 'Muchos productos y marcas. Varios usuarios, reportes por tienda y soporte prioritario.' },
  ];

  const benefits = [
    'Todo en un solo lugar: productos, ventas, cuentas por cobrar y reportes.',
    'Deja de perseguir pagos: recordatorios automáticos por WhatsApp.',
    'Funciona en celular y computadora. Usa donde estés.',
    'Varias tiendas o marcas con un solo acceso.',
    'Reportes claros para tomar mejores decisiones.',
    'Plan gratis para probar sin compromiso.',
  ];

  const painPoints = [
    '¿Se te pierden los pedidos entre WhatsApp e Instagram?',
    '¿Pasas horas escribiendo «¿me pagas?» a tus clientes?',
    '¿Llevas quién te debe en la cabeza o en notas sueltas?',
  ];

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-neutral-950 pointer-events-none z-0" aria-hidden />

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-400 text-sm font-medium uppercase tracking-wider mb-4">
            Plataforma para emprendedores y pequeñas tiendas
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white mb-5 leading-tight">
            Gestiona tu negocio
            <br />
            <span className="text-primary-400">sin complicarte</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes. Todo en un solo lugar, desde tu celular o computadora.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold text-base"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#contacto"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-neutral-600 text-neutral-300 font-medium text-base"
            >
              Contáctanos
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es Atelier Poz */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            Qué es Atelier Poz
          </h2>
          <p className="text-neutral-400 leading-relaxed text-center">
            Plataforma para que emprendedores y pequeñas tiendas gestionen su negocio en un solo lugar: catálogo de productos, ventas, cuentas por cobrar con recordatorios automáticos por WhatsApp y reportes. Sin complicaciones, desde el celular o la computadora.
          </p>
        </div>
      </section>

      {/* Problemas que resolvemos */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-light text-white mb-6 text-center">
            ¿Te suena familiar?
          </h2>
          <ul className="space-y-3">
            {painPoints.map((item, i) => (
              <li key={i} className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/40">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-sm mt-0.5">?</span>
                <span className="text-neutral-300">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-primary-400 font-medium mt-6">
            Atelier Poz te ayuda a organizar todo eso.
          </p>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-light text-white mb-2 text-center">
            Casos de uso
          </h2>
          <p className="text-neutral-400 text-center mb-10">
            Situaciones de todos los días que ya no tienen que ser un drama.
          </p>
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">Las 11 de la noche y el cliente que «mañana te pago»</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Llevas semanas con la misma conversación: «¿Me pasas el total?», «Sí, mañana te deposito», y al día siguiente… silencio. Revuelves chats de WhatsApp, notas en el celular y una hoja con números que ya no sabes si están al día. Con Atelier Poz registras la cuenta por cobrar, ves quién debe y desde cuándo, y los recordatorios salen solos por WhatsApp. Tú solo revisas; el sistema hace el recordatorio incómodo por ti.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">El pedido que se perdió entre historias, DMs y un «te escribo por aquí»</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Un cliente pide por Instagram, otro confirma por WhatsApp y un tercero dice que te escribió por Facebook. Al final no sabes qué quedó pendiente, qué precio ofreciste ni si tenías ese producto. Todo queda en capturas y esperanza. Con un catálogo en línea y pedidos organizados en un solo lugar, cada pedido tiene su lugar, su monto y su estado. Nada se pierde en el limbo de las redes.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">El cierre de mes: «¿en qué se fue la plata?»</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Llega fin de mes y toca cuadrar. Ventas que anotaste en un lado, pagos que te hicieron en otro, y lo que «te deben» repartido entre memoria y promesas. No hay forma de saber si el número de la libreta es real o un sueño. Con reportes de ventas, cuentas por cobrar y pagos recibidos en un solo sitio, ves en segundos qué vendiste, qué te han pagado y qué sigue pendiente. Sin adivinar, sin drama.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-light text-white mb-2">
              Una herramienta completa
            </h2>
            <p className="text-neutral-400">
              Para gestionar tu negocio sin complicaciones.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A quién va dirigida */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-light text-white mb-2">
              ¿Para quién es?
            </h2>
            <p className="text-neutral-400">
              Desde un emprendimiento hasta una distribuidora con varias marcas.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {audiences.map(({ title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/40"
              >
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-light text-white mb-2">
              Beneficios
            </h2>
            <p className="text-neutral-400">
              Lo que ganas al usar Atelier Poz.
            </p>
          </div>
          <ul className="space-y-2">
            {benefits.map((item, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/40">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-neutral-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-12 text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            ¿Te interesa?
          </h2>
          <p className="text-neutral-400 mb-6">
            Escríbenos y te contamos cómo puede ayudarte Atelier Poz.
          </p>
          <a
            href="mailto:ronnieljf@gmail.com"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-500/15 border border-primary-500/40 text-primary-300 font-semibold"
          >
            <Mail className="h-5 w-5" />
            ronnieljf@gmail.com
          </a>
          <p className="text-sm text-neutral-500 mt-3">
            Responde en menos de 24 horas
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 pb-16 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-400 font-medium"
          >
            Ver tiendas en la plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
