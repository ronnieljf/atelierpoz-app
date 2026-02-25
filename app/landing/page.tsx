'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Package,
  Receipt,
  Bell,
  BarChart3,
  Store,
  Users,
  ShoppingCart,
  Mail,
  ArrowRight,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

export default function LandingPage() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });

  const features = [
    { icon: Package, title: 'Catálogo de productos', desc: 'Fotos, precios, stock y variantes. Todo organizado.' },
    { icon: Receipt, title: 'Cuentas por cobrar', desc: 'Registra lo que te deben, los abonos y el estado de cada cuenta.' },
    { icon: Bell, title: 'Recordatorios por WhatsApp', desc: 'Avisos automáticos cuando una cuenta requiere seguimiento.' },
    { icon: BarChart3, title: 'Reportes', desc: 'Ventas, productos más vendidos, lo que no se movió y más.' },
    { icon: Store, title: 'Una o varias tiendas', desc: 'Gestiona múltiples marcas o locales desde un solo lugar.' },
    { icon: Users, title: 'Clientes y proveedores', desc: 'Tu libreta de contactos integrada al negocio.' },
  ];

  const audiences = [
    { icon: ShoppingCart, title: 'Negocio pequeño', desc: 'Un solo local, catálogo, ventas y recordatorios de cobro por WhatsApp. Empieza sin complicarte.' },
    { icon: Store, title: 'Negocio mediano', desc: 'Varias tiendas o marcas, más usuarios, reportes completos y mejor control.' },
    { icon: Package, title: 'Distribuidora', desc: 'Muchos productos y marcas, varios usuarios, reportes por marca y soporte prioritario.' },
  ];

  const benefits = [
    'Todo en un solo lugar: productos, ventas, cobranzas y reportes.',
    'Recordatorios por WhatsApp configurados a tu medida.',
    'Funciona en celular y computadora.',
    'Varias tiendas o marcas con un solo acceso.',
    'Reportes para tomar mejores decisiones.',
    'Plan gratis para probar sin compromiso.',
  ];

  return (
    <div className="overflow-x-hidden relative">
      {/* Fondo global: grid + dots */}
      <div className="fixed inset-0 landing-grid-pattern landing-dots-pattern pointer-events-none z-0" aria-hidden />
      <div className="fixed inset-0 bg-gradient-to-b from-neutral-950/80 via-transparent to-neutral-950/90 pointer-events-none z-0" aria-hidden />

      {/* Hero - Impacto máximo */}
      <section
        ref={heroRef}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 py-24 sm:py-32"
      >
        {/* Orbes animados de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] bg-primary-500/25"
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full blur-[100px] bg-secondary-500/20"
            animate={{
              x: [0, -30, 25, 0],
              y: [0, 25, -15, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[200px] h-[200px] rounded-full blur-[80px] bg-primary-400/15 -translate-x-1/2 -translate-y-1/2"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm font-medium uppercase tracking-[0.2em] mb-10 shadow-lg shadow-primary-500/10"
          >
            <Sparkles className="h-4 w-4" />
            Plataforma para tu negocio
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight text-white mb-6 leading-[1.1]"
          >
            <span className="block">Lleva tu negocio</span>
            <span className="block mt-2 landing-text-shine">
              al siguiente nivel
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg sm:text-xl text-neutral-400 font-light max-w-2xl mx-auto mb-14 leading-relaxed"
          >
            Productos, ventas, cuentas por cobrar, recordatorios por WhatsApp y reportes.{' '}
            <span className="text-primary-300/90">Todo en un solo lugar</span>, desde tu celular o computadora.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              href="#contacto"
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 border border-primary-400/20"
            >
              Contáctanos
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroInView ? { opacity: 1 } : {}}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 rounded-full border-2 border-neutral-600 flex justify-center pt-2"
            >
              <motion.div className="w-1 h-2 rounded-full bg-primary-500" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Qué hace */}
      <section className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="inline-flex items-center gap-2 text-primary-400 text-sm font-medium uppercase tracking-wider mb-4">
            <Zap className="h-4 w-4" />
            ¿Qué hace Atelier Poz?
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">
            Una herramienta completa
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Para gestionar tu negocio sin complicaciones.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              custom={i}
              whileHover="hover"
              initial="rest"
              className="group relative p-8 rounded-2xl border border-neutral-800/60 bg-neutral-900/50 hover:bg-neutral-900/70 hover:border-primary-700/40 transition-colors overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-400 mb-5 group-hover:bg-primary-500/20 group-hover:scale-110 transition-all duration-300"
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Icon className="h-7 w-7" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
                <p className="text-neutral-400 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* A quién va dirigida */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">
              ¿Para quién es?
            </h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              Desde un emprendimiento hasta una distribuidora con varias marcas.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {audiences.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative text-center p-10 rounded-3xl bg-gradient-to-b from-primary-900/30 to-neutral-900/50 border border-primary-800/30 hover:border-primary-600/50 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/20 text-primary-400 mb-6 group-hover:bg-primary-500/30 transition-colors"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className="h-8 w-8" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="relative z-10 container mx-auto max-w-4xl px-4 sm:px-6 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-4">
            Beneficios
          </h2>
          <p className="text-neutral-400 text-lg">
            Lo que ganas al usar Atelier Poz.
          </p>
        </motion.div>

        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-4"
        >
          {benefits.map((item, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              custom={i}
              className="flex items-center gap-4 p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/40 hover:border-primary-800/40 hover:bg-neutral-900/70 transition-all duration-300 group"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400 group-hover:bg-primary-500/30 group-hover:scale-110 transition-all">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="text-neutral-300 group-hover:text-white transition-colors">{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* Contacto - Sección impactante */}
      <section
        id="contacto"
        className="relative z-10 border-t border-neutral-800/60 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/20 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-24 sm:py-32 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="relative p-12 sm:p-16 rounded-3xl border-2 border-primary-500/30 bg-gradient-to-br from-primary-950/40 via-neutral-900/80 to-primary-950/40 shadow-2xl shadow-primary-500/10"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/5 via-transparent to-secondary-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-light text-white mb-4"
            >
              ¿Te interesa?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-neutral-400 text-lg mb-10"
            >
              Escríbenos y te contamos cómo puede ayudarte Atelier Poz.
            </motion.p>
            <motion.a
              href="mailto:ronnieljf@gmail.com"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 sm:gap-4 px-4 py-4 sm:px-10 sm:py-5 w-full max-w-full sm:w-auto rounded-2xl bg-primary-500/15 border-2 border-primary-500/40 hover:bg-primary-500/25 hover:border-primary-400/60 text-primary-300 transition-all duration-300 group shadow-lg shadow-primary-500/20 min-w-0"
            >
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-base sm:text-xl font-semibold min-w-0 break-all sm:break-normal">ronnieljf@gmail.com</span>
            </motion.a>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-sm text-primary-400/80 mt-6 font-medium"
            >
              Responde en menos de 24 horas
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 pb-24">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-neutral-400 hover:text-primary-400 transition-colors text-base font-light"
            >
              Ver tiendas en la plataforma
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
