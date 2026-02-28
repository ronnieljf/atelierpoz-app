import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de la plataforma Atelier Poz.',
  keywords: 'términos de servicio, términos y condiciones, Atelier Poz, legal, reglas de la plataforma',
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: '/terminos-y-condiciones',
    languages: {
      es: '/terminos-y-condiciones',
      en: '/terms-of-service',
      'x-default': '/terminos-y-condiciones',
    },
  },
  openGraph: {
    title: 'Términos y Condiciones | Atelier Poz',
    url: `${baseUrl}/terminos-y-condiciones`,
    locale: 'es_ES',
    type: 'website',
  },
};

export default async function TerminosYCondicionesPage() {
  const dict = getDictionary(await getLocaleFromRequest());

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Términos y Condiciones de Uso
        </h1>
        <Link
          href="/terms-of-service"
          className="text-sm text-primary-400 hover:text-primary-300 underline"
        >
          Read in English
        </Link>
      </div>

      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-sm text-neutral-300">
        <p className="text-neutral-400">
          <strong>Última actualización:</strong> 21 de febrero de 2025
        </p>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">1. Aceptación</h2>
          <p>
            Al acceder o utilizar el sitio web atelierpoz.com y la plataforma multitienda de <strong>Atelier Poz</strong> («la Plataforma»), usted acepta 
            los presentes Términos y Condiciones. Si no está de acuerdo con ellos, no utilice la Plataforma. El uso continuado tras cualquier modificación 
            constituye la aceptación de los términos modificados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">2. Descripción del servicio</h2>
          <p>
            Atelier Poz ofrece una plataforma que permite a comerciantes («tiendas») exponer y gestionar sus productos, pedidos y clientes, y a los visitantes 
            consultar catálogos, realizar solicitudes de pedido y contactar con las tiendas (por ejemplo mediante WhatsApp). La Plataforma puede incluir 
            funcionalidades de integración con servicios de terceros, como Meta (Facebook/Instagram), para publicar contenido o conectar cuentas cuando el usuario lo autorice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">3. Uso permitido</h2>
          <p>Usted se compromete a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Utilizar la Plataforma de forma lícita y de acuerdo con estos Términos y con la legislación aplicable.</li>
            <li>Proporcionar información veraz en el registro, en las tiendas y en los pedidos.</li>
            <li>No utilizar la Plataforma para actividades fraudulentas, abusivas o que infrinjan derechos de terceros.</li>
            <li>No intentar acceder sin autorización a sistemas, cuentas ajenas o datos de otros usuarios.</li>
            <li>Respetar las políticas de Meta (Facebook/Instagram) cuando utilice las integraciones ofrecidas en la Plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">4. Cuentas y administración</h2>
          <p>
            El acceso al panel de administración (gestión de tiendas, productos, pedidos, etc.) requiere registro. Usted es responsable de mantener la confidencialidad 
            de sus credenciales y de toda actividad que se realice bajo su cuenta. Debe notificarnos cualquier uso no autorizado. Nos reservamos el derecho de suspender 
            o cerrar cuentas que incumplan estos Términos o que pongan en riesgo la seguridad o el buen uso de la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">5. Contenido y responsabilidad</h2>
          <p>
            Los comerciantes son responsables del contenido que publican (productos, imágenes, descripciones, precios) y de cumplir con la normativa de consumo, 
            propiedad intelectual y publicidad. Atelier Poz actúa como intermediario técnico y no garantiza la exactitud, legalidad o disponibilidad del contenido 
            de las tiendas. Las transacciones comerciales (precios, entregas, devoluciones) se rigen por el acuerdo entre el cliente y la tienda; salvo que la ley 
            imponga otra cosa, Atelier Poz no es parte en esas transacciones.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">6. Integraciones con terceros (Meta / Instagram)</h2>
          <p>
            Si utiliza funcionalidades que conectan la Plataforma con Meta (Facebook/Instagram), usted acepta cumplir con los Términos de Servicio y las Políticas 
            de Meta aplicables. La publicación de contenido en Instagram u otras acciones realizadas a través de esas integraciones están sujetas a las reglas de Meta. 
            Nosotros no controlamos los servicios de Meta y no somos responsables de su disponibilidad, modificaciones o del tratamiento que Meta haga de los datos. 
            Puede revocar en cualquier momento la conexión entre su cuenta de la Plataforma y sus cuentas de Meta desde la configuración correspondiente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">7. Propiedad intelectual</h2>
          <p>
            La Plataforma (diseño, software, marcas, textos propios) es propiedad de Atelier Poz o de sus licenciantes. Usted no adquiere ningún derecho sobre ellos 
            más allá del uso permitido. El contenido que usted sube (imágenes, textos de productos) sigue siendo suyo; nos otorga una licencia necesaria para operar 
            la Plataforma (mostrar, almacenar, reproducir en el contexto del servicio).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">8. Privacidad y datos</h2>
          <p>
            El tratamiento de datos personales se describe en nuestra <Link href="/politica-de-privacidad" className="text-primary-400 hover:underline">Política de Privacidad</Link>. 
            Al usar la Plataforma usted acepta dicha política. Para el uso de servicios de Meta (Facebook/Instagram), aplican además las políticas de privacidad de Meta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">9. Limitación de responsabilidad</h2>
          <p>
            La Plataforma se ofrece «tal cual» y «según disponibilidad». En la medida permitida por la ley, Atelier Poz no será responsable por daños indirectos, 
            incidentales, especiales o consecuentes, ni por pérdida de datos o beneficios, derivados del uso o la imposibilidad de uso de la Plataforma o de servicios 
            de terceros (incluido Meta). Nuestra responsabilidad total no excederá, en su caso, el importe abonado por usted por el servicio en el período en que 
            se produjo el hecho.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">10. Modificaciones y terminación</h2>
          <p>
            Podemos modificar estos Términos o las funcionalidades de la Plataforma. Los cambios relevantes se comunicarán mediante aviso en la Plataforma o por correo 
            cuando sea apropiado. Nos reservamos el derecho de suspender o dar por terminado el acceso a la Plataforma en caso de incumplimiento grave o por razones 
            operativas o legales, con el preaviso que en cada caso sea razonable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">11. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por la legislación aplicable en el lugar desde el que opera Atelier Poz. Cualquier controversia se someterá a los tribunales 
            competentes en ese lugar, salvo que la ley imponga otra jurisdicción.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">12. Contacto</h2>
          <p>
            Para consultas sobre estos Términos: <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-wrap gap-4">
        <Link href="/politica-de-privacidad" className="text-sm text-primary-400 hover:text-primary-300">
          Política de Privacidad
        </Link>
        <Link href="/" className="text-sm text-primary-400 hover:text-primary-300">
          ← Volver a {dict.title}
        </Link>
      </div>
    </div>
  );
}
