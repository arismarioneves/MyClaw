import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Exclude db tests from the main suite — they use node:sqlite which
    // Vite can't bundle. Run them separately with: node --test src/db.test.ts
    // or via the forks pool below.
    exclude: ['src/db.test.ts'],
  },
})
