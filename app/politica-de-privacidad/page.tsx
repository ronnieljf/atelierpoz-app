import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de Atelier Poz. Información sobre recopilación, uso y protección de datos personales.',
  alternates: { canonical: `${baseUrl}/politica-de-privacidad` },
  openGraph: {
    title: 'Política de Privacidad | Atelier Poz',
    url: `${baseUrl}/politica-de-privacidad`,
    locale: 'es_ES',
  },
};

export default function PoliticaDePrivacidadPage() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Política de Privacidad
        </h1>
        <Link
          href="/privacy-policy"
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
          <h2 className="text-lg font-medium text-white mt-8 mb-2">1. Responsable del tratamiento</h2>
          <p>
            El responsable del tratamiento de sus datos personales es <strong>Atelier Poz</strong> («nosotros», «nuestra plataforma»), 
            operadora del sitio web atelierpoz.com y de la plataforma multitienda asociada. Para cuestiones relacionadas con la privacidad 
            puede contactarnos en: <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">2. Datos que recopilamos</h2>
          <p>Recopilamos los siguientes tipos de datos:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de cuenta:</strong> correo electrónico, nombre (si lo facilita) y contraseña cifrada, cuando se registra o inicia sesión en el área de administración.</li>
            <li><strong>Datos de tiendas y productos:</strong> nombre de tienda, descripción, imágenes, datos de productos (nombre, precio, descripción, imágenes, categorías) que los administradores suben a la plataforma.</li>
            <li><strong>Datos de clientes y pedidos:</strong> nombre, teléfono, dirección de entrega y, en su caso, correo electrónico, que los clientes facilitan al realizar pedidos o que las tiendas registran en el panel de administración.</li>
            <li><strong>Datos de uso:</strong> direcciones IP, tipo de navegador, páginas visitadas y acciones en el sitio, para el correcto funcionamiento, seguridad y mejora del servicio.</li>
            <li><strong>Cookies y tecnologías similares:</strong> utilizamos cookies y almacenamiento local para sesión, preferencias y análisis (por ejemplo, si utilizan Google Analytics u otras herramientas configuradas en el sitio).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">3. Integración con Meta (Facebook / Instagram)</h2>
          <p>
            Nuestra plataforma puede ofrecer funcionalidades que utilizan productos de Meta Platforms, Inc. («Meta»), como el inicio de sesión con Facebook 
            o la publicación de contenido en Instagram. En ese caso:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Podemos recibir de Meta datos de perfil (por ejemplo, nombre, foto de perfil, identificador de usuario) cuando usted conecta su cuenta de Facebook o Instagram con nuestra plataforma.</li>
            <li>Utilizamos esos datos para asociar su cuenta, mostrar su perfil en la plataforma y, si lo autoriza, publicar contenido (por ejemplo, publicaciones de productos) en su cuenta de Instagram.</li>
            <li>El tratamiento de datos por parte de Meta se rige por la <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Política de Privacidad de Meta</a>. Le recomendamos leerla para conocer cómo Meta recopila, usa y comparte información.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">4. Finalidad del tratamiento</h2>
          <p>Utilizamos sus datos para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestionar su cuenta, acceso al panel de administración y relación contractual.</li>
            <li>Gestionar tiendas, productos, pedidos, clientes y comunicaciones (incluido WhatsApp si la tienda lo utiliza).</li>
            <li>Ofrecer y mejorar la experiencia de compra en la web pública (catálogo, carrito, solicitudes de pedido).</li>
            <li>Gestionar la conexión con Meta (Facebook/Instagram) para publicar contenido cuando usted lo autorice.</li>
            <li>Cumplir obligaciones legales, resolver disputas y garantizar la seguridad y el correcto funcionamiento técnico de la plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">5. Base legal y conservación</h2>
          <p>
            El tratamiento se basa en la ejecución del contrato (prestación del servicio), en su consentimiento (cuando aplique, por ejemplo para publicar en Instagram) 
            y en el interés legítimo (seguridad, mejora del servicio, análisis). Conservamos los datos mientras sea necesario para estas finalidades y para cumplir 
            obligaciones legales (por ejemplo, facturación y reclamaciones). Los datos de clientes y pedidos se conservan de acuerdo con la relación comercial y la normativa aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">6. Destinatarios y transferencias</h2>
          <p>
            Sus datos pueden ser tratados por proveedores que nos prestan servicios (hosting, correo, análisis, integraciones). Cuando utilizamos servicios de Meta (Facebook/Instagram), 
            los datos que usted autorice compartir se envían a Meta según sus políticas. Algunos proveedores pueden estar fuera del Espacio Económico Europeo; en esos casos aplicamos 
            las garantías previstas en la normativa (cláusulas tipo, decisiones de adecuación u otras medidas aprobadas).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">7. Sus derechos</h2>
          <p>
            Puede ejercer los derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición dirigiéndose a{' '}
            <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>. 
            Si considera que el tratamiento no se ajusta a la normativa, tiene derecho a presentar una reclamación ante la autoridad de control de protección de datos correspondiente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">8. Seguridad</h2>
          <p>
            Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos personales frente a accesos no autorizados, pérdida o alteración, en consonancia con la naturaleza de los datos y los riesgos existentes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">9. Cambios</h2>
          <p>
            Podemos actualizar esta política de privacidad. La versión vigente estará publicada en esta página, con la fecha de «Última actualización» indicada al inicio. 
            Le recomendamos revisarla periódicamente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">10. Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad o ejercicio de derechos: <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800">
        <Link
          href="/"
          className="text-sm text-primary-400 hover:text-primary-300"
        >
          ← Volver a {dict.title}
        </Link>
      </div>
    </div>
  );
}
