<template>
  <v-app theme="light">
    <div class="legal-page">
      <v-container class="legal-container py-12">
        <router-link to="/landing" class="text-body-2 text-primary text-decoration-none d-inline-flex align-center mb-6">
          <v-icon size="small" class="mr-1">mdi-arrow-left</v-icon>
          Back to home
        </router-link>

        <h1 class="text-h3 font-weight-bold mb-2">Privacy Policy</h1>
        <p class="text-body-2 legal-muted mb-8">Last updated: February 2026</p>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">1. Introduction</h2>
          <p class="text-body-1 legal-muted">
            Welcome to TickyTack ("we," "our," or "us"). TickyTack is a time tracking and project management
            SaaS platform designed for freelancers and teams who bill by the hour. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our service at
            <a href="https://tickytack.app" class="text-primary">tickytack.app</a>.
          </p>
          <p class="text-body-1 legal-muted mt-2">
            By using TickyTack, you agree to the collection and use of information in accordance with this policy.
            If you do not agree, please do not use our service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">2. Information We Collect</h2>

          <h3 class="text-h6 font-weight-bold mb-2">2.1 Account Information</h3>
          <p class="text-body-1 legal-muted mb-3">
            When you create an account, we collect your email address, display name, and username. This
            information is necessary to provide you with access to the service and identify you within your organization.
          </p>

          <h3 class="text-h6 font-weight-bold mb-2">2.2 Organization and Project Data</h3>
          <p class="text-body-1 legal-muted mb-3">
            We store data you create within the platform, including organizations, projects, tickets,
            time entries, and team member information. This data is essential for the core functionality
            of the service.
          </p>

          <h3 class="text-h6 font-weight-bold mb-2">2.3 OAuth and Social Sign-In Data</h3>
          <p class="text-body-1 legal-muted mb-3">
            When you sign in using a third-party provider (Google, Facebook, GitHub, LinkedIn, or Microsoft),
            we receive your email address, name, and profile picture from that provider. We use this
            information solely for authentication and displaying your profile within TickyTack. We do not
            access your contacts, posts, repositories, or other data from these providers.
          </p>

          <h3 class="text-h6 font-weight-bold mb-2">2.4 Billing Data</h3>
          <p class="text-body-1 legal-muted mb-3">
            Payment processing is handled entirely by Stripe. We do not store your credit card numbers,
            CVV codes, or full payment details on our servers. We retain only a Stripe customer identifier
            and subscription status to manage your plan.
          </p>

          <h3 class="text-h6 font-weight-bold mb-2">2.5 Usage and Log Data</h3>
          <p class="text-body-1 legal-muted">
            We may collect standard server logs including IP addresses, browser type, referring pages,
            and timestamps. This data is used for security monitoring, debugging, and improving the service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">3. Cookies and Local Storage</h2>
          <p class="text-body-1 legal-muted">
            TickyTack uses localStorage to store your JWT authentication token, theme preference, and
            language setting. We do not use third-party tracking cookies. No advertising cookies or
            analytics trackers are embedded in the application.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">4. How We Use Your Information</h2>
          <p class="text-body-1 legal-muted mb-2">We use the information we collect to:</p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1">Provide, maintain, and improve the TickyTack service</li>
            <li class="mb-1">Authenticate your identity and manage your account</li>
            <li class="mb-1">Process billing and manage subscriptions through Stripe</li>
            <li class="mb-1">Send transactional emails (account verification, password resets, invite notifications)</li>
            <li class="mb-1">Monitor and prevent security threats and abuse</li>
            <li class="mb-1">Respond to support requests</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">5. Data Sharing and Disclosure</h2>
          <p class="text-body-1 legal-muted mb-2">
            We do not sell, rent, or trade your personal information. We may share data only in the
            following circumstances:
          </p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1"><strong>Service providers:</strong> Stripe for payment processing, and infrastructure providers for hosting</li>
            <li class="mb-1"><strong>Legal requirements:</strong> When required by law, subpoena, or government request</li>
            <li class="mb-1"><strong>Safety:</strong> To protect the rights, safety, or property of TickyTack, our users, or the public</li>
            <li class="mb-1"><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">6. Data Retention</h2>
          <p class="text-body-1 legal-muted">
            We retain your account data and associated content for as long as your account is active.
            If you delete your account, we will remove your personal data within 30 days, except where
            retention is required by law or for legitimate business purposes (e.g., billing records).
            Aggregated, anonymized data may be retained indefinitely for analytical purposes.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">7. Data Security</h2>
          <p class="text-body-1 legal-muted">
            We implement industry-standard security measures to protect your data, including encrypted
            connections (TLS/HTTPS), secure password hashing, and access controls. While we strive to
            protect your information, no method of transmission or storage is 100% secure. We cannot
            guarantee absolute security.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">8. Your Rights (GDPR)</h2>
          <p class="text-body-1 legal-muted mb-2">
            If you are located in the European Economic Area (EEA), you have the following rights
            under the General Data Protection Regulation (GDPR):
          </p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1"><strong>Right of access:</strong> Request a copy of the personal data we hold about you</li>
            <li class="mb-1"><strong>Right to rectification:</strong> Request correction of inaccurate personal data</li>
            <li class="mb-1"><strong>Right to erasure:</strong> Request deletion of your personal data</li>
            <li class="mb-1"><strong>Right to restrict processing:</strong> Request that we limit how we use your data</li>
            <li class="mb-1"><strong>Right to data portability:</strong> Request your data in a structured, machine-readable format</li>
            <li class="mb-1"><strong>Right to object:</strong> Object to our processing of your personal data</li>
          </ul>
          <p class="text-body-1 legal-muted mt-2">
            To exercise any of these rights, please contact us at
            <a href="mailto:privacy@tickytack.app" class="text-primary">privacy@tickytack.app</a>.
            We will respond within 30 days.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">9. Children's Privacy</h2>
          <p class="text-body-1 legal-muted">
            TickyTack is not intended for use by individuals under the age of 16. We do not knowingly
            collect personal information from children. If we become aware that we have collected data
            from a child under 16, we will take steps to delete that information promptly.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">10. Changes to This Policy</h2>
          <p class="text-body-1 legal-muted">
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by posting the updated policy on this page and updating the "Last updated" date.
            Your continued use of TickyTack after changes are posted constitutes acceptance of the
            revised policy.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">11. Contact Us</h2>
          <p class="text-body-1 legal-muted">
            If you have any questions or concerns about this Privacy Policy or our data practices,
            please contact us at
            <a href="mailto:privacy@tickytack.app" class="text-primary">privacy@tickytack.app</a>.
          </p>
        </section>
      </v-container>
    </div>
  </v-app>
</template>

<script setup>
</script>

<style scoped>
.legal-page {
  background: #ffffff;
  color: #1e1a17;
  min-height: 100vh;
}

.legal-container {
  max-width: 800px;
}

.legal-muted {
  color: rgba(30, 26, 23, 0.7) !important;
  line-height: 1.7;
}
</style>
