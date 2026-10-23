// Explicit offline profiles. No shell commands or caller-supplied test paths.
const profiles = {
  "test:object-onboarding": {
    "database": false,
    "api": false,
    "files": [
      "test/field-validation.test.cjs",
      "test/profile-batch.test.cjs",
      "test/purchase-validation.test.cjs",
      "test/object-onboarding.test.cjs",
      "test/short-name.test.cjs",
      "test/short-name-stress.test.cjs",
      "test/object-onboarding-profile.test.cjs",
      "test/onboarding-invoice-evidence.test.cjs",
      "test/order-roles.test.cjs",
      "test/generalized-evidence.test.cjs",
      "test/house-expenses.test.cjs",
      "test/house-amount-evidence.test.cjs",
      "test/document-understanding.test.cjs",
      "test/onboarding-evidence-regression.test.cjs",
      "test/q48-invoices.test.cjs",
      "test/q48-coverage.test.cjs",
      "test/gate-residuals.test.cjs",
      "test/q15-payment.test.cjs",
      "test/q22-lines.test.cjs",
      "test/conformity-evidence.test.cjs",
      "test/conformity-document-only.test.cjs"
    ]
  },
  "test:quality-v3": {
    "database": false,
    "api": false,
    "files": [
      "test/quality-v3-corpus.test.cjs",
      "test/quality-v3-reading.test.cjs",
      "test/quality-v3-score.test.cjs",
      "test/quality-v3-runner.test.cjs",
      "test/quality-v3-model.test.cjs"
    ]
  },
  "test:reference-matrix": {
    "database": false,
    "api": false,
    "files": [
      "test/reference-matrix.test.cjs"
    ]
  },
  "test:quality-v3-live-guards": {
    "database": false,
    "api": false,
    "files": [
      "test/quality-v3-authorization.test.cjs",
      "test/quality-v3-measures.test.cjs",
      "test/quality-v3-score.test.cjs"
    ]
  },
  "test:object-manuals": {
    "database": false,
    "api": false,
    "files": [
      "test/object-manuals.test.cjs"
    ]
  },
  "test": {
    "database": false,
    "api": false,
    "files": [
      "test/domain.test.cjs",
      "test/documents.test.cjs",
      "test/file-control.test.cjs",
      "test/personal-export.test.cjs",
      "test/multipart.test.cjs",
      "test/review.test.cjs",
      "test/anthropic.test.cjs",
      "test/activities.test.cjs",
      "test/document-search.test.cjs",
      "test/expenses.test.cjs",
      "test/home-objects.test.cjs",
      "test/warranty.test.cjs",
      "test/home-history.test.cjs",
      "test/activity-follow-up.test.cjs",
      "test/contact-confirmation-links.test.cjs",
      "test/economy.test.cjs",
      "test/economic-documents.test.cjs",
      "test/economic-anthropic.test.cjs",
      "test/sharing-policy.test.cjs",
      "test/recovery-mail.test.cjs",
      "test/pilot-corpus.test.cjs",
      "test/pilot-score.test.cjs",
      "test/pilot-observations.test.cjs",
      "test/receipt-assistance.test.cjs",
      "test/receipt-fixture.test.cjs",
      "test/receipt-release.test.cjs",
      "test/receipt-anthropic.test.cjs",
      "test/document-intake.test.cjs",
      "test/intake-classifier.test.cjs",
      "test/contacts.test.cjs",
      "test/offline-harness.test.cjs",
      "test/document-trash-guard.test.cjs"
    ]
  },
  "test:trash-db": {
    "database": true,
    "api": false,
    "files": [
      "test/document-trash.integration.test.cjs",
      "test/document-trash-review.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:cestino-review-db": {
    "database": true,
    "api": false,
    "files": [
      "test/document-trash-review.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:personal-export-db": {
    "database": true,
    "api": true,
    "files": [
      "test/personal-export.integration.test.cjs"
    ],
    "apiFiles": [
      "test/personal-export.integration.test.cjs"
    ]
  },
  "test:sharing-policy": {
    "database": false,
    "api": false,
    "files": [
      "test/sharing-policy.test.cjs"
    ]
  },
  "test:recovery-db": {
    "database": true,
    "api": false,
    "files": [
      "test/recovery.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:sharing-db": {
    "database": true,
    "api": false,
    "files": [
      "test/sharing.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:integration": {
    "database": true,
    "api": true,
    "files": [
      "test/integration.test.cjs",
      "test/documents.integration.test.cjs",
      "test/review.integration.test.cjs",
      "test/activities.integration.test.cjs",
      "test/activities.http.test.cjs",
      "test/document-search.integration.test.cjs",
      "test/document-search.http.test.cjs",
      "test/expenses.integration.test.cjs",
      "test/expenses.http.test.cjs",
      "test/home-objects.integration.test.cjs",
      "test/home-objects.http.test.cjs",
      "test/economy.integration.test.cjs",
      "test/economy.http.test.cjs",
      "test/economic-documents.integration.test.cjs",
      "test/economic-documents.http.test.cjs",
      "test/economic-ai.integration.test.cjs",
      "test/personal-export.integration.test.cjs",
      "test/receipt-assistance.integration.test.cjs",
      "test/receipt-jobs.integration.test.cjs",
      "test/receipt-ai.integration.test.cjs",
      "test/document-intake.integration.test.cjs",
      "test/intake-uploads.integration.test.cjs",
      "test/intake-organization.integration.test.cjs",
      "test/intake-analysis.integration.test.cjs"
    ],
    "apiFiles": [
      "test/integration.test.cjs",
      "test/documents.integration.test.cjs",
      "test/review.integration.test.cjs",
      "test/personal-export.integration.test.cjs"
    ]
  },
  "test:anthropic-offline-db": {
    "database": true,
    "api": false,
    "files": [
      "test/anthropic.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:activities-db": {
    "database": true,
    "api": false,
    "files": [
      "test/activities.integration.test.cjs",
      "test/activities.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:document-search-db": {
    "database": true,
    "api": false,
    "files": [
      "test/document-search.integration.test.cjs",
      "test/document-search.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:expenses-db": {
    "database": true,
    "api": false,
    "files": [
      "test/expenses.integration.test.cjs",
      "test/expenses.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:objects-db": {
    "database": true,
    "api": false,
    "files": [
      "test/home-objects.integration.test.cjs",
      "test/home-objects.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:economy-db": {
    "database": true,
    "api": false,
    "files": [
      "test/economy.integration.test.cjs",
      "test/economy.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:economy-documents-db": {
    "database": true,
    "api": false,
    "files": [
      "test/economic-documents.integration.test.cjs",
      "test/economic-documents.http.test.cjs",
      "test/economic-ai.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:receipt-db": {
    "database": true,
    "api": false,
    "files": [
      "test/receipt-assistance.integration.test.cjs",
      "test/receipt-jobs.integration.test.cjs",
      "test/receipt-ai.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:receipt-fixture": {
    "database": false,
    "api": false,
    "files": [
      "test/receipt-fixture.test.cjs"
    ]
  },
  "test:receipt-jobs-db": {
    "database": true,
    "api": false,
    "files": [
      "test/receipt-jobs.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:intake-db": {
    "database": true,
    "api": false,
    "files": [
      "test/document-intake.integration.test.cjs",
      "test/intake-uploads.integration.test.cjs",
      "test/intake-organization.integration.test.cjs",
      "test/intake-analysis.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:intake-physical": {
    "database": true,
    "api": false,
    "files": [
      "test/intake-physical.integration.test.cjs"
    ],
    "apiFiles": []
  },
  "test:object-onboarding:integration": {
    "database": true,
    "api": false,
    "files": [
      "test/object-onboarding.integration.test.cjs",
      "test/candidate-query-measurements.test.cjs",
      "test/object-onboarding.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:contacts-db": {
    "database": true,
    "api": false,
    "files": [
      "test/contacts.http.test.cjs"
    ],
    "apiFiles": []
  },
  "test:night-plan-db": {
    "database": true,
    "api": true,
    "files": [
      "test/contacts.http.test.cjs",
      "test/object-onboarding.http.test.cjs",
      "test/activities.http.test.cjs",
      "test/home-objects.http.test.cjs",
      "test/documents.integration.test.cjs",
      "test/object-onboarding.integration.test.cjs",
      "test/candidate-query-measurements.test.cjs",
      "test/automatic-intake.integration.test.cjs",
      "test/q48-coverage.integration.test.cjs",
      "test/q22-lines.integration.test.cjs",
      "test/q15-payment.integration.test.cjs",
      "test/q48-invoices.integration.test.cjs"
    ],
    "apiFiles": [
      "test/documents.integration.test.cjs"
    ]
  },
  "test:q48-db": {
    "database": true,
    "files": [
      "test/q48-invoices.integration.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:q15-db": {
    "database": true,
    "files": [
      "test/q15-payment.integration.test.cjs",
      "test/q48-invoices.integration.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:q22-db": {
    "database": true,
    "files": [
      "test/q22-lines.integration.test.cjs",
      "test/q15-payment.integration.test.cjs",
      "test/q48-invoices.integration.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:q48-coverage-db": {
    "database": true,
    "files": [
      "test/q48-coverage.integration.test.cjs",
      "test/q22-lines.integration.test.cjs",
      "test/q15-payment.integration.test.cjs",
      "test/q48-invoices.integration.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:installments-db": {
    "database": true,
    "files": [
      "test/installment-linking.integration.test.cjs",
      "test/q48-invoices.integration.test.cjs",
      "test/order-roles.integration.test.cjs",
      "test/generalized-evidence.integration.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:quality-v3-db": {
    "database": true,
    "files": [
      "test/quality-v3-ledger.integration.test.cjs",
      "test/quality-v3-model.integration.test.cjs"
    ],
    "restartFiles": [
      "test/quality-v3-ledger-restart.test.cjs"
    ],
    "apiFiles": [],
    "api": false
  },
  "test:offline-guards": {
    "database": false,
    "files": [
      "test/offline-harness.test.cjs"
    ]
  }
};
const databaseProfiles = Object.values(profiles).filter(profile => profile.database);
const union = key => [...new Set(databaseProfiles.flatMap(profile => profile[key] ?? []))];
profiles['test:offline-db'] = { database: true, api: true, files: union('files'), apiFiles: union('apiFiles'), restartFiles: union('restartFiles') };
module.exports = profiles;
