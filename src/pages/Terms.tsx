import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8"
        >
          <ArrowLeft size={20} />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-6">Terms of Service</h1>
          
          <p className="text-sm text-neutral-500 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-neutral max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-neutral-600 leading-relaxed">
                By accessing or using Vitu ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">2. Description of Service</h2>
              <p className="text-neutral-600 leading-relaxed">
                Vitu is a business showcase platform that allows users to:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mt-4 space-y-2">
                <li>Create and manage business profiles</li>
                <li>Post and showcase products or services</li>
                <li>Interact with other businesses and users</li>
                <li>Receive reviews and ratings</li>
                <li>Communicate with other users via messaging</li>
                <li>Access analytics and business insights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-lg font-medium text-neutral-800 mb-2">Account Creation</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mb-4 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Account Termination</h3>
              <p className="text-neutral-600 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">4. User Content</h2>
              
              <h3 className="text-lg font-medium text-neutral-800 mb-2">Content Ownership</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You retain ownership of any content you post, upload, or display on the Service ("User Content"). By posting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content in connection with the Service.
              </p>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Content Restrictions</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You agree not to post User Content that:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>Is illegal, harmful, threatening, abusive, or defamatory</li>
                <li>Infringes on any patent, trademark, trade secret, or copyright</li>
                <li>Contains software viruses or malicious code</li>
                <li>Is spam, unsolicited advertising, or promotional material</li>
                <li>Violates the privacy or publicity rights of any third party</li>
                <li>Is false, misleading, or deceptive</li>
                <li>Contains hate speech or promotes discrimination</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">5. Business Listings</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                When creating a business listing, you agree to:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>Provide accurate and truthful information about your business</li>
                <li>Only list businesses you own or are authorized to represent</li>
                <li>Not post misleading or fraudulent listings</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Maintain accurate contact information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">6. Prohibited Activities</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated means to access the Service without permission</li>
                <li>Collect or harvest user information without consent</li>
                <li>Impersonate any person or entity</li>
                <li>Engage in any form of harassment or abuse</li>
                <li>Post false reviews or ratings</li>
                <li>Manipulate engagement metrics (likes, comments, shares)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">7. Intellectual Property</h2>
              <p className="text-neutral-600 leading-relaxed">
                The Service and its original content, features, and functionality are and will remain the exclusive property of Vitu and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">8. Payments and Subscriptions</h2>
              
              <h3 className="text-lg font-medium text-neutral-800 mb-2">Billing</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                Certain features of the Service require payment of fees. You agree to pay all fees associated with your use of the Service. All fees are non-refundable unless otherwise stated.
              </p>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Subscription Plans</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                Subscription plans automatically renew unless cancelled before the renewal date. You may cancel your subscription at any time through your account settings.
              </p>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Price Changes</h3>
              <p className="text-neutral-600 leading-relaxed">
                We reserve the right to modify our pricing at any time. We will provide reasonable notice of any price changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-neutral-600 leading-relaxed">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-neutral-600 leading-relaxed">
                IN NO EVENT SHALL VITU, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">11. Indemnification</h2>
              <p className="text-neutral-600 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Vitu and its licensees and licensors from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">12. Governing Law</h2>
              <p className="text-neutral-600 leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">13. Changes to Terms</h2>
              <p className="text-neutral-600 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">14. Contact Us</h2>
              <p className="text-neutral-600 leading-relaxed">
                If you have any questions about these Terms, please contact us:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mt-4 space-y-2">
                <li>Email: legal@vitu.app</li>
                <li>Website: https://vitu.app</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
