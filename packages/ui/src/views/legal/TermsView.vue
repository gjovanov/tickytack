<template>
  <v-app theme="light">
    <div class="legal-page">
      <v-container class="legal-container py-12">
        <router-link to="/landing" class="text-body-2 text-primary text-decoration-none d-inline-flex align-center mb-6">
          <v-icon size="small" class="mr-1">mdi-arrow-left</v-icon>
          Back to home
        </router-link>

        <h1 class="text-h3 font-weight-bold mb-2">Terms of Service</h1>
        <p class="text-body-2 legal-muted mb-8">Last updated: February 2026</p>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">1. Agreement to Terms</h2>
          <p class="text-body-1 legal-muted">
            By accessing or using TickyTack ("the Service"), available at
            <a href="https://tickytack.app" class="text-primary">tickytack.app</a>, you agree to be
            bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not
            use the Service. These Terms constitute a legally binding agreement between you and TickyTack
            ("we," "our," or "us").
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">2. Description of Service</h2>
          <p class="text-body-1 legal-muted">
            TickyTack is a time tracking and project management SaaS platform. The Service allows users
            to track time entries on a weekly calendar, manage projects and tickets, organize teams within
            organizations, and export reports in Excel and PDF formats. Features may vary based on your
            subscription plan.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">3. Eligibility</h2>
          <p class="text-body-1 legal-muted">
            You must be at least 16 years of age to use TickyTack. By creating an account, you represent
            and warrant that you meet this age requirement and have the legal capacity to enter into these
            Terms. If you are using the Service on behalf of an organization, you represent that you have
            the authority to bind that organization to these Terms.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">4. Account Responsibilities</h2>
          <p class="text-body-1 legal-muted mb-2">When you create an account, you agree to:</p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1">Provide accurate, current, and complete registration information</li>
            <li class="mb-1">Maintain the security of your account credentials and not share them with others</li>
            <li class="mb-1">Promptly notify us of any unauthorized use of your account</li>
            <li class="mb-1">Accept responsibility for all activities that occur under your account</li>
          </ul>
          <p class="text-body-1 legal-muted mt-2">
            We reserve the right to suspend or terminate accounts that violate these Terms or that we
            reasonably believe have been compromised.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">5. Acceptable Use</h2>
          <p class="text-body-1 legal-muted mb-2">You agree not to use the Service to:</p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1">Violate any applicable laws, regulations, or third-party rights</li>
            <li class="mb-1">Upload or transmit malicious code, viruses, or harmful content</li>
            <li class="mb-1">Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
            <li class="mb-1">Interfere with or disrupt the integrity or performance of the Service</li>
            <li class="mb-1">Use automated means (bots, scrapers) to access the Service without our written permission</li>
            <li class="mb-1">Impersonate any person or entity, or misrepresent your affiliation</li>
            <li class="mb-1">Use the Service for any illegal, fraudulent, or abusive purpose</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">6. Intellectual Property</h2>
          <p class="text-body-1 legal-muted mb-3">
            The Service, including its design, code, features, logos, and documentation, is owned by
            TickyTack and protected by intellectual property laws. You may not copy, modify, distribute,
            or reverse-engineer any part of the Service without our prior written consent.
          </p>
          <p class="text-body-1 legal-muted">
            You retain ownership of all data and content you create within TickyTack (time entries,
            projects, tickets, organization data). By using the Service, you grant us a limited license
            to store, process, and display your content solely for the purpose of providing the Service
            to you.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">7. Billing and Subscriptions</h2>
          <p class="text-body-1 legal-muted mb-3">
            TickyTack offers Free, Pro, and Business subscription plans. Paid plans are billed monthly
            per user. All payments are processed securely through Stripe. By subscribing to a paid plan,
            you authorize us to charge your payment method on a recurring basis.
          </p>
          <p class="text-body-1 legal-muted mb-2">Billing terms:</p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1">Subscriptions renew automatically at the end of each billing cycle unless cancelled</li>
            <li class="mb-1">You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period</li>
            <li class="mb-1">Refunds are not provided for partial billing periods</li>
            <li class="mb-1">We reserve the right to change pricing with 30 days' advance notice</li>
            <li class="mb-1">Downgrading to the Free plan may result in loss of access to premium features</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">8. Data and Privacy</h2>
          <p class="text-body-1 legal-muted">
            Your use of the Service is also governed by our
            <router-link to="/privacy" class="text-primary">Privacy Policy</router-link>, which describes
            how we collect, use, and protect your information. By using the Service, you consent to the
            data practices described in our Privacy Policy.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">9. Termination</h2>
          <p class="text-body-1 legal-muted mb-3">
            You may terminate your account at any time by contacting us or using the account deletion
            feature within the Service. We may suspend or terminate your access to the Service at any
            time, with or without cause, including for violation of these Terms.
          </p>
          <p class="text-body-1 legal-muted">
            Upon termination, your right to use the Service ceases immediately. We will retain your data
            for 30 days after termination to allow for data export, after which it will be permanently
            deleted unless retention is required by law.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">10. Disclaimers</h2>
          <p class="text-body-1 legal-muted">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
            WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">11. Limitation of Liability</h2>
          <p class="text-body-1 legal-muted">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TICKYTACK AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
            AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL,
            ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ALL CLAIMS
            RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS
            PRECEDING THE CLAIM.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">12. Indemnification</h2>
          <p class="text-body-1 legal-muted">
            You agree to indemnify, defend, and hold harmless TickyTack and its affiliates from and
            against any claims, liabilities, damages, losses, and expenses arising out of or related
            to your use of the Service, your violation of these Terms, or your violation of any
            third-party rights.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">13. Governing Law</h2>
          <p class="text-body-1 legal-muted">
            These Terms shall be governed by and construed in accordance with the laws of the European
            Union and the applicable member state where TickyTack operates, without regard to conflict
            of law principles. Any disputes arising from these Terms or the Service shall be resolved
            in the competent courts of that jurisdiction.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">14. Changes to These Terms</h2>
          <p class="text-body-1 legal-muted">
            We reserve the right to modify these Terms at any time. We will notify you of material
            changes by posting the updated Terms on this page and updating the "Last updated" date.
            Your continued use of the Service after changes are posted constitutes acceptance of the
            revised Terms. If you do not agree to the new Terms, you must stop using the Service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">15. Severability</h2>
          <p class="text-body-1 legal-muted">
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be modified to the minimum extent necessary to make it enforceable, and the remaining
            provisions shall continue in full force and effect.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">16. Contact Us</h2>
          <p class="text-body-1 legal-muted">
            If you have any questions about these Terms of Service, please contact us at
            <a href="mailto:legal@tickytack.app" class="text-primary">legal@tickytack.app</a>.
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
