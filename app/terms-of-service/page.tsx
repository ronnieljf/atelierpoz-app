import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions of use of the Atelier Poz platform.',
  alternates: { canonical: `${baseUrl}/terms-of-service` },
  openGraph: {
    title: 'Terms of Service | Atelier Poz',
    url: `${baseUrl}/terms-of-service`,
    locale: 'en_US',
  },
};

export default function TermsOfServicePage() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Terms and Conditions of Use
        </h1>
        <Link
          href="/terminos-y-condiciones"
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
          <h2 className="text-lg font-medium text-white mt-8 mb-2">1. Acceptance</h2>
          <p>
            By accessing or using the website atelierpoz.com and the multi-store platform of <strong>Atelier Poz</strong> («the Platform»), you agree to these Terms and Conditions. 
            If you do not agree, do not use the Platform. Continued use after any modification constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">2. Description of the service</h2>
          <p>
            Atelier Poz provides a platform that allows merchants («stores») to display and manage their products, orders and customers, and allows visitors to browse catalogues, 
            submit order requests and contact stores (e.g. via WhatsApp). The Platform may include integration with third-party services such as Meta (Facebook/Instagram) to 
            publish content or connect accounts when the user authorises it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">3. Permitted use</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Platform lawfully and in accordance with these Terms and applicable law.</li>
            <li>Provide accurate information when registering, in stores and in orders.</li>
            <li>Not use the Platform for fraudulent, abusive or rights-infringing activities.</li>
            <li>Not attempt unauthorised access to systems, other users’ accounts or data.</li>
            <li>Comply with Meta (Facebook/Instagram) policies when using the integrations offered on the Platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">4. Accounts and administration</h2>
          <p>
            Access to the admin panel (management of stores, products, orders, etc.) requires registration. You are responsible for keeping your credentials confidential 
            and for all activity under your account. You must notify us of any unauthorised use. We reserve the right to suspend or close accounts that breach these Terms 
            or that jeopardise the security or proper use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">5. Content and responsibility</h2>
          <p>
            Merchants are responsible for the content they publish (products, images, descriptions, prices) and for compliance with consumer, intellectual property and 
            advertising regulations. Atelier Poz acts as a technical intermediary and does not guarantee the accuracy, legality or availability of store content. 
            Commercial transactions (prices, delivery, returns) are governed by the agreement between the customer and the store; unless the law provides otherwise, 
            Atelier Poz is not a party to those transactions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">6. Third-party integrations (Meta / Instagram)</h2>
          <p>
            If you use features that connect the Platform to Meta (Facebook/Instagram), you agree to comply with Meta’s applicable Terms of Service and Policies. 
            Publishing content to Instagram or other actions carried out through those integrations are subject to Meta’s rules. We do not control Meta’s services 
            and are not responsible for their availability, changes or for Meta’s processing of data. You may revoke the connection between your Platform account 
            and your Meta accounts at any time from the relevant settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">7. Intellectual property</h2>
          <p>
            The Platform (design, software, trademarks, own content) is the property of Atelier Poz or its licensors. You do not acquire any rights over it beyond 
            the permitted use. Content you upload (images, product text) remains yours; you grant us the licence necessary to operate the Platform (display, store, 
            reproduce in the context of the service).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">8. Privacy and data</h2>
          <p>
            The processing of personal data is described in our <Link href="/privacy-policy" className="text-primary-400 hover:underline">Privacy Policy</Link>. 
            By using the Platform you accept that policy. For use of Meta services (Facebook/Instagram), Meta’s privacy policies also apply.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">9. Limitation of liability</h2>
          <p>
            The Platform is provided «as is» and «as available». To the extent permitted by law, Atelier Poz shall not be liable for indirect, incidental, special 
            or consequential damages, or for loss of data or profits, arising from the use or inability to use the Platform or third-party services (including Meta). 
            Our total liability shall not exceed, where applicable, the amount paid by you for the service in the period in which the event occurred.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">10. Modifications and termination</h2>
          <p>
            We may modify these Terms or the Platform’s features. Material changes will be communicated by notice on the Platform or by email where appropriate. 
            We reserve the right to suspend or terminate access to the Platform in case of serious breach or for operational or legal reasons, with such notice as 
            is reasonable in each case.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">11. Governing law and jurisdiction</h2>
          <p>
            These Terms are governed by the applicable law in the place from which Atelier Poz operates. Any dispute shall be submitted to the competent courts in 
            that place, unless the law requires another jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white mt-8 mb-2">12. Contact</h2>
          <p>
            For inquiries about these Terms: <a href="mailto:ronnieljf@gmail.com" className="text-primary-400 hover:underline">ronnieljf@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-wrap gap-4">
        <Link href="/privacy-policy" className="text-sm text-primary-400 hover:text-primary-300">
          Privacy Policy
        </Link>
        <Link href="/" className="text-sm text-primary-400 hover:text-primary-300">
          ← Back to {dict.title}
        </Link>
      </div>
    </div>
  );
}
