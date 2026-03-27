import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-neutral-900 mb-6">Privacy Policy</h1>
          
          <p className="text-sm text-neutral-500 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-neutral max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">1. Introduction</h2>
              <p className="text-neutral-600 leading-relaxed">
                Welcome to Vitu ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-neutral-800 mb-2">Personal Information</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                When you register for an account, we collect:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mb-4 space-y-2">
                <li>Email address</li>
                <li>Name</li>
                <li>Password (encrypted and stored securely)</li>
                <li>Profile picture (optional)</li>
                <li>Bio (optional)</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Business Information</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">
                When you register a business, we collect:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mb-4 space-y-2">
                <li>Business name</li>
                <li>Business description</li>
                <li>Business type</li>
                <li>Business logo</li>
                <li>Address</li>
                <li>Contact information</li>
                <li>Social media handles</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-800 mb-2">Usage Data</h3>
              <p className="text-neutral-600 leading-relaxed">
                We automatically collect certain information when you use our Service, including:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mb-4 space-y-2">
                <li>Device type and operating system</li>
                <li>IP address</li>
                <li>Browser type</li>
                <li>Pages visited and features used</li>
                <li>Time and date of visits</li>
                <li>Referring website</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li>Provide, operate, and maintain our Service</li>
                <li>Create and manage your account</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Send you marketing and promotional communications (with your consent)</li>
                <li>Monitor and analyze usage and trends</li>
                <li>Detect, prevent, and address technical issues</li>
                <li>Protect against fraudulent or illegal activity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">4. Sharing Your Information</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li><strong>With other users:</strong> Your profile information and business listings are visible to other users of the Service</li>
                <li><strong>With service providers:</strong> We may share information with third-party vendors who perform services on our behalf</li>
                <li><strong>For legal purposes:</strong> We may disclose information if required by law or in response to valid requests by public authorities</li>
                <li><strong>Business transfers:</strong> We may share information in connection with a merger, sale, or acquisition of all or a portion of our assets</li>
                <li><strong>With your consent:</strong> We may share information with your consent or at your direction</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">5. Data Security</h2>
              <p className="text-neutral-600 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mt-4 space-y-2">
                <li>Encryption of passwords using bcrypt</li>
                <li>Secure HTTPS connections</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication</li>
                <li>Secure data storage practices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">6. Data Retention</h2>
              <p className="text-neutral-600 leading-relaxed">
                We retain your personal information for as long as necessary to provide you with our Service and as described in this Privacy Policy. We will also retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">7. Your Rights</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-neutral-600 space-y-2">
                <li><strong>Access:</strong> You can request access to your personal information</li>
                <li><strong>Correction:</strong> You can request that we correct inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> You can request that we delete your personal information</li>
                <li><strong>Portability:</strong> You can request a copy of your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> You can object to our processing of your personal information</li>
                <li><strong>Withdrawal of consent:</strong> You can withdraw consent at any time where we rely on consent to process your information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">8. Children's Privacy</h2>
              <p className="text-neutral-600 leading-relaxed">
                Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-neutral-600 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">10. Contact Us</h2>
              <p className="text-neutral-600 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mt-4 space-y-2">
                <li>Email: privacy@vitu.app</li>
                <li>Website: https://zionnent.com/vitu</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
