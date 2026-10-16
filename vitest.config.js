import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/test/**/*.test.js', 'client/src/engine/**/*.test.js', 'client/src/audio/**/*.test.js', 'client/src/*.test.js', 'client/src/hooks/**/*.test.js', 'client/src/midi/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 120000
  }
});
