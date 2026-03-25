import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'tests/e2e_tests/**/*.cy.{ts,tsx}',
    supportFile: 'tests/e2e_tests/support/e2e.ts',
    fixturesFolder: 'tests/e2e_tests/fixtures',
    screenshotsFolder: 'tests/e2e_tests/screenshots',
    videosFolder: 'tests/e2e_tests/videos',
    downloadsFolder: 'tests/e2e_tests/downloads',
    defaultCommandTimeout: 8000,
    video: false,
    screenshotOnRunFailure: true,
  },
});