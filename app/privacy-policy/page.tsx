import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Atelier Poz privacy policy. Information about collection, use and protection of personal data.',
  alternates: { canonical: `${baseUrl}/privacy-policy` },
  openGraph: {
    title: 'Privacy Policy | Atelier Poz',
    url: `${baseUrl}/privacy-policy`,
    locale: 'en_US',
  },
};

export default function PrivacyPolicyPage() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Privacy Policy
        </h1>
        <Link
          href="/politica-de-privacidad"
          className="text-sm text-primary-400 hover:text-primary-300 underline"
        >
          Leer en español
        </Link>
      </div>

      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-sm text-neutral-300">
        <p className="text-neutral-400">
          <strong>Last updated:</strong> February 21, 2025
        </p>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">1. Data controller</h2>
          <p>
            The data controller for your personal data is <strong>Atelier Poz</strong> («we», «our platform»), operator of the website atelierpoz.com 
            and the associated multi-store platform. For privacy-related inquiries you may contact us at:{' '}
            <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">2. Data we collect</h2>
          <p>We collect the following types of data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account data:</strong> email address, name (if provided), and encrypted password when you register or log in to the admin area.</li>
            <li><strong>Store and product data:</strong> store name, description, images, product data (name, price, description, images, categories) that administrators upload to the platform.</li>
            <li><strong>Customer and order data:</strong> name, phone number, delivery address and, where applicable, email address, provided by customers when placing orders or registered by stores in the admin panel.</li>
            <li><strong>Usage data:</strong> IP addresses, browser type, pages visited and actions on the site, for proper operation, security and improvement of the service.</li>
            <li><strong>Cookies and similar technologies:</strong> we use cookies and local storage for session, preferences and analytics (e.g. if Google Analytics or other tools are configured on the site).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">3. Integration with Meta (Facebook / Instagram)</h2>
          <p>
            Our platform may offer features that use products of Meta Platforms, Inc. («Meta»), such as Facebook login or publishing content to Instagram. In that case:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>We may receive from Meta profile data (e.g. name, profile picture, user identifier) when you connect your Facebook or Instagram account to our platform.</li>
            <li>We use that data to associate your account, display your profile on the platform and, if you authorise it, publish content (e.g. product posts) to your Instagram account.</li>
            <li>Meta’s processing of data is governed by <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Meta’s Privacy Policy</a>. We recommend that you read it to understand how Meta collects, uses and shares information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">4. Purposes of processing</h2>
          <p>We use your data to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Manage your account, access to the admin panel and contractual relationship.</li>
            <li>Manage stores, products, orders, customers and communications (including WhatsApp if the store uses it).</li>
            <li>Provide and improve the shopping experience on the public website (catalogue, cart, order requests).</li>
            <li>Manage the connection with Meta (Facebook/Instagram) to publish content when you authorise it.</li>
            <li>Comply with legal obligations, resolve disputes and ensure the security and proper technical operation of the platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">5. Legal basis and retention</h2>
          <p>
            Processing is based on performance of the contract (provision of the service), your consent (where applicable, e.g. for publishing to Instagram) and legitimate interest (security, service improvement, analytics). 
            We retain data for as long as necessary for these purposes and to comply with legal obligations (e.g. billing and claims). Customer and order data are retained in accordance with the business relationship and applicable regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">6. Recipients and transfers</h2>
          <p>
            Your data may be processed by providers that supply us with services (hosting, email, analytics, integrations). When we use Meta services (Facebook/Instagram), the data you authorise to share is sent to Meta in accordance with their policies. 
            Some providers may be located outside the European Economic Area; in those cases we apply the safeguards provided by law (standard contractual clauses, adequacy decisions or other approved measures).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">7. Your rights</h2>
          <p>
            You may exercise the rights of access, rectification, erasure, restriction of processing, data portability and objection by contacting{' '}
            <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>. 
            If you consider that the processing does not comply with the law, you have the right to lodge a complaint with the relevant data protection supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">8. Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss or alteration, in line with the nature of the data and the risks involved.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">9. Changes</h2>
          <p>
            We may update this privacy policy. The current version will be published on this page, with the «Last updated» date shown at the top. We recommend that you review it periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">10. Contact</h2>
          <p>
            For any privacy inquiries or to exercise your rights: <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800">
        <Link
          href="/"
          className="text-sm text-primary-400 hover:text-primary-300"
        >
          ← Back to {dict.title}
        </Link>
      </div>
    </div>
  );
}
