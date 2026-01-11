import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Bearo",
  description: "Bearo Privacy Policy - Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "https://bearo.cash/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#f97316] hover:underline mb-8"
        >
          &larr; Back
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: December 10, 2025</p>

        <p className="text-gray-300 mb-8">
          Bearo (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our peer-to-peer digital payment application.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
          <p className="text-gray-300 mb-4">We collect the following types of information:</p>

          <p className="text-white font-semibold mb-2">Personal Information:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Email address</li>
            <li>Username</li>
            <li>Payment account information</li>
            <li>Social media profile information (if you choose to connect Discord or Twitter/X)</li>
          </ul>

          <p className="text-white font-semibold mb-2">Transaction Information:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Payment history</li>
            <li>Payment amounts and recipients</li>
            <li>Transaction receipts and confirmations</li>
            <li>Payment preferences</li>
          </ul>

          <p className="text-white font-semibold mb-2">Usage Information:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Device information</li>
            <li>App usage statistics</li>
            <li>Error logs and diagnostic data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-300 mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Provide and maintain our digital payment services</li>
            <li>Process your payments securely and efficiently</li>
            <li>Verify your identity and prevent fraud</li>
            <li>Send you payment confirmations and notifications</li>
            <li>Improve our app functionality and user experience</li>
            <li>Provide customer support</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">3. Data Storage and Security</h2>
          <p className="text-gray-300 mb-4">Your data is stored securely using industry-standard encryption:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>We use Supabase for backend database storage with encryption at rest and in transit</li>
            <li>Payment processing is handled by thirdweb, a trusted payment infrastructure provider</li>
            <li>We implement secure authentication and authorization protocols</li>
            <li>Your payment credentials are protected with bank-level security</li>
          </ul>
          <p className="text-gray-300">While we implement reasonable security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">4. Third-Party Services</h2>
          <p className="text-gray-300 mb-4">We use the following third-party services that may collect and process your information:</p>

          <p className="text-gray-300 mb-4">
            <span className="text-white font-semibold">thirdweb:</span> For payment processing and account management. Please review thirdweb&apos;s privacy policy for details on their data practices.
          </p>

          <p className="text-gray-300 mb-4">
            <span className="text-white font-semibold">Supabase:</span> For backend database services and user authentication. Please review Supabase&apos;s privacy policy for details on their data practices.
          </p>

          <p className="text-gray-300 mb-4">
            <span className="text-white font-semibold">Social Media Platforms:</span> If you connect Discord or Twitter/X, those platforms&apos; privacy policies apply to the information they collect.
          </p>

          <p className="text-gray-300">We are not responsible for the privacy practices of these third-party services.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">5. Your Privacy Rights</h2>
          <p className="text-gray-300 mb-4">Depending on your location, you may have the following rights:</p>

          <p className="text-gray-300 mb-2"><span className="text-white font-semibold">Access:</span> Request access to the personal information we hold about you</p>
          <p className="text-gray-300 mb-2"><span className="text-white font-semibold">Correction:</span> Request correction of inaccurate or incomplete information</p>
          <p className="text-gray-300 mb-2"><span className="text-white font-semibold">Deletion:</span> Request deletion of your personal information (subject to legal retention requirements)</p>
          <p className="text-gray-300 mb-2"><span className="text-white font-semibold">Data Portability:</span> Request a copy of your data in a structured, machine-readable format</p>
          <p className="text-gray-300 mb-4"><span className="text-white font-semibold">Opt-Out:</span> Opt out of certain data processing activities</p>

          <p className="text-gray-300">To exercise these rights, please contact us using the information provided below. Please note that completed payment transactions are permanent records and cannot be deleted.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">6. Account Deletion</h2>
          <p className="text-gray-300 mb-4">You have the right to delete your account at any time. When you delete your account:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Your personal information (email, username) will be removed from our database</li>
            <li>Your payment history will be anonymized</li>
            <li>Your account will be permanently deactivated</li>
            <li>Some information may be retained as required by law or for legitimate business purposes</li>
          </ul>
          <p className="text-gray-300">Note: Completed payment records may be retained for legal and accounting purposes but will be disassociated from your personal information.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">7. Data Retention</h2>
          <p className="text-gray-300 mb-4">We retain your personal information for as long as necessary to:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Provide our services to you</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes and enforce our agreements</li>
          </ul>
          <p className="text-gray-300">When you delete your account, we will delete or anonymize your information within 30 days, except where retention is required by law.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">8. Children&apos;s Privacy</h2>
          <p className="text-gray-300">Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">9. International Data Transfers</h2>
          <p className="text-gray-300">Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our services, you consent to such transfers.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">10. Changes to This Privacy Policy</h2>
          <p className="text-gray-300 mb-4">We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
          <ul className="list-disc pl-6 text-gray-300 mb-4 space-y-2">
            <li>Posting the new Privacy Policy in the app</li>
            <li>Updating the &quot;Last updated&quot; date</li>
            <li>Sending you a notification (if we have your contact information)</li>
          </ul>
          <p className="text-gray-300">Your continued use of our services after any changes constitutes acceptance of the updated Privacy Policy.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">11. Contact Us</h2>
          <p className="text-gray-300 mb-4">If you have questions about this Privacy Policy or want to exercise your privacy rights, please contact us at:</p>
          <p className="text-gray-300 mb-4"><span className="text-white font-semibold">Email:</span> privacy@bearo.app</p>
          <p className="text-gray-300">We will respond to your request within 30 days.</p>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
          By using Bearo, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
        </footer>
      </div>
    </main>
  );
}
