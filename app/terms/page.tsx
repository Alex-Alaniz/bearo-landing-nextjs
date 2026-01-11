import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Bearo",
  description: "Bearo Terms of Service - Read our terms and conditions for using the Bearo payment application.",
  alternates: {
    canonical: "https://bearo.cash/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#f97316] hover:underline mb-8"
        >
          &larr; Back
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: December 10, 2024</p>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-300">By accessing and using Bearo, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this service. Your continued use of Bearo constitutes acceptance of any modifications to these Terms of Service.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">2. Account Terms</h2>
          <p className="text-gray-300 mb-4">You must be 18 years or older to use this service. You are responsible for maintaining the security of your account and payment information. Keep your login credentials and recovery information secure and private.</p>
          <p className="text-gray-300">You are responsible for all activity that occurs under your account. Bearo cannot and will not be liable for any loss or damage arising from your failure to comply with these security obligations.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">3. Payments and Transactions</h2>
          <p className="text-gray-300 mb-4">Bearo facilitates instant peer-to-peer digital payments using stablecoins (digital dollars pegged to USD). All payments are processed securely and are irreversible once confirmed. Double-check recipient usernames before sending money.</p>
          <p className="text-gray-300 mb-4">Small network fees may apply to certain transactions. These fees are determined by the payment network, not by Bearo. You are responsible for ensuring you have sufficient funds to cover both the payment amount and any associated fees.</p>
          <p className="text-gray-300">You are responsible for verifying the recipient username before sending money. Bearo is not responsible for payments sent to incorrect recipients. Always confirm the recipient before completing a payment.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">4. Prohibited Activities</h2>
          <p className="text-gray-300 mb-4">You agree not to use Bearo for any illegal activities, including but not limited to:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Money laundering or terrorist financing</li>
            <li>Fraud, theft, or unauthorized transactions</li>
            <li>Purchasing illegal goods or services</li>
            <li>Violation of any applicable laws or regulations</li>
            <li>Circumventing sanctions or embargoes</li>
          </ul>
          <p className="text-gray-300">Bearo reserves the right to suspend or terminate accounts engaged in prohibited activities without prior notice.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">5. Disclaimers</h2>
          <p className="text-gray-300 mb-4">Bearo is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.</p>
          <p className="text-gray-300 mb-4">Bearo is a payment service, not a financial advisor or investment platform. We do not provide financial, investment, or tax advice. For questions about how payments may affect your financial situation, please consult a qualified professional.</p>
          <p className="text-gray-300">We do not control the underlying payment networks. Network delays or technical issues may occasionally affect transaction processing times. We strive to provide fast, reliable service but cannot guarantee instant processing in all circumstances.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">6. Limitation of Liability</h2>
          <p className="text-gray-300 mb-4">To the maximum extent permitted by law, Bearo and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or funds.</p>
          <p className="text-gray-300">In no event shall our total liability exceed the amount of fees, if any, paid by you to Bearo in the six months preceding the event giving rise to the liability.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">7. Termination</h2>
          <p className="text-gray-300 mb-4">We reserve the right to suspend or terminate your account at any time, with or without cause or notice, for any reason including violation of these Terms of Service.</p>
          <p className="text-gray-300">You may terminate your account at any time by ceasing to use the service. Upon termination, you remain responsible for all transactions made prior to termination.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">8. Changes to Terms</h2>
          <p className="text-gray-300">We reserve the right to modify these Terms of Service at any time. Material changes will be notified through the app or via email. Your continued use of Bearo after such modifications constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">9. Contact Information</h2>
          <p className="text-gray-300 mb-4">If you have any questions about these Terms of Service, please contact us at:</p>
          <p className="text-[#f97316]">support@bearo.app</p>
        </section>

        <footer className="mt-12 p-6 bg-[#111] rounded-xl text-center text-gray-400 text-sm">
          By using Bearo, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </footer>
      </div>
    </main>
  );
}
