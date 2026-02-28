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
import { useLocaleContext } from '@/lib/context/LocaleContext';
import { getDictionary } from '@/lib/i18n/dictionary';

const FEATURE_ICONS = [Package, Receipt, Bell, BarChart3, Store, Users];

export default function LandingPage() {
  const locale = useLocaleContext();
  const dict = getDictionary(locale);
  const { landing } = dict;
  const features = landing.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }));
  const audiences = landing.audiences;
  const benefits = landing.benefitsList;
  const painPoints = landing.painPoints;

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-neutral-950 pointer-events-none z-0" aria-hidden />

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-400 text-sm font-medium uppercase tracking-wider mb-4">
            {landing.subtitle}
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white mb-5 leading-tight">
            {landing.heroTitle}
            <br />
            <span className="text-primary-400">{landing.heroHighlight}</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {landing.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-500 text-white font-semibold text-base"
            >
              {landing.createAccountFree}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#contacto"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-neutral-600 text-neutral-300 font-medium text-base"
            >
              {landing.contactUs}
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es Atelier Poz */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            {landing.whatIs}
          </h2>
          <p className="text-neutral-400 leading-relaxed text-center">
            {landing.whatIsDesc}
          </p>
        </div>
      </section>

      {/* Problemas que resolvemos */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-light text-white mb-6 text-center">
            {landing.soundsFamiliar}
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
            {landing.helpsOrganize}
          </p>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="relative z-10 border-t border-neutral-800/60">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-light text-white mb-2 text-center">
            {landing.useCases}
          </h2>
          <p className="text-neutral-400 text-center mb-10">
            {landing.useCasesSub}
          </p>
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">{landing.useCase1Title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {landing.useCase1Desc}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">{landing.useCase2Title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {landing.useCase2Desc}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-neutral-800/60 bg-neutral-900/50">
              <h3 className="text-base font-semibold text-white mb-2">{landing.useCase3Title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {landing.useCase3Desc}
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
              {landing.completeTool}
            </h2>
            <p className="text-neutral-400">
              {landing.completeToolSub}
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
              {landing.forWho}
            </h2>
            <p className="text-neutral-400">
              {landing.forWhoSub}
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
              {landing.benefits}
            </h2>
            <p className="text-neutral-400">
              {landing.benefitsSub}
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
            {landing.interested}
          </h2>
          <p className="text-neutral-400 mb-6">
            {landing.interestedDesc}
          </p>
          <a
            href="mailto:ronnieljf@gmail.com"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-500/15 border border-primary-500/40 text-primary-300 font-semibold"
          >
            <Mail className="h-5 w-5" />
            ronnieljf@gmail.com
          </a>
          <p className="text-sm text-neutral-500 mt-3">
            {landing.respondUnder24}
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
            {landing.viewStores}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
