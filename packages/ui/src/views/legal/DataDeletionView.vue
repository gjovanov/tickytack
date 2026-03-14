<template>
  <v-app theme="light">
    <div class="legal-page">
      <v-container class="legal-container py-12">
        <router-link to="/landing" class="text-body-2 text-primary text-decoration-none d-inline-flex align-center mb-6">
          <v-icon size="small" class="mr-1">mdi-arrow-left</v-icon>
          Back to home
        </router-link>

        <h1 class="text-h3 font-weight-bold mb-2">Data Deletion</h1>
        <p class="text-body-2 legal-muted mb-8">Last updated: March 2026</p>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">1. How to Delete Your Data Through TickyTack</h2>
          <p class="text-body-1 legal-muted">
            You can request deletion of your account and all associated data by contacting your organization
            administrator, who can remove your account from the admin panel. Alternatively, you can email us
            directly at <a href="mailto:privacy@tickytack.app" class="text-primary">privacy@tickytack.app</a>
            with the subject line "Data Deletion Request" and we will process your request.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">2. How to Delete Your Data Through Facebook</h2>
          <p class="text-body-1 legal-muted mb-3">
            If you signed up or logged in to TickyTack using your Facebook account, you can request deletion
            of your data directly from Facebook:
          </p>
          <ol class="text-body-1 legal-muted ml-6 mb-3">
            <li class="mb-2">Go to your Facebook <strong>Settings &amp; Privacy</strong> &gt; <strong>Settings</strong>.</li>
            <li class="mb-2">Click <strong>Apps and Websites</strong> in the left menu.</li>
            <li class="mb-2">Find <strong>TickyTack</strong> in the list of active apps.</li>
            <li class="mb-2">Click <strong>Remove</strong> and check the box to delete all data posted on Facebook by TickyTack.</li>
          </ol>
          <p class="text-body-1 legal-muted">
            When you remove TickyTack from your Facebook apps, Facebook will automatically notify us to delete
            all data associated with your Facebook account. You will receive a confirmation code that you can
            use to check the status of your deletion request.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">3. What Data Is Deleted</h2>
          <p class="text-body-1 legal-muted mb-3">
            When your data is deleted, the following information is permanently removed:
          </p>
          <ul class="text-body-1 legal-muted ml-6">
            <li class="mb-1">Your account information (name, email, username)</li>
            <li class="mb-1">Your OAuth tokens and provider connections</li>
            <li class="mb-1">Your time entries and tracked hours</li>
            <li class="mb-1">Your JIRA integration settings</li>
          </ul>
          <p class="text-body-1 legal-muted mt-3">
            Organization-level data such as projects and tickets are retained for other team members.
            Anonymized or aggregated data may be retained as described in our
            <router-link to="/privacy" class="text-primary">Privacy Policy</router-link>.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">4. Deletion Confirmation</h2>
          <p class="text-body-1 legal-muted">
            After a deletion request is processed, you will receive a confirmation code. You can check the
            status of your deletion request at any time by visiting
            <router-link to="/deletion-status" class="text-primary">tickytack.app/deletion-status</router-link>
            and entering your confirmation code.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-3">5. Contact Us</h2>
          <p class="text-body-1 legal-muted">
            If you have any questions about data deletion or need assistance, please contact us at
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
