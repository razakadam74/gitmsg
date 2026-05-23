import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      thresholds: {
        // Tight gates on the analysis core — heuristics that produce
        // wrong messages are the project's worst failure mode.
        'src/analyze/**': { lines: 85, functions: 85, branches: 80 },
        'src/languages/**': { lines: 85, functions: 85, branches: 80 },
        // Loose floor on everything else for now;
        lines: 70,
        functions: 70,
      },
    },
  },
});
